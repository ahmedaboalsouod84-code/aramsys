import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMedicines, useCostCenters, useJournal, nextRef, fmtSAR, type JournalEntry } from "@/lib/erp-store";
import { CheckCircle2, AlertTriangle, Pill } from "lucide-react";
import { toast } from "sonner";

export function MedicineDispensingPage() {
  const { t, lang } = useI18n();
  const [medicines, setMedicines] = useMedicines();
  const [centers] = useCostCenters();
  const [entries, setEntries] = useJournal();

  const [ccId, setCcId] = useState(centers[0]?.id ?? "");
  const [medId, setMedId] = useState(medicines[0]?.id ?? "");
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [lastRef, setLastRef] = useState<string | null>(null);

  const med = useMemo(() => medicines.find((m) => m.id === medId), [medicines, medId]);
  const cc = useMemo(() => centers.find((c) => c.id === ccId), [centers, ccId]);
  const total = (med?.unitCost ?? 0) * (qty || 0);
  const insufficient = med ? qty > med.stock : true;
  const valid = !!med && !!cc && qty > 0 && !insufficient;

  const submit = () => {
    if (!valid || !med || !cc) return;
    const ref = nextRef(entries);
    const je: JournalEntry = {
      id: crypto.randomUUID(),
      ref,
      date: new Date().toISOString().slice(0, 10),
      narrative: `Dispense ${med.name_en} x${qty} → ${cc.name_en}${reason ? " | " + reason : ""}`,
      lines: [
        { accountCode: "5410", debit: total, credit: 0, costCenterId: cc.id },
        { accountCode: "1121", debit: 0, credit: total },
      ],
    };
    setEntries([je, ...entries]);
    setMedicines(medicines.map((m) => (m.id === med.id ? { ...m, stock: m.stock - qty } : m)));
    setLastRef(ref);
    toast.success(t(`Dispensed. Entry ${ref}`, `تم الصرف. القيد ${ref}`));
    setQty(1); setReason("");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Pill className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Medicine Dispensing", "صرف الأدوية")}</h1>
          <p className="text-sm text-muted-foreground">{t("FIFO batch · auto cost center allocation", "صرف بنظام FIFO وتخصيص تلقائي لمركز التكلفة")}</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Dispense Form", "نموذج الصرف")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("Cost Center / Clinic", "مركز التكلفة / العيادة")}</Label>
              <Select value={ccId} onValueChange={setCcId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Medicine", "الدواء")}</Label>
              <Select value={medId} onValueChange={setMedId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {medicines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{lang === "ar" ? m.name_ar : m.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Quantity", "الكمية")}</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Reason", "السبب")}</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("Preview & Journal Entry", "المعاينة والقيد المحاسبي")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("Available Stock", "المخزون المتاح")} value={`${med?.stock ?? 0} ${med?.unit ?? ""}`} />
            <Row label={t("Batch Number", "رقم التشغيلة")} value={med?.batchNo ?? "—"} />
            <Row label={t("Expiry Date", "تاريخ الانتهاء")} value={med?.expiry ?? "—"} />
            <Row label={t("Unit Cost", "تكلفة الوحدة")} value={fmtSAR(med?.unitCost ?? 0)} />
            <Row label={t("Total Cost", "التكلفة الإجمالية")} value={<span className="font-semibold text-primary">{fmtSAR(total)}</span>} />
            <Row label={t("Charged to", "محملة على")} value={<Badge variant="secondary">{cc ? (lang === "ar" ? cc.name_ar : cc.name_en) : "—"}</Badge>} />

            <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-1.5 font-mono text-xs">
              <div className="font-semibold text-foreground">{t("Journal entry to be posted:", "القيد المحاسبي:")}</div>
              <div>Dr. 5410 (CC: {cc?.code}) ............ {fmtSAR(total)}</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;Cr. 1121 (Medicine Inventory) .. {fmtSAR(total)}</div>
            </div>

            {insufficient && med && (
              <div className="flex items-center gap-2 text-destructive text-xs"><AlertTriangle className="h-3.5 w-3.5" /> {t("Insufficient stock", "المخزون غير كافٍ")}</div>
            )}
            {lastRef && (
              <div className="flex items-center gap-2 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> {t(`Last entry: ${lastRef}`, `آخر قيد: ${lastRef}`)}</div>
            )}

            <Button className="w-full" disabled={!valid} onClick={submit}>{t("Confirm & Dispense", "تأكيد الصرف")}</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Inventory", "المخزون")}</CardTitle><CardDescription>{t("Current stock levels", "أرصدة المخزون")}</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start font-medium px-3 py-2">{t("Medicine", "الدواء")}</th>
                  <th className="text-start font-medium px-3 py-2">{t("Batch", "التشغيلة")}</th>
                  <th className="text-start font-medium px-3 py-2">{t("Expiry", "الانتهاء")}</th>
                  <th className="text-end font-medium px-3 py-2">{t("Unit Cost", "تكلفة الوحدة")}</th>
                  <th className="text-end font-medium px-3 py-2">{t("Stock", "المخزون")}</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{lang === "ar" ? m.name_ar : m.name_en}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.batchNo}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.expiry}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(m.unitCost)}</td>
                    <td className="px-3 py-2 text-end font-medium">{m.stock} {m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
