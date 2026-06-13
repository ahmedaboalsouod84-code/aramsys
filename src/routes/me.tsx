import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Languages, Moon, Sun, ShieldCheck, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/me")({
  component: MePage,
});

function MePage() {
  const { t, lang, setLang } = useI18n();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!user) return <Navigate to="/login" />;

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
        <h1 className="text-base font-semibold flex-1">{t("My Account", "حسابي")}</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-white/40">
            <AvatarFallback className="bg-white/15 text-primary-foreground font-bold text-lg uppercase">
              {user.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{lang === "ar" ? user.name_ar : user.name_en}</div>
            <div className="text-xs opacity-80 font-mono mt-0.5">@{user.username}</div>
            <Badge variant="secondary" className="mt-2 uppercase text-[10px]">{role}</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted"
          >
            <Languages className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-start text-sm font-medium">{t("Language", "اللغة")}</span>
            <span className="text-xs text-muted-foreground">{lang === "en" ? "English" : "العربية"}</span>
          </button>
          <button
            onClick={() => setDark((d) => !d)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted"
          >
            {dark ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            <span className="flex-1 text-start text-sm font-medium">{t("Theme", "المظهر")}</span>
            <span className="text-xs text-muted-foreground">{dark ? t("Dark", "داكن") : t("Light", "فاتح")}</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-start text-sm font-medium">{t("Role", "الصلاحية")}</span>
            <span className="text-xs text-muted-foreground uppercase">{role}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-start text-sm font-medium">{t("Support", "الدعم")}</span>
            <a href="mailto:info@stepuphub.cloud" className="text-xs text-primary">info@stepuphub.cloud</a>
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full h-12 rounded-2xl gap-2"
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("Sign out", "تسجيل الخروج")}
        </Button>
      </div>
    </div>
  );
}
