import { useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, LayoutGrid, Search, Bell, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function MobileBottomNav() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!user) return null;

  const items = [
    { key: "home", icon: Home, label: t("Home", "الرئيسية"), to: "/" },
    { key: "modules", icon: LayoutGrid, label: t("Apps", "التطبيقات"), to: "/apps" },
    { key: "search", icon: Search, label: t("Search", "بحث"), to: "/apps" },
    { key: "alerts", icon: Bell, label: t("Alerts", "تنبيهات"), to: "/alerts", badge: 3 },
    { key: "me", icon: User, label: t("Me", "حسابي"), to: "/me" },
  ];

  const isActive = (to: string) =>
    to === "/" ? path === "/" : path.startsWith(to);


  return (
    <nav
      className="xl:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(it.to);
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => navigate({ to: it.to })}
                className="w-full flex flex-col items-center justify-center gap-1 py-2.5 active:scale-95 transition-transform"
              >
                <div
                  className={`relative flex items-center justify-center h-9 w-9 rounded-2xl transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <it.icon className="h-5 w-5" strokeWidth={2.2} />
                  {it.badge ? (
                    <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-4 text-center font-bold ring-2 ring-card">
                      {it.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {it.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
