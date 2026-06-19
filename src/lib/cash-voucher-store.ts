// Cash Vouchers (Receipt & Payment) — posts directly to the ERP journal.
//
//  Receipt voucher  (سند قبض):   DR Cash on Hand    CR Counter account (e.g. AR, Other Revenue)
//  Payment voucher  (سند صرف):   DR Counter account (e.g. AP, Expense)  CR Cash on Hand
//
// Mirrors the localStorage pattern used by bank-recon-store so balances
// flow into Chart of Accounts / General Ledger / Trial Balance instantly.
import { useEffect, useState, useCallback } from "react";
import type { JournalEntry } from "@/lib/erp-store";
import { getPostingMap } from "@/lib/posting-rules";

const NS = "erp:";

export type VoucherKind = "receipt" | "payment";
export type VoucherStatus = "draft" | "posted" | "cancelled";

export type CashVoucher = {
  id: string;
  ref: string;                 // CV-2026-0001
  kind: VoucherKind;
  date: string;
  amount: number;
  counterAccount: string;      // COA code (the offsetting side)
  payeeOrPayer: string;        // "Patient X" / "Supplier Y" / employee name
  narrative: string;
  status: VoucherStatus;
  journalRef?: string;         // linked JE
  createdBy: string;
  createdAt: string;
  postedBy?: string;
  postedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
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

export const useVouchers = () => useStore<CashVoucher[]>("cash_vouchers", []);

function readJournal(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(NS + "journal") || "[]"); }
  catch { return []; }
}
function writeJournal(list: JournalEntry[]) {
  localStorage.setItem(NS + "journal", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));
}

function nextRef(prefix: string, items: { ref: string }[]) {
  const year = new Date().getFullYear();
  const max = items
    .filter(x => x.ref.includes(`-${year}-`))
    .reduce((a, x) => {
      const n = parseInt(x.ref.split("-").pop() || "0", 10);
      return isNaN(n) ? a : Math.max(a, n);
    }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function createVoucher(input: {
  kind: VoucherKind;
  date: string;
  amount: number;
  counterAccount: string;
  payeeOrPayer: string;
  narrative: string;
  user?: string;
}): CashVoucher {
  const list = load<CashVoucher[]>("cash_vouchers", []);
  const v: CashVoucher = {
    id: crypto.randomUUID(),
    ref: nextRef("CV", list),
    kind: input.kind,
    date: input.date,
    amount: Math.abs(input.amount),
    counterAccount: input.counterAccount,
    payeeOrPayer: input.payeeOrPayer,
    narrative: input.narrative,
    status: "draft",
    createdBy: input.user || "system",
    createdAt: new Date().toISOString(),
  };
  saveRaw("cash_vouchers", [...list, v]);
  return v;
}

export function postVoucher(voucherId: string, user?: string): CashVoucher {
  const list = load<CashVoucher[]>("cash_vouchers", []);
  const v = list.find(x => x.id === voucherId);
  if (!v) throw new Error("Voucher not found");
  if (v.status !== "draft") throw new Error("Only draft vouchers can be posted");
  const map = getPostingMap();
  const cash = map.cashOnHand;

  const jr = readJournal();
  const jeRef = nextRef("JE", jr);
  const lines =
    v.kind === "receipt"
      ? [
          { accountCode: cash,              debit: v.amount, credit: 0 },
          { accountCode: v.counterAccount,  debit: 0,        credit: v.amount },
        ]
      : [
          { accountCode: v.counterAccount,  debit: v.amount, credit: 0 },
          { accountCode: cash,              debit: 0,        credit: v.amount },
        ];
  writeJournal([
    ...jr,
    {
      id: crypto.randomUUID(),
      ref: jeRef,
      date: v.date,
      narrative: `${v.kind === "receipt" ? "Receipt" : "Payment"} voucher ${v.ref} — ${v.payeeOrPayer}`,
      lines,
    },
  ]);

  const next: CashVoucher = {
    ...v, status: "posted", journalRef: jeRef,
    postedBy: user || "system", postedAt: new Date().toISOString(),
  };
  saveRaw("cash_vouchers", list.map(x => x.id === v.id ? next : x));
  return next;
}

export function cancelVoucher(voucherId: string, user?: string) {
  const list = load<CashVoucher[]>("cash_vouchers", []);
  const v = list.find(x => x.id === voucherId);
  if (!v) throw new Error("Voucher not found");
  if (v.status === "posted") {
    // Reverse the journal entry
    const jr = readJournal();
    const reversed = jr.map(e => e.ref === v.journalRef ? null : e).filter(Boolean) as JournalEntry[];
    const orig = jr.find(e => e.ref === v.journalRef);
    if (orig) {
      const inverse: JournalEntry = {
        id: crypto.randomUUID(),
        ref: nextRef("JE", jr),
        date: new Date().toISOString().slice(0, 10),
        narrative: `Reversal of ${orig.narrative}`,
        lines: orig.lines.map(l => ({ accountCode: l.accountCode, debit: l.credit, credit: l.debit })),
      };
      writeJournal([...reversed, orig, inverse]);
    }
  }
  saveRaw("cash_vouchers", list.map(x => x.id === v.id
    ? { ...x, status: "cancelled", cancelledBy: user || "system", cancelledAt: new Date().toISOString() }
    : x));
}
