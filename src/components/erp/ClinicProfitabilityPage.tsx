import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCostCenters, useJournal, costCenterTotals, fmtSAR } from "@/lib/erp-store";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function ClinicProfitabilityPage() {
  const { t, lang } = useI18n();
  const [centers] = useCostCenters();
  const [entries] = useJournal();

  const data = useMemo(() => centers
    .filter((c) => c.type === "clinic" || c.type === "department")
    .map((c) => ({ ...c, ...costCenterTotals(c.id, entries), label: lang === "ar" ? c.name_ar : c.name_en })),
    [centers, entries, lang]);

  const totals = data.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue,
    cost: acc.cost + d.cost,
    profit: acc.profit + d.profit,
  }), { revenue: 0, cost: 0, profit: 0 });
  const avgMargin = data.length ? data.reduce((s, d) => s + d.margin, 0) / data.length : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BarChart3 className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Clinic Profitability", "ربحية العيادات")}</h1>
          <p className="text-sm text-muted-foreground">{t("Revenue, costs and margins by clinic", "الإيرادات والتكاليف والهوامش حسب العيادة")}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t("Total Revenue", "إجمالي الإيراد")} value={fmtSAR(totals.revenue)} />
        <Stat label={t("Total Cost", "إجمالي التكلفة")} value={fmtSAR(totals.cost)} />
        <Stat label={t("Total Profit", "إجمالي الربح")} value={fmtSAR(totals.profit)} good={totals.profit >= 0} />
        <Stat label={t("Avg Margin", "متوسط الهامش")} value={`${avgMargin.toFixed(1)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Revenue vs Cost by Clinic", "الإيراد مقابل التكلفة")}</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmtSAR(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#1e3c72" name={t("Revenue", "الإيراد") as string} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="#f59e0b" name={t("Cost", "التكلفة") as string} radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#48bb78" name={t("Profit", "الربح") as string} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Detailed Profitability", "تفاصيل الربحية")}</CardTitle><CardDescription>{t("Green ≥ 40%, Amber 20–40%, Red < 20%", "أخضر ≥ 40%، أصفر 20–40%، أحمر < 20%")}</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{t("Clinic", "العيادة")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Revenue", "الإيراد")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Cost", "التكلفة")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Profit", "الربح")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Margin %", "الهامش %")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => {
                  const cls = d.margin >= 40 ? "bg-success/10" : d.margin >= 20 ? "bg-warning/10" : "bg-destructive/10";
                  return (
                    <tr key={d.id} className={`border-t ${cls}`}>
                      <td className="px-3 py-2 font-medium">{d.label}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d.revenue)}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d.cost)}</td>
                      <td className={`px-3 py-2 text-end font-semibold ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(d.profit)}</td>
                      <td className="px-3 py-2 text-end font-semibold">{d.margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted/50 font-semibold">
                  <td className="px-3 py-2">{t("Total", "الإجمالي")}</td>
                  <td className="px-3 py-2 text-end">{fmtSAR(totals.revenue)}</td>
                  <td className="px-3 py-2 text-end">{fmtSAR(totals.cost)}</td>
                  <td className={`px-3 py-2 text-end ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(totals.profit)}</td>
                  <td className="px-3 py-2 text-end">{avgMargin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${good === false ? "text-destructive" : good ? "text-success" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}
