// Tabby / Tamara (BNPL) — Claim Builder + Commission Engine.
//
// Business flow (SAP-style):
//   1. Patient pays via Tabby/Tamara at reception → Payment recorded with method=tabby|tamara.
//   2. Posting (auto):
//        Dr  حـ/ 1131 BNPL Receivable (Tabby/Tamara)   = gross amount
//        Dr  حـ/ 5310 BNPL Commission Expense          = commission
//          Cr حـ/ Patient Receivable                   = gross amount
//          Cr حـ/ 2150 BNPL Commission Payable         = commission
//        (commission deducted by provider at settlement)
//   3. Reception/Accountant builds a Claim (batch of payments) → submits to provider.
//   4. Provider settles (T+N days) → bank receives NET amount → claim marked "settled".
//        Dr  حـ/ 1101 Bank   = NET
//          Cr حـ/ 1131 BNPL Receivable = GROSS
//          (commission already expensed at step 2)
//
// localStorage-only store, mirrors journey-store pattern.
import { useEffect, useState, useCallback } from "react";

const NS = "bnpl:";

export type BnplProvider = "tabby" | "tamara";

export type BnplConfig = {
  provider: BnplProvider;
  enabled: boolean;
  commissionPct: number;       // e.g. 5.5
  settlementDays: number;      // T+N
  receivableAccount: string;   // 1131 / 1132
  commissionAccount: string;   // 5310
  bankAccount: string;         // 1101
};

export type BnplClaimStatus = "draft" | "submitted" | "approved" | "settled" | "rejected";

export type BnplClaim = {
  id: string;
  ref: string;             // CLM-T-2026-0001 (T=tabby, M=tamara)
  provider: BnplProvider;
  paymentIds: string[];    // payment.ref list
  gross: number;
  commission: number;
  net: number;
  status: BnplClaimStatus;
  createdAt: string;
  createdBy: string;
  submittedAt?: string;
  approvedAt?: string;
  settledAt?: string;
  settledRef?: string;     // bank deposit reference
  rejectedReason?: string;
};

const DEFAULT_CONFIGS: BnplConfig[] = [
  { provider: "tabby",  enabled: true, commissionPct: 5.5, settlementDays: 7,  receivableAccount: "1131", commissionAccount: "5310", bankAccount: "1101" },
  { provider: "tamara", enabled: true, commissionPct: 6.0, settlementDays: 14, receivableAccount: "1132", commissionAccount: "5310", bankAccount: "1101" },
];

/* ---------- storage ---------- */
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
  window.dispatchEvent(new CustomEvent("bnpl:change", { detail: { key } }));
}
export function useBStore<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  useEffect(() => {
    setValue(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(load(key, seed));
    };
    window.addEventListener("bnpl:change", on);
    return () => window.removeEventListener("bnpl:change", on);
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

export const useBnplConfigs = () => useBStore<BnplConfig[]>("configs", DEFAULT_CONFIGS);
export const useBnplClaims  = () => useBStore<BnplClaim[]>("claims", []);

/* ---------- helpers ---------- */
export function getConfig(configs: BnplConfig[], provider: BnplProvider): BnplConfig {
  return configs.find(c => c.provider === provider) || DEFAULT_CONFIGS.find(c => c.provider === provider)!;
}

export function commissionFor(amount: number, pct: number): { commission: number; net: number } {
  const commission = Math.round(amount * (pct / 100) * 100) / 100;
  return { commission, net: amount - commission };
}

export function nextClaimRef(claims: BnplClaim[], provider: BnplProvider): string {
  const year = new Date().getFullYear();
  const prefix = provider === "tabby" ? "T" : "M";
  const max = claims.filter(c => c.provider === provider && c.ref.includes(`-${year}-`))
    .reduce((a, c) => Math.max(a, parseInt(c.ref.split("-").pop() || "0", 10)), 0);
  return `CLM-${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function claimStatusLabel(s: BnplClaimStatus): string {
  return ({
    draft: "مسودة",
    submitted: "مُرسلة للمزود",
    approved: "معتمدة من المزود",
    settled: "تمت التسوية بنكياً",
    rejected: "مرفوضة",
  } as const)[s];
}
