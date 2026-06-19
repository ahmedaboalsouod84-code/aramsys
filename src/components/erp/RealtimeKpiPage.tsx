// Realtime KPIs — single dashboard sourcing from journey, procurement, insurance and posting log.
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useInvoices, usePayments, useCases } from "@/lib/journey-store";
import { usePRs, usePOs, useGRs, useVIs, useCNs } from "@/lib/procurement-store";
import { useClaims, claimApproved } from "@/lib/insurance-store";
import { usePostingLog } from "@/lib/posting-rules";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" | "bad" }) {
  const tones = {
    good: "border-emerald-500/40 bg-emerald-500/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    bad:  "border-destructive/40 bg-destructive/5",
  } as const;
  return (
    <Card className={tone ? tones[tone] : undefined}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function RealtimeKpiPage() {
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [cases] = useCases();
  const [prs] = usePRs();
  const [pos] = usePOs();
  const [grs] = useGRs();
  const [vis] = useVIs();
  const [cns] = useCNs();
  const [claims] = useClaims();
  const log = usePostingLog();

  const today = new Date().toISOString().slice(0, 10);

  const k = useMemo(() => {
    const todayInv = invoices.filter((i) => i.createdAt?.slice(0, 10) === today);
    const todayPay = payments.filter((p) => p.at?.slice(0, 10) === today);
    const revenueToday = todayInv.reduce((a, i) => a + i.total, 0);
    const cashToday = todayPay.reduce((a, p) => a + p.amount, 0);

    const arOutstanding = invoices.reduce((a, i) => a + Math.max(0, i.total - i.paid), 0);
    const apOutstanding = vis
      .filter((v) => v.status === "approved" || v.status === "partial_credited")
      .reduce((a, v) => a + v.total, 0);

    const activeCases = cases.filter((c) =>
      c.status !== "closed" && c.status !== "cancelled" && c.status !== "fully_paid").length;

    const pendingPRs = prs.filter((p) => p.status === "submitted").length;
    const openPOs = pos.filter((p) => p.status === "approved" || p.status === "partial_received").length;
    const pendingGRs = grs.filter((g) => g.status === "posted" || g.status === "partial_invoiced").length;

    const insOutstanding = claims
      .filter((c) => c.status !== "settled" && c.status !== "rejected" && c.status !== "cancelled")
      .reduce((a, c) => a + claimApproved(c), 0);
    const insSettled = claims
      .filter((c) => c.status === "settled")
      .reduce((a, c) => a + (c.netReceived || claimApproved(c)), 0);

    const postingsToday = log.filter((l) => l.at.slice(0, 10) === today).length;
    const unbalanced = log.filter((l) => !l.balanced).length;

    return {
      revenueToday, cashToday, arOutstanding, apOutstanding, activeCases,
      pendingPRs, openPOs, pendingGRs, insOutstanding, insSettled,
      postingsToday, unbalanced, cnCount: cns.length,
    };
  }, [invoices, payments, cases, prs, pos, grs, vis, cns, claims, log, today]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> مؤشرات الأداء الحية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            لقطة لحظية لكامل الدورة: إيرادات، تحصيل، ذمم، مشتريات، تأمين، وقيود محاسبية.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> تحديث فوري</Badge>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">اليوم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="إيرادات اليوم" value={fmt(k.revenueToday)} tone="good" />
          <Kpi label="تحصيلات اليوم" value={fmt(k.cashToday)} tone="good" />
          <Kpi label="قيود محاسبية" value={String(k.postingsToday)} hint="عبر طبقة Posting Rules" />
          <Kpi label="قيود غير متوازنة" value={String(k.unbalanced)} tone={k.unbalanced ? "bad" : "good"} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">الإيرادات والمرضى</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="حالات نشطة" value={String(k.activeCases)} />
          <Kpi label="ذمم مرضى قائمة" value={fmt(k.arOutstanding)} tone={k.arOutstanding > 0 ? "warn" : undefined} />
          <Kpi label="ذمم تأمين قائمة" value={fmt(k.insOutstanding)} tone={k.insOutstanding > 0 ? "warn" : undefined} />
          <Kpi label="تأمين مُحصَّل" value={fmt(k.insSettled)} tone="good" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">المشتريات</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="PR بانتظار الاعتماد" value={String(k.pendingPRs)} tone={k.pendingPRs ? "warn" : undefined} />
          <Kpi label="PO مفتوحة" value={String(k.openPOs)} />
          <Kpi label="GR بانتظار الفوترة" value={String(k.pendingGRs)} tone={k.pendingGRs ? "warn" : undefined} />
          <Kpi label="ذمم موردين دائنة" value={fmt(k.apOutstanding)} tone={k.apOutstanding > 0 ? "warn" : undefined} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">سلامة الترحيل</h2>
        <Card>
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {k.unbalanced === 0
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <AlertTriangle className="h-5 w-5 text-destructive" />}
              <div className="text-sm">
                {k.unbalanced === 0
                  ? "جميع القيود المُسجَّلة عبر طبقة Posting Rules متوازنة."
                  : `يوجد ${k.unbalanced} قيداً غير متوازن — يجب المراجعة فوراً.`}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              آخر {Math.min(log.length, 500)} قيد محفوظ في سجل التدقيق.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
