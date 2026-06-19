// Bank Reconciliation store (SAP-style).
// Persists banks, bank transactions, statements and settlements in localStorage.
// Posts journal entries into the shared ERP journal so balances roll up
// into the Chart of Accounts and Financial Statements.
import { useEffect, useState, useCallback } from "react";
import type { Account, JournalEntry } from "@/lib/erp-store";

const NS = "erp:";

/* =====================  Types  ===================== */

export type Bank = {
  id: string;
  code: string;             // short bank code, e.g. "BNK01"
  name_en: string;
  name_ar: string;
  iban?: string;
  currency: string;         // SAR
  createdAt: string;
  // Linked Chart-of-Accounts codes
  mainAccount: string;      // H0001 — control (no manual postings)
  depositsAccount: string;  // H0002 — incoming bucket
  paymentsAccount: string;  // H0003 — outgoing bucket
  openingBalance: number;   // captured when bank was created
};

export type BankTxnKind = "deposit" | "payment";
export type BankTxn = {
  id: string;
  bankId: string;
  date: string;             // YYYY-MM-DD
  ref: string;              // BT-XXXX
  kind: BankTxnKind;
  amount: number;
  counterAccount: string;   // the offsetting COA code (e.g. 1111 / 2111)
  narrative: string;
  // Reconciliation lifecycle
  settlementId?: string;    // set once it has been settled in a closing
  source: "manual" | "import";
  createdBy: string;
  createdAt: string;
  reversed?: boolean;
};

export type BankStatementLine = {
  id: string;
  bankId: string;
  date: string;
  ref: string;
  description: string;
  debit: number;            // money OUT of bank (payment)
  credit: number;           // money IN to bank (deposit)
  matchedTxnId?: string;
  importedAt: string;
};

export type Settlement = {
  id: string;
  bankId: string;
  ref: string;              // SET-XXXX
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  totalDeposits: number;
  totalPayments: number;
  calculatedBalance: number;
  statementBalance: number;
  difference: number;
  status: "draft" | "approved" | "reversed";
  txnIds: string[];
  approvedBy?: string;
  approvedAt?: string;
  reversedBy?: string;
  reversedAt?: string;
  reversalOfId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  user: string;
  action: string;
  details: string;
};

/* =====================  Storage helpers  ===================== */

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

function saveRaw<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NS + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key } }));
}

function useStore<T>(key: string, seed: T) {
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
  const update = useCallback((next: T | ((p: T) => T)) => {
    setValue((p) => {
      const v = typeof next === "function" ? (next as (x: T) => T)(p) : next;
      saveRaw(key, v);
      return v;
    });
  }, [key]);
  return [value, update] as const;
}

/* =====================  Public hooks  ===================== */

export const useBanks = () => useStore<Bank[]>("banks_list", []);

/* ---------- Pending bank-movement classification ----------
 * H0002 (deposits) and H0003 (payments) hold REAL postings but are
 * "pending bank movements". They MUST NOT be aggregated into the
 * official bank balance shown in Balance Sheet / Trial Balance / Cash
 * Position. Only H0001 (the main control account) represents the
 * official bank position.
 */
export function getPendingBankCodes(): Set<string> {
  const banks = load<Bank[]>("banks_list", []);
  const s = new Set<string>();
  for (const b of banks) { s.add(b.depositsAccount); s.add(b.paymentsAccount); }
  return s;
}
export function getMainBankCodes(): Set<string> {
  const banks = load<Bank[]>("banks_list", []);
  return new Set(banks.map((b) => b.mainAccount));
}
export function isPendingBankAccount(code: string): boolean {
  return getPendingBankCodes().has(code);
}
export function isMainBankAccount(code: string): boolean {
  return getMainBankCodes().has(code);
}
export function usePendingBankCodes(): Set<string> {
  const [banks] = useBanks();
  const s = new Set<string>();
  for (const b of banks) { s.add(b.depositsAccount); s.add(b.paymentsAccount); }
  return s;
}
export const useBankTxns = () => useStore<BankTxn[]>("bank_txns", []);
export const useBankStatements = () => useStore<BankStatementLine[]>("bank_statements", []);
export const useSettlements = () => useStore<Settlement[]>("bank_settlements", []);
export const useBankActivity = () => useStore<ActivityEntry[]>("bank_activity", []);

/* =====================  COA + Journal integration  ===================== */
// We mutate the shared ERP localStorage keys directly so updates appear
// instantly in the Chart of Accounts and General Ledger screens.

function readAccounts(): Account[] {
  try { return JSON.parse(localStorage.getItem(NS + "accounts_v2") || "[]"); }
  catch { return []; }
}
function writeAccounts(list: Account[]) {
  localStorage.setItem(NS + "accounts_v2", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "accounts_v2" } }));
}
function readJournal(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(NS + "journal") || "[]"); }
  catch { return []; }
}
function writeJournal(list: JournalEntry[]) {
  localStorage.setItem(NS + "journal", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));
}

/** Allocate next 3 sequential H#### account codes. */
function nextBankAccountCodes(): { main: string; deposits: string; payments: string } {
  const accs = readAccounts();
  const usedH = accs
    .map((a) => a.code)
    .filter((c) => /^H\d{4}$/.test(c))
    .map((c) => parseInt(c.slice(1), 10))
    .sort((a, b) => a - b);
  let n = 1;
  // first available start where n, n+1, n+2 are all free
  while (usedH.includes(n) || usedH.includes(n + 1) || usedH.includes(n + 2)) n++;
  const fmt = (x: number) => "H" + String(x).padStart(4, "0");
  return { main: fmt(n), deposits: fmt(n + 1), payments: fmt(n + 2) };
}

function pushActivity(action: string, details: string, user: string) {
  const list = load<ActivityEntry[]>("bank_activity", []);
  const next: ActivityEntry[] = [
    { id: crypto.randomUUID(), at: new Date().toISOString(), user, action, details },
    ...list,
  ].slice(0, 500);
  saveRaw("bank_activity", next);
}

function nextRef(prefix: string, list: { ref: string }[]) {
  const max = list.reduce((acc, x) => {
    const n = parseInt(x.ref.replace(/\D/g, ""), 10);
    return isNaN(n) ? acc : Math.max(acc, n);
  }, 1000);
  return `${prefix}-${max + 1}`;
}

/* =====================  Service operations  ===================== */

export function createBank(input: {
  code: string;
  name_en: string;
  name_ar: string;
  iban?: string;
  currency?: string;
  openingBalance?: number;
  user?: string;
}): Bank {
  const codes = nextBankAccountCodes();
  const accs = readAccounts();
  const newAccounts: Account[] = [
    {
      code: codes.main,
      name_en: `${input.name_en} — Main Control`,
      name_ar: `${input.name_ar} — حساب التحكم الرئيسي`,
      type: "asset",
    },
    {
      code: codes.deposits,
      name_en: `${input.name_en} — Deposits (Incoming)`,
      name_ar: `${input.name_ar} — الإيداعات (الوارد)`,
      type: "asset",
    },
    {
      code: codes.payments,
      name_en: `${input.name_en} — Payments (Outgoing)`,
      name_ar: `${input.name_ar} — المدفوعات (الصادر)`,
      type: "asset",
    },
  ];
  writeAccounts([...accs, ...newAccounts]);

  const bank: Bank = {
    id: crypto.randomUUID(),
    code: input.code,
    name_en: input.name_en,
    name_ar: input.name_ar,
    iban: input.iban,
    currency: input.currency || "SAR",
    createdAt: new Date().toISOString(),
    mainAccount: codes.main,
    depositsAccount: codes.deposits,
    paymentsAccount: codes.payments,
    openingBalance: input.openingBalance || 0,
  };

  const banks = load<Bank[]>("banks_list", []);
  saveRaw("banks_list", [...banks, bank]);

  // Opening balance goes straight to H0001 (only legitimate posting to main)
  if (bank.openingBalance && bank.openingBalance !== 0) {
    const jr = readJournal();
    const ref = nextRef("JE", jr);
    writeJournal([
      ...jr,
      {
        id: crypto.randomUUID(),
        ref,
        date: new Date().toISOString().slice(0, 10),
        narrative: `Opening balance ${bank.code}`,
        lines: [
          { accountCode: bank.mainAccount, debit: bank.openingBalance, credit: 0 },
          { accountCode: "3101", debit: 0, credit: bank.openingBalance },
        ],
      },
    ]);
  }

  pushActivity("BANK_CREATE", `${bank.code} — accounts ${codes.main}/${codes.deposits}/${codes.payments}`, input.user || "system");
  return bank;
}

export function addBankTxn(input: {
  bankId: string;
  date: string;
  kind: BankTxnKind;
  amount: number;
  counterAccount: string;
  narrative: string;
  source?: "manual" | "import";
  user?: string;
}): BankTxn {
  const banks = load<Bank[]>("banks_list", []);
  const bank = banks.find((b) => b.id === input.bankId);
  if (!bank) throw new Error("Bank not found");
  const txns = load<BankTxn[]>("bank_txns", []);
  const ref = nextRef("BT", txns);
  const txn: BankTxn = {
    id: crypto.randomUUID(),
    bankId: bank.id,
    date: input.date,
    ref,
    kind: input.kind,
    amount: Math.abs(input.amount),
    counterAccount: input.counterAccount,
    narrative: input.narrative,
    source: input.source || "manual",
    createdBy: input.user || "system",
    createdAt: new Date().toISOString(),
  };
  saveRaw("bank_txns", [...txns, txn]);

  // Journal posting — H0001 (main) is NEVER touched here
  const jr = readJournal();
  const jref = nextRef("JE", jr);
  const lines =
    txn.kind === "deposit"
      ? [
          { accountCode: bank.depositsAccount, debit: txn.amount, credit: 0 },
          { accountCode: input.counterAccount, debit: 0, credit: txn.amount },
        ]
      : [
          { accountCode: input.counterAccount, debit: txn.amount, credit: 0 },
          { accountCode: bank.paymentsAccount, debit: 0, credit: txn.amount },
        ];
  writeJournal([
    ...jr,
    {
      id: crypto.randomUUID(),
      ref: jref,
      date: txn.date,
      narrative: `${bank.code} ${txn.kind} — ${txn.narrative}`,
      lines,
    },
  ]);

  pushActivity(
    txn.kind === "deposit" ? "BANK_DEPOSIT" : "BANK_PAYMENT",
    `${bank.code} ${ref} ${txn.amount.toFixed(2)} ${bank.currency}`,
    input.user || "system",
  );
  return txn;
}

/** Compute H-account balances directly from journal entries. */
export function bankAccountBalances(bank: Bank) {
  const jr = readJournal();
  const sum = (code: string) => {
    let d = 0, c = 0;
    for (const e of jr) for (const l of e.lines) if (l.accountCode === code) { d += l.debit; c += l.credit; }
    return d - c;
  };
  return {
    main: sum(bank.mainAccount),
    deposits: sum(bank.depositsAccount),
    payments: -sum(bank.paymentsAccount), // payments account natural balance is credit
  };
}

/** Reconciliation snapshot for a bank in a period (does not post anything). */
export function buildReconciliation(
  bank: Bank,
  periodStart: string,
  periodEnd: string,
  statementBalance: number,
) {
  const txns = load<BankTxn[]>("bank_txns", []);
  const inPeriod = txns.filter(
    (t) =>
      t.bankId === bank.id &&
      !t.reversed &&
      !t.settlementId &&
      t.date >= periodStart &&
      t.date <= periodEnd,
  );
  const totalDeposits = inPeriod.filter((t) => t.kind === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalPayments = inPeriod.filter((t) => t.kind === "payment").reduce((s, t) => s + t.amount, 0);
  const opening = bankAccountBalances(bank).main;
  const calculatedBalance = opening + totalDeposits - totalPayments;
  const difference = calculatedBalance - statementBalance;
  return {
    txnIds: inPeriod.map((t) => t.id),
    opening,
    totalDeposits,
    totalPayments,
    calculatedBalance,
    statementBalance,
    difference,
    matched: Math.abs(difference) < 0.005,
  };
}

/** Approve a reconciliation: posts settlement journal & zeroes H0002/H0003. */
export function approveSettlement(input: {
  bankId: string;
  periodStart: string;
  periodEnd: string;
  statementBalance: number;
  notes?: string;
  user?: string;
}): Settlement {
  const banks = load<Bank[]>("banks_list", []);
  const bank = banks.find((b) => b.id === input.bankId);
  if (!bank) throw new Error("Bank not found");

  const recon = buildReconciliation(bank, input.periodStart, input.periodEnd, input.statementBalance);

  const setts = load<Settlement[]>("bank_settlements", []);
  const ref = nextRef("SET", setts);
  const settlement: Settlement = {
    id: crypto.randomUUID(),
    bankId: bank.id,
    ref,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    openingBalance: recon.opening,
    totalDeposits: recon.totalDeposits,
    totalPayments: recon.totalPayments,
    calculatedBalance: recon.calculatedBalance,
    statementBalance: input.statementBalance,
    difference: recon.difference,
    status: "approved",
    txnIds: recon.txnIds,
    approvedBy: input.user || "system",
    approvedAt: new Date().toISOString(),
    notes: input.notes,
    createdBy: input.user || "system",
    createdAt: new Date().toISOString(),
  };
  saveRaw("bank_settlements", [...setts, settlement]);

  // Mark transactions as settled
  const txns = load<BankTxn[]>("bank_txns", []);
  saveRaw(
    "bank_txns",
    txns.map((t) => (recon.txnIds.includes(t.id) ? { ...t, settlementId: settlement.id } : t)),
  );

  // Post settlement journal: clear H0002 & H0003, net into H0001
  const jr = readJournal();
  const lines: { accountCode: string; debit: number; credit: number }[] = [];
  if (recon.totalDeposits > 0) {
    lines.push({ accountCode: bank.mainAccount, debit: recon.totalDeposits, credit: 0 });
    lines.push({ accountCode: bank.depositsAccount, debit: 0, credit: recon.totalDeposits });
  }
  if (recon.totalPayments > 0) {
    lines.push({ accountCode: bank.paymentsAccount, debit: recon.totalPayments, credit: 0 });
    lines.push({ accountCode: bank.mainAccount, debit: 0, credit: recon.totalPayments });
  }
  if (lines.length > 0) {
    writeJournal([
      ...jr,
      {
        id: crypto.randomUUID(),
        ref: nextRef("JE", jr),
        date: input.periodEnd,
        narrative: `Bank settlement ${ref} — ${bank.code}`,
        lines,
      },
    ]);
  }

  pushActivity(
    "SETTLEMENT_APPROVE",
    `${bank.code} ${ref} period ${input.periodStart}..${input.periodEnd} diff=${recon.difference.toFixed(2)}`,
    input.user || "system",
  );
  return settlement;
}

/** Reverse an approved settlement by posting an inverse journal. */
export function reverseSettlement(settlementId: string, user?: string): Settlement {
  const setts = load<Settlement[]>("bank_settlements", []);
  const src = setts.find((s) => s.id === settlementId);
  if (!src) throw new Error("Settlement not found");
  if (src.status !== "approved") throw new Error("Only approved settlements can be reversed");
  const banks = load<Bank[]>("banks_list", []);
  const bank = banks.find((b) => b.id === src.bankId);
  if (!bank) throw new Error("Bank not found");

  // Inverse posting
  const jr = readJournal();
  const lines: { accountCode: string; debit: number; credit: number }[] = [];
  if (src.totalDeposits > 0) {
    lines.push({ accountCode: bank.depositsAccount, debit: src.totalDeposits, credit: 0 });
    lines.push({ accountCode: bank.mainAccount, debit: 0, credit: src.totalDeposits });
  }
  if (src.totalPayments > 0) {
    lines.push({ accountCode: bank.mainAccount, debit: src.totalPayments, credit: 0 });
    lines.push({ accountCode: bank.paymentsAccount, debit: 0, credit: src.totalPayments });
  }
  const revRef = nextRef("SET", setts);
  if (lines.length > 0) {
    writeJournal([
      ...jr,
      {
        id: crypto.randomUUID(),
        ref: nextRef("JE", jr),
        date: new Date().toISOString().slice(0, 10),
        narrative: `Reversal of settlement ${src.ref} — ${bank.code}`,
        lines,
      },
    ]);
  }

  // Reopen the transactions
  const txns = load<BankTxn[]>("bank_txns", []);
  saveRaw(
    "bank_txns",
    txns.map((t) => (src.txnIds.includes(t.id) ? { ...t, settlementId: undefined } : t)),
  );

  const reversal: Settlement = {
    ...src,
    id: crypto.randomUUID(),
    ref: revRef,
    status: "reversed",
    reversalOfId: src.id,
    reversedBy: user || "system",
    reversedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: user || "system",
  };
  saveRaw("bank_settlements", [
    ...setts.map((s) => (s.id === src.id ? { ...s, status: "reversed" as const, reversedBy: user || "system", reversedAt: new Date().toISOString() } : s)),
    reversal,
  ]);

  pushActivity("SETTLEMENT_REVERSE", `${bank.code} reversed ${src.ref}`, user || "system");
  return reversal;
}

export function importStatementLines(bankId: string, lines: Omit<BankStatementLine, "id" | "bankId" | "importedAt">[], user?: string) {
  const existing = load<BankStatementLine[]>("bank_statements", []);
  const added: BankStatementLine[] = lines.map((l) => ({
    ...l,
    id: crypto.randomUUID(),
    bankId,
    importedAt: new Date().toISOString(),
  }));
  saveRaw("bank_statements", [...existing, ...added]);
  pushActivity("STATEMENT_IMPORT", `${added.length} lines imported`, user || "system");
  return added;
}

export function matchStatementLine(lineId: string, txnId: string | undefined) {
  const list = load<BankStatementLine[]>("bank_statements", []);
  saveRaw(
    "bank_statements",
    list.map((l) => (l.id === lineId ? { ...l, matchedTxnId: txnId } : l)),
  );
}

export function fmt(n: number, currency = "SAR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n || 0);
}
