import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, BookCheck, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import {
  usePostingMap, usePostingLog, postEvent, type AccountMap, type PostingEvent,
} from "@/lib/posting-rules";
import { useAccounts } from "@/lib/erp-store";

const FIELD_LABELS: Record<keyof AccountMap, { en: string; ar: string; group: string }> = {
  patientReceivable:      { en: "Patient Receivable",      ar: "ذمم مرضى",            group: "Receivables" },
  insuranceReceivable:    { en: "Insurance Receivable",    ar: "ذمم تأمين",           group: "Receivables" },
  bnplTabbyReceivable:    { en: "Tabby Receivable",        ar: "ذمم تابي",            group: "Receivables" },
  bnplTamaraReceivable:   { en: "Tamara Receivable",       ar: "ذمم تمارا",           group: "Receivables" },
  cashOnHand:             { en: "Cash on Hand",            ar: "النقدية بالخزينة",   group: "Cash/Bank" },
  treasuryClearing:       { en: "Treasury Clearing",       ar: "خزينة الاستقبال",    group: "Cash/Bank" },
  bankMain:               { en: "Bank — Main",             ar: "البنك الرئيسي",      group: "Cash/Bank" },
  cardClearing:           { en: "Card Clearing (POS)",     ar: "وسيط الشبكة",        group: "Cash/Bank" },
  consultationRevenue:    { en: "Consultation Revenue",    ar: "إيرادات كشف",        group: "Revenue" },
  radiologyRevenue:       { en: "Radiology Revenue",       ar: "إيرادات الأشعة",     group: "Revenue" },
  dentalRevenue:          { en: "Dental Revenue",          ar: "إيرادات الأسنان",    group: "Revenue" },
  surgeryRevenue:         { en: "Surgery Revenue",         ar: "إيرادات العمليات",   group: "Revenue" },
  pharmacyRevenue:        { en: "Pharmacy Revenue",        ar: "إيرادات الصيدلية",   group: "Revenue" },
  otherRevenue:           { en: "Other Revenue",           ar: "إيرادات أخرى",       group: "Revenue" },
  vatPayable:             { en: "VAT Payable",             ar: "ضريبة قيمة مضافة",   group: "Liabilities" },
  vatInputReceivable:     { en: "VAT Input (Recoverable)", ar: "ض.ق.م مدخلات",       group: "Liabilities" },
  accountsPayable:        { en: "Accounts Payable",        ar: "ذمم موردين دائنة",   group: "Liabilities" },
  grIrClearing:           { en: "GR/IR Clearing",          ar: "وسيط استلام/فاتورة", group: "Liabilities" },
  bnplCommissionPayable:  { en: "BNPL Commission Payable", ar: "عمولات BNPL مستحقة", group: "Liabilities" },
  bankFeesPayable:        { en: "Bank Fees Payable",       ar: "رسوم بنكية مستحقة",  group: "Liabilities" },
  bnplCommissionExpense:  { en: "BNPL Commission Expense", ar: "عمولات BNPL",        group: "Expenses" },
  bankFeesExpense:        { en: "Bank Fees Expense",       ar: "رسوم بنكية",         group: "Expenses" },
  medicineCogs:           { en: "Medicine COGS",           ar: "تكلفة الأدوية",      group: "Expenses" },
  materialsCogs:          { en: "Materials COGS",          ar: "تكلفة المستهلكات",   group: "Expenses" },
  insuranceWriteOff:      { en: "Insurance Write-Off",     ar: "خصم تأمين",          group: "Expenses" },
  medicineInventory:      { en: "Medicine Inventory",      ar: "مخزون الأدوية",      group: "Inventory" },
  materialsInventory:     { en: "Materials Inventory",     ar: "مخزون المستهلكات",   group: "Inventory" },
};

export function PostingRulesPage() {
  const { t, lang } = useI18n();
  const [map, setMap] = usePostingMap();
  const log = usePostingLog();
  const [accounts] = useAccounts();
  const [draft, setDraft] = useState<AccountMap>(map);

  const accountByCode = useMemo(() => {
    const m = new Map<string, string>();
    accounts.forEach(a => m.set(a.code, lang === "ar" ? a.name_ar : a.name_en));
    return m;
  }, [accounts, lang]);

  const groups = useMemo(() => {
    const g: Record<string, (keyof AccountMap)[]> = {};
    (Object.keys(FIELD_LABELS) as (keyof AccountMap)[]).forEach(k => {
      const grp = FIELD_LABELS[k].group;
      (g[grp] ||= []).push(k);
    });
    return g;
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(map);

  const runTest = () => {
    const events: PostingEvent[] = [
      { kind: "invoice.issued", ref: "TEST-INV-1", date: new Date().toISOString(),
        patientRef: "P-TEST", payer: "patient", vat: 15,
        lines: [{ category: "consultation", amount: 100 }] },
      { kind: "payment.received", ref: "TEST-PAY-1", date: new Date().toISOString(),
        patientRef: "P-TEST", method: "cash", amount: 115 },
      { kind: "treasury.handover", ref: "TEST-HO-1", date: new Date().toISOString(), amount: 115 },
    ];
    events.forEach(e => postEvent("posting-rules:test", e));
  };

  const balancedCount = log.filter(l => l.balanced).length;
  const unbalancedCount = log.length - balancedCount;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Settings2 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Unified Posting Rules", "قواعد الترحيل الموحّدة")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Single source of truth mapping business events to GL accounts.",
              "مصدر موحّد لربط الأحداث التشغيلية بحسابات دفتر الأستاذ.",
            )}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <BookCheck className="h-3 w-3" /> {log.length} {t("postings", "ترحيل")}
        </Badge>
      </header>

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">{t("Account Mapping", "ربط الحسابات")}</TabsTrigger>
          <TabsTrigger value="log">{t("Audit Log", "سجل الترحيلات")}</TabsTrigger>
          <TabsTrigger value="test">{t("Test Posting", "اختبار قيد")}</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDraft(map)} disabled={!dirty}>
              {t("Reset", "إلغاء")}
            </Button>
            <Button size="sm" onClick={() => setMap(draft)} disabled={!dirty}>
              {t("Save Changes", "حفظ التغييرات")}
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(groups).map(([grp, keys]) => (
              <Card key={grp}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{grp}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {keys.map(k => (
                    <div key={k} className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-5 text-xs">
                        {lang === "ar" ? FIELD_LABELS[k].ar : FIELD_LABELS[k].en}
                      </label>
                      <Input
                        className="col-span-3 font-mono text-xs h-8"
                        value={draft[k]}
                        onChange={(e) => setDraft(d => ({ ...d, [k]: e.target.value }))}
                      />
                      <span className="col-span-4 text-xs text-muted-foreground truncate">
                        {accountByCode.get(draft[k]) || (
                          <span className="text-rose-600">{t("Not found", "غير موجود")}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="log" className="space-y-3">
          <div className="flex gap-3 text-sm">
            <Badge variant="outline" className="gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> {balancedCount} {t("balanced", "متوازن")}
            </Badge>
            {unbalancedCount > 0 && (
              <Badge variant="outline" className="gap-1 text-rose-600">
                <AlertTriangle className="h-3 w-3" /> {unbalancedCount} {t("unbalanced", "غير متوازن")}
              </Badge>
            )}
          </div>
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
              <div className="col-span-2">{t("Time", "الوقت")}</div>
              <div className="col-span-2">{t("Module", "الوحدة")}</div>
              <div className="col-span-2">{t("Event", "الحدث")}</div>
              <div className="col-span-2">{t("Ref", "المرجع")}</div>
              <div className="col-span-2 text-end">{t("Debit/Credit", "مدين/دائن")}</div>
              <div className="col-span-2 text-end">{t("Status", "الحالة")}</div>
            </div>
            {log.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t("No postings yet. Run a test or trigger a business event.", "لا توجد ترحيلات بعد.")}
              </div>
            )}
            {log.map(l => (
              <div key={l.id} className="grid grid-cols-12 items-center px-3 py-2 text-xs border-t">
                <div className="col-span-2 text-muted-foreground">{new Date(l.at).toLocaleTimeString()}</div>
                <div className="col-span-2 truncate">{l.module}</div>
                <div className="col-span-2 font-mono">{l.eventKind}</div>
                <div className="col-span-2 font-mono truncate">{l.ref}</div>
                <div className="col-span-2 text-end font-mono">{l.debit.toFixed(2)} / {l.credit.toFixed(2)}</div>
                <div className="col-span-2 text-end">
                  {l.balanced
                    ? <Badge variant="outline" className="text-emerald-600 text-[10px]">OK</Badge>
                    : <Badge variant="outline" className="text-rose-600 text-[10px]">{t("Diff", "فرق")}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Run a sample posting", "تشغيل قيد تجريبي")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {t(
                  "Generates 3 events: invoice issued (100 + 15 VAT), cash payment (115), treasury handover (115). All should be balanced.",
                  "يولّد 3 أحداث: إصدار فاتورة (100 + 15 ضريبة)، تحصيل نقدي (115)، تسليم خزينة (115). يجب أن تكون كلها متوازنة.",
                )}
              </p>
              <Button onClick={runTest} className="gap-2">
                <RotateCcw className="h-4 w-4" /> {t("Run Test", "تشغيل الاختبار")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
