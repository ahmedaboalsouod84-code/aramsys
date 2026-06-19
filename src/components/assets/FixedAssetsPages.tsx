// Fixed Assets — list, add, monthly depreciation run, disposal.
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useFixedAssets, useDepreciationEntries,
  acquireAsset, runMonthlyDepreciation, disposeAsset,
  monthlyDepreciation, netBookValue,
  type AssetCategory,
} from "@/lib/assets-store";
import { fmt } from "@/lib/bank-recon-store";
import { Building2, Plus, Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }

const CATEGORIES: { v: AssetCategory; en: string; ar: string }[] = [
  { v: "medical",   en: "Medical Equipment", ar: "أجهزة طبية" },
  { v: "it",        en: "IT / Computers",    ar: "حاسب وتقنية" },
  { v: "furniture", en: "Furniture",         ar: "أثاث" },
  { v: "vehicle",   en: "Vehicles",          ar: "مركبات" },
  { v: "building",  en: "Buildings",         ar: "مباني" },
];

export function AddAssetPage() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [assets] = useFixedAssets();
  const [form, setForm] = useState({
    name: "", category: "medical" as AssetCategory, acquisitionDate: todayISO(),
    cost: "", salvageValue: "", usefulLifeYears: "5", paymentMethod: "bank" as "bank"|"cash"|"ap",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(form.cost);
    const life = parseFloat(form.usefulLifeYears);
    if (!form.name || !cost || !life) { toast.error(t("Fill all required fields","أكمل الحقول")); return; }
    acquireAsset({
      name: form.name, category: form.category, acquisitionDate: form.acquisitionDate,
      cost, salvageValue: parseFloat(form.salvageValue) || 0, usefulLifeYears: life,
      paymentMethod: form.paymentMethod,
    });
    setForm({ name: "", category: "medical", acquisitionDate: todayISO(),
      cost: "", salvageValue: "", usefulLifeYears: "5", paymentMethod: "bank" });
    setOpen(false);
    toast.success(t("Asset acquired (JE posted)", "تم اقتناء الأصل (تم ترحيل القيد)"));
  };

  const recent = useMemo(() => [...assets].sort((a,b) => b.acquisitionDate.localeCompare(a.acquisitionDate)).slice(0, 10), [assets]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("Add Fixed Asset", "إضافة أصل ثابت")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Capitalize an asset — auto-posts: Asset Cost DR / Bank or AP CR.",
                 "رسملة أصل — يتم ترحيل: مدين الأصل / دائن البنك أو الموردين.")}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("New asset", "أصل جديد")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("New fixed asset", "أصل ثابت جديد")}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>{t("Asset name", "اسم الأصل")}*</Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Category", "التصنيف")}</Label>
                <Select value={form.category} onValueChange={(v: AssetCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.v} value={c.v}>{lang === "ar" ? c.ar : c.en}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>{t("Acquisition date", "تاريخ الاقتناء")}</Label>
                <Input type="date" value={form.acquisitionDate} onChange={e => setForm({ ...form, acquisitionDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Cost (SAR)", "التكلفة")}*</Label>
                <Input type="number" required value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Salvage value", "القيمة المتبقية")}</Label>
                <Input type="number" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Useful life (years)", "العمر الإنتاجي / سنوات")}*</Label>
                <Input type="number" required value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("Paid by", "وسيلة الدفع")}</Label>
                <Select value={form.paymentMethod} onValueChange={(v: "bank"|"cash"|"ap") => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">{t("Bank", "بنك")}</SelectItem>
                    <SelectItem value="cash">{t("Cash", "نقدًا")}</SelectItem>
                    <SelectItem value="ap">{t("Supplier (AP)", "ذمم موردين")}</SelectItem>
                  </SelectContent>
                </Select></div>
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
                <Button type="submit">{t("Acquire & Post", "اقتناء وترحيل")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Recently added", "أُضيف مؤخرًا")}</CardTitle></CardHeader>
        <CardContent>
          <AssetsTable assets={recent} />
        </CardContent>
      </Card>
    </div>
  );
}

export function AssetsListPage() {
  const { t } = useI18n();
  const [assets] = useFixedAssets();
  const active   = assets.filter(a => a.status === "active");
  const disposed = assets.filter(a => a.status === "disposed");
  const totalCost = active.reduce((s, a) => s + a.cost, 0);
  const totalAccum = active.reduce((s, a) => s + a.accumulated, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{t("Assets List", "قائمة الأصول")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Active register + disposed history.", "السجل النشط + المُستبعدة.")}
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-4 gap-3">
        <KPI label={t("Active assets","أصول نشطة")} value={String(active.length)} />
        <KPI label={t("Total cost","إجمالي التكلفة")} value={fmt(totalCost)} />
        <KPI label={t("Accumulated dep.","مجمع الاستهلاك")} value={fmt(totalAccum)} />
        <KPI label={t("Net book value","القيمة الدفترية")} value={fmt(totalCost - totalAccum)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Active","النشطة")} ({active.length})</CardTitle></CardHeader>
        <CardContent><AssetsTable assets={active} showDispose /></CardContent>
      </Card>

      {disposed.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("Disposed","المُستبعدة")} ({disposed.length})</CardTitle></CardHeader>
          <CardContent><AssetsTable assets={disposed} /></CardContent>
        </Card>
      )}
    </div>
  );
}

export function DepreciationPage() {
  const { t } = useI18n();
  const [assets] = useFixedAssets();
  const [entries] = useDepreciationEntries();
  const [month, setMonth] = useState(currentMonth());

  const eligible = assets.filter(a => a.status === "active"
    && a.lastDepreciatedMonth !== month
    && a.acquisitionDate.slice(0,7) <= month
    && (a.cost - a.salvageValue) - a.accumulated > 0);
  const projected = eligible.reduce((s, a) => s + Math.min(
    Math.max(0, (a.cost - a.salvageValue) - a.accumulated), monthlyDepreciation(a)), 0);

  const run = () => {
    const { posted, total } = runMonthlyDepreciation(month);
    if (posted === 0) toast.info(t("Nothing to depreciate for this month", "لا يوجد ما يُستهلك لهذا الشهر"));
    else toast.success(t(`Depreciated ${posted} assets — ${fmt(total)} posted`, `تم استهلاك ${posted} أصل — ${fmt(total)}`));
  };

  const monthEntries = entries.filter(e => e.month === month);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("Depreciation", "الاستهلاك")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Straight-line monthly depreciation — auto-posts balanced JE per asset.",
                 "استهلاك شهري بالقسط الثابت — قيود متوازنة لكل أصل.")}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5"><Label>{t("Month", "الشهر")}</Label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9" /></div>
          <Button onClick={run} className="gap-1.5"><Activity className="h-4 w-4" />{t("Run depreciation", "تنفيذ الاستهلاك")}</Button>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <KPI label={t("Eligible assets","أصول مؤهلة")} value={String(eligible.length)} />
        <KPI label={t("Projected","المُتوقع")} value={fmt(projected)} />
        <KPI label={t("Already posted this month","تم ترحيله")} value={fmt(monthEntries.reduce((s,e)=>s+e.amount,0))} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Depreciation history","سجل الاستهلاك")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Month","الشهر")}</th>
                  <th className="px-3 py-2 text-start">{t("Asset","الأصل")}</th>
                  <th className="px-3 py-2 text-end">{t("Amount","المبلغ")}</th>
                  <th className="px-3 py-2 text-start">{t("JE","القيد")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">{t("No depreciation posted yet","لم يتم ترحيل استهلاك بعد")}</td></tr>
                ) : [...entries].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,40).map(e => {
                  const a = assets.find(x => x.id === e.assetId);
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">{e.month}</td>
                      <td className="px-3 py-2">{a?.name || e.assetId}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(e.amount)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{e.journalRef}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsTable({ assets, showDispose }: { assets: ReturnType<typeof useFixedAssets>[0]; showDispose?: boolean }) {
  const { t, lang } = useI18n();
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-start">{t("Ref","المرجع")}</th>
            <th className="px-3 py-2 text-start">{t("Name","الاسم")}</th>
            <th className="px-3 py-2 text-start">{t("Category","التصنيف")}</th>
            <th className="px-3 py-2 text-start">{t("Acquired","الاقتناء")}</th>
            <th className="px-3 py-2 text-end">{t("Cost","التكلفة")}</th>
            <th className="px-3 py-2 text-end">{t("Accum.","مجمع")}</th>
            <th className="px-3 py-2 text-end">{t("NBV","القيمة الدفترية")}</th>
            <th className="px-3 py-2 text-center">{t("Status","الحالة")}</th>
            {showDispose && <th className="px-3 py-2 text-center">{t("Actions","إجراءات")}</th>}
          </tr>
        </thead>
        <tbody>
          {assets.length === 0 ? (
            <tr><td colSpan={showDispose ? 9 : 8} className="px-3 py-8 text-center text-muted-foreground">{t("No assets","لا توجد أصول")}</td></tr>
          ) : assets.map(a => {
            const cat = CATEGORIES.find(c => c.v === a.category);
            return (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{a.ref}</td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{cat ? (lang==="ar"?cat.ar:cat.en) : a.category}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.acquisitionDate}</td>
                <td className="px-3 py-2 text-end font-mono">{fmt(a.cost)}</td>
                <td className="px-3 py-2 text-end font-mono text-muted-foreground">{fmt(a.accumulated)}</td>
                <td className="px-3 py-2 text-end font-mono font-semibold">{fmt(netBookValue(a))}</td>
                <td className="px-3 py-2 text-center">
                  {a.status === "active"   && <Badge variant="secondary">{t("Active","نشط")}</Badge>}
                  {a.status === "disposed" && <Badge variant="outline">{t("Disposed","مُستبعد")}</Badge>}
                </td>
                {showDispose && (
                  <td className="px-3 py-2 text-center">
                    {a.status === "active" && (
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                        onClick={() => {
                          const v = prompt(t("Disposal proceeds (SAR)?","قيمة البيع (ر.س)؟"), "0");
                          if (v === null) return;
                          try { disposeAsset(a.id, parseFloat(v) || 0); toast.success(t("Asset disposed","تم استبعاد الأصل")); }
                          catch (e: unknown) { toast.error((e as Error).message); }
                        }}>
                        <Trash2 className="h-3 w-3" />{t("Dispose","استبعاد")}
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value}</div>
    </CardContent></Card>
  );
}
