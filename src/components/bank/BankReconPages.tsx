import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/lib/erp-store";
import {
  useBanks, useBankTxns, useSettlements, useBankActivity, useBankStatements,
  createBank, addBankTxn, buildReconciliation, approveSettlement, reverseSettlement,
  importStatementLines, matchStatementLine, bankAccountBalances, fmt,
  type Bank, type BankTxn,
} from "@/lib/bank-recon-store";
import {
  Landmark, Plus, ArrowDownCircle, ArrowUpCircle, RotateCcw, CheckCircle2,
  AlertTriangle, FileUp, Link2, History, ListChecks,
} from "lucide-react";

/* ============ shared utilities ============ */

function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function useBank(): [Bank | undefined, (id: string) => void, Bank[]] {
  const [banks] = useBanks();
  const [id, setId] = useState<string>("");
  const current = banks.find((b) => b.id === id) || banks[0];
  return [current, setId, banks];
}

function PageHeader({ icon: Icon, title, subtitle, actions }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

function BankPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { lang, t } = useI18n();
  const [banks] = useBanks();
  if (banks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("No banks yet. Create one in Bank List.", "لا توجد بنوك. أنشئ بنكاً من قائمة البنوك.")}</p>;
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-72"><SelectValue placeholder={t("Select bank", "اختر البنك")} /></SelectTrigger>
      <SelectContent>
        {banks.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.code} · {lang === "ar" ? b.name_ar : b.name_en}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============ 1. Bank List ============ */

export function BankListPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [banks] = useBanks();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", name_en: "", name_ar: "", iban: "", currency: "SAR", openingBalance: "0",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name_en || !form.name_ar) return;
    createBank({
      code: form.code, name_en: form.name_en, name_ar: form.name_ar,
      iban: form.iban, currency: form.currency,
      openingBalance: parseFloat(form.openingBalance) || 0,
      user: user?.username,
    });
    setForm({ code: "", name_en: "", name_ar: "", iban: "", currency: "SAR", openingBalance: "0" });
    setOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={Landmark}
        title={t("Bank List", "قائمة البنوك")}
        subtitle={t("Every bank auto-generates 3 control accounts (Main / Deposits / Payments).",
                    "كل بنك ينشئ تلقائياً 3 حسابات: الرئيسي والإيداعات والمدفوعات.")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("New bank", "بنك جديد")}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("Create bank", "إنشاء بنك")}</DialogTitle>
                <DialogDescription>{t("System will create H0001-style accounts in the Chart of Accounts.",
                                       "سيُنشئ النظام حسابات بنمط H0001 في دليل الحسابات.")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("Code", "الرمز")}*</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BNK01" required /></div>
                <div className="space-y-1.5"><Label>{t("Currency", "العملة")}</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("Name (EN)", "الاسم (إنجليزي)")}*</Label>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>{t("Name (AR)", "الاسم (عربي)")}*</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} required /></div>
                <div className="space-y-1.5 col-span-2"><Label>IBAN</Label>
                  <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="SA…" /></div>
                <div className="space-y-1.5 col-span-2"><Label>{t("Opening balance", "الرصيد الافتتاحي")}</Label>
                  <Input type="number" step="0.01" value={form.openingBalance}
                         onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></div>
                <DialogFooter className="col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
                  <Button type="submit">{t("Create", "إنشاء")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {banks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t("No banks yet. Click \"New bank\" to register the first one.",
             "لا توجد بنوك. اضغط \"بنك جديد\" لتسجيل أول بنك.")}
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {banks.map((b) => {
            const bal = bankAccountBalances(b);
            return (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{b.code} — {lang === "ar" ? b.name_ar : b.name_en}</CardTitle>
                    <Badge variant="outline">{b.currency}</Badge>
                  </div>
                  {b.iban && <CardDescription className="font-mono text-xs">{b.iban}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <Row label={t("Main (H control)", "الرئيسي")} code={b.mainAccount} value={fmt(bal.main, b.currency)} strong />
                  <Row label={t("Deposits bucket", "الإيداعات")} code={b.depositsAccount} value={fmt(bal.deposits, b.currency)} />
                  <Row label={t("Payments bucket", "المدفوعات")} code={b.paymentsAccount} value={fmt(bal.payments, b.currency)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Row({ label, code, value, strong }: { label: string; code: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b last:border-0 py-1 ${strong ? "font-medium" : ""}`}>
      <span className="text-muted-foreground"><span className="font-mono text-xs me-2">{code}</span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

/* ============ 2. Bank Transactions (record manual deposits & payments) ============ */

export function BankTransactionsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [bank, setBank] = useBank();
  const [accounts] = useAccounts();
  const [txns] = useBankTxns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(), kind: "deposit" as "deposit" | "payment",
    amount: "", counterAccount: "", narrative: "",
  });

  const rows = useMemo(() => txns.filter((t) => t.bankId === bank?.id).sort((a, b) => b.date.localeCompare(a.date)), [txns, bank]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank || !form.amount || !form.counterAccount) return;
    addBankTxn({
      bankId: bank.id, date: form.date, kind: form.kind,
      amount: parseFloat(form.amount), counterAccount: form.counterAccount,
      narrative: form.narrative, user: user?.username,
    });
    setForm({ ...form, amount: "", narrative: "" });
    setOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={ListChecks} title={t("Bank Transactions", "حركات البنك")}
        subtitle={t("Manual deposits / payments — posted to H0002 or H0003 (never H0001).",
                    "إيداعات/مدفوعات يدوية — تُرحَّل إلى H0002 أو H0003 وليس إلى H0001 أبداً.")}
        actions={<BankPicker value={bank?.id} onChange={setBank} />} />

      {bank && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("New transaction", "حركة جديدة")}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t("New bank transaction", "حركة بنكية جديدة")}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>{t("Date", "التاريخ")}</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("Kind", "النوع")}</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as "deposit" | "payment" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">{t("Deposit (incoming)", "إيداع (وارد)")}</SelectItem>
                      <SelectItem value="payment">{t("Payment (outgoing)", "دفع (صادر)")}</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div className="space-y-1.5"><Label>{t("Amount", "المبلغ")}*</Label>
                  <Input type="number" step="0.01" required value={form.amount}
                         onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("Counter account", "الحساب المقابل")}*</Label>
                  <Select value={form.counterAccount} onValueChange={(v) => setForm({ ...form, counterAccount: v })}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter((a) => !/^H\d{4}$/.test(a.code)).map((a) =>
                        <SelectItem key={a.code} value={a.code}>{a.code} · {lang === "ar" ? a.name_ar : a.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div className="space-y-1.5 col-span-2"><Label>{t("Narrative", "البيان")}</Label>
                  <Textarea rows={2} value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} /></div>
                <DialogFooter className="col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
                  <Button type="submit">{t("Save", "حفظ")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {bank && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{rows.length} {t("transactions", "حركة")}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                    <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                    <th className="px-3 py-2 text-start">{t("Kind", "النوع")}</th>
                    <th className="px-3 py-2 text-start">{t("Narrative", "البيان")}</th>
                    <th className="px-3 py-2 text-end">{t("Amount", "المبلغ")}</th>
                    <th className="px-3 py-2 text-center">{t("Status", "الحالة")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{t("No transactions", "لا توجد حركات")}</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                      <td className="px-3 py-2">
                        {r.kind === "deposit"
                          ? <Badge variant="secondary" className="gap-1"><ArrowDownCircle className="h-3 w-3" />{t("Deposit", "إيداع")}</Badge>
                          : <Badge variant="outline" className="gap-1"><ArrowUpCircle className="h-3 w-3" />{t("Payment", "دفع")}</Badge>}
                      </td>
                      <td className="px-3 py-2">{r.narrative}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(r.amount, bank.currency)}</td>
                      <td className="px-3 py-2 text-center">
                        {r.settlementId
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-700">{t("Settled", "مُسوّاة")}</Badge>
                          : <Badge variant="outline">{t("Open", "مفتوحة")}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============ 3. Reconciliation Dashboard ============ */

export function ReconciliationDashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [bank, setBank] = useBank();
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(todayISO());
  const [stmt, setStmt] = useState("0");
  const [notes, setNotes] = useState("");

  const recon = useMemo(() => {
    if (!bank) return null;
    return buildReconciliation(bank, periodStart, periodEnd, parseFloat(stmt) || 0);
  }, [bank, periodStart, periodEnd, stmt]);

  const onApprove = () => {
    if (!bank || !recon) return;
    if (!confirm(t("Approve and post settlement? This cannot be deleted.",
                   "اعتماد وترحيل التسوية؟ لا يمكن حذفها بعد ذلك."))) return;
    approveSettlement({
      bankId: bank.id, periodStart, periodEnd,
      statementBalance: parseFloat(stmt) || 0, notes, user: user?.username,
    });
    setNotes("");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={CheckCircle2} title={t("Reconciliation Dashboard", "لوحة التسوية البنكية")}
        actions={<BankPicker value={bank?.id} onChange={setBank} />} />

      {bank && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("Period", "الفترة")}</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>{t("From", "من")}</Label><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{t("To", "إلى")}</Label><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{t("Bank statement balance", "رصيد كشف البنك")}</Label>
                <Input type="number" step="0.01" value={stmt} onChange={(e) => setStmt(e.target.value)} /></div>
            </CardContent>
          </Card>

          {recon && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Stat label={t("Opening (H0001)", "الافتتاحي (H0001)")} value={fmt(recon.opening, bank.currency)} />
              <Stat label={t("Total Deposits (H0002)", "إجمالي الإيداعات")} value={fmt(recon.totalDeposits, bank.currency)} tone="up" />
              <Stat label={t("Total Payments (H0003)", "إجمالي المدفوعات")} value={fmt(recon.totalPayments, bank.currency)} tone="down" />
              <Stat label={t("Calculated Balance", "الرصيد المحسوب")} value={fmt(recon.calculatedBalance, bank.currency)} strong />
            </div>
          )}

          {recon && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("Reconciliation Result", "نتيجة التسوية")}</CardTitle>
                  {recon.matched
                    ? <Badge className="bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />{t("Matched", "متطابق")}</Badge>
                    : <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t("Unmatched", "غير متطابق")}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <KV label={t("Calculated", "المحسوب")} value={fmt(recon.calculatedBalance, bank.currency)} />
                  <KV label={t("Statement", "الكشف")} value={fmt(recon.statementBalance, bank.currency)} />
                  <KV label={t("Difference", "الفرق")} value={fmt(recon.difference, bank.currency)}
                      cls={recon.matched ? "text-emerald-600" : "text-destructive"} />
                </div>
                <Textarea placeholder={t("Notes (optional)", "ملاحظات (اختياري)")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex justify-end">
                  <Button onClick={onApprove} disabled={!recon.matched}>
                    {t("Approve & post settlement", "اعتماد وترحيل التسوية")}
                  </Button>
                </div>
                {!recon.matched && (
                  <p className="text-xs text-muted-foreground">
                    {t("Difference must be zero. Reconcile transactions on the Unreconciled screen first.",
                       "يجب أن يكون الفرق صفراً. سوِّ الحركات من شاشة غير المُسوَّاة أولاً.")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">{lang === "ar" ? "" : ""}</p>
    </div>
  );
}
function Stat({ label, value, tone, strong }: { label: string; value: string; tone?: "up" | "down"; strong?: boolean }) {
  const color = tone === "up" ? "text-emerald-600" : tone === "down" ? "text-amber-600" : "";
  return (
    <Card><CardContent className="pt-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-mono mt-1 ${color} ${strong ? "font-bold" : ""}`}>{value}</p>
    </CardContent></Card>
  );
}
function KV({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono text-base ${cls || ""}`}>{value}</p>
    </div>
  );
}

/* ============ 4. Settlement History ============ */

export function SettlementHistoryPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [settlements] = useSettlements();
  const [banks] = useBanks();
  const [bank, setBank] = useBank();
  const rows = useMemo(() =>
    [...settlements].filter((s) => !bank || s.bankId === bank.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [settlements, bank]);

  const onReverse = (id: string) => {
    if (!confirm(t("Post a reversal entry for this settlement?", "ترحيل قيد عكسي لهذه التسوية؟"))) return;
    reverseSettlement(id, user?.username);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={History} title={t("Settlement History", "سجل التسويات")}
        actions={<BankPicker value={bank?.id} onChange={setBank} />} />
      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                  <th className="px-3 py-2 text-start">{t("Bank", "البنك")}</th>
                  <th className="px-3 py-2 text-start">{t("Period", "الفترة")}</th>
                  <th className="px-3 py-2 text-end">{t("Deposits", "إيداعات")}</th>
                  <th className="px-3 py-2 text-end">{t("Payments", "مدفوعات")}</th>
                  <th className="px-3 py-2 text-end">{t("Calc", "محسوب")}</th>
                  <th className="px-3 py-2 text-end">{t("Statement", "الكشف")}</th>
                  <th className="px-3 py-2 text-end">{t("Diff", "الفرق")}</th>
                  <th className="px-3 py-2 text-center">{t("Status", "الحالة")}</th>
                  <th className="px-3 py-2 text-center">{t("Actions", "إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{t("No settlements yet", "لا توجد تسويات")}</td></tr>
                ) : rows.map((s) => {
                  const b = banks.find((x) => x.id === s.bankId);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{s.ref}</td>
                      <td className="px-3 py-2">{b ? `${b.code} · ${lang === "ar" ? b.name_ar : b.name_en}` : "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{s.periodStart} → {s.periodEnd}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(s.totalDeposits)}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(s.totalPayments)}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(s.calculatedBalance)}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(s.statementBalance)}</td>
                      <td className={`px-3 py-2 text-end font-mono ${Math.abs(s.difference) < 0.005 ? "text-emerald-600" : "text-destructive"}`}>{fmt(s.difference)}</td>
                      <td className="px-3 py-2 text-center">
                        {s.status === "approved" && <Badge className="bg-emerald-600">{t("Approved", "معتمدة")}</Badge>}
                        {s.status === "reversed" && <Badge variant="destructive">{t("Reversed", "معكوسة")}</Badge>}
                        {s.status === "draft" && <Badge variant="outline">{t("Draft", "مسودة")}</Badge>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {s.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => onReverse(s.id)} className="gap-1">
                            <RotateCcw className="h-3 w-3" />{t("Reverse", "عكس")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============ 5. Unreconciled Transactions ============ */

export function UnreconciledPage() {
  const { t } = useI18n();
  const [bank, setBank] = useBank();
  const [txns] = useBankTxns();
  const rows = useMemo(() => txns.filter((t) => t.bankId === bank?.id && !t.settlementId && !t.reversed),
    [txns, bank]);
  const totalIn = rows.filter((r) => r.kind === "deposit").reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.kind === "payment").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={AlertTriangle} title={t("Unreconciled Transactions", "الحركات غير المُسوَّاة")}
        actions={<BankPicker value={bank?.id} onChange={setBank} />} />
      {bank && (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label={t("Open transactions", "حركات مفتوحة")} value={String(rows.length)} />
            <Stat label={t("Pending deposits", "إيداعات معلقة")} value={fmt(totalIn, bank.currency)} tone="up" />
            <Stat label={t("Pending payments", "مدفوعات معلقة")} value={fmt(totalOut, bank.currency)} tone="down" />
          </div>
          <TxnTable rows={rows} bank={bank} />
        </>
      )}
    </div>
  );
}
function TxnTable({ rows, bank }: { rows: BankTxn[]; bank: Bank }) {
  const { t } = useI18n();
  return (
    <Card><CardContent className="pt-5">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr><th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                <th className="px-3 py-2 text-start">{t("Kind", "النوع")}</th>
                <th className="px-3 py-2 text-start">{t("Narrative", "البيان")}</th>
                <th className="px-3 py-2 text-end">{t("Amount", "المبلغ")}</th></tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">{t("All clear ✓", "لا توجد حركات معلقة ✓")}</td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                  <td className="px-3 py-2">{r.kind === "deposit"
                    ? <Badge variant="secondary">{t("Deposit", "إيداع")}</Badge>
                    : <Badge variant="outline">{t("Payment", "دفع")}</Badge>}</td>
                  <td className="px-3 py-2">{r.narrative}</td>
                  <td className="px-3 py-2 text-end font-mono">{fmt(r.amount, bank.currency)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}

/* ============ 6. Statement Import ============ */

export function StatementImportPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [bank, setBank] = useBank();
  const [statements] = useBankStatements();
  const [txns] = useBankTxns();
  const [raw, setRaw] = useState("");

  const lines = useMemo(() => statements.filter((s) => s.bankId === bank?.id).sort((a, b) => b.date.localeCompare(a.date)), [statements, bank]);

  const doImport = () => {
    if (!bank || !raw.trim()) return;
    const parsed: Omit<Parameters<typeof importStatementLines>[1][number], never>[] = [];
    for (const line of raw.split("\n")) {
      const cells = line.split(/[,\t;]/).map((c) => c.trim());
      if (cells.length < 4) continue;
      const [date, ref, description, debitStr, creditStr] = [cells[0], cells[1], cells[2], cells[3], cells[4] || "0"];
      const debit = parseFloat(debitStr) || 0;
      const credit = parseFloat(creditStr) || 0;
      if (!date) continue;
      parsed.push({ date, ref, description, debit, credit });
    }
    if (parsed.length === 0) { alert(t("No valid rows parsed", "لم يتم استخراج صفوف صالحة")); return; }
    importStatementLines(bank.id, parsed, user?.username);
    setRaw("");
  };

  const candidates = (line: typeof lines[number]) =>
    txns.filter((t) =>
      t.bankId === bank?.id &&
      ((line.credit > 0 && t.kind === "deposit" && Math.abs(t.amount - line.credit) < 0.01) ||
       (line.debit > 0 && t.kind === "payment" && Math.abs(t.amount - line.debit) < 0.01)));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={FileUp} title={t("Bank Statement Import", "استيراد كشف البنك")}
        actions={<BankPicker value={bank?.id} onChange={setBank} />} />

      {bank && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("Paste statement (CSV)", "ألصق الكشف (CSV)")}</CardTitle>
              <CardDescription className="font-mono text-xs">
                date,ref,description,debit,credit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)}
                        placeholder="2026-06-01,REF-1,Customer deposit,0,1500" />
              <div className="flex justify-end"><Button onClick={doImport} className="gap-1.5"><FileUp className="h-4 w-4" />{t("Import", "استيراد")}</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{lines.length} {t("imported lines", "سطر مستورد")}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                      <th className="px-3 py-2 text-start">{t("Ref", "المرجع")}</th>
                      <th className="px-3 py-2 text-start">{t("Description", "الوصف")}</th>
                      <th className="px-3 py-2 text-end">{t("Debit", "مدين")}</th>
                      <th className="px-3 py-2 text-end">{t("Credit", "دائن")}</th>
                      <th className="px-3 py-2 text-start">{t("Match", "مطابقة")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{t("No lines imported", "لا توجد أسطر")}</td></tr>
                    ) : lines.map((l) => {
                      const cands = candidates(l);
                      const matched = txns.find((t) => t.id === l.matchedTxnId);
                      return (
                        <tr key={l.id} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{l.date}</td>
                          <td className="px-3 py-2 font-mono text-xs">{l.ref}</td>
                          <td className="px-3 py-2">{l.description}</td>
                          <td className="px-3 py-2 text-end font-mono">{l.debit ? fmt(l.debit, bank.currency) : "—"}</td>
                          <td className="px-3 py-2 text-end font-mono">{l.credit ? fmt(l.credit, bank.currency) : "—"}</td>
                          <td className="px-3 py-2">
                            <Select value={matched?.id || ""} onValueChange={(v) => matchStatementLine(l.id, v || undefined)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("Pick txn…", "اختر…")} /></SelectTrigger>
                              <SelectContent>
                                {cands.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">{t("No candidates", "لا يوجد مرشحون")}</div>}
                                {cands.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.ref} · {fmt(c.amount, bank.currency)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ============ 7. Approval Workflow & Audit ============ */

export function ApprovalWorkflowPage() {
  const { t, lang } = useI18n();
  const [activity] = useBankActivity();
  const [settlements] = useSettlements();
  const [banks] = useBanks();
  const drafts = settlements.filter((s) => s.status === "draft");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader icon={Link2} title={t("Reconciliation Approval & Audit", "اعتماد التسوية والتدقيق")}
        subtitle={t("Pending approvals plus full append-only activity log.",
                    "الاعتمادات المعلقة وسجل النشاط الكامل (غير قابل للحذف).")} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Pending approvals", "الاعتمادات المعلقة")}</CardTitle></CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No pending approvals.", "لا توجد اعتمادات معلقة.")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {drafts.map((s) => {
                const b = banks.find((x) => x.id === s.bankId);
                return <li key={s.id}>{s.ref} — {b?.code} — {fmt(s.difference)}</li>;
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Activity log", "سجل النشاط")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-start">{t("When", "متى")}</th>
                  <th className="px-3 py-2 text-start">{t("User", "المستخدم")}</th>
                  <th className="px-3 py-2 text-start">{t("Action", "الإجراء")}</th>
                  <th className="px-3 py-2 text-start">{t("Details", "التفاصيل")}</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">{t("No activity yet", "لا يوجد نشاط")}</td></tr>
                ) : activity.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</td>
                    <td className="px-3 py-2">{a.user}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="font-mono text-xs">{a.action}</Badge></td>
                    <td className="px-3 py-2">{a.details}</td>
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
