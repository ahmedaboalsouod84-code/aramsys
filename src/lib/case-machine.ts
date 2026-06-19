// Case State Machine
// ───────────────────
// Single source of truth for the 8-stage case lifecycle:
//   registered → under_diagnosis → under_treatment →
//   medically_completed → (pending_payment | partially_paid) → fully_paid → closed
// `cancelled` is a terminal branch reachable from any non-terminal state.
//
// Each transition declares:
//   • roles allowed to trigger it
//   • an optional `guard(ctx)` for business rules
//   • a human label (AR)

import type { CaseStatus, PatientCase } from "./journey-store";
import type { Role } from "./permissions";

export type CaseCtx = {
  case: PatientCase;
  totals: { total: number; paid: number; remaining: number };
};

export type CaseTransition = {
  to: CaseStatus;
  label_ar: string;
  roles: Role[];
  guard?: (ctx: CaseCtx) => string | true; // string = error message, true = ok
};

const ANY_CLINICAL: Role[] = ["doctor", "medical_manager", "admin"];
const ANY_OPS: Role[] = ["reception", "accountant", "finance_manager", "admin"];
const CLOSE_ROLES: Role[] = ["accountant", "finance_manager", "medical_manager", "admin"];

/**
 * Allowed transitions FROM each status.
 * Note: payment-driven transitions (pending_payment ↔ partially_paid ↔ fully_paid)
 * are computed automatically by `computeCaseStatus` based on totals — we still
 * expose them here so the UI can render the pipeline and history.
 */
export const CASE_TRANSITIONS: Partial<Record<CaseStatus, CaseTransition[]>> = {
  registered: [
    { to: "under_diagnosis", label_ar: "بدء التشخيص", roles: ANY_CLINICAL },
    { to: "cancelled",       label_ar: "إلغاء الحالة", roles: ANY_OPS },
  ],
  under_diagnosis: [
    { to: "under_treatment",     label_ar: "بدء العلاج", roles: ANY_CLINICAL },
    { to: "medically_completed", label_ar: "اعتماد كمكتملة طبياً", roles: ANY_CLINICAL,
      guard: ({ case: c }) => c.services.length > 0 || "أضف خدمة واحدة على الأقل" },
    { to: "cancelled",           label_ar: "إلغاء الحالة", roles: ANY_OPS },
  ],
  under_treatment: [
    { to: "medically_completed", label_ar: "اعتماد كمكتملة طبياً", roles: ANY_CLINICAL,
      guard: ({ case: c }) => c.services.length > 0 || "أضف خدمة واحدة على الأقل" },
    { to: "cancelled",           label_ar: "إلغاء الحالة", roles: ANY_OPS },
  ],
  medically_completed: [
    { to: "pending_payment", label_ar: "إرسال للدفع", roles: ANY_OPS,
      guard: ({ totals }) => totals.total > 0 || "لا توجد فواتير قابلة للدفع" },
    { to: "closed",          label_ar: "إغلاق (لا فواتير)", roles: CLOSE_ROLES,
      guard: ({ totals }) => totals.total === 0 || "يوجد فواتير — حصّل أو اعتمد كذمم" },
  ],
  pending_payment: [
    // partially_paid / fully_paid are auto-derived from payments.
    { to: "cancelled", label_ar: "إلغاء الحالة", roles: ANY_OPS,
      guard: ({ totals }) => totals.paid === 0 || "لا يمكن الإلغاء بعد استلام دفعات" },
  ],
  partially_paid: [
    // fully_paid is auto-derived.
  ],
  fully_paid: [
    { to: "closed", label_ar: "إغلاق الحالة", roles: CLOSE_ROLES },
  ],
  closed: [],
  cancelled: [],
  // legacy
  active: [
    { to: "under_treatment", label_ar: "ترقية إلى العلاج", roles: ANY_CLINICAL },
  ],
};

/** Ordered stages used by the pipeline UI. */
export const CASE_STAGES: CaseStatus[] = [
  "registered",
  "under_diagnosis",
  "under_treatment",
  "medically_completed",
  "pending_payment",
  "partially_paid",
  "fully_paid",
  "closed",
];

export function isTerminal(s: CaseStatus): boolean {
  return s === "closed" || s === "cancelled";
}

export function stageIndex(s: CaseStatus): number {
  const i = CASE_STAGES.indexOf(s);
  if (i >= 0) return i;
  if (s === "active") return CASE_STAGES.indexOf("under_treatment");
  return -1;
}

export function allowedTransitions(ctx: CaseCtx, role: Role | null | undefined): CaseTransition[] {
  if (!role) return [];
  const list = CASE_TRANSITIONS[ctx.case.status] || [];
  return list.filter((tr) => tr.roles.includes(role));
}

export function canTransition(
  ctx: CaseCtx,
  to: CaseStatus,
  role: Role | null | undefined,
): { ok: boolean; reason?: string } {
  if (!role) return { ok: false, reason: "غير مصرح" };
  const tr = (CASE_TRANSITIONS[ctx.case.status] || []).find((t) => t.to === to);
  if (!tr) return { ok: false, reason: "انتقال غير مسموح" };
  if (!tr.roles.includes(role)) return { ok: false, reason: "صلاحية غير كافية" };
  if (tr.guard) {
    const g = tr.guard(ctx);
    if (g !== true) return { ok: false, reason: g };
  }
  return { ok: true };
}

/** Apply a transition, returning the mutated case (no persistence). */
export function applyTransition(c: PatientCase, to: CaseStatus): PatientCase {
  const next: PatientCase = { ...c, status: to };
  if (to === "medically_completed") next.medicallyCompleted = true;
  if (to === "closed") next.closedAt = new Date().toISOString();
  return next;
}
