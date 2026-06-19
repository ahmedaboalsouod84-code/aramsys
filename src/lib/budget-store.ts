// Budget vs Actual — yearly budget per account (+ optional cost center / month split).
import { useEffect, useState, useCallback } from "react";
import type { JournalEntry } from "./erp-store";

const NS = "erp:";

export type BudgetLine = {
  id: string;
  year: number;
  accountCode: string;
  costCenterId?: string;
  // 12 monthly buckets (index 0 = Jan)
  months: number[];
};

const SEED_BUDGETS: BudgetLine[] = [
  // Revenue accounts
  { id: "b1", year: new Date().getFullYear(), accountCode: "4110", months: Array(12).fill(15000) },
  { id: "b2", year: new Date().getFullYear(), accountCode: "4120", months: Array(12).fill(8000) },
  { id: "b3", year: new Date().getFullYear(), accountCode: "4130", months: Array(12).fill(5000) },
  // Expense accounts
  { id: "b4", year: new Date().getFullYear(), accountCode: "5110", months: Array(12).fill(20000) },
  { id: "b5", year: new Date().getFullYear(), accountCode: "5640", months: Array(12).fill(8000) },
];

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

export const useBudgets = () => useStore<BudgetLine[]>("budgets", SEED_BUDGETS);

export function budgetActualForAccount(
  accountCode: string,
  year: number,
  journal: JournalEntry[],
  budgets: BudgetLine[],
  costCenterId?: string,
) {
  const budget = budgets
    .filter(b => b.year === year && b.accountCode === accountCode &&
                 (!costCenterId || b.costCenterId === costCenterId))
    .reduce((s, b) => s + b.months.reduce((a, n) => a + (n || 0), 0), 0);

  let actual = 0;
  for (const e of journal) {
    const y = parseInt(e.date.slice(0, 4), 10);
    if (y !== year) continue;
    for (const l of e.lines) {
      if (l.accountCode !== accountCode) continue;
      if (costCenterId && l.costCenterId !== costCenterId) continue;
      // For revenue: actual = credit - debit; for expense: debit - credit
      if (accountCode.startsWith("4"))      actual += l.credit - l.debit;
      else if (accountCode.startsWith("5")) actual += l.debit - l.credit;
      else                                  actual += l.debit - l.credit;
    }
  }

  const variance = actual - budget;
  const variancePct = budget ? (variance / budget) * 100 : 0;
  return { budget, actual, variance, variancePct };
}
