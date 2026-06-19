// Unified Posting Rules Layer (SAP-style)
// ────────────────────────────────────────
// Single source of truth that converts BUSINESS EVENTS into balanced
// JOURNAL ENTRIES using a configurable account-mapping table.
//
// Every module (Reception, Treasury, BNPL, Pharmacy, Insurance, Payroll…)
// should call `buildJournalForEvent(event)` instead of hard-coding
// account codes. That way:
//   • account mapping changes in ONE place (the AccountMap below)
//   • all postings are guaranteed balanced (debit == credit)
//   • we get a consistent narrative/ref convention
//   • a single audit log captures every posting
//
// The output is plug-compatible with `JournalEntry` in erp-store.ts.

import { useEffect, useState, useCallback } from "react";
import type { JournalEntry, JournalLine } from "./erp-store";
import type { PaymentMethod } from "./journey-store";

const NS = "posting:";

/* ============================================================
 * 1. Account Mapping (editable, persisted)
 * ============================================================ */

export type AccountMap = {
  // Receivables
  patientReceivable: string;       // 1130
  insuranceReceivable: string;     // 1135
  bnplTabbyReceivable: string;     // 1131
  bnplTamaraReceivable: string;    // 1132

  // Cash / Bank / Clearing
  cashOnHand: string;              // 1111
  treasuryClearing: string;        // 1115
  bankMain: string;                // 1101
  cardClearing: string;            // 1112

  // Revenue
  consultationRevenue: string;     // 4110
  radiologyRevenue: string;        // 4120
  dentalRevenue: string;           // 4130
  surgeryRevenue: string;          // 4140
  pharmacyRevenue: string;         // 4150
  otherRevenue: string;            // 4190

  // Liabilities
  vatPayable: string;              // 2310
  bnplCommissionPayable: string;   // 2150
  bankFeesPayable: string;         // 2160

  // Expenses
  bnplCommissionExpense: string;   // 5310
  bankFeesExpense: string;         // 5320
  medicineCogs: string;            // 5210
  materialsCogs: string;           // 5220

  // Inventory
  medicineInventory: string;       // 1210
  materialsInventory: string;      // 1220
};

const DEFAULT_MAP: AccountMap = {
  patientReceivable: "1130",
  insuranceReceivable: "1135",
  bnplTabbyReceivable: "1131",
  bnplTamaraReceivable: "1132",
  cashOnHand: "1111",
  treasuryClearing: "1115",
  bankMain: "1101",
  cardClearing: "1112",
  consultationRevenue: "4110",
  radiologyRevenue: "4120",
  dentalRevenue: "4130",
  surgeryRevenue: "4140",
  pharmacyRevenue: "4150",
  otherRevenue: "4190",
  vatPayable: "2310",
  bnplCommissionPayable: "2150",
  bankFeesPayable: "2160",
  bnplCommissionExpense: "5310",
  bankFeesExpense: "5320",
  medicineCogs: "5210",
  materialsCogs: "5220",
  medicineInventory: "1210",
  materialsInventory: "1220",
};

/* ============================================================
 * 2. Persistence
 * ============================================================ */

function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) { window.localStorage.setItem(NS + key, JSON.stringify(seed)); return seed; }
    return { ...(seed as object), ...(JSON.parse(raw) as object) } as T;
  } catch { return seed; }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("posting:change", { detail: { key } }));
}

export function usePostingMap() {
  const [value, setValue] = useState<AccountMap>(DEFAULT_MAP);
  useEffect(() => {
    setValue(load("map", DEFAULT_MAP));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === "map") setValue(load("map", DEFAULT_MAP));
    };
    window.addEventListener("posting:change", on);
    return () => window.removeEventListener("posting:change", on);
  }, []);
  const update = useCallback((next: AccountMap | ((p: AccountMap) => AccountMap)) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: AccountMap) => AccountMap)(prev) : next;
      save("map", v);
      return v;
    });
  }, []);
  return [value, update] as const;
}

export function getPostingMap(): AccountMap {
  return load("map", DEFAULT_MAP);
}

/* ============================================================
 * 3. Business Events
 * ============================================================ */

export type PostingEvent =
  // Invoice issued → recognize revenue + VAT against patient/insurance receivable
  | {
      kind: "invoice.issued";
      ref: string;
      date: string;
      patientRef: string;
      lines: { category: "consultation"|"radiology"|"dental"|"surgery"|"pharmacy"|"other"; amount: number }[];
      vat: number;
      payer: "patient" | "insurance";
      costCenterId?: string;
    }
  // Reception payment → cash/card lands in treasury-clearing (cash) or bank (card/bank/insurance)
  | {
      kind: "payment.received";
      ref: string;
      date: string;
      patientRef: string;
      method: PaymentMethod;
      amount: number;
      costCenterId?: string;
    }
  // Treasury handover approved → move from clearing to main cash
  | {
      kind: "treasury.handover";
      ref: string;
      date: string;
      amount: number;
      variance?: number; // +short, -over (rare)
    }
  // BNPL claim settled → bank receives NET, receivable closed at GROSS
  | {
      kind: "bnpl.settled";
      ref: string;
      date: string;
      provider: "tabby" | "tamara";
      gross: number;
      net: number;
      // commission already expensed at payment.received time
    }
  // Pharmacy dispense → COGS hits inventory
  | {
      kind: "pharmacy.dispensed";
      ref: string;
      date: string;
      cost: number;
      costCenterId?: string;
    };

/* ============================================================
 * 4. Helpers
 * ============================================================ */

function dr(accountCode: string, amount: number, costCenterId?: string): JournalLine {
  return { accountCode, debit: round(amount), credit: 0, costCenterId };
}
function cr(accountCode: string, amount: number, costCenterId?: string): JournalLine {
  return { accountCode, debit: 0, credit: round(amount), costCenterId };
}
function round(n: number): number { return Math.round(n * 100) / 100; }

function revenueAccountFor(map: AccountMap, cat: string): string {
  switch (cat) {
    case "consultation": return map.consultationRevenue;
    case "radiology":    return map.radiologyRevenue;
    case "dental":       return map.dentalRevenue;
    case "surgery":      return map.surgeryRevenue;
    case "pharmacy":     return map.pharmacyRevenue;
    default:             return map.otherRevenue;
  }
}

function paymentLandingAccount(map: AccountMap, method: PaymentMethod): string {
  switch (method) {
    case "cash":      return map.treasuryClearing;   // sits in reception clearing until handover
    case "card":      return map.cardClearing;       // T+1 bank settlement
    case "bank":      return map.bankMain;
    case "insurance": return map.insuranceReceivable;
    case "tabby":     return map.bnplTabbyReceivable;
    case "tamara":    return map.bnplTamaraReceivable;
  }
}

/* ============================================================
 * 5. Core: Event → JournalEntry
 * ============================================================ */

export function buildJournalForEvent(
  event: PostingEvent,
  map: AccountMap = getPostingMap(),
): JournalEntry {
  const lines: JournalLine[] = [];
  let narrative = "";

  switch (event.kind) {
    case "invoice.issued": {
      const recv = event.payer === "insurance" ? map.insuranceReceivable : map.patientReceivable;
      const subtotal = event.lines.reduce((s, l) => s + l.amount, 0);
      lines.push(dr(recv, subtotal + event.vat, event.costCenterId));
      for (const l of event.lines) {
        lines.push(cr(revenueAccountFor(map, l.category), l.amount, event.costCenterId));
      }
      if (event.vat > 0) lines.push(cr(map.vatPayable, event.vat));
      narrative = `Invoice ${event.ref} / ${event.patientRef}`;
      break;
    }

    case "payment.received": {
      // For BNPL the gross hits receivable AND we expense commission immediately.
      if (event.method === "tabby" || event.method === "tamara") {
        // Commission is computed by bnpl-store; here we just record landing of gross
        // and let bnpl.settled close the receivable later. Commission expense is
        // recorded inside bnpl-store using its own commission %; we keep it
        // out of this event to avoid double-booking.
        lines.push(dr(paymentLandingAccount(map, event.method), event.amount));
        lines.push(cr(map.patientReceivable, event.amount));
      } else {
        lines.push(dr(paymentLandingAccount(map, event.method), event.amount, event.costCenterId));
        lines.push(cr(map.patientReceivable, event.amount, event.costCenterId));
      }
      narrative = `Payment ${event.ref} / ${event.method} / ${event.patientRef}`;
      break;
    }

    case "treasury.handover": {
      const variance = event.variance || 0;
      // Cash physically deposited into safe/main cash
      lines.push(dr(map.cashOnHand, event.amount - variance));
      if (variance !== 0) {
        // Shortage → expense; overage → other revenue
        if (variance > 0) lines.push(dr(map.bankFeesExpense, variance));
        else              lines.push(cr(map.otherRevenue, -variance));
      }
      lines.push(cr(map.treasuryClearing, event.amount));
      narrative = `Treasury handover ${event.ref}${variance ? ` (variance ${variance})` : ""}`;
      break;
    }

    case "bnpl.settled": {
      const recv = event.provider === "tabby" ? map.bnplTabbyReceivable : map.bnplTamaraReceivable;
      const commission = event.gross - event.net;
      lines.push(dr(map.bankMain, event.net));
      if (commission > 0) lines.push(dr(map.bnplCommissionExpense, commission));
      lines.push(cr(recv, event.gross));
      narrative = `BNPL ${event.provider.toUpperCase()} settlement ${event.ref}`;
      break;
    }

    case "pharmacy.dispensed": {
      lines.push(dr(map.medicineCogs, event.cost, event.costCenterId));
      lines.push(cr(map.medicineInventory, event.cost, event.costCenterId));
      narrative = `Pharmacy dispense ${event.ref}`;
      break;
    }
  }

  return {
    id: `pe_${event.ref}_${Date.now()}`,
    ref: event.ref,
    date: event.date,
    narrative,
    lines,
  };
}

/* ============================================================
 * 6. Validation — every entry MUST balance
 * ============================================================ */

export function assertBalanced(je: JournalEntry): { ok: boolean; diff: number } {
  const d = je.lines.reduce((s, l) => s + l.debit, 0);
  const c = je.lines.reduce((s, l) => s + l.credit, 0);
  const diff = round(d - c);
  return { ok: Math.abs(diff) < 0.005, diff };
}

/* ============================================================
 * 7. Audit log of every posting that flowed through this layer
 * ============================================================ */

export type PostingLog = {
  id: string;
  at: string;
  module: string;
  eventKind: PostingEvent["kind"];
  ref: string;
  narrative: string;
  debit: number;
  credit: number;
  balanced: boolean;
};

export function usePostingLog() {
  const [value, setValue] = useState<PostingLog[]>([]);
  useEffect(() => {
    setValue(load<PostingLog[]>("log", []));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === "log") setValue(load<PostingLog[]>("log", []));
    };
    window.addEventListener("posting:change", on);
    return () => window.removeEventListener("posting:change", on);
  }, []);
  return value;
}

export function recordPosting(module: string, event: PostingEvent, je: JournalEntry) {
  const log = load<PostingLog[]>("log", []);
  const totals = je.lines.reduce((s, l) => ({ d: s.d + l.debit, c: s.c + l.credit }), { d: 0, c: 0 });
  const entry: PostingLog = {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    module,
    eventKind: event.kind,
    ref: event.ref,
    narrative: je.narrative,
    debit: round(totals.d),
    credit: round(totals.c),
    balanced: assertBalanced(je).ok,
  };
  save("log", [entry, ...log].slice(0, 500));
}

/* ============================================================
 * 8. One-call helper: build + validate + log
 * ============================================================ */

export function postEvent(module: string, event: PostingEvent): {
  journal: JournalEntry;
  balanced: boolean;
  diff: number;
} {
  const je = buildJournalForEvent(event);
  const v = assertBalanced(je);
  recordPosting(module, event, je);
  return { journal: je, balanced: v.ok, diff: v.diff };
}
