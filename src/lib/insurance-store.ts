// Insurance claims data layer (localStorage mock).
// Claim → groups invoices payable by insurance → submit → adjudicate → settle.
import { useCallback, useEffect, useState } from "react";

const NS = "insurance:";

export type Insurer = {
  id: string;
  code: string;
  name_ar: string;
  contractRate?: number; // % paid by insurer (e.g. 80)
  active: boolean;
};

export type ClaimStatus =
  | "draft" | "submitted" | "under_review" | "approved"
  | "rejected" | "settled" | "cancelled";

export type ClaimLine = {
  id: string;
  patientRef: string;
  invoiceNo?: string;
  serviceName: string;
  gross: number;             // billed
  approved: number;          // approved amount (post-adjudication)
};

export type InsuranceClaim = {
  id: string;
  ref: string;               // CLM-####
  insurerId: string;
  status: ClaimStatus;
  lines: ClaimLine[];
  submittedAt?: string;
  settledAt?: string;
  rejectionReason?: string;
  netReceived?: number;
  createdAt: string;
};

const SEED_INSURERS: Insurer[] = [
  { id: "ins-1", code: "BUPA",  name_ar: "بوبا العربية",         contractRate: 80, active: true },
  { id: "ins-2", code: "TAW",   name_ar: "التعاونية للتأمين",     contractRate: 80, active: true },
  { id: "ins-3", code: "MEDG",  name_ar: "ميدجلف",                contractRate: 70, active: true },
  { id: "ins-4", code: "WALAA", name_ar: "ولاء للتأمين",          contractRate: 75, active: true },
];

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
  window.dispatchEvent(new CustomEvent("insurance:change", { detail: { key } }));
}

export function useInsStore<T>(key: string, seed: T) {
  const [v, setV] = useState<T>(seed);
  useEffect(() => {
    setV(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setV(load(key, seed));
    };
    window.addEventListener("insurance:change", on);
    return () => window.removeEventListener("insurance:change", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback((next: T | ((p: T) => T)) => {
    setV((prev) => {
      const nv = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      save(key, nv);
      return nv;
    });
  }, [key]);
  return [v, update] as const;
}

export const useInsurers = () => useInsStore<Insurer[]>("insurers", SEED_INSURERS);
export const useClaims = () => useInsStore<InsuranceClaim[]>("claims", []);

export function nextClaimRef(claims: InsuranceClaim[]) {
  const max = claims.reduce((a, c) => {
    const n = parseInt((c.ref || "").replace(/\D/g, ""), 10);
    return isNaN(n) ? a : Math.max(a, n);
  }, 0);
  return `CLM-${String(max + 1).padStart(4, "0")}`;
}

export function claimGross(c: InsuranceClaim) {
  return c.lines.reduce((a, l) => a + (l.gross || 0), 0);
}
export function claimApproved(c: InsuranceClaim) {
  return c.lines.reduce((a, l) => a + (l.approved || 0), 0);
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "مسودة", submitted: "مقدّمة", under_review: "قيد المراجعة",
  approved: "معتمدة", rejected: "مرفوضة", settled: "مسددة", cancelled: "ملغاة",
};
export function claimStatusBadge(s: ClaimStatus) {
  const m: Record<ClaimStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/15 text-destructive",
    settled: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300",
    cancelled: "bg-destructive/15 text-destructive",
  };
  return m[s];
}
