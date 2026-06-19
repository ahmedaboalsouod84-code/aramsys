// Budget vs Actual page — annual budget per account with monthly split and variance.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAccounts, useJournal, fmtSAR } from "@/lib/erp-store";
import { useBudgets, budgetActualForAccount, type BudgetLine } from "@/lib/budget-store";
import { Plus, Trash2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function BudgetPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [journal] = useJournal();
  const [budgets, setBudgets] = useBudgets();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [newCode, setNewCode] = useState("");
  const [monthly, setMonthly] = useState("10000");

  const postable = accounts.filter(a => a.code.startsWith("4") || a.code.startsWith("5"));
  const accountName = (code: string) => {
    const a = accounts.find(x => x.code === code);
    if (!a) return code;
    return lang === "ar" ? a.name_ar : a.name_en;
  };

  const rows = useMemo(() => {
    const codes = Array.from(new Set(budgets.filter(b => b.year === year).map(b => b.accountCode)));
    return codes.map(code => {
      const bva = budgetActualForAccount(code, year, journal, budgets);
      return { code, ...bva };
    });
  }, [budgets, journal, year]);

  const totals = rows.reduce((s, r) => ({
    budget: s.budget + r.budget,
    actual: s.actual + r.actual,
  }), { budget: 0, actual: 0 });

  const addBudget = () => {
    if (!newCode) return;
    const m = parseFloat(monthly) || 0;
    const line: BudgetLine = {
      id: crypto.randomUUID(),
      year, accountCode: newCode,
      months: Array(12).fill(m),
    };
    setBudgets(p => [...p.filter(b => !(b.year === year && b.accountCode === newCode)), line]);
    setNewCode("");
  };

  const removeBudget = (code: string) => {
    setBudgets(p => p.filter(b => !(b.year === year && b.accountCode === code)));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Budget vs Actual", "الموازنة مقابل الفعلي")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Annual budget per account with live variance from the journal.", "موازنة سنوية لكل حساب مع انحراف مباشر من اليومية.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Set Budget", "ضبط الموازنة")}</CardTitle>
          <CardDescription>{t("Pick a revenue / expense account, year, and monthly amount.", "اختر حساب إيراد/مصروف والسنة والمبلغ الشهري.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">{t("Year", "السنة")}</label>
              <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || currentYear)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("Account", "الحساب")}</label>
              <Select value={newCode} onValueChange={setNewCode}>
                <SelectTrigger><SelectValue placeholder={t("Select…", "اختر…")} /></SelectTrigger>
                <SelectContent>
                  {postable.map(a => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} — {lang === "ar" ? a.name_ar : a.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("Monthly", "الشهري")}</label>
              <Input value={monthly} onChange={e => setMonthly(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={addBudget} className="w-full gap-1.5"><Plus className="h-4 w-4" />{t("Add / Update", "إضافة / تحديث")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t(`Variance ${year}`, `الانحراف ${year}`)}</CardTitle>
          <CardDescription>
            {t("Total budget", "إجمالي الموازنة")}: <b>{fmtSAR(totals.budget)}</b> &nbsp;·&nbsp;
            {t("Total actual", "إجمالي الفعلي")}: <b>{fmtSAR(totals.actual)}</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Account", "الحساب")}</TableHead>
                <TableHead className="text-end">{t("Budget", "الموازنة")}</TableHead>
                <TableHead className="text-end">{t("Actual", "الفعلي")}</TableHead>
                <TableHead className="text-end">{t("Variance", "الانحراف")}</TableHead>
                <TableHead className="text-end">%</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t("No budgets for this year.", "لا توجد موازنات لهذه السنة.")}
                </TableCell></TableRow>
              )}
              {rows.map(r => {
                const isRev = r.code.startsWith("4");
                const good = isRev ? r.variance >= 0 : r.variance <= 0;
                return (
                  <TableRow key={r.code}>
                    <TableCell className="font-medium">{r.code} <span className="text-muted-foreground">— {accountName(r.code)}</span></TableCell>
                    <TableCell className="text-end">{fmtSAR(r.budget)}</TableCell>
                    <TableCell className="text-end">{fmtSAR(r.actual)}</TableCell>
                    <TableCell className="text-end">
                      <Badge variant={good ? "secondary" : "destructive"}>{fmtSAR(r.variance)}</Badge>
                    </TableCell>
                    <TableCell className="text-end">{r.variancePct.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeBudget(r.code)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Monthly distribution", "التوزيع الشهري")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Account", "الحساب")}</TableHead>
                {MONTHS.map(m => <TableHead key={m} className="text-end">{m}</TableHead>)}
                <TableHead className="text-end">{t("Total", "الإجمالي")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.filter(b => b.year === year).map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.accountCode}</TableCell>
                  {b.months.map((v, i) => (
                    <TableCell key={i} className="p-1">
                      <Input
                        type="number"
                        value={v}
                        onChange={e => {
                          const n = parseFloat(e.target.value) || 0;
                          setBudgets(p => p.map(x => x.id === b.id
                            ? { ...x, months: x.months.map((m, j) => j === i ? n : m) }
                            : x));
                        }}
                        className="h-8 w-20 text-end"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-end font-semibold">{fmtSAR(b.months.reduce((s, n) => s + (n || 0), 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
