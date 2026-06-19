// CaseLifecycle — visualizes the 8-stage pipeline + role-aware transition buttons.
import { Check, Circle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CASE_STAGES, allowedTransitions, applyTransition, canTransition, isTerminal, stageIndex,
} from "@/lib/case-machine";
import { STATUS_LABEL_AR, statusColor, type PatientCase } from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";

type Totals = { total: number; paid: number; remaining: number };

export function CaseLifecycle({
  c, totals, onChange, onLog,
}: {
  c: PatientCase;
  totals: Totals;
  onChange: (next: PatientCase) => void;
  onLog?: (action: string, from?: string, to?: string) => void;
}) {
  const { role } = useAuth();
  const ctx = { case: c, totals };
  const transitions = allowedTransitions(ctx, role);
  const idx = stageIndex(c.status);
  const cancelled = c.status === "cancelled";

  const trigger = (to: PatientCase["status"]) => {
    const v = canTransition(ctx, to, role);
    if (!v.ok) { toast.error(v.reason || "غير مسموح"); return; }
    const next = applyTransition(c, to);
    onChange(next);
    onLog?.(`نقل حالة → ${STATUS_LABEL_AR[to]}`, STATUS_LABEL_AR[c.status], STATUS_LABEL_AR[to]);
    toast.success(`الحالة الآن: ${STATUS_LABEL_AR[to]}`);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium">دورة حياة الحالة</div>
          <Badge className={statusColor(c.status)}>{STATUS_LABEL_AR[c.status]}</Badge>
        </div>

        {/* Pipeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {CASE_STAGES.map((s, i) => {
            const reached = !cancelled && idx >= i;
            const current = !cancelled && idx === i;
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div
                  className={[
                    "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs whitespace-nowrap",
                    current ? "border-primary bg-primary/10 text-primary font-medium" :
                    reached ? "border-success/40 bg-success/10 text-success" :
                              "border-border bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {reached && !current ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  {STATUS_LABEL_AR[s]}
                </div>
                {i < CASE_STAGES.length - 1 && (
                  <div className={`h-px w-4 ${reached && idx > i ? "bg-success/50" : "bg-border"}`} />
                )}
              </div>
            );
          })}
          {cancelled && (
            <div className="ms-2 flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-2 py-1 text-xs">
              <X className="h-3 w-3" /> ملغاة
            </div>
          )}
        </div>

        {/* Transitions */}
        {!isTerminal(c.status) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {transitions.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                لا توجد إجراءات متاحة لدورك الحالي على هذه المرحلة.
              </div>
            ) : transitions.map((tr) => (
              <Button
                key={tr.to}
                size="sm"
                variant={tr.to === "cancelled" ? "destructive" : "default"}
                onClick={() => trigger(tr.to)}
              >
                {tr.label_ar}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
