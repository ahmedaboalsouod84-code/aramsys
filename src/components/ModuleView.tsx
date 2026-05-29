import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findModule } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";

export function ModuleView({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const m = findModule(slug);

  if (!m) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">{t("Module not found", "الوحدة غير موجودة")}</h1>
        <Link to="/" className="text-sm text-primary underline mt-2 inline-block">
          {t("Back to dashboard", "العودة للوحة التحكم")}
        </Link>
      </div>
    );
  }

  const title = lang === "ar" ? m.ar : m.en;
  const desc = lang === "ar" ? m.desc_ar : m.desc_en;
  const Icon = m.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> {t("Home", "الرئيسية")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="text-foreground font-medium">{title}</span>
      </nav>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant="secondary">{m.items.length} {t("screens", "شاشة")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {m.items.map((it) => {
          const itTitle = lang === "ar" ? it.ar : it.en;
          return (
            <Link key={it.slug} to={`/m/${m.slug}/${it.slug}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors rtl:rotate-180" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-sm">{itTitle}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {t("Open screen", "افتح الشاشة")}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t(
          "This is a UI shell. Screens are placeholders ready to be wired to your backend.",
          "هذه واجهة عرض فقط. الشاشات تجريبية جاهزة للربط مع الخادم لاحقًا."
        )}
      </div>
    </div>
  );
}

export function SubPageView({ moduleSlug, subSlug }: { moduleSlug: string; subSlug: string }) {
  const { t, lang } = useI18n();
  const m = findModule(moduleSlug);
  const sub = m?.items.find((i) => i.slug === subSlug);

  if (!m || !sub) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">{t("Page not found", "الصفحة غير موجودة")}</h1>
      </div>
    );
  }

  const modTitle = lang === "ar" ? m.ar : m.en;
  const subTitle = lang === "ar" ? sub.ar : sub.en;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> {t("Home", "الرئيسية")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link to={`/m/${m.slug}`} className="hover:text-foreground">{modTitle}</Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="text-foreground font-medium">{subTitle}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{subTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(`Part of ${modTitle}`, `ضمن ${modTitle}`)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">{t("Export", "تصدير")}</Button>
          <Button size="sm">{t("New record", "سجل جديد")}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Records", "السجلات")}</CardTitle>
          <CardDescription>
            {t("Demo table — connect a backend to load real data.", "جدول تجريبي — اربط الخادم لعرض البيانات الحقيقية.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start font-medium px-3 py-2">#</th>
                  <th className="text-start font-medium px-3 py-2">{t("Reference", "المرجع")}</th>
                  <th className="text-start font-medium px-3 py-2">{t("Name", "الاسم")}</th>
                  <th className="text-start font-medium px-3 py-2">{t("Date", "التاريخ")}</th>
                  <th className="text-start font-medium px-3 py-2">{t("Status", "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs">{m.slug.toUpperCase()}-{1000 + i}</td>
                    <td className="px-3 py-2">{subTitle} #{i + 1}</td>
                    <td className="px-3 py-2 text-muted-foreground">2026-05-{(10 + i).toString().padStart(2, "0")}</td>
                    <td className="px-3 py-2">
                      <Badge variant={i % 3 === 0 ? "default" : i % 3 === 1 ? "secondary" : "outline"}>
                        {i % 3 === 0 ? t("Active", "نشط") : i % 3 === 1 ? t("Pending", "قيد الانتظار") : t("Closed", "مغلق")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
