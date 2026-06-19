// Org Structure store — positions, levels, cost centers, profit centers.
// Persisted to localStorage; supports full CRUD + bulk import.
import { useEffect, useState, useCallback } from "react";

const NS = "erp:";

export type OrgLevel = {
  id: string;
  name_ar: string;
  name_en?: string;
  order: number;
  color?: string; // tailwind class token
};

export type Position = {
  id: string;
  no: number;
  levelId: string;
  title_ar: string;
  title_en?: string;
  desc_ar?: string;
};

export type CostCenterRow = {
  id: string;
  no: number;
  group_ar: string;          // مراكز التكلفة للمبنى / للغرف
  name_ar: string;
  name_en?: string;
};

export type ProfitCenterRow = {
  id: string;
  code: string;              // PR-01
  name_ar: string;
  name_en?: string;
  services_ar: string;
};

/* ---------- Seed data (from client workbook) ---------- */

const SEED_LEVELS: OrgLevel[] = [
  { id: "L1", name_ar: "الإدارة العليا",            order: 1, color: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  { id: "L2", name_ar: "الإدارة المتوسطة",          order: 2, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { id: "L3", name_ar: "المالية والإدارية",         order: 3, color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { id: "L4", name_ar: "العمالة المساندة والخدمات", order: 4, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
];

const SEED_POSITIONS: Position[] = [
  { id: "P1",  no: 1,  levelId: "L1", title_ar: "المالك" },
  { id: "P2",  no: 2,  levelId: "L1", title_ar: "مجلس الإدارة" },
  { id: "P3",  no: 3,  levelId: "L1", title_ar: "مدير المركز الطبي" },
  { id: "P4",  no: 4,  levelId: "L2", title_ar: "رئيس الحسابات" },
  { id: "P5",  no: 5,  levelId: "L2", title_ar: "مدير التشغيل" },
  { id: "P6",  no: 6,  levelId: "L3", title_ar: "مسؤول شؤون إدارية" },
  { id: "P7",  no: 7,  levelId: "L3", title_ar: "مسؤول IT" },
  { id: "P8",  no: 8,  levelId: "L3", title_ar: "مسؤول تسويق" },
  { id: "P9",  no: 9,  levelId: "L3", title_ar: "مسؤول موارد بشرية" },
  { id: "P10", no: 10, levelId: "L3", title_ar: "مسؤول مشتريات" },
  { id: "P11", no: 11, levelId: "L3", title_ar: "محاسب" },
  { id: "P12", no: 12, levelId: "L3", title_ar: "موظف الاستقبال" },
  { id: "P13", no: 13, levelId: "L4", title_ar: "مساعد مشتريات" },
  { id: "P14", no: 14, levelId: "L4", title_ar: "أمين مخزن" },
  { id: "P15", no: 15, levelId: "L4", title_ar: "حارس أمن" },
  { id: "P16", no: 16, levelId: "L4", title_ar: "عامل بوفيه" },
  { id: "P17", no: 17, levelId: "L4", title_ar: "عامل نظافة" },
  { id: "P18", no: 18, levelId: "L4", title_ar: "تمريض" },
];

const SEED_COST_CENTERS: CostCenterRow[] = [
  { id: "CC19", no: 19, group_ar: "مراكز التكلفة للمبنى", name_ar: "المركز الطبي" },
  { id: "CC20", no: 20, group_ar: "مراكز التكلفة للغرف",  name_ar: "العيادات" },
  { id: "CC21", no: 21, group_ar: "مراكز التكلفة للغرف",  name_ar: "الأشعة" },
  { id: "CC22", no: 22, group_ar: "مراكز التكلفة للغرف",  name_ar: "التعقيم" },
  { id: "CC23", no: 23, group_ar: "مراكز التكلفة للغرف",  name_ar: "الاستقبال" },
  { id: "CC24", no: 24, group_ar: "مراكز التكلفة للغرف",  name_ar: "الحسابات" },
  { id: "CC25", no: 25, group_ar: "مراكز التكلفة للغرف",  name_ar: "الموارد البشرية" },
  { id: "CC26", no: 26, group_ar: "مراكز التكلفة للغرف",  name_ar: "التسويق" },
  { id: "CC27", no: 27, group_ar: "مراكز التكلفة للغرف",  name_ar: "المخازن" },
  { id: "CC28", no: 28, group_ar: "مراكز التكلفة للغرف",  name_ar: "تقنية المعلومات" },
  { id: "CC29", no: 29, group_ar: "مراكز التكلفة للغرف",  name_ar: "الإدارة العامة" },
];

const SEED_PROFIT_CENTERS: ProfitCenterRow[] = [
  { id: "PC1",  code: "PR-01", name_ar: "الكشف والتشخيص",      services_ar: "الكشوف والاستشارات" },
  { id: "PC2",  code: "PR-02", name_ar: "العلاج التحفظي",      services_ar: "الحشوات وعلاج العصب" },
  { id: "PC3",  code: "PR-03", name_ar: "جراحة الفم والأسنان", services_ar: "الخلع والجراحات" },
  { id: "PC4",  code: "PR-04", name_ar: "التركيبات الثابتة",   services_ar: "التيجان والجسور" },
  { id: "PC5",  code: "PR-05", name_ar: "التركيبات المتحركة",  services_ar: "الأطقم" },
  { id: "PC6",  code: "PR-06", name_ar: "زراعة الأسنان",       services_ar: "الزرعات والتركيبات عليها" },
  { id: "PC7",  code: "PR-07", name_ar: "تقويم الأسنان",       services_ar: "جميع خدمات التقويم" },
  { id: "PC8",  code: "PR-08", name_ar: "تجميل الأسنان",       services_ar: "التبييض والابتسامة التجميلية" },
  { id: "PC9",  code: "PR-09", name_ar: "الأشعة",              services_ar: "أشعة الأسنان" },
  { id: "PC10", code: "PR-10", name_ar: "المعمل الداخلي",      services_ar: "تصنيع التركيبات" },
  { id: "PC11", code: "PR-11", name_ar: "بيع المنتجات",        services_ar: "منتجات العناية بالأسنان" },
];

/* ---------- Persistence ---------- */
function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) { window.localStorage.setItem(NS + key, JSON.stringify(seed)); return seed; }
    return JSON.parse(raw) as T;
  } catch { return seed; }
}
function saveRaw<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key } }));
}
function useStore<T>(key: string, seed: T) {
  const [v, setV] = useState<T>(seed);
  useEffect(() => {
    setV(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setV(load(key, seed));
    };
    window.addEventListener("erp:change", on);
    return () => window.removeEventListener("erp:change", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const upd = useCallback((next: T | ((p: T) => T)) => {
    setV(p => {
      const x = typeof next === "function" ? (next as (p: T) => T)(p) : next;
      saveRaw(key, x);
      return x;
    });
  }, [key]);
  return [v, upd] as const;
}

export const useOrgLevels      = () => useStore<OrgLevel[]>("org_levels", SEED_LEVELS);
export const useOrgPositions   = () => useStore<Position[]>("org_positions", SEED_POSITIONS);
export const useOrgCostCenters = () => useStore<CostCenterRow[]>("org_cost_centers", SEED_COST_CENTERS);
export const useOrgProfitCenters = () => useStore<ProfitCenterRow[]>("org_profit_centers", SEED_PROFIT_CENTERS);

/* ---------- Bulk import helpers ---------- */

/** Parse pasted CSV / TSV / Excel-copied table into rows of cells.
 *  Supports comma, tab and semicolon separators. */
export function parseDelimited(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Detect separator from first line
  const candidates = ["\t", ",", ";", "|"];
  let sep = "\t";
  let max = 0;
  for (const c of candidates) {
    const n = lines[0].split(c).length;
    if (n > max) { max = n; sep = c; }
  }
  return lines.map(l => l.split(sep).map(c => c.trim()));
}

export function nextSeq(list: { no: number }[]): number {
  return list.reduce((m, x) => Math.max(m, x.no || 0), 0) + 1;
}
