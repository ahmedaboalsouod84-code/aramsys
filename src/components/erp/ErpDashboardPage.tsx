import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCostCenters, useJournal, useMedicines, costCenterTotals, fmtSAR } from "@/lib/erp-store";
import { Activity, Users, DollarSign, Pill, TrendingUp, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["#1e3c72", "#2a5298", "#667eea", "#48bb78", "#f59e0b"];

export function ErpDashboardPage() {
  const { t, lang } = useI18n();
  const [centers] = useCostCenters();
  const [entries] = useJournal();
  const [medicines] = useMedicines();

  const totals = useMemo(() => centers.reduce((acc, c) => {
    const r = costCenterTotals(c.id, entries);
    return { revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit };
  }, { revenue: 0, cost: 0, profit: 0 }), [centers, entries]);

  const revenueByCenter = useMemo(() => centers.map((c, i) => ({
    name: lang === "ar" ? c.name_ar : c.name_en,
    value: Math.max(0, costCenterTotals(c.id, entries).revenue),
    color: PIE_COLORS[i % PIE_COLORS.length],
  })).filter((d) => d.value > 0), [centers, entries, lang]);

  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const e of entries) {
      const day = e.date.slice(5);
      const rev = e.lines.filter((l) => l.accountCode.startsWith("4")).reduce((s, l) => s + l.credit - l.debit, 0);
      buckets.set(day, (buckets.get(day) || 0) + rev);
    }
    return Array.from(buckets.entries()).sort().map(([day, value]) => ({ day, value }));
  }, [entries]);

  const lowStock = medicines.filter((m) => m.stock < 100);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("ERP Dashboard", "لوحة تحكم النظام")}</h1>
        <p className="text-sm text-muted-foreground">{t("Operations, finance & inventory overview", "نظرة عامة على العمليات والمالية والمخزون")}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label={t("Today's Patients", "مرضى اليوم")} value="128" tint="bg-primary/15 text-primary" />
        <Stat icon={DollarSign} label={t("Total Revenue", "إجمالي الإيراد")} value={fmtSAR(totals.revenue)} tint="bg-success/15 text-success" />
        <Stat icon={TrendingUp} label={t("Net Profit", "صافي الربح")} value={fmtSAR(totals.profit)} tint="bg-accent/30 text-accent-foreground" />
        <Stat icon={Activity} label={t("Active Centers", "المراكز النشطة")} value={`${centers.length}`} tint="bg-warning/25 text-warning-foreground" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Daily Revenue", "الإيرادات اليومية")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtSAR(v)} />
                <Line type="monotone" dataKey="value" stroke="#1e3c72" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("Revenue by Center", "الإيراد حسب المركز")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueByCenter} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {revenueByCenter.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtSAR(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning-foreground" />{t("Low Stock Alerts", "تنبيهات نقص المخزون")}</CardTitle>
            <CardDescription>{t("Medicines below 100 units", "أدوية أقل من 100 وحدة")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((m) => (
                <div key={m.id} className="rounded-md border px-3 py-1.5 text-sm flex items-center gap-2 bg-warning/5">
                  <Pill className="h-3.5 w-3.5 text-warning-foreground" />
                  <span>{lang === "ar" ? m.name_ar : m.name_en}</span>
                  <span className="font-mono text-xs text-muted-foreground">{m.stock} {m.unit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}><Icon className="h-5 w-5" /></div>
      </div>
    </CardContent></Card>
  );
}
