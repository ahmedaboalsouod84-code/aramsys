// Cash Vouchers — Receipt (سند قبض) & Payment (سند صرف).
// Each voucher posts a balanced JE: Cash DR/CR vs a configurable counter account.
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/lib/erp-store";
import {
  useVouchers, createVoucher, postVoucher, cancelVoucher,
  type VoucherKind,
} from "@/lib/cash-voucher-store";
import { fmt } from "@/lib/bank-recon-store";
import { Wallet, Plus, BookCheck, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

function todayISO() { return new Date().toISOString().slice(0, 10); }

function VoucherPage({ kind }: { kind: VoucherKind }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [vouchers] = useVouchers();
  const [accounts] = useAccounts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), amount: "", counterAccount: "",
    payeeOrPayer: "", narrative: "",
  });

  const title = kind === "receipt"
    ? t("Receipt Vouchers", "سندات القبض")
    : t("Payment Vouchers", "سندات الصرف");
  const Icon = kind === "receipt" ? ArrowDownCircle : ArrowUpCircle;

  const rows = useMemo(
    () => vouchers.filter(v => v.kind === kind).sort((a, b) => b.date.localeCompare(a.date)),
    [vouchers, kind],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || !form.counterAccount || !form.payeeOrPayer) {
      toast.error(t("Fill all required fields", "أكمل الحقول الإلزامية"));
      return;
    }
    createVoucher({
      kind, date: form.date, amount: amt,
      counterAccount: form.counterAccount,
      payeeOrPayer: form.payeeOrPayer,
      narrative: form.narrative,
      user: user?.username,
    });
    setForm({ date: todayISO(), amount: "", counterAccount: "", payeeOrPayer: "", narrative: "" });
    setOpen(false);
    toast.success(t("Voucher created (draft)", "تم إنشاء السند (مسودة)"));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {kind === "receipt"
                ? t("Cash IN — debit Cash, credit counter account.", "نقدية واردة — مدين الخزينة، دائن الحساب المقابل.")
                : t("Cash OUT — debit counter account, credit Cash.", "نقدية صادرة — مدين الحساب المقابل، دائن الخزينة.")}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("New voucher", "سند جديد")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{t("Date", "التاريخ")}</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Amount", "المبلغ")}*</Label>
                <Input type="number" step="0.01" required value={form.amount}
                       onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2">
                <Label>{kind === "receipt" ? t("Payer", "المستلَم منه") : t("Payee", "المصروف له")}*</Label>
                <Input required value={form.payeeOrPayer}
                       onChange={e => setForm({ ...form, payeeOrPayer: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>{t("Counter account", "الحساب المقابل")}*</Label>
                <Select value={form.counterAccount} onValueChange={v => setForm({ ...form, counterAccount: v })}>
                  <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a =>
                      <SelectItem key={a.code} value={a.code}>{a.code} · {lang === "ar" ? a.name_ar : a.name_en}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5 col-span-2"><Label>{t("Narrative", "البيان")}</Label>
                <Textarea rows={2} value={form.narrative}
                          onChange={e => setForm({ ...form, narrative: e.target.value })} /></div>
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
                <Button type="submit">{t("Save draft", "حفظ كمسودة")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{rows.length} {t("vouchers", "سند")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                  <th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                  <th className="px-3 py-2 text-start">{kind === "receipt" ? t("Payer", "المستلَم منه") : t("Payee", "المصروف له")}</th>
                  <th className="px-3 py-2 text-start">{t("Counter A/C", "ح. مقابل")}</th>
                  <th className="px-3 py-2 text-end">{t("Amount", "المبلغ")}</th>
                  <th className="px-3 py-2 text-center">{t("Status", "الحالة")}</th>
                  <th className="px-3 py-2 text-center">{t("Actions", "إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t("No vouchers", "لا توجد سندات")}</td></tr>
                ) : rows.map(v => (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{v.ref}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.date}</td>
                    <td className="px-3 py-2">{v.payeeOrPayer}</td>
                    <td className="px-3 py-2 font-mono text-xs">{v.counterAccount}</td>
                    <td className="px-3 py-2 text-end font-mono">{fmt(v.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      {v.status === "draft"     && <Badge variant="outline">{t("Draft", "مسودة")}</Badge>}
                      {v.status === "posted"    && <Badge className="bg-emerald-600 hover:bg-emerald-700">{t("Posted", "مُرحَّل")}</Badge>}
                      {v.status === "cancelled" && <Badge variant="destructive">{t("Cancelled", "ملغى")}</Badge>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        {v.status === "draft" && (
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => { try { postVoucher(v.id, user?.username); toast.success(t("Posted", "تم الترحيل")); }
                                             catch (e: unknown) { toast.error((e as Error).message); } }}>
                            <BookCheck className="h-3 w-3" />{t("Post", "ترحيل")}
                          </Button>
                        )}
                        {v.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                            onClick={() => { if (confirm(t("Cancel voucher?", "إلغاء السند؟"))) {
                              cancelVoucher(v.id, user?.username); toast.success(t("Cancelled", "تم الإلغاء"));
                            } }}>
                            <X className="h-3 w-3" />{t("Cancel", "إلغاء")}
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
    </div>
  );
}

export function ReceiptVouchersPage() { return <VoucherPage kind="receipt" />; }
export function PaymentVouchersPage() { return <VoucherPage kind="payment" />; }

export function VouchersOverviewPage() {
  const { t } = useI18n();
  const [vouchers] = useVouchers();
  const draft   = vouchers.filter(v => v.status === "draft").length;
  const posted  = vouchers.filter(v => v.status === "posted").length;
  const totalIn  = vouchers.filter(v => v.kind === "receipt" && v.status === "posted").reduce((s, v) => s + v.amount, 0);
  const totalOut = vouchers.filter(v => v.kind === "payment" && v.status === "posted").reduce((s, v) => s + v.amount, 0);
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{t("Cash Vouchers Overview", "نظرة عامة على سندات الخزينة")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Summary across all receipt and payment vouchers.", "ملخص جميع سندات القبض والصرف.")}
          </p>
        </div>
      </header>
      <div className="grid sm:grid-cols-4 gap-3">
        <KPI label={t("Drafts", "مسودات")} value={String(draft)} />
        <KPI label={t("Posted", "مُرحَّل")} value={String(posted)} />
        <KPI label={t("Cash IN (posted)", "وارد مرحَّل")} value={fmt(totalIn)} />
        <KPI label={t("Cash OUT (posted)", "صادر مرحَّل")} value={fmt(totalOut)} />
      </div>
    </div>
  );
}
function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value}</div>
    </CardContent></Card>
  );
}
