import { Bell, Search, Languages, Plus, Moon, Sun, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);


  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <SidebarTrigger />
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("Search patients, invoices, items…", "ابحث عن المرضى والفواتير والأصناف…")}
          className="ps-9 bg-background"
        />
      </div>
      <div className="ms-auto flex items-center gap-1">
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("New Order", "طلب جديد")}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === "en" ? "ar" : "en")} title="Language">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Language</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-0.5 -end-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">3</Badge>
        </Button>
        <Avatar className="h-8 w-8 ms-1">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">DR</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
