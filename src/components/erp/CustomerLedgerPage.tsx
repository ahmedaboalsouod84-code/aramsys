// Customer Ledger — per-patient (by National ID) financial statement.
// Aggregates all charges (case services), invoices, and payments per patient,
// computes running balance and aging. Mirrors SAP-style customer account view.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileDown, User } from "lucide-react";
import {
  usePatients, useCases, useInvoices, usePayments,
  fmtSAR, caseTotals, isVatExempt,
  type Patient,
} from "@/lib/journey-store";

type LedgerRow = {
  date: string;
  type: "charge" | "invoice" | "payment";
  ref: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

function buildLedger(patient: Patient, cases: ReturnType<typeof useCases>[0], invoices: ReturnType<typeof useInvoices>[0], payments: ReturnType<typeof usePayments>[0]) {
  const myCases = cases.filter(c => c.patientId === patient.id);
  const events: Omit<LedgerRow, "balance">[] = [];

  // Charges per case (services rendered → receivable)
  for (const c of myCases) {
    const t = caseTotals(c, invoices, payments, patient);
    if (t.total > 0) {
      events.push({
        date: c.openedAt,
        type: "charge",
        ref: c.caseNo,
        description: `حالة ${c.caseNo} — ${c.services.length} خدمة${isVatExempt(patient) ? " (مُعفى)" : ""}`,
        debit: t.total,
        credit: 0,
      });
    }
  }
  // Invoices issued (informational — does not double-debit; balance already from charge)
  // Skip invoices in debit/credit to avoid duplication; show in separate tab.

  // Payments received → credit
  for (const p of payments.filter(p => myCases.some(c => c.id === p.caseId))) {
    events.push({
      date: p.at,
      type: "payment",
      ref: p.ref,
      description: `سداد ${p.method.toUpperCase()}${p.reference ? ` — ${p.reference}` : ""}`,
      debit: 0,
      credit: p.amount,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  const rows: LedgerRow[] = events.map(e => {
    bal += e.debit - e.credit;
    return { ...e, balance: bal };
  });
  return { rows, balance: bal };
}

function aging(patient: Patient, cases: ReturnType<typeof useCases>[0], invoices: ReturnType<typeof useInvoices>[0], payments: ReturnType<typeof usePayments>[0]) {
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
  const now = Date.now();
  const myCases = cases.filter(c => c.patientId === patient.id);
  for (const c of myCases) {
    const t = caseTotals(c, invoices, payments, patient);
    if (t.remaining <= 0.005) continue;
    const days = Math.floor((now - new Date(c.openedAt).getTime()) / 86400000);
    if (days <= 30) buckets.current += t.remaining;
    else if (days <= 60) buckets.d30 += t.remaining;
    else if (days <= 90) buckets.d60 += t.remaining;
    else if (days <= 120) buckets.d90 += t.remaining;
    else buckets.d90p += t.remaining;
  }
  return buckets;
}

export function CustomerLedgerPage() {
  const [patients] = usePatients();
  const [cases] = useCases();
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summary = useMemo(() => patients.map(p => {
    const myCases = cases.filter(c => c.patientId === p.id);
    let charged = 0, paid = 0;
    for (const c of myCases) {
      const t = caseTotals(c, invoices, payments, p);
      charged += t.total;
      paid += t.paid;
    }
    return { patient: p, cases: myCases.length, charged, paid, balance: charged - paid };
  }), [patients, cases, invoices, payments]);

  const filtered = summary.filter(s => {
    if (!q.trim()) return true;
    const v = q.trim().toLowerCase();
    return s.patient.idNumber.includes(v) ||
      s.patient.name_ar.toLowerCase().includes(v) ||
      (s.patient.phone || "").includes(v);
  });

  const totals = filtered.reduce(
    (a, s) => ({ charged: a.charged + s.charged, paid: a.paid + s.paid, balance: a.balance + s.balance }),
    { charged: 0, paid: 0, balance: 0 },
  );

  const selected = selectedId ? patients.find(p => p.id === selectedId) : null;
  const ledger = selected ? buildLedger(selected, cases, invoices, payments) : null;
  const ag = selected ? aging(selected, cases, invoices, payments) : null;

  function exportCSV() {
    if (!selected || !ledger) return;
    const header = "Date,Type,Ref,Description,Debit,Credit,Balance\n";
    const body = ledger.rows.map(r =>
      [r.date.slice(0, 10), r.type, r.ref, `"${r.description.replace(/"/g, '""')}"`, r.debit, r.credit, r.balance].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${selected.idNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> كشف حساب العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="عدد العملاء" value={String(filtered.length)} />
            <SummaryCard label="إجمالي الحركات المدينة" value={fmtSAR(totals.charged)} tone="amber" />
            <SummaryCard label="إجمالي المسدد" value={fmtSAR(totals.paid)} tone="emerald" />
            <SummaryCard label="إجمالي الرصيد المستحق" value={fmtSAR(totals.balance)} tone={totals.balance > 0 ? "destructive" : "emerald"} />
          </div>

          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث برقم الهوية أو الاسم أو الجوال" className="ps-3 pe-9" />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-start">رقم الهوية</th>
                  <th className="px-3 py-2 text-start">الاسم</th>
                  <th className="px-3 py-2 text-start">الجوال</th>
                  <th className="px-3 py-2 text-end">حالات</th>
                  <th className="px-3 py-2 text-end">مدين</th>
                  <th className="px-3 py-2 text-end">دائن</th>
                  <th className="px-3 py-2 text-end">الرصيد</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.patient.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{s.patient.idNumber}</td>
                    <td className="px-3 py-2">{s.patient.name_ar}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.patient.phone}</td>
                    <td className="px-3 py-2 text-end">{s.cases}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(s.charged)}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(s.paid)}</td>
                    <td className={`px-3 py-2 text-end font-semibold ${s.balance > 0.005 ? "text-destructive" : "text-emerald-600"}`}>
                      {fmtSAR(s.balance)}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(s.patient.id)}>كشف</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">لا يوجد عملاء</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selected && ledger && ag && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>كشف حساب — {selected.name_ar}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {selected.idNumber} · {selected.phone} · {isVatExempt(selected) ? "مُعفى من الضريبة" : "خاضع للضريبة"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV}><FileDown className="h-4 w-4 me-1" /> تصدير CSV</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>إغلاق</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <SummaryCard label="حالي (0-30 يوم)" value={fmtSAR(ag.current)} />
              <SummaryCard label="31-60 يوم" value={fmtSAR(ag.d30)} tone="amber" />
              <SummaryCard label="61-90 يوم" value={fmtSAR(ag.d60)} tone="amber" />
              <SummaryCard label="91-120 يوم" value={fmtSAR(ag.d90)} tone="destructive" />
              <SummaryCard label="أكثر من 120 يوم" value={fmtSAR(ag.d90p)} tone="destructive" />
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-start">التاريخ</th>
                    <th className="px-3 py-2 text-start">النوع</th>
                    <th className="px-3 py-2 text-start">المرجع</th>
                    <th className="px-3 py-2 text-start">البيان</th>
                    <th className="px-3 py-2 text-end">مدين</th>
                    <th className="px-3 py-2 text-end">دائن</th>
                    <th className="px-3 py-2 text-end">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{r.date.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={
                          r.type === "charge" ? "border-amber-500/30 text-amber-700" :
                          r.type === "payment" ? "border-emerald-500/30 text-emerald-700" : ""
                        }>
                          {r.type === "charge" ? "مدين" : r.type === "payment" ? "دائن" : "فاتورة"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2 text-end">{r.debit ? fmtSAR(r.debit) : "—"}</td>
                      <td className="px-3 py-2 text-end">{r.credit ? fmtSAR(r.credit) : "—"}</td>
                      <td className={`px-3 py-2 text-end font-semibold ${r.balance > 0.005 ? "text-destructive" : "text-emerald-600"}`}>
                        {fmtSAR(r.balance)}
                      </td>
                    </tr>
                  ))}
                  {ledger.rows.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">لا توجد حركات</td></tr>
                  )}
                </tbody>
                {ledger.rows.length > 0 && (
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-end">الرصيد النهائي</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(ledger.rows.reduce((a, r) => a + r.debit, 0))}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(ledger.rows.reduce((a, r) => a + r.credit, 0))}</td>
                      <td className={`px-3 py-2 text-end ${ledger.balance > 0.005 ? "text-destructive" : "text-emerald-600"}`}>
                        {fmtSAR(ledger.balance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "amber" | "emerald" | "destructive" }) {
  const cls = tone === "amber" ? "text-amber-700 dark:text-amber-400"
    : tone === "emerald" ? "text-emerald-700 dark:text-emerald-400"
    : tone === "destructive" ? "text-destructive"
    : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
