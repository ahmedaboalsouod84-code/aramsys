// Insurance Claims — submit, adjudicate, settle. Settlement posts to ledger.
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useInsurers, useClaims, nextClaimRef, claimGross, claimApproved,
  claimStatusBadge, CLAIM_STATUS_LABEL,
  type ClaimLine, type InsuranceClaim,
} from "@/lib/insurance-store";
import { postEvent } from "@/lib/posting-rules";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n);

export function InsuranceClaimsPage() {
  const [insurers] = useInsurers();
  const [claims, setClaims] = useClaims();
  const [open, setOpen] = useState(false);
  const [insurerId, setInsurerId] = useState("");
  const [lines, setLines] = useState<ClaimLine[]>([
    { id: crypto.randomUUID(), patientRef: "", serviceName: "", gross: 0, approved: 0 },
  ]);
  const [settleOpen, setSettleOpen] = useState<InsuranceClaim | null>(null);
  const [netReceived, setNetReceived] = useState(0);
  const [rejectReason, setRejectReason] = useState("");

  const upLine = (id: string, k: keyof ClaimLine, v: string) =>
    setLines((p) => p.map((l) => l.id === id
      ? { ...l, [k]: (k === "gross" || k === "approved") ? Number(v) : v } : l));
  const addLine = () => setLines((p) => [...p, { id: crypto.randomUUID(), patientRef: "", serviceName: "", gross: 0, approved: 0 }]);
  const rmLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id));

  const reset = () => {
    setInsurerId("");
    setLines([{ id: crypto.randomUUID(), patientRef: "", serviceName: "", gross: 0, approved: 0 }]);
  };

  const submit = () => {
    if (!insurerId) return toast.error("اختر شركة التأمين");
    const valid = lines.filter((l) => l.patientRef.trim() && l.gross > 0);
    if (!valid.length) return toast.error("أضف بنداً واحداً على الأقل");
    const ref = nextClaimRef(claims);
    setClaims((p) => [{
      id: crypto.randomUUID(), ref, insurerId, status: "submitted",
      lines: valid.map((l) => ({ ...l, approved: l.approved || l.gross })),
      submittedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    }, ...p]);
    toast.success(`تم تقديم المطالبة ${ref}`);
    setOpen(false); reset();
  };

  const review = (id: string) =>
    setClaims((p) => p.map((c) => c.id === id ? { ...c, status: "under_review" } : c));
  const approve = (id: string) =>
    setClaims((p) => p.map((c) => c.id === id ? { ...c, status: "approved" } : c));
  const reject = (id: string, reason: string) =>
    setClaims((p) => p.map((c) => c.id === id ? { ...c, status: "rejected", rejectionReason: reason } : c));

  const settle = (c: InsuranceClaim, net: number) => {
    const gross = claimApproved(c);
    if (net <= 0 || net > gross) return toast.error(`المبلغ المستلم يجب أن يكون بين 0 و ${fmt(gross)}`);
    postEvent("insurance:settle", {
      kind: "insurance.settled", ref: c.ref, date: new Date().toISOString(),
      gross, net,
    });
    setClaims((p) => p.map((x) => x.id === c.id
      ? { ...x, status: "settled", settledAt: new Date().toISOString(), netReceived: net } : x));
    toast.success(`تم تسوية ${c.ref} وقيد التحصيل`);
    setSettleOpen(null); setNetReceived(0);
  };

  const totals = useMemo(() => {
    let outstanding = 0, settled = 0, rejected = 0;
    for (const c of claims) {
      const g = claimApproved(c);
      if (c.status === "settled") settled += (c.netReceived || g);
      else if (c.status === "rejected") rejected += claimGross(c);
      else outstanding += g;
    }
    return { outstanding, settled, rejected };
  }, [claims]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">مطالبات التأمين</h1>
        <p className="text-sm text-muted-foreground mt-1">
          دورة كاملة: إنشاء → تقديم → مراجعة → اعتماد/رفض → تسوية. التسوية تُرحَّل تلقائياً إلى دفتر الأستاذ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">ذمم تأمين قائمة</div>
          <div className="text-xl font-semibold">{fmt(totals.outstanding)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">مُحصَّل</div>
          <div className="text-xl font-semibold text-emerald-600">{fmt(totals.settled)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">مرفوض</div>
          <div className="text-xl font-semibold text-destructive">{fmt(totals.rejected)}</div>
        </CardContent></Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>قيد التسوية</AlertTitle>
        <AlertDescription>
          عند ضغط "تسوية" يتم: <b>Bank DR</b> بالمبلغ المستلم، <b>Insurance Write-Off DR</b> بالفرق إن وُجد،
          <b> Insurance Receivable CR</b> بالإجمالي المعتمد.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />مطالبة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>مطالبة تأمين جديدة</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label>شركة التأمين</Label>
                <Select value={insurerId} onValueChange={setInsurerId}>
                  <SelectTrigger><SelectValue placeholder="اختر شركة" /></SelectTrigger>
                  <SelectContent>
                    {insurers.filter((i) => i.active).map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name_ar} ({i.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>بنود المطالبة (حالات/فواتير)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 me-1" />سطر
                </Button>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>مرجع المريض</TableHead>
                  <TableHead>الفاتورة</TableHead>
                  <TableHead>الخدمة</TableHead>
                  <TableHead className="w-28">المبلغ</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell><Input value={l.patientRef} onChange={(e) => upLine(l.id, "patientRef", e.target.value)} /></TableCell>
                      <TableCell><Input value={l.invoiceNo || ""} onChange={(e) => upLine(l.id, "invoiceNo", e.target.value)} /></TableCell>
                      <TableCell><Input value={l.serviceName} onChange={(e) => upLine(l.id, "serviceName", e.target.value)} /></TableCell>
                      <TableCell><Input type="number" value={l.gross} onChange={(e) => upLine(l.id, "gross", e.target.value)} /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => rmLine(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-end text-sm">
                إجمالي المطالبة: <b>{fmt(lines.reduce((a, l) => a + (l.gross || 0), 0))}</b>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>تقديم المطالبة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>المرجع</TableHead>
            <TableHead>شركة التأمين</TableHead>
            <TableHead>بنود</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>المعتمد</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {claims.map((c) => {
              const ins = insurers.find((i) => i.id === c.insurerId);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.ref}</TableCell>
                  <TableCell>{ins?.name_ar || "—"}</TableCell>
                  <TableCell>{c.lines.length}</TableCell>
                  <TableCell>{fmt(claimGross(c))}</TableCell>
                  <TableCell>{fmt(claimApproved(c))}</TableCell>
                  <TableCell><Badge className={claimStatusBadge(c.status)}>{CLAIM_STATUS_LABEL[c.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c.status === "submitted" && <Button size="sm" variant="outline" onClick={() => review(c.id)}>بدء المراجعة</Button>}
                      {c.status === "under_review" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => approve(c.id)}>اعتماد</Button>
                          <Button size="sm" variant="ghost" onClick={() => { const r = prompt("سبب الرفض؟") || ""; if (r) reject(c.id, r); }}>رفض</Button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <Button size="sm" onClick={() => { setSettleOpen(c); setNetReceived(claimApproved(c)); }}>تسوية</Button>
                      )}
                      {c.status === "settled" && c.netReceived != null && (
                        <span className="text-xs text-emerald-700">مُحصَّل: {fmt(c.netReceived)}</span>
                      )}
                      {c.status === "rejected" && c.rejectionReason && (
                        <span className="text-xs text-destructive">{c.rejectionReason}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {claims.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">لا مطالبات</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!settleOpen} onOpenChange={(v) => !v && setSettleOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسوية مطالبة {settleOpen?.ref}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">
              المبلغ المعتمد: <b>{settleOpen ? fmt(claimApproved(settleOpen)) : ""}</b>
            </div>
            <div className="space-y-1">
              <Label>المبلغ المستلم فعلياً</Label>
              <Input type="number" value={netReceived} onChange={(e) => setNetReceived(Number(e.target.value))} />
              <div className="text-xs text-muted-foreground">
                الفرق سيُسجَّل في حساب "خصم تأمين".
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => settleOpen && settle(settleOpen, netReceived)}>تأكيد التسوية</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
