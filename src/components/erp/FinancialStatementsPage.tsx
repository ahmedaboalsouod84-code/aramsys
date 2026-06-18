import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAccounts, useJournal, accountBalance, fmtSAR } from "@/lib/erp-store";
import { usePendingBankCodes } from "@/lib/bank-recon-store";
import { FileBarChart, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export function FinancialStatementsPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [entries] = useJournal();
  const pending = usePendingBankCodes();
  const [view, setView] = useState<"income" | "balance">("income");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><FileBarChart className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Financial Statements", "القوائم المالية")}</h1>
          <p className="text-sm text-muted-foreground">{t("Income statement and balance sheet", "قائمة الدخل والميزانية")}</p>
        </div>
      </header>

      <div className="max-w-xs">
        <Select value={view} onValueChange={(v) => setView(v as "income" | "balance")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">{t("Income Statement", "قائمة الدخل")}</SelectItem>
            <SelectItem value="balance">{t("Balance Sheet", "الميزانية")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === "income" ? <IncomeStatement /> : <BalanceSheet />}
    </div>
  );

  function IncomeStatement() {
    const revenue = accounts.filter((a) => a.type === "revenue");
    const expenses = accounts.filter((a) => a.type === "expense");
    const revTotal = revenue.reduce((s, a) => s + Math.abs(accountBalance(a.code, entries).balance), 0);
    const expTotal = expenses.reduce((s, a) => s + accountBalance(a.code, entries).balance, 0);
    const net = revTotal - expTotal;

    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{t("Income Statement", "قائمة الدخل")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Section title={t("Revenue", "الإيرادات")} items={revenue.map((a) => ({ code: a.code, label: lang === "ar" ? a.name_ar : a.name_en, amount: Math.abs(accountBalance(a.code, entries).balance) }))} total={revTotal} />
          <Section title={t("Expenses", "المصروفات")} items={expenses.map((a) => ({ code: a.code, label: lang === "ar" ? a.name_ar : a.name_en, amount: accountBalance(a.code, entries).balance }))} total={expTotal} />
          <div className="flex items-center justify-between border-t-2 border-foreground/30 pt-3 text-base">
            <span className="font-semibold">{t("Net Profit", "صافي الربح")}</span>
            <span className={`font-bold text-lg ${net >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(net)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  function BalanceSheet() {
    // SAP-style: H0002 / H0003 are PENDING bank movements — excluded from
    // official asset totals. Only H0001 (main bank control) is the official
    // bank balance shown on the Balance Sheet.
    const officialAssets = accounts.filter((a) => a.type === "asset" && !pending.has(a.code));
    const pendingAssets = accounts.filter((a) => a.type === "asset" && pending.has(a.code));
    const liabilities = accounts.filter((a) => a.type === "liability");
    const equity = accounts.filter((a) => a.type === "equity");
    const assetTotal = officialAssets.reduce((s, a) => s + accountBalance(a.code, entries).balance, 0);
    const pendingTotal = pendingAssets.reduce((s, a) => s + accountBalance(a.code, entries).balance, 0);
    const liabTotal = liabilities.reduce((s, a) => s + Math.abs(accountBalance(a.code, entries).balance), 0);
    const eqTotal = equity.reduce((s, a) => s + Math.abs(accountBalance(a.code, entries).balance), 0);
    const liabEq = liabTotal + eqTotal;
    const balanced = Math.abs(assetTotal - liabEq) < 1;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("Balance Sheet", "الميزانية")}</CardTitle>
            <Badge variant={balanced ? "default" : "destructive"} className={balanced ? "bg-success text-success-foreground" : ""}>
              {balanced ? <><CheckCircle2 className="h-3 w-3 mr-1" />{t("Balanced", "متوازن")}</> : <><AlertCircle className="h-3 w-3 mr-1" />{t("Unbalanced", "غير متوازن")}</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title={t("Assets", "الأصول")} items={officialAssets.map((a) => ({ code: a.code, label: lang === "ar" ? a.name_ar : a.name_en, amount: accountBalance(a.code, entries).balance }))} total={assetTotal} />
          <Section title={t("Liabilities", "الخصوم")} items={liabilities.map((a) => ({ code: a.code, label: lang === "ar" ? a.name_ar : a.name_en, amount: Math.abs(accountBalance(a.code, entries).balance) }))} total={liabTotal} />
          <Section title={t("Equity", "حقوق الملكية")} items={equity.map((a) => ({ code: a.code, label: lang === "ar" ? a.name_ar : a.name_en, amount: Math.abs(accountBalance(a.code, entries).balance) }))} total={eqTotal} />
          <div className="flex items-center justify-between border-t-2 border-foreground/30 pt-3">
            <span className="font-semibold">{t("Liabilities + Equity", "الخصوم + حقوق الملكية")}</span>
            <span className="font-bold">{fmtSAR(liabEq)}</span>
          </div>

          {pendingAssets.length > 0 && (
            <div className="space-y-1.5 pt-4 border-t border-dashed">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {t("Pending bank movements (memo only — not included in totals)",
                   "حركات بنكية معلقة (مذكرة فقط — لا تدخل في الإجماليات)")}
              </div>
              <div className="divide-y border border-dashed rounded-md bg-muted/20">
                {pendingAssets.map((a) => (
                  <div key={a.code} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span>
                      <span className="font-mono text-xs text-muted-foreground me-2">{a.code}</span>
                      {lang === "ar" ? a.name_ar : a.name_en}
                      <Badge variant="outline" className="ms-2 text-[10px]">{t("Pending", "معلق")}</Badge>
                    </span>
                    <span className="font-mono text-muted-foreground">{fmtSAR(accountBalance(a.code, entries).balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-sm bg-muted/30">
                  <span className="text-muted-foreground">{t("Pending total (awaiting reconciliation)", "إجمالي المعلق (بانتظار التسوية)")}</span>
                  <span className="font-mono text-muted-foreground">{fmtSAR(pendingTotal)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("These balances become part of the official bank position only after a reconciliation settlement is approved.",
                   "تنضم هذه الأرصدة إلى الرصيد البنكي الرسمي فقط بعد اعتماد التسوية البنكية.")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}

function Section({ title, items, total }: { title: string; items: { code: string; label: string; amount: number }[]; total: number }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="divide-y border rounded-md">
        {items.map((i) => (
          <div key={i.code} className="flex items-center justify-between px-3 py-1.5 text-sm">
            <span><span className="font-mono text-xs text-muted-foreground me-2">{i.code}</span>{i.label}</span>
            <span className="font-mono">{fmtSAR(i.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold bg-muted/30">
          <span>Total</span>
          <span className="font-mono">{fmtSAR(total)}</span>
        </div>
      </div>
    </div>
  );
}
