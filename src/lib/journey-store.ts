// Patient Journey full data layer (localStorage, mock-only).
// Self-contained store covering Services, Patient Cases, Invoices, Payments,
// Radiology, Tool Packets, Material Requests, Accounting Batches, Activity Log.
import { useEffect, useState, useCallback } from "react";

const NS = "journey:";
const VAT_RATE = 0.15;

/* ---------- Types ---------- */
export type ServiceCategory =
  | "consultation" | "radiology" | "dental" | "surgery"
  | "orthodontics" | "followup" | "other";

export type Service = {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  category: ServiceCategory;
  department: string;
  price: number;
  taxable: boolean;
  vat: number; // percent
  active: boolean;
  requiresApproval: boolean;
  editableByDoctor: boolean;
};

export type Doctor = {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  department: string;
  room?: string;
  commissionPct?: number;
};

export type PatientAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

export type Patient = {
  id: string;
  fileNo: string;        // == idNumber
  idNumber: string;      // رقم الهوية / الإقامة
  nationality: string;   // "SA" = سعودي (بدون ضريبة قيمة مضافة)
  name_ar: string;
  name_en?: string;
  phone: string;
  gender?: "M" | "F";
  dob?: string;
  employer?: string;
  attachments?: PatientAttachment[];
};

export function isVatExempt(p?: Patient | null): boolean {
  return !!p && p.nationality === "SA";
}

// Full 8-stage case lifecycle from the gap analysis.
// Backwards-compat: legacy values "active" and "pending_payment" remain valid.
export type CaseStatus =
  | "registered"
  | "under_diagnosis"
  | "under_treatment"
  | "medically_completed"
  | "pending_payment"      // = Awaiting Payment
  | "partially_paid"
  | "fully_paid"
  | "closed"
  | "cancelled"
  | "active";              // legacy alias of under_treatment
export type PayStatus = "unpaid" | "partial" | "paid" | "refunded";

/** Derive the canonical case status from medical + payment state. */
export function computeCaseStatus(
  current: CaseStatus,
  medicallyCompleted: boolean,
  invoiceTotal: number,
  paidTotal: number,
): CaseStatus {
  if (current === "cancelled" || current === "closed") return current;
  if (!medicallyCompleted) {
    if (current === "registered" || current === "under_diagnosis") return current;
    return "under_treatment";
  }
  // Medically completed → status is driven by payment.
  if (invoiceTotal <= 0) return "medically_completed";
  const remaining = invoiceTotal - paidTotal;
  if (paidTotal <= 0) return "pending_payment";
  if (remaining > 0.005) return "partially_paid";
  return "fully_paid";
}

export type CaseService = {
  id: string;
  serviceId: string;
  code: string;
  name_ar: string;
  qty: number;
  unitPrice: number;
  originalPrice: number;
  priceChangeReason?: string;
  priceChangedBy?: string;
  free: boolean;
  taxable: boolean;
  vat: number;
  addedBy: string; // username
  addedByRole: string;
  addedAt: string;
  invoiced: boolean;
  invoiceId?: string;
  note?: string;
};

export type CaseNote = {
  id: string;
  by: string;
  byRole: string;
  at: string;
  text: string;
  followUp?: string;
};

export type PatientCase = {
  id: string;
  caseNo: string; // CASE-2026-0001
  patientId: string;
  doctorId: string;
  branch: string;
  department: string;
  room?: string;
  status: CaseStatus;
  payStatus: PayStatus;
  openedAt: string;
  closedAt?: string;
  services: CaseService[];
  notes: CaseNote[];
  followUpDate?: string;
  needsFollowUp: boolean;
  medicallyCompleted: boolean;
};

export type PaymentMethod = "cash" | "card" | "bank" | "insurance" | "tabby" | "tamara";

export type Payment = {
  id: string;
  ref: string;
  caseId: string;
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedBy: string;
  at: string;
  note?: string;
};

export type InvoiceLine = {
  serviceId: string;
  code: string;
  name_ar: string;
  qty: number;
  unitPrice: number;
  taxable: boolean;
  vat: number;
};

export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "cancelled" | "refunded";

export type Invoice = {
  id: string;
  invoiceNo: string;
  caseId: string;
  patientId: string;
  doctorId: string;
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  paid: number;
  status: InvoiceStatus;
  createdBy: string;
  createdAt: string;
};

export type RadiologyStatus =
  | "requested" | "awaiting_payment" | "paid" | "in_progress"
  | "result_uploaded" | "reviewed" | "cancelled";

export type RadiologyRequest = {
  id: string;
  ref: string;
  caseId: string;
  serviceId: string;
  doctorId: string;
  free: boolean;
  status: RadiologyStatus;
  requestedAt: string;
  resultUrl?: string;
  resultNote?: string;
  reviewedAt?: string;
};

export type PacketStatus = "available" | "used" | "returned" | "damaged" | "sterilization";

export type ToolPacket = {
  id: string;
  code: string;
  name_ar: string;
  cost: number;
  qty: number;
  room: string;
  status: PacketStatus;
  doctorId?: string;
  caseId?: string;
  usedAt?: string;
  usedBy?: string;
};

export type MaterialReqStatus =
  | "requested" | "approved" | "issued" | "received" | "used" | "cancelled" | "returned";

export type MaterialRequest = {
  id: string;
  ref: string;
  caseId: string;
  doctorId: string;
  requestedBy: string;
  itemName: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  status: MaterialReqStatus;
  issuedBy?: string;
  issuedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  usedAt?: string;
};

export type BatchType = "revenue" | "payment" | "consumption" | "expense" | "receivables";
export type BatchStatus = "draft" | "reviewed" | "posted" | "cancelled";

export type BatchLine = {
  label: string;
  debit: number;
  credit: number;
  dim?: { doctor?: string; case?: string; service?: string; dept?: string; method?: string };
};

export type AccountingBatch = {
  id: string;
  ref: string;
  type: BatchType;
  periodFrom: string;
  periodTo: string;
  status: BatchStatus;
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  lines: BatchLine[];
  totalDebit: number;
  totalCredit: number;
  sourceIds: string[];
};

export type ActivityEntry = {
  id: string;
  at: string;
  user: string;
  role: string;
  action: string;
  caseId?: string;
  oldValue?: string;
  newValue?: string;
  detail?: string;
};

/* ---------- Doctor Workspace: Treatment Plans + Prescriptions ---------- */
export type TreatmentPlanItemStatus = "planned" | "in_progress" | "done" | "cancelled";
export type TreatmentPlanItem = {
  id: string;
  caseId: string;
  doctorId: string;
  serviceId?: string;          // optional link to a Service
  title: string;               // e.g. "حشو ضرس علوي أيمن"
  toothCode?: string;          // e.g. "16"
  sessions: number;
  estimatedCost: number;
  scheduledAt?: string;
  status: TreatmentPlanItemStatus;
  createdBy: string;
  createdAt: string;
  notes?: string;
};

export type PrescriptionItem = {
  drugName: string;
  dose: string;                // "500 mg"
  frequency: string;           // "كل 8 ساعات"
  durationDays: number;
  route?: string;              // "فموي / موضعي"
  notes?: string;
};

export type Prescription = {
  id: string;
  ref: string;                 // RX-####
  caseId: string;
  patientId: string;
  doctorId: string;
  issuedAt: string;
  items: PrescriptionItem[];
  diagnosis?: string;
  followUpDate?: string;
  status: "draft" | "issued" | "dispensed" | "cancelled";
};

/* ---------- Seed ---------- */
const SEED_SERVICES: Service[] = [
  { id: "sv1", code: "CON-001", name_en: "General Consultation", name_ar: "كشف عام", category: "consultation", department: "العيادة العامة", price: 150, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: false },
  { id: "sv2", code: "CON-002", name_en: "Specialist Consultation", name_ar: "كشف استشاري", category: "consultation", department: "العيادة العامة", price: 300, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: true },
  { id: "sv3", code: "CON-003", name_en: "Follow-up", name_ar: "متابعة", category: "followup", department: "العيادة العامة", price: 75, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: false },
  { id: "sv4", code: "DEN-001", name_en: "Dental Cleaning", name_ar: "تنظيف أسنان", category: "dental", department: "الأسنان", price: 250, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: true },
  { id: "sv5", code: "DEN-002", name_en: "Filling", name_ar: "حشو", category: "dental", department: "الأسنان", price: 350, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: true },
  { id: "sv6", code: "DEN-003", name_en: "Root Canal", name_ar: "علاج عصب", category: "dental", department: "الأسنان", price: 1200, taxable: true, vat: 15, active: true, requiresApproval: true, editableByDoctor: true },
  { id: "sv7", code: "ORT-001", name_en: "Orthodontics Adjustment", name_ar: "ضبط تقويم", category: "orthodontics", department: "التقويم", price: 400, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: true },
  { id: "sv8", code: "RAD-001", name_en: "X-Ray Single", name_ar: "أشعة سينية", category: "radiology", department: "الأشعة", price: 120, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: false },
  { id: "sv9", code: "RAD-002", name_en: "Panoramic X-Ray", name_ar: "أشعة بانوراما", category: "radiology", department: "الأشعة", price: 200, taxable: true, vat: 15, active: true, requiresApproval: false, editableByDoctor: false },
  { id: "sv10", code: "SUR-001", name_en: "Minor Surgery", name_ar: "جراحة صغرى", category: "surgery", department: "العمليات", price: 2500, taxable: true, vat: 15, active: true, requiresApproval: true, editableByDoctor: false },
];

const SEED_DOCTORS: Doctor[] = [
  { id: "dr1", code: "DR-001", name_en: "Dr. Khalid", name_ar: "د. خالد العتيبي", department: "العيادة العامة", room: "R-101", commissionPct: 40 },
  { id: "dr2", code: "DR-002", name_en: "Dr. Sara", name_ar: "د. سارة الزهراني", department: "الأسنان", room: "R-201", commissionPct: 45 },
  { id: "dr3", code: "DR-003", name_en: "Dr. Ahmed", name_ar: "د. أحمد الشمري", department: "التقويم", room: "R-202", commissionPct: 50 },
];

const SEED_PATIENTS: Patient[] = [
  { id: "1078451236", fileNo: "1078451236", idNumber: "1078451236", nationality: "SA", name_ar: "محمد عبدالله", phone: "0501234567", gender: "M", dob: "1985-03-12", employer: "وزارة الصحة" },
  { id: "2345678901", fileNo: "2345678901", idNumber: "2345678901", nationality: "SA", name_ar: "فاطمة الحربي", phone: "0507654321", gender: "F", dob: "1992-08-04" },
  { id: "2456789012", fileNo: "2456789012", idNumber: "2456789012", nationality: "EG", name_ar: "خالد الدوسري", phone: "0551112233", gender: "M", dob: "1978-11-20", employer: "شركة خاصة" },
  { id: "2567890123", fileNo: "2567890123", idNumber: "2567890123", nationality: "SA", name_ar: "نورة القحطاني", phone: "0533445566", gender: "F", dob: "2001-01-15" },
];

const SEED_PACKETS: ToolPacket[] = [
  { id: "pk1", code: "PKT-001", name_ar: "طقم فحص أسنان معقم", cost: 25, qty: 10, room: "R-201", status: "available" },
  { id: "pk2", code: "PKT-002", name_ar: "طقم حشو أسنان", cost: 60, qty: 5, room: "R-201", status: "available" },
  { id: "pk3", code: "PKT-003", name_ar: "طقم كشف عام", cost: 10, qty: 20, room: "R-101", status: "available" },
  { id: "pk4", code: "PKT-004", name_ar: "طقم جراحة صغرى", cost: 180, qty: 3, room: "R-301", status: "sterilization" },
];

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
  window.dispatchEvent(new CustomEvent("journey:change", { detail: { key } }));
}

export function useJStore<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(seed);
  useEffect(() => {
    setValue(load(key, seed));
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail?.key === key) setValue(load(key, seed));
    };
    window.addEventListener("journey:change", on);
    return () => window.removeEventListener("journey:change", on);
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

/* ---------- Hooks ---------- */
export const useServices = () => useJStore<Service[]>("services", SEED_SERVICES);
export const useDoctors = () => useJStore<Doctor[]>("doctors", SEED_DOCTORS);
export const usePatients = () => useJStore<Patient[]>("patients", SEED_PATIENTS);
export const useCases = () => useJStore<PatientCase[]>("cases", []);
export const useInvoices = () => useJStore<Invoice[]>("invoices", []);
export const usePayments = () => useJStore<Payment[]>("payments", []);
export const useRadiology = () => useJStore<RadiologyRequest[]>("radiology", []);
export const usePackets = () => useJStore<ToolPacket[]>("packets", SEED_PACKETS);
export const useMatRequests = () => useJStore<MaterialRequest[]>("matreq", []);
export const useBatches = () => useJStore<AccountingBatch[]>("batches", []);
export const useActivity = () => useJStore<ActivityEntry[]>("activity", []);
export const useTreatmentPlans = () => useJStore<TreatmentPlanItem[]>("treatment_plans", []);
export const usePrescriptions = () => useJStore<Prescription[]>("prescriptions", []);

/* ---------- Numbering ---------- */
function pad(n: number, w = 4) { return String(n).padStart(w, "0"); }
export function nextCaseNo(cases: PatientCase[]) {
  const year = new Date().getFullYear();
  const max = cases.filter(c => c.caseNo.includes(`-${year}-`))
    .reduce((a, c) => Math.max(a, parseInt(c.caseNo.split("-").pop() || "0", 10)), 0);
  return `CASE-${year}-${pad(max + 1)}`;
}
export function nextInvoiceNo(inv: Invoice[]) {
  const year = new Date().getFullYear();
  const max = inv.filter(i => i.invoiceNo.includes(`-${year}-`))
    .reduce((a, i) => Math.max(a, parseInt(i.invoiceNo.split("-").pop() || "0", 10)), 0);
  return `INV-${year}-${pad(max + 1)}`;
}
export function nextRef(prefix: string, items: { ref?: string }[]) {
  const max = items.reduce((a, i) => {
    const n = parseInt((i.ref || "").replace(/\D/g, ""), 10);
    return isNaN(n) ? a : Math.max(a, n);
  }, 1000);
  return `${prefix}-${max + 1}`;
}

/* ---------- Helpers ---------- */
export function fmtSAR(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n);
}
export const VAT = VAT_RATE;

export function caseTotals(c: PatientCase, invoices: Invoice[], payments: Payment[], patient?: Patient | null) {
  const vatExempt = isVatExempt(patient);
  let subtotal = 0, vat = 0;
  for (const s of c.services) {
    if (s.free) continue;
    const line = s.qty * s.unitPrice;
    subtotal += line;
    if (s.taxable && !vatExempt) vat += line * (s.vat / 100);
  }
  const total = subtotal + vat;
  const paid = payments.filter(p => p.caseId === c.id).reduce((a, p) => a + p.amount, 0);
  const invoiced = invoices.filter(i => i.caseId === c.id && i.status !== "cancelled")
    .reduce((a, i) => a + i.total, 0);
  return { subtotal, vat, total, paid, remaining: total - paid, invoiced, vatExempt };
}

export function logActivity(setActivity: (u: (p: ActivityEntry[]) => ActivityEntry[]) => void,
  entry: Omit<ActivityEntry, "id" | "at">) {
  setActivity((prev) => [{
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    ...entry,
  }, ...prev].slice(0, 1000));
}

export function statusColor(s: CaseStatus | PayStatus | InvoiceStatus | RadiologyStatus | MaterialReqStatus | PacketStatus | BatchStatus): string {
  const map: Record<string, string> = {
    registered: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    under_diagnosis: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    under_treatment: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    active: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    pending_payment: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    medically_completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    partially_paid: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    fully_paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    closed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/15 text-destructive",
    unpaid: "bg-destructive/15 text-destructive",
    partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    refunded: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    requested: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    awaiting_payment: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    result_uploaded: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    reviewed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    approved: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    issued: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    used: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    returned: "bg-muted text-muted-foreground",
    available: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    damaged: "bg-destructive/15 text-destructive",
    sterilization: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    reviewed_batch: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    posted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  };
  return map[s] || "bg-muted text-muted-foreground";
}

export const STATUS_LABEL_AR: Record<string, string> = {
  registered: "مسجلة", under_diagnosis: "تحت التشخيص", under_treatment: "تحت العلاج",
  active: "نشط", pending_payment: "بانتظار الدفع", medically_completed: "مكتمل طبياً",
  partially_paid: "مدفوع جزئياً", fully_paid: "مدفوع بالكامل",
  closed: "مغلق", cancelled: "ملغي",
  unpaid: "غير مدفوع", partial: "مدفوع جزئياً", paid: "مدفوع", refunded: "مسترد",
  draft: "مسودة", pending: "بانتظار الدفع",
  requested: "مطلوب", awaiting_payment: "بانتظار الدفع", in_progress: "قيد التنفيذ",
  result_uploaded: "تم رفع النتيجة", reviewed: "تمت المراجعة",
  approved: "معتمد", issued: "تم الصرف", received: "تم الاستلام", used: "تم الاستخدام",
  returned: "مرتجع",
  available: "متاح", damaged: "تالف", sterilization: "تعقيم",
  posted: "مرحّل",
};
