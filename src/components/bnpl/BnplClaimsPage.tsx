// Tabby / Tamara Claims UI — settings, build claim batch from BNPL payments,
// submit, approve, mark settled. Auto computes commission and net.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, FilePlus2, Send, CheckCircle2, Banknote, Settings2 } from "lucide-react";
import {
  useBnplConfigs, useBnplClaims, getConfig, commissionFor, nextClaimRef,
  claimStatusLabel,
  type BnplProvider, type BnplClaim,
} from "@/lib/bnpl-store";
import { usePayments, useCases, usePatients, fmtSAR } from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "amber" | "emerald" | "destructive" | "primary" }) {
  const cls = tone === "amber" ? "text-amber-700 dark:text-amber-400"
    : tone === "emerald" ? "text-emerald-700 dark:text-emerald-400"
    : tone === "destructive" ? "text-destructive"
    : tone === "primary" ? "text-primary" : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function statusBadge(s: BnplClaim["status"]) {
  const map: Record<BnplClaim["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    approved: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    settled: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="outline" className={map[s]}>{claimStatusLabel(s)}</Badge>;
}

export function BnplClaimsPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useBnplConfigs();
  const [claims, setClaims] = useBnplClaims();
  const [payments] = usePayments();
  const [cases] = useCases();
  const [patients] = usePatients();
  const [provider, setProvider] = useState<BnplProvider>("tabby");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const cfg = getConfig(configs, provider);

  // Payments via BNPL not yet attached to any claim
  const claimedPayRefs = useMemo(() => new Set(claims.flatMap(c => c.paymentIds)), [claims]);
  const eligible = payments.filter(p => p.method === provider && !claimedPayRefs.has(p.ref));

  const totals = useMemo(() => {
    const gross = claims.filter(c => c.provider === provider).reduce((a, c) => a + c.gross, 0);
    const commission = claims.filter(c => c.provider === provider).reduce((a, c) => a + c.commission, 0);
    const settled = claims.filter(c => c.provider === provider && c.status === "settled").reduce((a, c) => a + c.net, 0);
    const pending = claims.filter(c => c.provider === provider && c.status !== "settled" && c.status !== "rejected").reduce((a, c) => a + c.net, 0);
    return { gross, commission, settled, pending, eligibleCount: eligible.length };
  }, [claims, provider, eligible.length]);

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function selectAll() {
    setSelectedIds(eligible.map(p => p.id));
  }

  function buildClaim() {
    if (selectedIds.length === 0) return toast.error("اختر مدفوعات لإنشاء المطالبة");
    const picked = eligible.filter(p => selectedIds.includes(p.id));
    const gross = picked.reduce((a, p) => a + p.amount, 0);
    const { commission, net } = commissionFor(gross, cfg.commissionPct);
    const claim: BnplClaim = {
      id: crypto.randomUUID(),
      ref: nextClaimRef(claims, provider),
      provider,
      paymentIds: picked.map(p => p.ref),
      gross, commission, net,
      status: "draft",
      createdAt: new Date().toISOString(),
      createdBy: user?.username || "system",
    };
    setClaims(prev => [claim, ...prev]);
    setSelectedIds([]);
    setOpen(false);
    toast.success(`أنشئت مطالبة ${claim.ref} — صافي ${fmtSAR(net)}`);
  }

  function advance(c: BnplClaim, next: BnplClaim["status"], extra?: Partial<BnplClaim>) {
    setClaims(prev => prev.map(x => x.id === c.id ? { ...x, status: next, ...extra } : x));
    if (next === "settled") {
      import("@/lib/posting-rules").then(({ postEvent }) => {
        postEvent("bnpl:settlement", {
          kind: "bnpl.settled",
          ref: c.ref,
          date: new Date().toISOString(),
          provider: c.provider,
          gross: c.gross,
          net: c.net,
        });
      });
    }
    toast.success(`${c.ref} → ${claimStatusLabel(next)}`);
  }

  function patientName(caseId: string): string {
    const cs = cases.find(c => c.id === caseId);
    const p = cs ? patients.find(pp => pp.id === cs.patientId) : null;
    return p?.name_ar || "—";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> مطالبات Tabby / Tamara
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Tabs value={provider} onValueChange={(v) => { setProvider(v as BnplProvider); setSelectedIds([]); }}>
              <TabsList>
                <TabsTrigger value="tabby">Tabby</TabsTrigger>
                <TabsTrigger value="tamara">Tamara</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="text-xs text-muted-foreground">
              عمولة {cfg.commissionPct}% · تسوية T+{cfg.settlementDays} يوم · حالة الخدمة:{" "}
              <span className={cfg.enabled ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                {cfg.enabled ? "مُفعّل" : "متوقف"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <SummaryCard label="مدفوعات معلقة" value={String(totals.eligibleCount)} tone="amber" />
            <SummaryCard label="إجمالي المطالبات" value={fmtSAR(totals.gross)} />
            <SummaryCard label="إجمالي العمولة" value={fmtSAR(totals.commission)} tone="destructive" />
            <SummaryCard label="صافٍ منتظر" value={fmtSAR(totals.pending)} tone="amber" />
            <SummaryCard label="صافٍ مُحصّل" value={fmtSAR(totals.settled)} tone="emerald" />
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
            <div className="font-semibold">القيد المحاسبي عند إصدار الدفعة:</div>
            <div className="font-mono">من حـ/ {cfg.receivableAccount} ذمم {provider === "tabby" ? "Tabby" : "Tamara"} &nbsp; {fmtSAR(100)} (إجمالي)</div>
            <div className="font-mono">من حـ/ {cfg.commissionAccount} مصروف عمولة BNPL &nbsp; {fmtSAR(cfg.commissionPct)}</div>
            <div className="font-mono">إلى حـ/ ذمم العميل &nbsp; {fmtSAR(100)}</div>
            <div className="font-mono">إلى حـ/ 2150 عمولة BNPL مستحقة &nbsp; {fmtSAR(cfg.commissionPct)}</div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <div className="flex gap-2 items-center">
              <DialogTrigger asChild>
                <Button disabled={eligible.length === 0}>
                  <FilePlus2 className="h-4 w-4 me-1" /> إنشاء مطالبة جديدة
                </Button>
              </DialogTrigger>
              {eligible.length > 0 && (
                <span className="text-xs text-muted-foreground">{eligible.length} دفعة جاهزة للضم</span>
              )}
            </div>

            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>إنشاء مطالبة {provider === "tabby" ? "Tabby" : "Tamara"}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between mb-2">
                <Button size="sm" variant="outline" onClick={selectAll}>تحديد الكل</Button>
                <div className="text-sm">
                  المحدد: <span className="font-semibold">{selectedIds.length}</span> ·
                  إجمالي: <span className="font-semibold">{fmtSAR(eligible.filter(p => selectedIds.includes(p.id)).reduce((a, p) => a + p.amount, 0))}</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-10"></th>
                      <th className="px-3 py-2 text-start">المرجع</th>
                      <th className="px-3 py-2 text-start">التاريخ</th>
                      <th className="px-3 py-2 text-start">المريض</th>
                      <th className="px-3 py-2 text-end">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map(p => (
                      <tr key={p.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{p.ref}</td>
                        <td className="px-3 py-2 text-xs">{new Date(p.at).toLocaleDateString("ar-SA")}</td>
                        <td className="px-3 py-2">{patientName(p.caseId)}</td>
                        <td className="px-3 py-2 text-end">{fmtSAR(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={buildClaim}>إنشاء المطالبة</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-start">المرجع</th>
                  <th className="px-3 py-2 text-start">التاريخ</th>
                  <th className="px-3 py-2 text-end">عدد المدفوعات</th>
                  <th className="px-3 py-2 text-end">إجمالي</th>
                  <th className="px-3 py-2 text-end">العمولة</th>
                  <th className="px-3 py-2 text-end">صافٍ</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2 text-end">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {claims.filter(c => c.provider === provider).map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{c.ref}</td>
                    <td className="px-3 py-2 text-xs">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td className="px-3 py-2 text-end">{c.paymentIds.length}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(c.gross)}</td>
                    <td className="px-3 py-2 text-end text-destructive">−{fmtSAR(c.commission)}</td>
                    <td className="px-3 py-2 text-end font-semibold text-emerald-600">{fmtSAR(c.net)}</td>
                    <td className="px-3 py-2">{statusBadge(c.status)}</td>
                    <td className="px-3 py-2 text-end">
                      {c.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => advance(c, "submitted", { submittedAt: new Date().toISOString() })}>
                          <Send className="h-3.5 w-3.5 me-1" /> إرسال
                        </Button>
                      )}
                      {c.status === "submitted" && (
                        <Button size="sm" variant="outline" onClick={() => advance(c, "approved", { approvedAt: new Date().toISOString() })}>
                          <CheckCircle2 className="h-3.5 w-3.5 me-1" /> اعتماد
                        </Button>
                      )}
                      {c.status === "approved" && (
                        <SettleButton claim={c} onSettle={(ref) => advance(c, "settled", { settledAt: new Date().toISOString(), settledRef: ref })} />
                      )}
                    </td>
                  </tr>
                ))}
                {claims.filter(c => c.provider === provider).length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">لا توجد مطالبات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> إعدادات المزوّدين</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configs.map(c => (
            <div key={c.provider} className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{c.provider === "tabby" ? "Tabby" : "Tamara"}</div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">مُفعّل</Label>
                  <Switch checked={c.enabled} onCheckedChange={(v) => setConfigs(prev => prev.map(x => x.provider === c.provider ? { ...x, enabled: v } : x))} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <Label className="text-xs">العمولة %</Label>
                  <Input type="number" step="0.1" value={c.commissionPct}
                    onChange={(e) => setConfigs(prev => prev.map(x => x.provider === c.provider ? { ...x, commissionPct: parseFloat(e.target.value) || 0 } : x))} />
                </div>
                <div>
                  <Label className="text-xs">أيام التسوية</Label>
                  <Input type="number" value={c.settlementDays}
                    onChange={(e) => setConfigs(prev => prev.map(x => x.provider === c.provider ? { ...x, settlementDays: parseInt(e.target.value) || 0 } : x))} />
                </div>
                <div>
                  <Label className="text-xs">حساب الذمم</Label>
                  <Input value={c.receivableAccount}
                    onChange={(e) => setConfigs(prev => prev.map(x => x.provider === c.provider ? { ...x, receivableAccount: e.target.value } : x))} />
                </div>
                <div>
                  <Label className="text-xs">حساب البنك</Label>
                  <Input value={c.bankAccount}
                    onChange={(e) => setConfigs(prev => prev.map(x => x.provider === c.provider ? { ...x, bankAccount: e.target.value } : x))} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettleButton({ claim, onSettle }: { claim: BnplClaim; onSettle: (ref: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Banknote className="h-3.5 w-3.5 me-1" /> تسجيل تسوية بنكية</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>تسوية {claim.ref}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <SummaryCard label="الصافي المتوقع من البنك" value={fmtSAR(claim.net)} tone="emerald" />
          <div>
            <Label className="text-xs">مرجع الإيداع البنكي</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="مثال: BNK-2026-0123" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => { if (!ref.trim()) return; onSettle(ref); setOpen(false); }}>تأكيد التسوية</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
