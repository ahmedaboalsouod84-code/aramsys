import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCostCenters, useJournal, costCenterTotals, fmtSAR } from "@/lib/erp-store";
import { Building2 } from "lucide-react";

export function CostCentersPage() {
  const { t, lang } = useI18n();
  const [centers] = useCostCenters();
  const [entries] = useJournal();

  const data = useMemo(() => centers.map((c) => ({ center: c, ...costCenterTotals(c.id, entries) })), [centers, entries]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Building2 className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Cost Centers", "مراكز التكلفة")}</h1>
          <p className="text-sm text-muted-foreground">{t("Track direct & allocated costs per clinic / department", "تتبع التكاليف المباشرة والموزعة لكل عيادة / قسم")}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {data.map(({ center: c, revenue, cost, profit, margin }) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{lang === "ar" ? c.name_ar : c.name_en}</CardTitle>
                <Badge variant="outline">{c.code}</Badge>
              </div>
              <CardDescription className="capitalize">{c.type} · {c.area} m² · {c.headcount} staff</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label={t("Revenue", "الإيراد")} value={fmtSAR(revenue)} positive />
              <Row label={t("Cost", "التكلفة")} value={fmtSAR(cost)} />
              <Row label={t("Profit", "الربح")} value={fmtSAR(profit)} positive={profit >= 0} negative={profit < 0} bold />
              <Row label={t("Margin", "الهامش")} value={`${margin.toFixed(1)}%`} bold />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Summary Table", "جدول ملخص")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{t("Center", "المركز")}</th>
                  <th className="text-start px-3 py-2 font-medium">{t("Type", "النوع")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Area", "المساحة")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Staff", "العاملون")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Revenue", "الإيراد")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Cost", "التكلفة")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Profit", "الربح")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(({ center: c, revenue, cost, profit }) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{lang === "ar" ? c.name_ar : c.name_en}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{c.type}</td>
                    <td className="px-3 py-2 text-end">{c.area} m²</td>
                    <td className="px-3 py-2 text-end">{c.headcount}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(revenue)}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(cost)}</td>
                    <td className={`px-3 py-2 text-end font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(profit)}</td>
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

function Row({ label, value, positive, negative, bold }: { label: string; value: React.ReactNode; positive?: boolean; negative?: boolean; bold?: boolean }) {
  const cls = positive ? "text-success" : negative ? "text-destructive" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${cls} ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
