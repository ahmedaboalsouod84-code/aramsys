import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const items = [
    {
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/10",
      title: t("Low stock: Amoxicillin 500mg", "مخزون منخفض: أموكسيسيلين 500 ملج"),
      desc: t("Only 12 units left in main warehouse.", "تبقى 12 وحدة فقط في المستودع الرئيسي."),
      time: t("5 min ago", "قبل 5 دقائق"),
    },
    {
      icon: Info,
      tone: "text-primary bg-primary/10",
      title: t("New appointment booked", "حجز موعد جديد"),
      desc: t("Patient Sara Ali — Dr. Khalid 2:30 PM.", "المريضة سارة علي — د. خالد 2:30 م."),
      time: t("18 min ago", "قبل 18 دقيقة"),
    },
    {
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-500/10",
      title: t("Daily closing posted", "تم ترحيل الإقفال اليومي"),
      desc: t("Revenue 42,180 SAR — Journal entry #JE-2041.", "الإيراد 42,180 ر.س — قيد #JE-2041."),
      time: t("1 hr ago", "قبل ساعة"),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div
        className="sticky top-0 z-30 bg-card border-b border-border flex items-center gap-2 px-2 h-14"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted active:scale-90"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <h1 className="text-base font-semibold flex-1">{t("Alerts", "التنبيهات")}</h1>
        <Bell className="h-5 w-5 text-muted-foreground me-2" />
      </div>

      <div className="p-4 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-3 flex gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${it.tone}`}>
              <it.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{it.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{it.desc}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider">{it.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
