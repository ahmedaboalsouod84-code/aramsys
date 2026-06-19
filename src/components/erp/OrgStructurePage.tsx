// Organizational Structure — positions, cost centers (rooms/building), profit centers.
// Source: client-supplied workbook "كشف بالهيكل الوظيفي ومراكز التكلفة والربحية".
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, TrendingUp, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Position = { no: number; level_ar: string; title_ar: string; desc_ar?: string };
type Room = { no: number; group_ar: string; name_ar: string };
type ProfitCenter = { code: string; name_ar: string; services_ar: string };

const POSITIONS: Position[] = [
  { no: 1,  level_ar: "الإدارة العليا",            title_ar: "المالك" },
  { no: 2,  level_ar: "الإدارة العليا",            title_ar: "مجلس الإدارة" },
  { no: 3,  level_ar: "الإدارة العليا",            title_ar: "مدير المركز الطبي" },
  { no: 4,  level_ar: "الإدارة المتوسطة",          title_ar: "رئيس الحسابات" },
  { no: 5,  level_ar: "الإدارة المتوسطة",          title_ar: "مدير التشغيل" },
  { no: 6,  level_ar: "المالية والإدارية",         title_ar: "مسؤول شؤون إدارية" },
  { no: 7,  level_ar: "المالية والإدارية",         title_ar: "مسؤول IT" },
  { no: 8,  level_ar: "المالية والإدارية",         title_ar: "مسؤول تسويق" },
  { no: 9,  level_ar: "المالية والإدارية",         title_ar: "مسؤول موارد بشرية" },
  { no: 10, level_ar: "المالية والإدارية",         title_ar: "مسؤول مشتريات" },
  { no: 11, level_ar: "المالية والإدارية",         title_ar: "محاسب" },
  { no: 12, level_ar: "المالية والإدارية",         title_ar: "موظف الاستقبال" },
  { no: 13, level_ar: "العمالة المساندة والخدمات", title_ar: "مساعد مشتريات" },
  { no: 14, level_ar: "العمالة المساندة والخدمات", title_ar: "أمين مخزن" },
  { no: 15, level_ar: "العمالة المساندة والخدمات", title_ar: "حارس أمن" },
  { no: 16, level_ar: "العمالة المساندة والخدمات", title_ar: "عامل بوفيه" },
  { no: 17, level_ar: "العمالة المساندة والخدمات", title_ar: "عامل نظافة" },
  { no: 18, level_ar: "العمالة المساندة والخدمات", title_ar: "تمريض" },
];

const ROOMS: Room[] = [
  { no: 19, group_ar: "مراكز التكلفة للمبنى", name_ar: "المركز الطبي" },
  { no: 20, group_ar: "مراكز التكلفة للغرف", name_ar: "العيادات" },
  { no: 21, group_ar: "مراكز التكلفة للغرف", name_ar: "الأشعة" },
  { no: 22, group_ar: "مراكز التكلفة للغرف", name_ar: "التعقيم" },
  { no: 23, group_ar: "مراكز التكلفة للغرف", name_ar: "الاستقبال" },
  { no: 24, group_ar: "مراكز التكلفة للغرف", name_ar: "الحسابات" },
  { no: 25, group_ar: "مراكز التكلفة للغرف", name_ar: "الموارد البشرية" },
  { no: 26, group_ar: "مراكز التكلفة للغرف", name_ar: "التسويق" },
  { no: 27, group_ar: "مراكز التكلفة للغرف", name_ar: "المخازن" },
  { no: 28, group_ar: "مراكز التكلفة للغرف", name_ar: "تقنية المعلومات" },
  { no: 29, group_ar: "مراكز التكلفة للغرف", name_ar: "الإدارة العامة" },
];

const PROFIT_CENTERS: ProfitCenter[] = [
  { code: "PR-01", name_ar: "الكشف والتشخيص",      services_ar: "الكشوف والاستشارات" },
  { code: "PR-02", name_ar: "العلاج التحفظي",      services_ar: "الحشوات وعلاج العصب" },
  { code: "PR-03", name_ar: "جراحة الفم والأسنان", services_ar: "الخلع والجراحات" },
  { code: "PR-04", name_ar: "التركيبات الثابتة",   services_ar: "التيجان والجسور" },
  { code: "PR-05", name_ar: "التركيبات المتحركة",  services_ar: "الأطقم" },
  { code: "PR-06", name_ar: "زراعة الأسنان",       services_ar: "الزرعات والتركيبات عليها" },
  { code: "PR-07", name_ar: "تقويم الأسنان",       services_ar: "جميع خدمات التقويم" },
  { code: "PR-08", name_ar: "تجميل الأسنان",       services_ar: "التبييض والابتسامة التجميلية" },
  { code: "PR-09", name_ar: "الأشعة",              services_ar: "أشعة الأسنان" },
  { code: "PR-10", name_ar: "المعمل الداخلي",      services_ar: "تصنيع التركيبات" },
  { code: "PR-11", name_ar: "بيع المنتجات",        services_ar: "منتجات العناية بالأسنان" },
];

const LEVEL_COLORS: Record<string, string> = {
  "الإدارة العليا":            "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "الإدارة المتوسطة":          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "المالية والإدارية":         "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "العمالة المساندة والخدمات": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function OrgStructurePage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  const positionsByLevel = useMemo(() => {
    const filtered = q
      ? POSITIONS.filter(p => p.title_ar.includes(q) || p.level_ar.includes(q))
      : POSITIONS;
    const map = new Map<string, Position[]>();
    for (const p of filtered) {
      if (!map.has(p.level_ar)) map.set(p.level_ar, []);
      map.get(p.level_ar)!.push(p);
    }
    return Array.from(map.entries());
  }, [q]);

  const roomsByGroup = useMemo(() => {
    const filtered = q ? ROOMS.filter(r => r.name_ar.includes(q)) : ROOMS;
    const map = new Map<string, Room[]>();
    for (const r of filtered) {
      if (!map.has(r.group_ar)) map.set(r.group_ar, []);
      map.get(r.group_ar)!.push(r);
    }
    return Array.from(map.entries());
  }, [q]);

  const profitCenters = useMemo(
    () => q ? PROFIT_CENTERS.filter(p => p.name_ar.includes(q) || p.services_ar.includes(q) || p.code.includes(q)) : PROFIT_CENTERS,
    [q],
  );

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Organizational Structure", "الهيكل الوظيفي ومراكز التكلفة والربحية")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Positions, cost centers and profit centers of the medical center.", "الوظائف ومراكز التكلفة والربحية في المركز الطبي.")}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Search…", "بحث…")} className="ps-8 w-64" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={<Users className="h-5 w-5" />} label={t("Positions", "الوظائف")} value={POSITIONS.length} tone="primary" />
        <KpiCard icon={<Building2 className="h-5 w-5" />} label={t("Cost Centers", "مراكز التكلفة")} value={ROOMS.length} tone="warning" />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label={t("Profit Centers", "المراكز الربحية")} value={PROFIT_CENTERS.length} tone="success" />
      </div>

      {/* Org structure by level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> {t("Organizational Levels", "المستويات الوظيفية")}</CardTitle>
          <CardDescription>{t("Hierarchy grouped by administrative level.", "الترتيب الإداري حسب المستوى.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {positionsByLevel.map(([level, items]) => (
            <div key={level}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={LEVEL_COLORS[level] || ""}>{level}</Badge>
                <span className="text-xs text-muted-foreground">{items.length} {t("positions", "وظيفة")}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(p => (
                  <div key={p.no} className="rounded-lg border border-border bg-card px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {p.no}
                      </div>
                      <span className="text-sm font-medium">{p.title_ar}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cost centers (rooms / building) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> {t("Cost Centers", "مراكز التكلفة")}</CardTitle>
          <CardDescription>{t("Building and room-level cost centers.", "مراكز تكلفة المبنى والغرف.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {roomsByGroup.map(([group, items]) => (
            <div key={group}>
              <div className="text-sm font-semibold mb-2 text-muted-foreground">{group}</div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.map(r => (
                  <div key={r.no} className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{r.name_ar}</span>
                    <Badge variant="outline">{r.no}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Profit centers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t("Profit Centers", "المراكز الربحية")}</CardTitle>
          <CardDescription>{t("Revenue-generating service lines in the medical center.", "خطوط الخدمات المدرّة للإيراد.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Code", "الكود")}</TableHead>
                <TableHead>{t("Profit Center", "المركز الربحي")}</TableHead>
                <TableHead>{t("Services", "الخدمات")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitCenters.map(p => (
                <TableRow key={p.code}>
                  <TableCell><Badge variant="secondary" className="font-mono">{p.code}</Badge></TableCell>
                  <TableCell className="font-medium">{p.name_ar}</TableCell>
                  <TableCell className="text-muted-foreground">{p.services_ar}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary"|"warning"|"success" }) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
