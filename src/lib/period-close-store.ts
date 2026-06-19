// Period Close & Year-End — track open/closed periods and run closing entries
// to move revenue/expense balances into Retained Earnings (account 3200).
import { useEffect, useState, useCallback } from "react";
import type { JournalEntry, JournalLine } from "./erp-store";

const NS = "erp:";

export type PeriodStatus = "open" | "closing" | "closed";

export type Period = {
  id: string;
  yearMonth: string;     // YYYY-MM
  status: PeriodStatus;
  closedAt?: string;
  closedBy?: string;
  closingJournalRef?: string;
};

export type YearEnd = {
  id: string;
  year: number;
  status: "open" | "closed";
  closedAt?: string;
  closingJournalRef?: string;
  netIncome: number;
};

const RETAINED_EARNINGS = "3200";
const INCOME_SUMMARY    = "3900"; // optional clearing; if not present we close directly to 3200

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

export const usePeriods = () => useStore<Period[]>("periods", []);
export const useYearEnds = () => useStore<YearEnd[]>("year_ends", []);

export function isPeriodClosed(yearMonth: string): boolean {
  const list = load<Period[]>("periods", []);
  return list.some(p => p.yearMonth === yearMonth && p.status === "closed");
}

export function isYearClosed(year: number): boolean {
  const list = load<YearEnd[]>("year_ends", []);
  return list.some(y => y.year === year && y.status === "closed");
}

function appendJournal(je: JournalEntry) {
  const jr = JSON.parse(localStorage.getItem(NS + "journal") || "[]") as JournalEntry[];
  localStorage.setItem(NS + "journal", JSON.stringify([...jr, je]));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));
}

/** Close a monthly period — marks it as closed (no JE needed for monthly close). */
export function closePeriod(yearMonth: string, user?: string): Period {
  const list = load<Period[]>("periods", []);
  if (list.some(p => p.yearMonth === yearMonth && p.status === "closed"))
    throw new Error("Period already closed");
  const p: Period = {
    id: crypto.randomUUID(), yearMonth, status: "closed",
    closedAt: new Date().toISOString(), closedBy: user || "system",
  };
  saveRaw("periods", [...list.filter(x => x.yearMonth !== yearMonth), p]);
  return p;
}

export function reopenPeriod(yearMonth: string) {
  const list = load<Period[]>("periods", []);
  saveRaw("periods", list.filter(p => p.yearMonth !== yearMonth));
}

/** Year-end: zero out revenue + expense accounts into Retained Earnings. */
export function closeYear(year: number, journal: JournalEntry[]): YearEnd {
  const yearList = load<YearEnd[]>("year_ends", []);
  if (yearList.some(y => y.year === year && y.status === "closed"))
    throw new Error("Year already closed");

  // Aggregate balances per revenue / expense account for the year
  const balances: Record<string, number> = {};
  for (const e of journal) {
    const y = parseInt(e.date.slice(0, 4), 10);
    if (y !== year) continue;
    for (const l of e.lines) {
      if (!(l.accountCode.startsWith("4") || l.accountCode.startsWith("5"))) continue;
      balances[l.accountCode] = (balances[l.accountCode] || 0) + l.debit - l.credit;
    }
  }

  const lines: JournalLine[] = [];
  let netIncome = 0; // credit balance (revenue - expense)
  for (const [code, bal] of Object.entries(balances)) {
    if (Math.abs(bal) < 0.005) continue;
    // bal = debit - credit. To zero it out we post the opposite side.
    if (bal > 0) {
      // account has net debit → credit it
      lines.push({ accountCode: code, debit: 0, credit: round(bal) });
    } else {
      lines.push({ accountCode: code, debit: round(-bal), credit: 0 });
    }
    if (code.startsWith("4")) netIncome += -bal;  // revenue credit balance
    else                       netIncome -= -bal; // expense debit reduces NI
  }

  // Plug to Retained Earnings
  const totalDr = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  const diff = round(totalDr - totalCr);
  if (diff > 0)      lines.push({ accountCode: RETAINED_EARNINGS, debit: 0,    credit: diff });
  else if (diff < 0) lines.push({ accountCode: RETAINED_EARNINGS, debit: -diff, credit: 0   });

  const je: JournalEntry = {
    id: crypto.randomUUID(),
    ref: `YEC-${year}`,
    date: `${year}-12-31`,
    narrative: `Year-end closing entry ${year} — close revenue & expense to Retained Earnings`,
    lines,
  };
  appendJournal(je);

  const ye: YearEnd = {
    id: crypto.randomUUID(),
    year, status: "closed",
    closedAt: new Date().toISOString(),
    closingJournalRef: je.ref,
    netIncome: round(netIncome),
  };
  saveRaw("year_ends", [...yearList.filter(y => y.year !== year), ye]);

  // Also close all 12 months of that year
  const periods = load<Period[]>("periods", []);
  const newPeriods = [...periods];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    if (!newPeriods.some(p => p.yearMonth === ym && p.status === "closed")) {
      newPeriods.push({
        id: crypto.randomUUID(), yearMonth: ym, status: "closed",
        closedAt: new Date().toISOString(), closedBy: "year-end",
      });
    }
  }
  saveRaw("periods", newPeriods);

  return ye;
}

function round(n: number): number { return Math.round(n * 100) / 100; }
// Suppress unused export warning
void INCOME_SUMMARY;
