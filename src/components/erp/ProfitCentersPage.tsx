import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCostCenters, useJournal, costCenterTotals, fmtSAR } from "@/lib/erp-store";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function ProfitCentersPage() {
  const { t, lang } = useI18n();
  const [centers] = useCostCenters();
  const [entries] = useJournal();

  const data = useMemo(() => centers
    .map((c) => ({ ...c, ...costCenterTotals(c.id, entries), label: lang === "ar" ? c.name_ar : c.name_en }))
    .filter((d) => d.revenue > 0 || d.cost > 0), [centers, entries, lang]);

  const totals = data.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue, cost: acc.cost + d.cost, profit: acc.profit + d.profit,
  }), { revenue: 0, cost: 0, profit: 0 });
  const margin = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-success/15 text-success flex items-center justify-center"><TrendingUp className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Profit Centers", "مراكز الربحية")}</h1>
          <p className="text-sm text-muted-foreground">{t("Revenue, cost and profit per clinic", "الإيرادات والتكاليف والأرباح لكل عيادة")}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("Total Revenue", "إجمالي الإيراد")} value={fmtSAR(totals.revenue)} tone="primary" />
        <StatCard label={t("Total Cost", "إجمالي التكلفة")} value={fmtSAR(totals.cost)} tone="warning" />
        <StatCard label={t("Total Profit", "إجمالي الربح")} value={fmtSAR(totals.profit)} tone={totals.profit >= 0 ? "success" : "destructive"} />
        <StatCard label={t("Margin", "هامش الربح")} value={`${margin.toFixed(1)}%`} tone="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Revenue vs Cost", "الإيراد مقابل التكلفة")}</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmtSAR(v)} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1, 200 80% 50%))" name={t("Revenue", "الإيراد") as string} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill="hsl(var(--chart-2, 25 90% 55%))" name={t("Cost", "التكلفة") as string} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Profit by Center", "الربح حسب المركز")}</CardTitle><CardDescription>{t("Green = profit, red = loss", "أخضر = ربح، أحمر = خسارة")}</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{t("Center", "المركز")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Revenue", "الإيراد")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Cost", "التكلفة")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Profit", "الربح")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Margin", "الهامش")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => {
                  const rowCls = d.margin > 40 ? "bg-success/5" : d.margin >= 20 ? "bg-warning/5" : "bg-destructive/5";
                  return (
                    <tr key={d.id} className={`border-t ${rowCls}`}>
                      <td className="px-3 py-2 font-medium">{d.label}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d.revenue)}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d.cost)}</td>
                      <td className={`px-3 py-2 text-end font-semibold ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(d.profit)}</td>
                      <td className="px-3 py-2 text-end">{d.margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2">{t("Total", "الإجمالي")}</td>
                  <td className="px-3 py-2 text-end">{fmtSAR(totals.revenue)}</td>
                  <td className="px-3 py-2 text-end">{fmtSAR(totals.cost)}</td>
                  <td className={`px-3 py-2 text-end ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(totals.profit)}</td>
                  <td className="px-3 py-2 text-end">{margin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" | "destructive" }) {
  const toneCls = { primary: "text-primary", success: "text-success", warning: "text-warning-foreground", destructive: "text-destructive" }[tone];
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-2 text-2xl font-semibold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
