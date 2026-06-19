import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FileText, Home, Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { findModule } from "@/lib/modules";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canAccessModule, canAccessSub, allowedSubs } from "@/lib/permissions";
import { getFormSchema, type Field } from "@/lib/formSchemas";
import { MedicineDispensingPage } from "@/components/erp/MedicineDispensingPage";
import { CostCentersPage } from "@/components/erp/CostCentersPage";
import { ProfitCentersPage } from "@/components/erp/ProfitCentersPage";
import { JournalEntriesPage } from "@/components/erp/JournalEntriesPage";
import { GeneralLedgerPage } from "@/components/erp/GeneralLedgerPage";
import { ChartOfAccountsPage } from "@/components/erp/ChartOfAccountsPage";
import { CostDistributionPage } from "@/components/erp/CostDistributionPage";
import { ClinicProfitabilityPage } from "@/components/erp/ClinicProfitabilityPage";
import { FinancialStatementsPage } from "@/components/erp/FinancialStatementsPage";
import { CustomerLedgerPage } from "@/components/erp/CustomerLedgerPage";
import { ErpDashboardPage } from "@/components/erp/ErpDashboardPage";
import {
  ServicesPage, ReceptionDashboard, DoctorDashboard, PatientsPage,
} from "@/components/journey/pages-core";
import { CasesPage } from "@/components/journey/pages-cases";
import {
  InvoicesPage, PaymentsPage, RadiologyDashboard, PacketsPage,
  MaterialRequestsPage, AccountingBatchesPage, DoctorProfitabilityPage, ActivityLogPage,
} from "@/components/journey/pages-ops";
import {
  BankListPage, BankTransactionsPage, ReconciliationDashboardPage,
  SettlementHistoryPage, UnreconciledPage, StatementImportPage, ApprovalWorkflowPage,
} from "@/components/bank/BankReconPages";
import { ReceptionShiftPage, TreasuryApprovalPage } from "@/components/treasury/TreasuryPages";
import { BnplClaimsPage } from "@/components/bnpl/BnplClaimsPage";
import { PostingRulesPage } from "@/components/erp/PostingRulesPage";
import {
  SuppliersPage, PurchaseRequestsPage, PurchaseOrdersPage,
  GoodsReceiptsPage, VendorInvoicesPage, CreditNotesPage, SupplierOffersPage,
} from "@/components/procurement/ProcurementPages";



const ERP_PAGES: Record<string, React.ComponentType> = {
  "inventory:medicine-dispensing": MedicineDispensingPage,
  "inventory:pharmacy": MedicineDispensingPage,
  "accounting:erp-dashboard": ErpDashboardPage,
  "accounting:posting-rules": PostingRulesPage,
  "accounting:chart-of-accounts": ChartOfAccountsPage,
  "accounting:journal": JournalEntriesPage,
  "accounting:ledger": GeneralLedgerPage,
  "accounting:cost-centers": CostCentersPage,
  "accounting:profit-centers": ProfitCentersPage,
  "accounting:cost-distribution": CostDistributionPage,
  "accounting:clinic-profitability": ClinicProfitabilityPage,
  "accounting:financial-statements": FinancialStatementsPage,
  "accounting:income-statement": FinancialStatementsPage,
  "accounting:balance-sheet": FinancialStatementsPage,
  "accounting:customer-ledger": CustomerLedgerPage,
  "sales:customers": CustomerLedgerPage,
  // Patient Journey
  "journey:reception-dash": ReceptionDashboard,
  "journey:doctor-dash": DoctorDashboard,
  "journey:patients": PatientsPage,
  "journey:cases": CasesPage,
  "journey:services": ServicesPage,
  "journey:invoices": InvoicesPage,
  "journey:payments": PaymentsPage,
  "journey:radiology": RadiologyDashboard,
  "journey:packets": PacketsPage,
  "journey:materials": MaterialRequestsPage,
  "journey:batches": AccountingBatchesPage,
  "journey:profitability": DoctorProfitabilityPage,
  "journey:activity": ActivityLogPage,
  // Banks — SAP-style reconciliation
  "banks:bank-list": BankListPage,
  "banks:bank-txns": BankTransactionsPage,
  "banks:reconciliation": ReconciliationDashboardPage,
  "banks:unreconciled": UnreconciledPage,
  "banks:statement-import": StatementImportPage,
  "banks:settlements": SettlementHistoryPage,
  "banks:approvals": ApprovalWorkflowPage,
  // Cash & Treasury — Reception Shifts + Approval (SAP-style Clearing)
  "cash:reception-shift": ReceptionShiftPage,
  "cash:treasury-approval": TreasuryApprovalPage,
  // BNPL — Tabby / Tamara claim builder + commission engine
  "sales:bnpl-claims": BnplClaimsPage,
  // Procurement chain: PR → PO → GR → VI → CN
  "purchases:suppliers": SuppliersPage,
  "purchases:requests": PurchaseRequestsPage,
  "purchases:offers": SupplierOffersPage,
  "purchases:orders": PurchaseOrdersPage,
  "purchases:goods-receipts": GoodsReceiptsPage,
  "purchases:invoices": VendorInvoicesPage,
  "purchases:return-invoices": CreditNotesPage,
  // Aliases: route legacy/medical patient pages to the unified Journey screens
  "medical:patient-search": PatientsPage,
  "medical:patients": PatientsPage,
  "medical:radiology": RadiologyDashboard,
  "medical:pending-invoices": InvoicesPage,
  "medical:outpatient-billing": InvoicesPage,
  "medical:inpatient-billing": InvoicesPage,
  "medical:clinic-reception": ReceptionDashboard,
};

function AccessDenied({ titleEn, titleAr }: { titleEn: string; titleAr: string }) {
  const { t } = useI18n();
  return (
    <div className="p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t("Access denied", "غير مصرح بالوصول")}</CardTitle>
          <CardDescription>
            {t(
              `You do not have permission to view "${titleEn}". Contact the system administrator.`,
              `لا تملك صلاحية لعرض "${titleAr}". تواصل مع مدير النظام.`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className="text-sm text-primary underline">
            {t("Back to dashboard", "العودة للوحة التحكم")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}


export function ModuleView({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const m = findModule(slug);

  if (!m) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">{t("Module not found", "الوحدة غير موجودة")}</h1>
        <Link to="/" className="text-sm text-primary underline mt-2 inline-block">
          {t("Back to dashboard", "العودة للوحة التحكم")}
        </Link>
      </div>
    );
  }

  if (role && !canAccessModule(role, slug)) {
    return <AccessDenied titleEn={m.en} titleAr={m.ar} />;
  }

  const visibleItems = role
    ? m.items.filter((it) => allowedSubs(role, slug, m.items.map((x) => x.slug)).includes(it.slug))
    : m.items;

  const title = lang === "ar" ? m.ar : m.en;
  const desc = lang === "ar" ? m.desc_ar : m.desc_en;
  const Icon = m.icon;


  return (
    <div className="space-y-4 xl:space-y-6">
      {/* Mobile app header */}
      <MobileBackHeader title={title} to="/" />

      <div className="p-4 xl:p-6 pt-0 xl:pt-6 space-y-6">
        <nav className="hidden xl:flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
            <Home className="h-3.5 w-3.5" /> {t("Home", "الرئيسية")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant="secondary">{visibleItems.length} {t("screens", "شاشة")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {visibleItems.map((it) => {
          const itTitle = lang === "ar" ? it.ar : it.en;
          return (
            <Link key={it.slug} to={`/m/${m.slug}/${it.slug}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors rtl:rotate-180" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-sm">{itTitle}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {t("Open form", "افتح النموذج")}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function MobileBackHeader({ title, to }: { title: string; to: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="xl:hidden sticky top-0 z-30 bg-card border-b border-border flex items-center gap-2 px-2 h-14"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
          } else {
            navigate({ to });
          }
        }}
        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition"
      >
        <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
      </button>
      <h1 className="text-base font-semibold truncate flex-1">{title}</h1>
    </div>
  );
}


type RowRecord = { _id: string; _createdAt: string; [k: string]: string };

function emptyValues(fields: Field[]): { [k: string]: string } {
  const v: { [k: string]: string } = {};
  for (const f of fields) v[f.key] = "";
  return v;
}

function useLocalRecords(storageKey: string) {
  const [records, setRecords] = useState<RowRecord[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setRecords(raw ? JSON.parse(raw) : []);
    } catch {
      setRecords([]);
    }
  }, [storageKey]);

  const persist = (next: RowRecord[]) => {
    setRecords(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  return { records, persist };
}


export function SubPageView({ moduleSlug, subSlug }: { moduleSlug: string; subSlug: string }) {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const m = findModule(moduleSlug);
  const sub = m?.items.find((i) => i.slug === subSlug);

  const fields = useMemo(() => getFormSchema(moduleSlug, subSlug), [moduleSlug, subSlug]);
  const storageKey = `da:${moduleSlug}:${subSlug}`;
  const { records, persist } = useLocalRecords(storageKey);

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<{ [k: string]: string }>(() => emptyValues(fields));
  const [query, setQuery] = useState("");

  useEffect(() => {
    setValues(emptyValues(fields));
  }, [fields]);

  if (!m || !sub) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">{t("Page not found", "الصفحة غير موجودة")}</h1>
      </div>
    );
  }

  if (role && !canAccessSub(role, moduleSlug, subSlug)) {
    return <AccessDenied titleEn={sub.en} titleAr={sub.ar} />;
  }

  const ErpPage = ERP_PAGES[`${moduleSlug}:${subSlug}`];
  if (ErpPage) return <ErpPage />;



  const modTitle = lang === "ar" ? m.ar : m.en;
  const subTitle = lang === "ar" ? sub.ar : sub.en;

  const fLabel = (f: Field) => (lang === "ar" ? f.ar : f.en);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) return;
    }
    const rec: RowRecord = {
      _id: crypto.randomUUID(),
      _createdAt: new Date().toISOString(),
      ...values,
    };
    persist([rec, ...records]);
    setValues(emptyValues(fields));
    setOpen(false);
  };

  const del = (id: string) => persist(records.filter((r) => r._id !== id));

  const tableFields = fields.slice(0, 5);
  const filtered = query
    ? records.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(query.toLowerCase()))
      )
    : records;

  const renderCell = (f: Field, v: string) => {
    if (!v) return <span className="text-muted-foreground">—</span>;
    if (f.type === "select" && f.options) {
      const opt = f.options.find((o) => o.value === v);
      if (opt) return <Badge variant="secondary">{lang === "ar" ? opt.ar : opt.en}</Badge>;
    }
    return v;
  };

  return (
    <div className="space-y-4">
      <MobileBackHeader title={subTitle} to={`/m/${m.slug}`} />
      <div className="p-4 md:p-6 pt-0 md:pt-6 space-y-6">
      <nav className="hidden xl:flex items-center gap-1.5 text-sm text-muted-foreground">

        <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> {t("Home", "الرئيسية")}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link to={`/m/${m.slug}`} className="hover:text-foreground">{modTitle}</Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="text-foreground font-medium">{subTitle}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{subTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(`Part of ${modTitle}`, `ضمن ${modTitle}`)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("New record", "سجل جديد")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t(`Add ${subTitle}`, `إضافة ${subTitle}`)}
              </DialogTitle>
              <DialogDescription>
                {t("Fill the form below. Saved locally on this device.", "املأ النموذج. يُحفظ محليًا على هذا الجهاز.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {fields.map((f) => {
                const isWide = f.type === "textarea";
                return (
                  <div key={f.key} className={`space-y-1.5 ${isWide ? "sm:col-span-2" : ""}`}>
                    <Label htmlFor={f.key}>
                      {fLabel(f)}
                      {f.required && <span className="text-destructive ms-1">*</span>}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={f.key}
                        value={values[f.key] || ""}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        rows={3}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        value={values[f.key] || ""}
                        onValueChange={(v) => setValues({ ...values, [f.key]: v })}
                      >
                        <SelectTrigger id={f.key}>
                          <SelectValue placeholder={t("Select…", "اختر…")} />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options!.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {lang === "ar" ? o.ar : o.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={f.key}
                        type={f.type}
                        value={values[f.key] || ""}
                        onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                        required={f.required}
                      />
                    )}
                  </div>
                );
              })}
              <DialogFooter className="sm:col-span-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("Cancel", "إلغاء")}
                </Button>
                <Button type="submit">{t("Save", "حفظ")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Records", "السجلات")}</CardTitle>
              <CardDescription>
                {records.length} {t("records saved locally", "سجل محفوظ محليًا")}
              </CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("Search…", "بحث…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t("No records yet. Click \"New record\" to add the first one.", "لا توجد سجلات بعد. اضغط \"سجل جديد\" لإضافة أول سجل.")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-start font-medium px-3 py-2 w-10">#</th>
                    {tableFields.map((f) => (
                      <th key={f.key} className="text-start font-medium px-3 py-2 whitespace-nowrap">
                        {fLabel(f)}
                      </th>
                    ))}
                    <th className="text-end font-medium px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r._id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      {tableFields.map((f) => (
                        <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                          {renderCell(f, r[f.key])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => del(r._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );

}
