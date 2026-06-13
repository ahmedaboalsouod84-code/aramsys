import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAccounts, useCostCenters, useRules, fmtSAR } from "@/lib/erp-store";
import { Split, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function CostDistributionPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [centers] = useCostCenters();
  const [rules, setRules] = useRules();

  const updatePercent = (ruleId: string, ccId: string, p: number) => {
    setRules(rules.map((r) => r.id === ruleId
      ? { ...r, allocations: r.allocations.map((a) => a.costCenterId === ccId ? { ...a, percent: p } : a) }
      : r));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Split className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Cost Distribution Rules", "قواعد توزيع التكاليف")}</h1>
          <p className="text-sm text-muted-foreground">{t("Allocate indirect costs across cost centers", "توزيع التكاليف غير المباشرة على مراكز التكلفة")}</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const total = rule.allocations.reduce((s, a) => s + a.percent, 0);
          const valid = Math.abs(total - 100) < 0.01;
          const acc = accounts.find((a) => a.code === rule.accountCode);
          return (
            <Card key={rule.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <CardDescription>{acc?.code} · {lang === "ar" ? acc?.name_ar : acc?.name_en}</CardDescription>
                  </div>
                  <Badge variant={valid ? "default" : "destructive"} className={valid ? "bg-success text-success-foreground" : ""}>
                    {valid ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                    {total.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize">{t("Method", "الطريقة")}: {rule.method}</div>
                {rule.allocations.map((a) => {
                  const cc = centers.find((c) => c.id === a.costCenterId);
                  return (
                    <div key={a.costCenterId} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7 text-sm">{cc ? (lang === "ar" ? cc.name_ar : cc.name_en) : a.costCenterId}</div>
                      <Input
                        type="number" min={0} max={100} step={0.1}
                        className="col-span-4 h-9 text-end font-mono"
                        value={a.percent}
                        onChange={(e) => updatePercent(rule.id, a.costCenterId, parseFloat(e.target.value) || 0)}
                      />
                      <div className="col-span-1 text-sm text-muted-foreground">%</div>
                    </div>
                  );
                })}
                <Button size="sm" variant="outline" className="w-full mt-2" disabled={!valid}
                  onClick={() => toast.success(t(`Rule "${rule.name}" applied`, `تم تطبيق القاعدة "${rule.name}"`))}>
                  {t("Apply Rule", "تطبيق القاعدة")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
