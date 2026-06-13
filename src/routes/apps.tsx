import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { MODULES } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";

export const Route = createFileRoute("/apps")({
  component: AppsPage,
});

function AppsPage() {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const visible = role ? MODULES.filter((m) => canAccessModule(role, m.slug)) : MODULES;
  const filtered = q
    ? visible.filter((m) =>
        (lang === "ar" ? m.ar : m.en).toLowerCase().includes(q.toLowerCase()),
      )
    : visible;

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
        <h1 className="text-base font-semibold flex-1">{t("All Apps", "كل التطبيقات")}</h1>
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search apps…", "ابحث عن التطبيقات…")}
            className="ps-9 h-11 rounded-2xl"
          />
        </div>

        <div className="grid grid-cols-4 gap-x-2 gap-y-5">
          {filtered.map((m) => (
            <Link
              key={m.slug}
              to={`/m/${m.slug}`}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
            >
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                <m.icon className="h-7 w-7" strokeWidth={2} />
              </div>
              <span className="text-[10.5px] font-medium text-center leading-tight line-clamp-2 px-0.5">
                {lang === "ar" ? m.ar : m.en}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
