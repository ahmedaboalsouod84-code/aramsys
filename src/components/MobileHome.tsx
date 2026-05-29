import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";
import logoMark from "@/assets/logo-mark.png";

export function MobileHome() {
  const { t, lang, setLang } = useI18n();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const visibleModules = role ? MODULES.filter((m) => canAccessModule(role, m.slug)) : MODULES;
  const canSeeStats = role === "admin" || role === "accountant";

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("Good morning", "صباح الخير");
    if (h < 18) return t("Good afternoon", "مساء الخير");
    return t("Good evening", "مساء الخير");
  })();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-sidebar to-sidebar/90 text-sidebar-foreground">
      {/* App status header */}
      <div
        className="px-5 pt-3 pb-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center">
              <img src={logoMark} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
                {greeting}
              </div>
              <div className="text-sm font-semibold">
                {user ? (lang === "ar" ? user.name_ar : user.name_en) : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
            >
              <span className="text-xs font-bold">{lang === "en" ? "AR" : "EN"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
          </div>
        </div>

        {/* Stats card for admin/accountant */}
        {canSeeStats && (
          <div className="mt-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              {t("Today's revenue", "إيرادات اليوم")}
            </div>
            <div className="mt-1 text-3xl font-bold text-primary">SAR 42,180</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-semibold">128</div>
                <div className="text-[10px] text-sidebar-foreground/60">{t("Patients", "مرضى")}</div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-lg font-semibold">14/18</div>
                <div className="text-[10px] text-sidebar-foreground/60">{t("Chairs", "كراسي")}</div>
              </div>
              <div>
                <div className="text-lg font-semibold">9</div>
                <div className="text-[10px] text-sidebar-foreground/60">{t("Dentists", "أطباء")}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apps grid container */}
      <div className="bg-background rounded-t-3xl px-4 pt-5 pb-32 min-h-[60vh]">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-bold text-foreground">{t("All Apps", "كل التطبيقات")}</h2>
          <span className="text-xs text-muted-foreground">
            {visibleModules.length} {t("modules", "وحدة")}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-x-2 gap-y-5">
          {visibleModules.map((m) => {
            const title = lang === "ar" ? m.ar : m.en;
            return (
              <Link
                key={m.slug}
                to={`/m/${m.slug}`}
                className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                  <m.icon className="h-7 w-7" strokeWidth={2} />
                </div>
                <span className="text-[10.5px] font-medium text-center text-foreground leading-tight line-clamp-2 px-0.5">
                  {title}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Account section */}
        {user && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold uppercase">
                {user.username.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {lang === "ar" ? user.name_ar : user.name_en}
              </div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {user.role}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
