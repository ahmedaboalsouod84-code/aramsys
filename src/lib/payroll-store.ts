// Payroll Runs — generate balanced JE via posting-rules (payroll.posted / payroll.paid).
import { useEffect, useState, useCallback } from "react";
import { postEvent } from "@/lib/posting-rules";

const NS = "erp:";

export type Employee = {
  id: string;
  name: string;
  position: string;
  basicSalary: number;
  allowances: number;
  gosiEmployeePct: number; // typically 0.10 in KSA
  gosiEmployerPct: number; // typically 0.12 in KSA
  costCenterId?: string;
};

export type PayrollLine = {
  employeeId: string;
  name: string;
  gross: number;
  gosiEmployee: number;
  gosiEmployer: number;
  advance: number;
  deduction: number;
  bonus: number;
  net: number;
};

export type PayrollStatus = "draft" | "posted" | "paid" | "cancelled";

export type PayrollRun = {
  id: string;
  ref: string;            // PR-2026-01
  period: string;         // YYYY-MM
  date: string;           // payroll date
  lines: PayrollLine[];
  totals: {
    gross: number;
    gosiEmployee: number;
    gosiEmployer: number;
    advances: number;
    deductions: number;
    bonuses: number;
    net: number;
  };
  status: PayrollStatus;
  journalRef?: string;
  paidJournalRef?: string;
  createdBy: string;
  createdAt: string;
  postedAt?: string;
  paidAt?: string;
};

const SEED_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Dr. Ahmed Ali",   position: "طبيب",     basicSalary: 18000, allowances: 4000, gosiEmployeePct: 0.10, gosiEmployerPct: 0.12, costCenterId: "cc1" },
  { id: "e2", name: "Dr. Sara Hamad",  position: "طبيبة",    basicSalary: 16000, allowances: 3500, gosiEmployeePct: 0.10, gosiEmployerPct: 0.12, costCenterId: "cc2" },
  { id: "e3", name: "Nurse Mona",      position: "ممرضة",    basicSalary: 6500,  allowances: 1500, gosiEmployeePct: 0.10, gosiEmployerPct: 0.12, costCenterId: "cc3" },
  { id: "e4", name: "Accountant Omar", position: "محاسب",    basicSalary: 9000,  allowances: 2000, gosiEmployeePct: 0.10, gosiEmployerPct: 0.12, costCenterId: "cc4" },
];

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

export const useEmployees   = () => useStore<Employee[]>("hr_employees", SEED_EMPLOYEES);
export const usePayrollRuns = () => useStore<PayrollRun[]>("hr_payroll_runs", []);

function nextRef(prefix: string, items: { ref: string }[]) {
  const year = new Date().getFullYear();
  const max = items
    .filter(x => x.ref.includes(`-${year}-`))
    .reduce((a, x) => {
      const n = parseInt(x.ref.split("-").pop() || "0", 10);
      return isNaN(n) ? a : Math.max(a, n);
    }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(2, "0")}`;
}

export function buildPayrollLines(employees: Employee[],
  overrides: Record<string, { advance?: number; deduction?: number; bonus?: number }> = {}): PayrollLine[] {
  return employees.map(e => {
    const gross = e.basicSalary + e.allowances + (overrides[e.id]?.bonus || 0);
    const gosiEmployee = Math.round(e.basicSalary * e.gosiEmployeePct * 100) / 100;
    const gosiEmployer = Math.round(e.basicSalary * e.gosiEmployerPct * 100) / 100;
    const advance      = overrides[e.id]?.advance || 0;
    const deduction    = overrides[e.id]?.deduction || 0;
    const bonus        = overrides[e.id]?.bonus || 0;
    const net          = gross - gosiEmployee - advance - deduction;
    return {
      employeeId: e.id, name: e.name,
      gross, gosiEmployee, gosiEmployer, advance, deduction, bonus, net,
    };
  });
}

export function createPayrollRun(period: string, date: string, lines: PayrollLine[], user?: string): PayrollRun {
  const list = load<PayrollRun[]>("hr_payroll_runs", []);
  const totals = lines.reduce((s, l) => ({
    gross:        s.gross + l.gross,
    gosiEmployee: s.gosiEmployee + l.gosiEmployee,
    gosiEmployer: s.gosiEmployer + l.gosiEmployer,
    advances:     s.advances + l.advance,
    deductions:   s.deductions + l.deduction,
    bonuses:      s.bonuses + l.bonus,
    net:          s.net + l.net,
  }), { gross:0, gosiEmployee:0, gosiEmployer:0, advances:0, deductions:0, bonuses:0, net:0 });

  const run: PayrollRun = {
    id: crypto.randomUUID(),
    ref: nextRef("PR", list),
    period, date, lines, totals,
    status: "draft",
    createdBy: user || "system",
    createdAt: new Date().toISOString(),
  };
  saveRaw("hr_payroll_runs", [...list, run]);
  return run;
}

export function postPayroll(runId: string): PayrollRun {
  const list = load<PayrollRun[]>("hr_payroll_runs", []);
  const r = list.find(x => x.id === runId);
  if (!r) throw new Error("Run not found");
  if (r.status !== "draft") throw new Error("Only draft runs can be posted");
  const { journal } = postEvent("payroll", {
    kind: "payroll.posted",
    ref: r.ref,
    date: r.date,
    gross: r.totals.gross,
    gosiEmployee: r.totals.gosiEmployee,
    gosiEmployer: r.totals.gosiEmployer,
    advancesRecovered: r.totals.advances,
  });
  // append JE to journal store
  const jr = JSON.parse(localStorage.getItem(NS + "journal") || "[]");
  localStorage.setItem(NS + "journal", JSON.stringify([...jr, journal]));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));

  const next: PayrollRun = { ...r, status: "posted", journalRef: journal.ref, postedAt: new Date().toISOString() };
  saveRaw("hr_payroll_runs", list.map(x => x.id === r.id ? next : x));
  return next;
}

export function payPayroll(runId: string): PayrollRun {
  const list = load<PayrollRun[]>("hr_payroll_runs", []);
  const r = list.find(x => x.id === runId);
  if (!r) throw new Error("Run not found");
  if (r.status !== "posted") throw new Error("Run must be posted before paying");
  const { journal } = postEvent("payroll", {
    kind: "payroll.paid", ref: r.ref + "-PAY", date: new Date().toISOString().slice(0,10),
    amount: r.totals.net, method: "bank",
  });
  const jr = JSON.parse(localStorage.getItem(NS + "journal") || "[]");
  localStorage.setItem(NS + "journal", JSON.stringify([...jr, journal]));
  window.dispatchEvent(new CustomEvent("erp:change", { detail: { key: "journal" } }));

  const next: PayrollRun = { ...r, status: "paid", paidJournalRef: journal.ref, paidAt: new Date().toISOString() };
  saveRaw("hr_payroll_runs", list.map(x => x.id === r.id ? next : x));
  return next;
}

export function cancelPayroll(runId: string) {
  const list = load<PayrollRun[]>("hr_payroll_runs", []);
  saveRaw("hr_payroll_runs", list.map(x => x.id === runId ? { ...x, status: "cancelled" as const } : x));
}
