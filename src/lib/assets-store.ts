// Fixed Assets — registry + straight-line depreciation + disposal,
// posting balanced JEs through posting-rules.
import { useEffect, useState, useCallback } from "react";
import { postEvent } from "@/lib/posting-rules";

const NS = "erp:";

export type AssetCategory = "medical" | "it" | "furniture" | "vehicle" | "building";
export type AssetStatus = "active" | "disposed";

export type FixedAsset = {
  id: string;
  ref: string;                   // FA-2026-0001
  name: string;
  category: AssetCategory;
  acquisitionDate: string;       // YYYY-MM-DD
  cost: number;                  // original gross cost
  salvageValue: number;
  usefulLifeYears: number;       // for straight-line
  costCenterId?: string;
  accumulated: number;           // depreciation booked so far
  lastDepreciatedMonth?: string; // YYYY-MM
  status: AssetStatus;
  disposedAt?: string;
  disposalProceeds?: number;
};

export type DepreciationEntry = {
  id: string;
  assetId: string;
  month: string;                 // YYYY-MM
  amount: number;
  journalRef: string;
  postedAt: string;
};

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

export const useFixedAssets         = () => useStore<FixedAsset[]>("fixed_assets", []);
export const useDepreciationEntries = () => useStore<DepreciationEntry[]>("fa_depreciation", []);

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

function appendJournal(je: { id: string; ref: string; date: string; narrative: string; lines: unknown[] }) {
  const jr = JSON.parse(localStorage.getItem(NS + "journal") || "[]");
  localStorage.setItem(NS + "journal", JSON.stringify([...jr, je]));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));
}

export function monthlyDepreciation(a: FixedAsset): number {
  const months = Math.max(1, a.usefulLifeYears * 12);
  return Math.round(((a.cost - a.salvageValue) / months) * 100) / 100;
}

export function netBookValue(a: FixedAsset): number {
  return Math.round((a.cost - a.accumulated) * 100) / 100;
}

export function acquireAsset(input: {
  name: string; category: AssetCategory; acquisitionDate: string;
  cost: number; salvageValue: number; usefulLifeYears: number;
  costCenterId?: string; paymentMethod?: "bank"|"cash"|"ap";
}): FixedAsset {
  const list = load<FixedAsset[]>("fixed_assets", []);
  const asset: FixedAsset = {
    id: crypto.randomUUID(),
    ref: nextRef("FA", list),
    name: input.name,
    category: input.category,
    acquisitionDate: input.acquisitionDate,
    cost: input.cost,
    salvageValue: input.salvageValue,
    usefulLifeYears: input.usefulLifeYears,
    costCenterId: input.costCenterId,
    accumulated: 0,
    status: "active",
  };
  const { journal } = postEvent("fixed-assets", {
    kind: "asset.acquired", ref: asset.ref, date: asset.acquisitionDate,
    cost: asset.cost, paymentMethod: input.paymentMethod || "bank",
  });
  appendJournal(journal);
  saveRaw("fixed_assets", [...list, asset]);
  return asset;
}

export function runMonthlyDepreciation(month: string): { posted: number; total: number } {
  const list = load<FixedAsset[]>("fixed_assets", []);
  const entries = load<DepreciationEntry[]>("fa_depreciation", []);
  let posted = 0; let total = 0;
  const updated = list.map(a => {
    if (a.status !== "active") return a;
    if (a.lastDepreciatedMonth === month) return a;
    if (a.acquisitionDate.slice(0, 7) > month) return a;
    const remainingDep = Math.max(0, (a.cost - a.salvageValue) - a.accumulated);
    if (remainingDep <= 0) return a;
    const amt = Math.min(remainingDep, monthlyDepreciation(a));
    const ref = `${a.ref}-DEP-${month}`;
    const { journal } = postEvent("fixed-assets", {
      kind: "asset.depreciated", ref, date: `${month}-28`,
      amount: amt, costCenterId: a.costCenterId,
    });
    appendJournal(journal);
    entries.push({
      id: crypto.randomUUID(), assetId: a.id, month, amount: amt,
      journalRef: journal.ref, postedAt: new Date().toISOString(),
    });
    posted += 1; total += amt;
    return { ...a, accumulated: a.accumulated + amt, lastDepreciatedMonth: month };
  });
  saveRaw("fixed_assets", updated);
  saveRaw("fa_depreciation", entries);
  return { posted, total };
}

export function disposeAsset(assetId: string, proceeds: number): FixedAsset {
  const list = load<FixedAsset[]>("fixed_assets", []);
  const a = list.find(x => x.id === assetId);
  if (!a) throw new Error("Asset not found");
  if (a.status !== "active") throw new Error("Asset already disposed");
  const ref = `${a.ref}-DISP`;
  const { journal } = postEvent("fixed-assets", {
    kind: "asset.disposed", ref, date: new Date().toISOString().slice(0,10),
    cost: a.cost, accumulated: a.accumulated, proceeds,
  });
  appendJournal(journal);
  const next: FixedAsset = { ...a, status: "disposed",
    disposedAt: new Date().toISOString(), disposalProceeds: proceeds };
  saveRaw("fixed_assets", list.map(x => x.id === a.id ? next : x));
  return next;
}
