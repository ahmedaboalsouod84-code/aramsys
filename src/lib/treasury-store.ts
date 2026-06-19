// Reception Treasury — Shifts, Cash Counts, Handover to Accounting (Clearing Account).
//
// SAP-style flow:
//   Patient pays cash → Receivable cleared, debited to "Treasury Clearing" (سيولة قيد التسوية).
//   Receptionist closes shift → counts cash, generates handover voucher.
//   Accountant approves handover → Clearing Account → real Cash/Bank account.
//
// Store is localStorage-backed (mock-only), mirroring the journey-store pattern.
import { useEffect, useState, useCallback } from "react";

const NS = "treasury:";

export type ShiftStatus = "open" | "pending_handover" | "approved" | "rejected";

export type CashCountBreakdown = {
  // SAR denominations
  n500: number; n200: number; n100: number; n50: number; n20: number;
  n10: number; n5: number; n1: number; coins: number;
};

export function countTotal(b: CashCountBreakdown): number {
  return b.n500 * 500 + b.n200 * 200 + b.n100 * 100 + b.n50 * 50 +
    b.n20 * 20 + b.n10 * 10 + b.n5 * 5 + b.n1 * 1 + b.coins;
}

export type TreasuryShift = {
  id: string;
  ref: string;            // SH-2026-0001
  cashierId: string;      // username
  cashierName: string;
  station: string;        // reception desk / branch
  openedAt: string;
  openingFloat: number;   // عهدة افتتاحية
  closedAt?: string;
  systemCash?: number;    // Σ cash payments during shift (computed at close)
  systemCard?: number;
  systemBank?: number;
  systemInsurance?: number;
  countedCash?: number;   // actual physical count
  variance?: number;      // counted - system (cash only)
  breakdown?: CashCountBreakdown;
  notes?: string;
  status: ShiftStatus;
  handoverAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  paymentIds: string[];   // attached payment refs for traceability
};

/* ---------- Storage helpers ---------- */
function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) { window.localStorage.setItem(NS + key, JSON.stringify(seed)); return seed; }
    return JSON.parse(raw) as T;
  } catch { return seed; }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("treasury:change", { detail: { key } }));
}

export function useTStore<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  useEffect(() => {
    setValue(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(load(key, seed));
    };
    window.addEventListener("treasury:change", on);
    return () => window.removeEventListener("treasury:change", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback((next: T | ((p: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      save(key, v);
      return v;
    });
  }, [key]);
  return [value, update] as const;
}

export const useShifts = () => useTStore<TreasuryShift[]>("shifts", []);

export function nextShiftRef(items: TreasuryShift[]): string {
  const year = new Date().getFullYear();
  const max = items.filter(s => s.ref.includes(`-${year}-`))
    .reduce((a, s) => Math.max(a, parseInt(s.ref.split("-").pop() || "0", 10)), 0);
  return `SH-${year}-${String(max + 1).padStart(4, "0")}`;
}

/* ---------- Clearing balance (informational) ---------- */
// Sum of all approved handovers minus settled = pending balance in "1115 — Treasury Clearing".
export function clearingBalance(shifts: TreasuryShift[]): {
  pending: number;     // closed but not yet approved
  approved: number;    // approved (already moved to cash account in books)
  variance: number;    // total cash variance (over/short)
} {
  let pending = 0, approved = 0, variance = 0;
  for (const s of shifts) {
    if (s.status === "pending_handover" && s.countedCash != null) pending += s.countedCash;
    if (s.status === "approved" && s.countedCash != null) approved += s.countedCash;
    if (s.variance != null) variance += s.variance;
  }
  return { pending, approved, variance };
}
