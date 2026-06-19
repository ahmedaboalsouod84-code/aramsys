// Procurement (Purchases) data layer: PR → PO → GR → VI → CN
// localStorage mock store. Strict document chain enforced.
import { useEffect, useState, useCallback } from "react";

const NS = "procure:";

/* ---------- Types ---------- */
export type Supplier = {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  vatNo?: string;
  phone?: string;
  paymentTerms?: string;
  active: boolean;
};

export type PrLine = {
  id: string;
  itemName: string;
  qty: number;
  estUnitCost: number;
  note?: string;
};

export type PrStatus = "draft" | "submitted" | "approved" | "rejected" | "converted" | "cancelled";
export type PurchaseRequest = {
  id: string;
  ref: string;            // PR-####
  requestedBy: string;
  department: string;
  needBy?: string;
  status: PrStatus;
  lines: PrLine[];
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  poRef?: string;
};

export type OfferLine = { itemName: string; qty: number; unitCost: number };
export type SupplierOffer = {
  id: string;
  ref: string;            // RFQ-####
  prRef?: string;
  supplierId: string;
  lines: OfferLine[];
  total: number;
  validUntil?: string;
  status: "received" | "selected" | "rejected";
  createdAt: string;
};

export type PoLine = {
  id: string;
  itemName: string;
  qty: number;
  unitCost: number;
  receivedQty: number;
  invoicedQty: number;
  vatPct: number;
};

export type PoStatus = "draft" | "approved" | "partial_received" | "received" | "closed" | "cancelled";
export type PurchaseOrder = {
  id: string;
  ref: string;            // PO-####
  prRef?: string;
  supplierId: string;
  lines: PoLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: PoStatus;
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  expectedAt?: string;
};

export type GrLine = {
  id: string;
  poLineId: string;
  itemName: string;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  unitCost: number;
  invoicedQty: number;
};
export type GrStatus = "draft" | "posted" | "invoiced" | "partial_invoiced";
export type GoodsReceipt = {
  id: string;
  ref: string;            // GR-####
  poRef: string;
  supplierId: string;
  receivedBy: string;
  receivedAt: string;
  status: GrStatus;
  warehouse?: string;
  lines: GrLine[];
  notes?: string;
};

export type ViLine = {
  id: string;
  grLineId: string;
  itemName: string;
  qty: number;
  unitCost: number;
  vatPct: number;
  creditedQty: number;
};
export type ViStatus = "draft" | "approved" | "paid" | "partial_credited" | "credited" | "cancelled";
export type VendorInvoice = {
  id: string;
  ref: string;            // VI-####
  invoiceNo: string;      // supplier's invoice number
  grRef: string;
  poRef: string;
  supplierId: string;
  lines: ViLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: ViStatus;
  createdAt: string;
  dueDate?: string;
};

export type CnLine = {
  id: string;
  viLineId: string;
  itemName: string;
  qty: number;
  unitCost: number;
  vatPct: number;
  reason: "damaged" | "wrong_item" | "expired" | "overdelivery" | "quality" | "other";
};
export type CreditNote = {
  id: string;
  ref: string;            // CN-####
  viRef: string;
  supplierId: string;
  lines: CnLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  status: "draft" | "approved" | "applied";
};

/* ---------- Seeds ---------- */
const SEED_SUPPLIERS: Supplier[] = [
  { id: "sup-1", code: "SUP-001", name_ar: "شركة المستلزمات الطبية المحدودة", vatNo: "300012345600003", phone: "0112223344", paymentTerms: "Net 30", active: true },
  { id: "sup-2", code: "SUP-002", name_ar: "مؤسسة الأدوية الموحدة", vatNo: "300054321600003", phone: "0115556677", paymentTerms: "Net 45", active: true },
  { id: "sup-3", code: "SUP-003", name_ar: "مصنع الأطقم المعقمة", phone: "0118889900", paymentTerms: "Net 15", active: true },
];

/* ---------- Storage ---------- */
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
  window.dispatchEvent(new CustomEvent("procure:change", { detail: { key } }));
}

export function useStore<T>(key: string, seed: T) {
  const [v, setV] = useState<T>(seed);
  useEffect(() => {
    setV(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setV(load(key, seed));
    };
    window.addEventListener("procure:change", on);
    return () => window.removeEventListener("procure:change", on);
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

export const useSuppliers = () => useStore<Supplier[]>("suppliers", SEED_SUPPLIERS);
export const usePRs = () => useStore<PurchaseRequest[]>("prs", []);
export const useOffers = () => useStore<SupplierOffer[]>("offers", []);
export const usePOs = () => useStore<PurchaseOrder[]>("pos", []);
export const useGRs = () => useStore<GoodsReceipt[]>("grs", []);
export const useVIs = () => useStore<VendorInvoice[]>("vis", []);
export const useCNs = () => useStore<CreditNote[]>("cns", []);

/* ---------- Helpers ---------- */
function pad(n: number, w = 4) { return String(n).padStart(w, "0"); }
export function nextRef(prefix: string, items: { ref?: string }[]) {
  const max = items.reduce((a, i) => {
    const n = parseInt((i.ref || "").replace(/\D/g, ""), 10);
    return isNaN(n) ? a : Math.max(a, n);
  }, 0);
  return `${prefix}-${pad(max + 1)}`;
}

export function fmtSAR(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n);
}

export function poTotals(po: { lines: PoLine[] }) {
  let subtotal = 0, vat = 0;
  for (const l of po.lines) {
    const line = l.qty * l.unitCost;
    subtotal += line;
    vat += line * (l.vatPct / 100);
  }
  return { subtotal, vat, total: subtotal + vat };
}

export function viTotals(vi: { lines: ViLine[] }) {
  let subtotal = 0, vat = 0;
  for (const l of vi.lines) {
    const line = l.qty * l.unitCost;
    subtotal += line;
    vat += line * (l.vatPct / 100);
  }
  return { subtotal, vat, total: subtotal + vat };
}

export function cnTotals(cn: { lines: CnLine[] }) {
  let subtotal = 0, vat = 0;
  for (const l of cn.lines) {
    const line = l.qty * l.unitCost;
    subtotal += line;
    vat += line * (l.vatPct / 100);
  }
  return { subtotal, vat, total: subtotal + vat };
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة", submitted: "مقدّم", approved: "معتمد", rejected: "مرفوض",
  converted: "محوّل", cancelled: "ملغي", partial_received: "استلام جزئي",
  received: "تم الاستلام", closed: "مغلق", posted: "مرحّل", invoiced: "تمت فوترته",
  partial_invoiced: "فوترة جزئية", paid: "مدفوع", partial_credited: "إشعار جزئي",
  credited: "تم الإشعار", applied: "مطبّق", selected: "مختار",
};

export function statusBadge(s: string) {
  const m: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-destructive/15 text-destructive",
    converted: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    partial_received: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    closed: "bg-muted text-muted-foreground",
    posted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    invoiced: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    partial_invoiced: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    partial_credited: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    credited: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    applied: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  };
  return m[s] || "bg-muted text-muted-foreground";
}
