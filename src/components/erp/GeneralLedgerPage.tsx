import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAccounts, useJournal, fmtSAR } from "@/lib/erp-store";
import { BookOpen } from "lucide-react";

export function GeneralLedgerPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [entries] = useJournal();
  const [code, setCode] = useState(accounts[0]?.code ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const acc = accounts.find((a) => a.code === code);
  const movements = useMemo(() => {
    const list: { date: string; ref: string; narrative: string; debit: number; credit: number }[] = [];
    for (const e of entries) {
      if (from && e.date < from) continue;
      if (to && e.date > to) continue;
      for (const l of e.lines) if (l.accountCode === code) {
        list.push({ date: e.date, ref: e.ref, narrative: e.narrative, debit: l.debit, credit: l.credit });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, code, from, to]);

  let running = 0;
  const rows = movements.map((m) => { running += m.debit - m.credit; return { ...m, balance: running }; });
  const totalD = movements.reduce((s, m) => s + m.debit, 0);
  const totalC = movements.reduce((s, m) => s + m.credit, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BookOpen className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("General Ledger", "دفتر الأستاذ")}</h1>
          <p className="text-sm text-muted-foreground">{t("Movements by account", "حركات الحساب")}</p>
        </div>
      </header>

      <Card>
        <CardContent className="pt-5 grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>{t("Account", "الحساب")}</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.code} value={a.code}>{a.code} · {lang === "ar" ? a.name_ar : a.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t("From", "من")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("To", "إلى")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      {acc && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{acc.code} · {lang === "ar" ? acc.name_ar : acc.name_en}</CardTitle>
                <CardDescription className="capitalize">{acc.type}</CardDescription>
              </div>
              <Badge variant="outline" className="text-base font-mono">{fmtSAR(running)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">{t("Date", "التاريخ")}</th>
                    <th className="text-start px-3 py-2 font-medium">{t("Ref", "المرجع")}</th>
                    <th className="text-start px-3 py-2 font-medium">{t("Narrative", "البيان")}</th>
                    <th className="text-end px-3 py-2 font-medium">{t("Debit", "مدين")}</th>
                    <th className="text-end px-3 py-2 font-medium">{t("Credit", "دائن")}</th>
                    <th className="text-end px-3 py-2 font-medium">{t("Balance", "الرصيد")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{t("No movements", "لا توجد حركات")}</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                      <td className="px-3 py-2">{r.narrative}</td>
                      <td className="px-3 py-2 text-end">{r.debit ? fmtSAR(r.debit) : "—"}</td>
                      <td className="px-3 py-2 text-end">{r.credit ? fmtSAR(r.credit) : "—"}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.balance)}</td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr className="border-t bg-muted/40 font-semibold">
                      <td colSpan={3} className="px-3 py-2">{t("Total", "الإجمالي")}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(totalD)}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(totalC)}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(running)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
