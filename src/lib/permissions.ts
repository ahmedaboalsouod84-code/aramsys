// Role-based permissions (frontend-only).
// Each role gets a map of moduleSlug -> true (all sub-pages) or array of sub-slugs.

export type Role =
  | "admin" | "doctor" | "reception" | "pharmacy" | "hr" | "accountant"
  | "nurse" | "radiology" | "store_keeper" | "medical_manager" | "finance_manager";

export type ModuleAccess = true | string[];
export type RolePerms = Record<string, ModuleAccess>;

// Patient Journey module sub-slugs reference
// reception-dash, doctor-dash, patients, services, cases, invoices, payments,
// radiology, packets, materials, batches, profitability, activity

export const ROLE_PERMS: Record<Role, RolePerms> = {
  admin: {
    medical: true, hr: true, inventory: true, purchases: true, sales: true,
    services: true, assets: true, maintenance: true, fleet: true, cash: true,
    banks: true, accounting: true, projects: true, quality: true, sms: true,
    archive: true, admin: true, journey: true,
  },
  doctor: {
    medical: [
      "patient-search", "clinic-booking", "clinic-management", "lab-results",
      "radiology", "surgery", "doctor-schedules", "inpatient-rounds",
      "medical-records", "nursing", "emergency", "reports",
    ],
    projects: true,
    archive: ["search", "archive"],
    journey: ["doctor-dash", "patients", "cases", "services", "materials", "packets", "activity"],
  },
  reception: {
    medical: [
      "patient-search", "clinic-booking", "clinic-reception",
      "pending-invoices", "outpatient-billing", "emergency", "doctor-schedules",
    ],
    sales: ["new-invoice", "pos", "invoices", "customers", "agreements", "bnpl-claims"],
    cash: ["reception-shift"],
    sms: true,
    journey: ["reception-dash", "patients", "cases", "services", "invoices", "payments", "activity"],
  },
  pharmacy: {
    inventory: [
      "medicine-dispensing", "items", "barcode", "stock-in", "stock-out", "returns",
      "receiving", "warehouse-monitor", "warehouses", "pharmacy", "reports",
    ],
    sales: ["pharmacy-pos", "returns", "invoices"],
    purchases: ["requests", "orders", "suppliers", "invoices"],
    journey: ["materials", "packets"],
  },
  hr: { hr: true, projects: true, archive: true, sms: ["send", "reports"] },
  accountant: {
    accounting: true, cash: true, banks: true, assets: true,
    sales: ["invoices", "returns", "customers", "agreements"],
    purchases: ["invoices", "return-invoices", "suppliers", "expenses", "taxes"],
    sms: ["send", "reports"],
    journey: ["invoices", "payments", "batches", "profitability", "activity"],
  },
  nurse: {
    journey: ["doctor-dash", "cases", "materials", "packets"],
    medical: ["patient-search", "nursing"],
  },
  radiology: {
    journey: ["radiology", "cases", "activity"],
    medical: ["radiology"],
  },
  store_keeper: {
    journey: ["materials", "packets", "activity"],
    inventory: ["items", "stock-in", "stock-out", "warehouses", "warehouse-monitor"],
  },
  medical_manager: {
    journey: true, medical: true,
  },
  finance_manager: {
    journey: ["invoices", "payments", "batches", "profitability", "services", "activity"],
    accounting: true, cash: true, banks: true,
  },
};

export type DemoUser = {
  username: string;
  password: string;
  role: Role;
  name_en: string;
  name_ar: string;
};

export const DEMO_PASSWORD = "Aram@2026";

export const DEMO_USERS: DemoUser[] = [
  { username: "admin",      password: DEMO_PASSWORD, role: "admin",           name_en: "System Administrator", name_ar: "مدير النظام" },
  { username: "doctor",     password: DEMO_PASSWORD, role: "doctor",          name_en: "Dr. Khalid",           name_ar: "د. خالد" },
  { username: "reception",  password: DEMO_PASSWORD, role: "reception",       name_en: "Reception Desk",       name_ar: "موظف الاستقبال" },
  { username: "pharmacy",   password: DEMO_PASSWORD, role: "pharmacy",        name_en: "Pharmacy Staff",       name_ar: "موظف الصيدلية" },
  { username: "hr",         password: DEMO_PASSWORD, role: "hr",              name_en: "HR Manager",           name_ar: "مدير الموارد البشرية" },
  { username: "accountant", password: DEMO_PASSWORD, role: "accountant",      name_en: "Accountant",           name_ar: "محاسب" },
  { username: "nurse",      password: DEMO_PASSWORD, role: "nurse",           name_en: "Nurse",                name_ar: "ممرض/ة" },
  { username: "radiology",  password: DEMO_PASSWORD, role: "radiology",       name_en: "Radiology Tech",       name_ar: "فني الأشعة" },
  { username: "store",      password: DEMO_PASSWORD, role: "store_keeper",    name_en: "Store Keeper",         name_ar: "أمين المخزن" },
  { username: "medmgr",     password: DEMO_PASSWORD, role: "medical_manager", name_en: "Medical Manager",      name_ar: "المدير الطبي" },
  { username: "finmgr",     password: DEMO_PASSWORD, role: "finance_manager", name_en: "Finance Manager",      name_ar: "المدير المالي" },
];

export function canAccessModule(role: Role, moduleSlug: string): boolean {
  return !!ROLE_PERMS[role][moduleSlug];
}

export function canAccessSub(role: Role, moduleSlug: string, subSlug: string): boolean {
  const acc = ROLE_PERMS[role][moduleSlug];
  if (!acc) return false;
  if (acc === true) return true;
  return acc.includes(subSlug);
}

export function allowedSubs(role: Role, moduleSlug: string, allSubs: string[]): string[] {
  const acc = ROLE_PERMS[role][moduleSlug];
  if (!acc) return [];
  if (acc === true) return allSubs;
  return allSubs.filter((s) => acc.includes(s));
}
