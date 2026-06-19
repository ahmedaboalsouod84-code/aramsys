// ZATCA E-Invoicing (Saudi Arabia Phase 1 — simplified Tax Invoices).
//
// Generates the standard ZATCA QR code (TLV → Base64) for each invoice:
//   Tag 1: Seller name
//   Tag 2: Seller VAT registration number
//   Tag 3: Timestamp (ISO 8601)
//   Tag 4: Invoice total (with VAT)
//   Tag 5: VAT total
//
// Output is a base64 string rendered as a QR via api.qrserver.com (free).
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useInvoices, usePatients } from "@/lib/journey-store";
import { fmt } from "@/lib/bank-recon-store";
import { FileCode2, QrCode, Save, Printer } from "lucide-react";

type SellerCfg = {
  name: string;
  vatNumber: string;   // 15-digit VAT TRN
  crNumber?: string;
  address?: string;
};

const SELLER_KEY = "zatca:seller";
const DEFAULT_SELLER: SellerCfg = {
  name: "ARAMSYS Medical Group",
  vatNumber: "300000000000003",
  crNumber: "1010000000",
  address: "Riyadh, Saudi Arabia",
};

function loadSeller(): SellerCfg {
  if (typeof window === "undefined") return DEFAULT_SELLER;
  try {
    const raw = window.localStorage.getItem(SELLER_KEY);
    return raw ? { ...DEFAULT_SELLER, ...JSON.parse(raw) } : DEFAULT_SELLER;
  } catch { return DEFAULT_SELLER; }
}
function saveSeller(s: SellerCfg) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELLER_KEY, JSON.stringify(s));
}

/* ---------- TLV encoder ---------- */
function utf8(s: string): Uint8Array { return new TextEncoder().encode(s); }
function tlv(tag: number, value: string): Uint8Array {
  const v = utf8(value);
  const out = new Uint8Array(2 + v.length);
  out[0] = tag;
  out[1] = v.length;
  out.set(v, 2);
  return out;
}
function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
}

export function buildZatcaQr(seller: SellerCfg, invoice: {
  total: number; vatAmount: number; createdAt: string;
}): string {
  const bytes = concat([
    tlv(1, seller.name || ""),
    tlv(2, seller.vatNumber || ""),
    tlv(3, new Date(invoice.createdAt).toISOString()),
    tlv(4, invoice.total.toFixed(2)),
    tlv(5, invoice.vatAmount.toFixed(2)),
  ]);
  return toBase64(bytes);
}

/* ---------- Page ---------- */
export function ZatcaEInvoicingPage() {
  const { t } = useI18n();
  const [seller, setSeller] = useState<SellerCfg>(DEFAULT_SELLER);
  const [invoices] = useInvoices();
  const [patients] = usePatients();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => { setSeller(loadSeller()); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!q) return list;
    return list.filter(i =>
      i.invoiceNo.toLowerCase().includes(q) ||
      patients.find(p => p.id === i.patientId)?.name_ar.toLowerCase().includes(q));
  }, [invoices, patients, query]);

  const totalsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of invoices) map[i.status] = (map[i.status] || 0) + i.total;
    return map;
  }, [invoices]);

  const invoice = active ? invoices.find(i => i.id === active) : null;
  const patient = invoice ? patients.find(p => p.id === invoice.patientId) : null;
  const qrPayload = invoice ? buildZatcaQr(seller, invoice) : "";
  const qrUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`
    : "";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <FileCode2 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("ZATCA E-Invoicing", "الفوترة الإلكترونية (هيئة الزكاة)")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Generate ZATCA Phase 1 simplified tax invoice QR codes (TLV/Base64).",
               "إصدار رمز QR للفواتير المبسطة وفق المرحلة الأولى من ZATCA (TLV/Base64).")}
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("Seller information", "بيانات البائع")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{t("Seller name", "اسم البائع")}*</Label>
            <Input value={seller.name} onChange={e => setSeller({ ...seller, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("VAT number (15 digits)", "الرقم الضريبي (15 رقم)")}*</Label>
            <Input value={seller.vatNumber} onChange={e => setSeller({ ...seller, vatNumber: e.target.value })} maxLength={15} /></div>
          <div className="space-y-1.5"><Label>{t("CR number", "السجل التجاري")}</Label>
            <Input value={seller.crNumber || ""} onChange={e => setSeller({ ...seller, crNumber: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("Address", "العنوان")}</Label>
            <Input value={seller.address || ""} onChange={e => setSeller({ ...seller, address: e.target.value })} /></div>
          <div className="col-span-full flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { saveSeller(seller); }}>
              <Save className="h-4 w-4" />{t("Save", "حفظ")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-4 gap-3">
        {(["paid", "partial", "pending", "draft"] as const).map(s => (
          <Card key={s}><CardContent className="pt-5">
            <div className="text-xs text-muted-foreground capitalize">{s}</div>
            <div className="text-xl font-semibold font-mono mt-1">{fmt(totalsByStatus[s] || 0)}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t("Invoices", "الفواتير")}</CardTitle>
            <Input
              placeholder={t("Search invoice or patient", "بحث برقم الفاتورة أو المريض")}
              className="max-w-xs h-8"
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">{t("Invoice", "الفاتورة")}</th>
                  <th className="px-3 py-2 text-start">{t("Date", "التاريخ")}</th>
                  <th className="px-3 py-2 text-start">{t("Patient", "المريض")}</th>
                  <th className="px-3 py-2 text-end">{t("Subtotal", "قبل الضريبة")}</th>
                  <th className="px-3 py-2 text-end">{t("VAT", "الضريبة")}</th>
                  <th className="px-3 py-2 text-end">{t("Total", "الإجمالي")}</th>
                  <th className="px-3 py-2 text-center">{t("Status", "الحالة")}</th>
                  <th className="px-3 py-2 text-center">{t("ZATCA QR", "QR")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t("No invoices", "لا توجد فواتير")}</td></tr>
                ) : rows.map(i => {
                  const p = patients.find(x => x.id === i.patientId);
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{i.invoiceNo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.createdAt.slice(0, 10)}</td>
                      <td className="px-3 py-2">{p?.name_ar || "—"}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(i.subtotal)}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(i.vatAmount)}</td>
                      <td className="px-3 py-2 text-end font-mono">{fmt(i.total)}</td>
                      <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-xs">{i.status}</Badge></td>
                      <td className="px-3 py-2 text-center">
                        <Button size="sm" variant="outline" className="gap-1"
                          onClick={() => setActive(i.id)}>
                          <QrCode className="h-3 w-3" />{t("View", "عرض")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("ZATCA Tax Invoice", "فاتورة ضريبية مبسطة")}</DialogTitle></DialogHeader>
          {invoice && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 space-y-1">
                <div className="font-semibold">{seller.name}</div>
                <div className="text-xs text-muted-foreground">VAT: {seller.vatNumber}</div>
                {seller.crNumber && <div className="text-xs text-muted-foreground">CR: {seller.crNumber}</div>}
                {seller.address && <div className="text-xs text-muted-foreground">{seller.address}</div>}
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Invoice #", "رقم الفاتورة")}</span><span className="font-mono">{invoice.invoiceNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Patient", "المريض")}</span><span>{patient?.name_ar || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Date", "التاريخ")}</span><span className="font-mono">{new Date(invoice.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Subtotal", "قبل الضريبة")}</span><span className="font-mono">{fmt(invoice.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("VAT (15%)", "ض.ق.م 15٪")}</span><span className="font-mono">{fmt(invoice.vatAmount)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>{t("Total", "الإجمالي")}</span><span className="font-mono">{fmt(invoice.total)}</span></div>

              <div className="flex flex-col items-center pt-2 border-t">
                <img src={qrUrl} alt="ZATCA QR" className="w-48 h-48" />
                <code className="mt-2 text-[10px] break-all text-muted-foreground max-w-full">{qrPayload}</code>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
                  <Printer className="h-3 w-3" />{t("Print", "طباعة")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
