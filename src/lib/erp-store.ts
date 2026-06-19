// ERP shared mock data + localStorage hooks.
// All data is persisted under namespaced keys and seeded on first read.
import { useEffect, useState, useCallback } from "react";
import { MEDICAL_COA } from "./coa-medical-seed";

const NS = "erp:";

/* ---------- Types ---------- */
export type AccountLevel = "root" | "group" | "detail" | "contra";
export type Account = {
  code: string;
  name_en: string;
  name_ar: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parent?: string | null;
  level?: AccountLevel;
  desc?: string;
};

/** Only detail/contra accounts may receive direct journal postings (SAP-style). */
export function isPostableAccount(a: Account | undefined): boolean {
  if (!a) return false;
  return a.level === "detail" || a.level === "contra" || a.level === undefined;
}

export type CostCenter = {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  type: "clinic" | "department" | "support";
  area: number;
  headcount: number;
};

export type Medicine = {
  id: string;
  name_en: string;
  name_ar: string;
  unit: string;
  stock: number;
  unitCost: number;
  batchNo: string;
  expiry: string; // YYYY-MM-DD
};

export type JournalLine = {
  accountCode: string;
  debit: number;
  credit: number;
  costCenterId?: string;
};

export type JournalEntry = {
  id: string;
  ref: string;
  date: string;
  narrative: string;
  lines: JournalLine[];
};

export type DistributionRule = {
  id: string;
  name: string;
  accountCode: string;
  method: "area" | "headcount" | "revenue" | "manual";
  allocations: { costCenterId: string; percent: number }[];
};

/* ---------- Seed data ---------- */
// Full ZATCA-compliant medical-center chart of accounts (137 accounts).
const SEED_ACCOUNTS: Account[] = MEDICAL_COA;

const SEED_COST_CENTERS: CostCenter[] = [
  { id: "cc1", code: "CC1", name_en: "Clinic 1 - General", name_ar: "عيادة 1 - عامة", type: "clinic", area: 80, headcount: 6 },
  { id: "cc2", code: "CC2", name_en: "Clinic 2 - Dental", name_ar: "عيادة 2 - أسنان", type: "clinic", area: 60, headcount: 5 },
  { id: "cc3", code: "CC3", name_en: "Lab", name_ar: "المختبر", type: "department", area: 40, headcount: 3 },
  { id: "cc4", code: "CC4", name_en: "Administration", name_ar: "الإدارة", type: "support", area: 50, headcount: 4 },
];

const SEED_MEDICINES: Medicine[] = [
  { id: "m1", name_en: "Amoxicillin 500mg", name_ar: "أموكسيسيلين 500", unit: "Tab", stock: 500, unitCost: 8, batchNo: "B-A001", expiry: "2027-06-30" },
  { id: "m2", name_en: "Paracetamol 500mg", name_ar: "باراسيتامول 500", unit: "Tab", stock: 1200, unitCost: 2, batchNo: "B-P012", expiry: "2027-03-15" },
  { id: "m3", name_en: "Ibuprofen 400mg", name_ar: "إيبوبروفين 400", unit: "Tab", stock: 800, unitCost: 3, batchNo: "B-I007", expiry: "2026-12-31" },
  { id: "m4", name_en: "Insulin", name_ar: "أنسولين", unit: "Vial", stock: 60, unitCost: 20, batchNo: "B-IN03", expiry: "2026-09-30" },
  { id: "m5", name_en: "Vitamin C 1000mg", name_ar: "فيتامين سي 1000", unit: "Tab", stock: 2000, unitCost: 1, batchNo: "B-V020", expiry: "2028-01-01" },
  { id: "m6", name_en: "Lidocaine 2%", name_ar: "ليدوكايين 2%", unit: "Vial", stock: 150, unitCost: 12, batchNo: "B-L004", expiry: "2026-11-30" },
];

const SEED_RULES: DistributionRule[] = [
  {
    id: "r1", name: "Rent by Area", accountCode: "5640", method: "area",
    allocations: [
      { costCenterId: "cc1", percent: 35 },
      { costCenterId: "cc2", percent: 26 },
      { costCenterId: "cc3", percent: 17 },
      { costCenterId: "cc4", percent: 22 },
    ],
  },
  {
    id: "r2", name: "Utilities by Headcount", accountCode: "5610", method: "headcount",
    allocations: [
      { costCenterId: "cc1", percent: 33 },
      { costCenterId: "cc2", percent: 28 },
      { costCenterId: "cc3", percent: 17 },
      { costCenterId: "cc4", percent: 22 },
    ],
  },
];

function todayMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const SEED_JOURNAL: JournalEntry[] = [
  {
    id: "je1", ref: "JE-1001", date: todayMinus(20), narrative: "Consultation revenue - Clinic 1",
    lines: [
      { accountCode: "1101", debit: 12000, credit: 0 },
      { accountCode: "4110", debit: 0, credit: 12000, costCenterId: "cc1" },
    ],
  },
  {
    id: "je2", ref: "JE-1002", date: todayMinus(18), narrative: "Consultation revenue - Clinic 2",
    lines: [
      { accountCode: "1101", debit: 9500, credit: 0 },
      { accountCode: "4110", debit: 0, credit: 9500, costCenterId: "cc2" },
    ],
  },
  {
    id: "je3", ref: "JE-1003", date: todayMinus(15), narrative: "Lab revenue",
    lines: [
      { accountCode: "1101", debit: 6800, credit: 0 },
      { accountCode: "4120", debit: 0, credit: 6800, costCenterId: "cc3" },
    ],
  },
  {
    id: "je4", ref: "JE-1004", date: todayMinus(12), narrative: "Doctor salaries - Clinic 1",
    lines: [
      { accountCode: "5110", debit: 10000, credit: 0, costCenterId: "cc1" },
      { accountCode: "1102", debit: 0, credit: 10000 },
    ],
  },
  {
    id: "je5", ref: "JE-1005", date: todayMinus(10), narrative: "Doctor salaries - Clinic 2",
    lines: [
      { accountCode: "5110", debit: 8000, credit: 0, costCenterId: "cc2" },
      { accountCode: "1102", debit: 0, credit: 8000 },
    ],
  },
  {
    id: "je6", ref: "JE-1006", date: todayMinus(8), narrative: "Rent expense - allocated",
    lines: [
      { accountCode: "5640", debit: 2800, credit: 0, costCenterId: "cc1" },
      { accountCode: "5640", debit: 2080, credit: 0, costCenterId: "cc2" },
      { accountCode: "5640", debit: 1360, credit: 0, costCenterId: "cc3" },
      { accountCode: "5640", debit: 1760, credit: 0, costCenterId: "cc4" },
      { accountCode: "1102", debit: 0, credit: 8000 },
    ],
  },
  {
    id: "je7", ref: "JE-1007", date: todayMinus(5), narrative: "Radiology revenue",
    lines: [
      { accountCode: "1101", debit: 4200, credit: 0 },
      { accountCode: "4130", debit: 0, credit: 4200, costCenterId: "cc3" },
    ],
  },
];

/* ---------- Generic localStorage hook with seed ---------- */
function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) {
      window.localStorage.setItem(NS + key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key } }));
}

export function useStore<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);

  useEffect(() => {
    setValue(load(key, seed));
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(load(key, seed));
    };
    window.addEventListener("erp:change", onChange);
    return () => window.removeEventListener("erp:change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      save(key, v);
      return v;
    });
  }, [key]);

  return [value, update] as const;
}

/* ---------- Convenience hooks ---------- */
export const useAccounts = () => useStore<Account[]>("accounts", SEED_ACCOUNTS);
export const useCostCenters = () => useStore<CostCenter[]>("cost_centers", SEED_COST_CENTERS);
export const useMedicines = () => useStore<Medicine[]>("medicines", SEED_MEDICINES);
export const useJournal = () => useStore<JournalEntry[]>("journal", SEED_JOURNAL);
export const useRules = () => useStore<DistributionRule[]>("rules", SEED_RULES);

/* ---------- Helpers ---------- */
export function nextRef(entries: JournalEntry[]) {
  const max = entries.reduce((acc, e) => {
    const n = parseInt(e.ref.replace(/\D/g, ""), 10);
    return isNaN(n) ? acc : Math.max(acc, n);
  }, 1000);
  return `JE-${max + 1}`;
}

export function accountBalance(code: string, entries: JournalEntry[]) {
  let d = 0, c = 0;
  for (const e of entries) for (const l of e.lines) if (l.accountCode === code) {
    d += l.debit; c += l.credit;
  }
  return { debit: d, credit: c, balance: d - c };
}

export function costCenterTotals(ccId: string, entries: JournalEntry[]) {
  let revenue = 0, cost = 0;
  for (const e of entries) for (const l of e.lines) {
    if (l.costCenterId !== ccId) continue;
    // revenue accounts start with 4, expenses with 5
    if (l.accountCode.startsWith("4")) revenue += l.credit - l.debit;
    else if (l.accountCode.startsWith("5")) cost += l.debit - l.credit;
  }
  return { revenue, cost, profit: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0 };
}

export function fmtSAR(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
}
