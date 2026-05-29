import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { MODULES } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { MODULES } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";
import logoMark from "@/assets/logo-mark.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");
  const visibleModules = role ? MODULES.filter((m) => canAccessModule(role, m.slug)) : [];

  const collapsed = state === "collapsed";
  const { t, lang } = useI18n();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");

  return (
    <Sidebar collapsible="icon" side={lang === "ar" ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5 p-1">
            <img src={logoMark} alt="Durrat Aram" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {t("Durrat Aram", "درة أرام")}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {t("Dental Clinics", "عيادات الأسنان")}
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("Overview", "نظرة عامة")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === "/"} tooltip={t("Dashboard", "لوحة التحكم")}>
                  <Link to="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("Dashboard", "لوحة التحكم")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("Modules", "الوحدات")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MODULES.map((m) => {
                const path = `/m/${m.slug}`;
                const label = lang === "ar" ? m.ar : m.en;
                return (
                  <SidebarMenuItem key={m.slug}>
                    <SidebarMenuButton asChild isActive={isActive(path)} tooltip={label}>
                      <Link to={path}>
                        <m.icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 text-[11px] text-sidebar-foreground/60">
            {t("v1.0 · Demo build", "إصدار 1.0 · نسخة تجريبية")}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
