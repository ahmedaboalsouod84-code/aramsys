import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, LayoutGrid, Search, Bell, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileBottomNav() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!user) return null;

  const isActive = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  const items = [
    { key: "home", to: "/", icon: Home, label: t("Home", "الرئيسية"), onClick: () => navigate({ to: "/" }) },
    { key: "modules", icon: LayoutGrid, label: t("Modules", "الوحدات"), onClick: () => setOpenMobile(true), active: false },
    { key: "search", icon: Search, label: t("Search", "بحث"), onClick: () => {} },
    { key: "alerts", icon: Bell, label: t("Alerts", "التنبيهات"), onClick: () => {}, badge: 3 },
    { key: "me", to: "/login", icon: User, label: t("Me", "حسابي") },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const ActiveCls = (it.to && isActive(it.to)) || it.active
            ? "text-primary"
            : "text-muted-foreground";
          const Inner = (
            <div className={`flex flex-col items-center justify-center gap-0.5 py-2 ${ActiveCls}`}>
              <div className="relative">
                <it.icon className="h-5 w-5" />
                {it.badge ? (
                  <span className="absolute -top-1.5 -end-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-4 text-center">
                    {it.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{it.label}</span>
            </div>
          );
          return (
            <li key={it.key}>
              {it.to ? (
                <Link to={it.to} className="block active:scale-95 transition-transform">
                  {Inner}
                </Link>
              ) : (
                <button type="button" onClick={it.onClick} className="w-full active:scale-95 transition-transform">
                  {Inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
