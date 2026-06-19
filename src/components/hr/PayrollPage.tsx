// Payroll Page — list employees, generate run, post & pay (balanced JE).
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  useEmployees, usePayrollRuns, buildPayrollLines,
  createPayrollRun, postPayroll, payPayroll, cancelPayroll,
} from "@/lib/payroll-store";
import { fmt } from "@/lib/bank-recon-store";
import { Users, Plus, BookCheck, Banknote, X } from "lucide-react";
import { toast } from "sonner";

function currentPeriod() { return new Date().toISOString().slice(0, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

export function PayrollPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [employees] = useEmployees();
  const [runs] = usePayrollRuns();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(currentPeriod());
  const [date, setDate]     = useState(todayISO());
  const [overrides, setOverrides] = useState<Record<string, { advance?: number; deduction?: number; bonus?: number }>>({});

  const preview = useMemo(() => buildPayrollLines(employees, overrides), [employees, overrides]);
  const totals = useMemo(() => preview.reduce((s, l) => ({
    gross: s.gross + l.gross, net: s.net + l.net,
    gosi: s.gosi + l.gosiEmployee + l.gosiEmployer,
  }), { gross:0, net:0, gosi:0 }), [preview]);

  const sortedRuns = useMemo(() => [...runs].sort((a,b) => b.createdAt.localeCompare(a.createdAt)), [runs]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayrollRun(period, date, preview, user?.username);
    setOpen(false); setOverrides({});
    toast.success(t("Payroll run created (draft)", "تم إنشاء مسير الرواتب (مسودة)"));
  };

  const setOv = (id: string, key: "advance"|"deduction"|"bonus", val: string) =>
    setOverrides(o => ({ ...o, [id]: { ...o[id], [key]: parseFloat(val) || 0 } }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("Payroll", "الرواتب")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Monthly payroll runs — auto-post balanced JE on approval.",
                 "مسير الرواتب الشهري — ترحيل قيود متوازنة تلقائياً عند الاعتماد.")}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("New payroll run", "مسير جديد")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("New payroll run", "مسير رواتب جديد")}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("Period", "الفترة")}</Label>
                  <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>{t("Payroll date", "تاريخ المسير")}</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-start">{t("Employee", "الموظف")}</th>
                      <th className="px-2 py-2 text-end">{t("Gross", "إجمالي")}</th>
                      <th className="px-2 py-2 text-end">{t("Bonus", "مكافأة")}</th>
                      <th className="px-2 py-2 text-end">{t("Advance", "سلفة")}</th>
                      <th className="px-2 py-2 text-end">{t("Deduction", "خصم")}</th>
                      <th className="px-2 py-2 text-end">{t("GOSI", "تأمينات")}</th>
                      <th className="px-2 py-2 text-end">{t("Net", "صافي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(l => (
                      <tr key={l.employeeId} className="border-t">
                        <td className="px-2 py-1.5">{l.name}</td>
                        <td className="px-2 py-1.5 text-end font-mono">{fmt(l.gross)}</td>
                        <td className="px-2 py-1.5 text-end">
                          <Input type="number" className="h-7 w-24 ms-auto"
                            value={overrides[l.employeeId]?.bonus ?? ""}
                            onChange={e => setOv(l.employeeId, "bonus", e.target.value)} /></td>
                        <td className="px-2 py-1.5 text-end">
                          <Input type="number" className="h-7 w-24 ms-auto"
                            value={overrides[l.employeeId]?.advance ?? ""}
                            onChange={e => setOv(l.employeeId, "advance", e.target.value)} /></td>
                        <td className="px-2 py-1.5 text-end">
                          <Input type="number" className="h-7 w-24 ms-auto"
                            value={overrides[l.employeeId]?.deduction ?? ""}
                            onChange={e => setOv(l.employeeId, "deduction", e.target.value)} /></td>
                        <td className="px-2 py-1.5 text-end font-mono text-muted-foreground">{fmt(l.gosiEmployee)}</td>
                        <td className="px-2 py-1.5 text-end font-mono font-semibold">{fmt(l.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30">
                    <tr><td className="px-2 py-2 font-semibold">{t("Totals", "الإجمالي")}</td>
                      <td className="px-2 py-2 text-end font-mono">{fmt(totals.gross)}</td>
                      <td colSpan={3}></td>
                      <td className="px-2 py-2 text-end font-mono">{fmt(totals.gosi)}</td>
                      <td className="px-2 py-2 text-end font-mono font-bold">{fmt(totals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
                <Button type="submit">{t("Save draft", "حفظ كمسودة")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{sortedRuns.length} {t("payroll runs", "مسير")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                  <th className="px-3 py-2 text-start">{t("Period", "الفترة")}</th>
                  <th className="px-3 py-2 text-end">{t("Gross", "إجمالي")}</th>
                  <th className="px-3 py-2 text-end">{t("Net", "صافي")}</th>
                  <th className="px-3 py-2 text-center">{t("Status", "الحالة")}</th>
                  <th className="px-3 py-2 text-center">{t("JE", "القيد")}</th>
                  <th className="px-3 py-2 text-center">{t("Actions", "إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRuns.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t("No payroll runs", "لا يوجد مسير")}</td></tr>
                ) : sortedRuns.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                    <td className="px-3 py-2">{r.period}</td>
                    <td className="px-3 py-2 text-end font-mono">{fmt(r.totals.gross)}</td>
                    <td className="px-3 py-2 text-end font-mono font-semibold">{fmt(r.totals.net)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.status === "draft"     && <Badge variant="outline">{t("Draft", "مسودة")}</Badge>}
                      {r.status === "posted"    && <Badge className="bg-blue-600 hover:bg-blue-700">{t("Posted", "مرحَّل")}</Badge>}
                      {r.status === "paid"      && <Badge className="bg-emerald-600 hover:bg-emerald-700">{t("Paid", "مُسدَّد")}</Badge>}
                      {r.status === "cancelled" && <Badge variant="destructive">{t("Cancelled", "ملغى")}</Badge>}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-xs">{r.journalRef || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        {r.status === "draft" && (
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => { try { postPayroll(r.id); toast.success(t("Posted", "تم الترحيل")); }
                                             catch (e: unknown) { toast.error((e as Error).message); } }}>
                            <BookCheck className="h-3 w-3" />{t("Post", "ترحيل")}
                          </Button>
                        )}
                        {r.status === "posted" && (
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => { try { payPayroll(r.id); toast.success(t("Paid", "تم السداد")); }
                                             catch (e: unknown) { toast.error((e as Error).message); } }}>
                            <Banknote className="h-3 w-3" />{t("Pay", "سداد")}
                          </Button>
                        )}
                        {r.status !== "cancelled" && r.status !== "paid" && (
                          <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                            onClick={() => { if (confirm(t("Cancel run?", "إلغاء المسير؟"))) cancelPayroll(r.id); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Employees", "الموظفون")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Name", "الاسم")}</th>
                  <th className="px-3 py-2 text-start">{t("Position", "الوظيفة")}</th>
                  <th className="px-3 py-2 text-end">{t("Basic", "أساسي")}</th>
                  <th className="px-3 py-2 text-end">{t("Allowances", "بدلات")}</th>
                  <th className="px-3 py-2 text-end">{t("Gross", "إجمالي")}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2">{e.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.position}</td>
                    <td className="px-3 py-2 text-end font-mono">{fmt(e.basicSalary)}</td>
                    <td className="px-3 py-2 text-end font-mono">{fmt(e.allowances)}</td>
                    <td className="px-3 py-2 text-end font-mono font-semibold">{fmt(e.basicSalary + e.allowances)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
