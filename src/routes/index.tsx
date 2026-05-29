import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Users, BedDouble, DollarSign, TrendingUp, Stethoscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Durrat Aram Dental Clinics" },
      { name: "description", content: "Hospital & ERP operations dashboard." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const visibleModules = role ? MODULES.filter((m) => canAccessModule(role, m.slug)) : MODULES;


  const stats = [
    { label: t("Today's Patients", "مرضى اليوم"), value: "128", delta: "+12%", icon: Users, tint: "bg-primary/15 text-primary" },
    { label: t("Dental Chairs", "كراسي الأسنان"), value: "14 / 18", delta: "78%", icon: BedDouble, tint: "bg-accent/30 text-accent-foreground" },
    { label: t("Today's Revenue", "إيرادات اليوم"), value: "SAR 42,180", delta: "+8.4%", icon: DollarSign, tint: "bg-success/15 text-success" },
    { label: t("Active Dentists", "الأطباء النشطون"), value: "9", delta: "+1", icon: Stethoscope, tint: "bg-warning/25 text-warning-foreground" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Clinic Dashboard", "لوحة تحكم العيادة")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Real-time overview across clinical and financial operations.", "نظرة لحظية على العمليات الإكلينيكية والمالية.")}
          </p>
        </div>

        <Badge variant="outline" className="gap-1.5">
          <Activity className="h-3 w-3 text-success" />
          {t("All systems operational", "جميع الأنظمة تعمل")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{s.value}</div>
                  <div className="mt-1 text-xs text-success inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {s.delta}
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("Modules", "الوحدات")}</h2>
          <span className="text-xs text-muted-foreground">{MODULES.length} {t("modules", "وحدة")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULES.map((m) => {
            const title = lang === "ar" ? m.ar : m.en;
            const desc = lang === "ar" ? m.desc_ar : m.desc_en;
            return (
              <Link key={m.slug} to={`/m/${m.slug}`}>
                <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <m.icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{m.items.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-sm">{title}</CardTitle>
                    <CardDescription className="text-xs mt-1 line-clamp-2">{desc}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
