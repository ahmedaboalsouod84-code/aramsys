// Reception Treasury UI — Cashier shift open/close, denomination count,
// handover voucher, and Accountant approval workflow.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, ClipboardCheck, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  useShifts, nextShiftRef, countTotal, clearingBalance,
  type TreasuryShift, type CashCountBreakdown,
} from "@/lib/treasury-store";
import { usePayments, fmtSAR } from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";

const ZERO_BREAKDOWN: CashCountBreakdown = {
  n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, n5: 0, n1: 0, coins: 0,
};

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "amber" | "emerald" | "destructive" }) {
  const cls = tone === "amber" ? "text-amber-700 dark:text-amber-400"
    : tone === "emerald" ? "text-emerald-700 dark:text-emerald-400"
    : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function statusBadge(s: TreasuryShift["status"]) {
  const map: Record<TreasuryShift["status"], { ar: string; cls: string }> = {
    open: { ar: "وردية مفتوحة", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    pending_handover: { ar: "بانتظار الاعتماد", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    approved: { ar: "معتمدة", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    rejected: { ar: "مرفوضة", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[s];
  return <Badge variant="outline" className={m.cls}>{m.ar}</Badge>;
}

/* ============================================================
   Reception Shift Page — open/close shifts, count cash, handover.
   ============================================================ */
export function ReceptionShiftPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useShifts();
  const [payments] = usePayments();
  const [openingFloat, setOpeningFloat] = useState(500);
  const [station, setStation] = useState("Reception-1");

  const username = user?.username || "anon";
  const mine = shifts.filter(s => s.cashierId === username);
  const active = mine.find(s => s.status === "open");

  function openShift() {
    if (active) return toast.error("لديك وردية مفتوحة بالفعل");
    const s: TreasuryShift = {
      id: crypto.randomUUID(),
      ref: nextShiftRef(shifts),
      cashierId: username,
      cashierName: user?.name_ar || user?.name_en || username,
      station,
      openedAt: new Date().toISOString(),
      openingFloat,
      status: "open",
      paymentIds: [],
    };
    setShifts(prev => [s, ...prev]);
    toast.success(`فتح وردية ${s.ref}`);
  }

  const cb = useMemo(() => clearingBalance(shifts), [shifts]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> خزينة الاستقبال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="ورديتي الحالية" value={active ? active.ref : "—"} tone={active ? "emerald" : undefined} />
            <SummaryCard label="إجمالي بانتظار الاعتماد" value={fmtSAR(cb.pending)} tone="amber" />
            <SummaryCard label="معتمد (محول للنقدية)" value={fmtSAR(cb.approved)} tone="emerald" />
            <SummaryCard label="إجمالي الفروقات" value={fmtSAR(cb.variance)} tone={Math.abs(cb.variance) > 0.005 ? "destructive" : "emerald"} />
          </div>

          {!active && (
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="text-sm font-semibold mb-3">فتح وردية جديدة</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs">المحطة</Label>
                  <Input value={station} onChange={e => setStation(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">العهدة الافتتاحية</Label>
                  <Input type="number" value={openingFloat} onChange={e => setOpeningFloat(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={openShift} className="w-full">فتح الوردية</Button>
                </div>
              </div>
            </div>
          )}

          {active && <ActiveShiftPanel shift={active} payments={payments} onUpdate={(u) => setShifts(prev => prev.map(p => p.id === active.id ? u : p))} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ورديات سابقة</CardTitle></CardHeader>
        <CardContent>
          <ShiftTable shifts={mine.filter(s => s.status !== "open")} />
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveShiftPanel({ shift, payments, onUpdate }: {
  shift: TreasuryShift;
  payments: ReturnType<typeof usePayments>[0];
  onUpdate: (s: TreasuryShift) => void;
}) {
  const [breakdown, setBreakdown] = useState<CashCountBreakdown>(shift.breakdown || ZERO_BREAKDOWN);
  const [notes, setNotes] = useState(shift.notes || "");
  const [open, setOpen] = useState(false);

  // Capture cash payments since shift opened.
  const since = new Date(shift.openedAt).getTime();
  const shiftPayments = payments.filter(p => new Date(p.at).getTime() >= since);
  const systemCash = shiftPayments.filter(p => p.method === "cash").reduce((a, p) => a + p.amount, 0);
  const systemCard = shiftPayments.filter(p => p.method === "card").reduce((a, p) => a + p.amount, 0);
  const systemBank = shiftPayments.filter(p => p.method === "bank").reduce((a, p) => a + p.amount, 0);
  const systemIns = shiftPayments.filter(p => p.method === "insurance").reduce((a, p) => a + p.amount, 0);
  const expectedCash = shift.openingFloat + systemCash;
  const counted = countTotal(breakdown);
  const variance = counted - expectedCash;

  function submitHandover() {
    const u: TreasuryShift = {
      ...shift,
      closedAt: new Date().toISOString(),
      systemCash, systemCard, systemBank, systemInsurance: systemIns,
      countedCash: counted,
      variance,
      breakdown,
      notes,
      status: "pending_handover",
      handoverAt: new Date().toISOString(),
      paymentIds: shiftPayments.map(p => p.ref),
    };
    onUpdate(u);
    setOpen(false);
    toast.success(`تم تسليم وردية ${shift.ref} للمحاسبة`);
  }

  return (
    <div className="rounded-md border p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold">{shift.ref} · {shift.station}</div>
          <div className="text-xs text-muted-foreground">فُتحت {new Date(shift.openedAt).toLocaleString("ar-SA")} · عهدة {fmtSAR(shift.openingFloat)}</div>
        </div>
        {statusBadge(shift.status)}
      </div>

      <div className="grid gap-3 md:grid-cols-5 text-sm">
        <SummaryCard label="نقدي مستلم (نظام)" value={fmtSAR(systemCash)} />
        <SummaryCard label="بطاقات" value={fmtSAR(systemCard)} />
        <SummaryCard label="تحويل بنكي" value={fmtSAR(systemBank)} />
        <SummaryCard label="تأمين" value={fmtSAR(systemIns)} />
        <SummaryCard label="المتوقع بالخزينة" value={fmtSAR(expectedCash)} tone="amber" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full"><ClipboardCheck className="h-4 w-4 me-1" /> إغلاق الوردية وعدّ النقد</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>عدّ النقد وتسليم الوردية</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(["n500", "n200", "n100", "n50", "n20", "n10", "n5", "n1"] as const).map(k => (
                <div key={k}>
                  <Label className="text-xs">{k.replace("n", "")} ريال × عدد</Label>
                  <Input type="number" min={0} value={breakdown[k]} onChange={e => setBreakdown({ ...breakdown, [k]: parseInt(e.target.value) || 0 })} />
                </div>
              ))}
              <div>
                <Label className="text-xs">معدنية (إجمالي)</Label>
                <Input type="number" min={0} value={breakdown.coins} onChange={e => setBreakdown({ ...breakdown, coins: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div><div className="text-xs text-muted-foreground">المتوقع</div><div className="font-semibold">{fmtSAR(expectedCash)}</div></div>
              <div><div className="text-xs text-muted-foreground">المعدود</div><div className="font-semibold">{fmtSAR(counted)}</div></div>
              <div>
                <div className="text-xs text-muted-foreground">الفرق</div>
                <div className={`font-semibold ${Math.abs(variance) < 0.005 ? "text-emerald-600" : variance > 0 ? "text-amber-600" : "text-destructive"}`}>
                  {variance > 0 ? "+" : ""}{fmtSAR(variance)}
                </div>
              </div>
            </div>

            {Math.abs(variance) > 0.005 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <span>يوجد فرق {variance > 0 ? "زيادة" : "عجز"}. الرجاء توضيح السبب في الملاحظات.</span>
              </div>
            )}

            <div>
              <Label className="text-xs">ملاحظات</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="سبب الفرق، أي أحداث استثنائية..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submitHandover}><ShieldCheck className="h-4 w-4 me-1" /> تسليم للمحاسبة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShiftTable({ shifts }: { shifts: TreasuryShift[] }) {
  if (shifts.length === 0) return <div className="text-center text-sm text-muted-foreground py-8">لا توجد ورديات</div>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-start">المرجع</th>
            <th className="px-3 py-2 text-start">المحطة</th>
            <th className="px-3 py-2 text-start">تاريخ الإغلاق</th>
            <th className="px-3 py-2 text-end">متوقع</th>
            <th className="px-3 py-2 text-end">معدود</th>
            <th className="px-3 py-2 text-end">الفرق</th>
            <th className="px-3 py-2">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map(s => (
            <tr key={s.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{s.ref}</td>
              <td className="px-3 py-2">{s.station}</td>
              <td className="px-3 py-2 text-xs">{s.closedAt ? new Date(s.closedAt).toLocaleString("ar-SA") : "—"}</td>
              <td className="px-3 py-2 text-end">{fmtSAR(s.openingFloat + (s.systemCash || 0))}</td>
              <td className="px-3 py-2 text-end">{fmtSAR(s.countedCash || 0)}</td>
              <td className={`px-3 py-2 text-end ${Math.abs(s.variance || 0) < 0.005 ? "text-emerald-600" : "text-destructive"}`}>
                {(s.variance || 0) > 0 ? "+" : ""}{fmtSAR(s.variance || 0)}
              </td>
              <td className="px-3 py-2">{statusBadge(s.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Accountant Approval Page — review pending handovers, approve/reject.
   ============================================================ */
export function TreasuryApprovalPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useShifts();
  const [selected, setSelected] = useState<TreasuryShift | null>(null);
  const [reason, setReason] = useState("");

  const pending = shifts.filter(s => s.status === "pending_handover");
  const history = shifts.filter(s => s.status === "approved" || s.status === "rejected");
  const cb = clearingBalance(shifts);

  function approve(s: TreasuryShift) {
    setShifts(prev => prev.map(x => x.id === s.id ? {
      ...x, status: "approved", approvedBy: user?.username || "accountant",
      approvedAt: new Date().toISOString(),
    } : x));
    const amount = s.countedCash || 0;
    const variance = s.systemCash != null ? (s.systemCash - amount) : 0;
    import("@/lib/posting-rules").then(({ postEvent }) => {
      postEvent("treasury:handover", {
        kind: "treasury.handover",
        ref: s.ref,
        date: new Date().toISOString(),
        amount,
        variance,
      });
    });
    toast.success(`اعتمدت وردية ${s.ref}. تم تحويل المبلغ من حساب التسوية إلى النقدية.`);
    setSelected(null);
  }
  function reject(s: TreasuryShift) {
    if (!reason.trim()) return toast.error("الرجاء كتابة سبب الرفض");
    setShifts(prev => prev.map(x => x.id === s.id ? {
      ...x, status: "rejected", rejectedReason: reason,
      approvedBy: user?.username || "accountant", approvedAt: new Date().toISOString(),
    } : x));
    toast.success(`تم رفض وردية ${s.ref} وإعادتها للكاشير`);
    setSelected(null);
    setReason("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> اعتماد ورديات الخزينة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard label="بانتظار الاعتماد" value={String(pending.length)} tone="amber" />
            <SummaryCard label="رصيد حساب التسوية" value={fmtSAR(cb.pending)} tone="amber" />
            <SummaryCard label="إجمالي معتمد" value={fmtSAR(cb.approved)} tone="emerald" />
            <SummaryCard label="إجمالي الفروقات" value={fmtSAR(cb.variance)} tone={Math.abs(cb.variance) > 0.005 ? "destructive" : "emerald"} />
          </div>

          <div className="rounded-md border bg-muted/20 p-3 text-xs space-y-1">
            <div className="font-semibold">قيد محاسبي عند الاعتماد:</div>
            <div className="font-mono">من حـ/ 1111 الصندوق &nbsp; xxx</div>
            <div className="font-mono">إلى حـ/ 1115 سيولة قيد التسوية &nbsp; xxx</div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-start">المرجع</th>
                  <th className="px-3 py-2 text-start">الكاشير</th>
                  <th className="px-3 py-2 text-start">المحطة</th>
                  <th className="px-3 py-2 text-start">التسليم</th>
                  <th className="px-3 py-2 text-end">معدود</th>
                  <th className="px-3 py-2 text-end">الفرق</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{s.ref}</td>
                    <td className="px-3 py-2">{s.cashierName}</td>
                    <td className="px-3 py-2">{s.station}</td>
                    <td className="px-3 py-2 text-xs">{s.handoverAt ? new Date(s.handoverAt).toLocaleString("ar-SA") : "—"}</td>
                    <td className="px-3 py-2 text-end">{fmtSAR(s.countedCash || 0)}</td>
                    <td className={`px-3 py-2 text-end ${Math.abs(s.variance || 0) < 0.005 ? "text-emerald-600" : "text-destructive"}`}>
                      {(s.variance || 0) > 0 ? "+" : ""}{fmtSAR(s.variance || 0)}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Button size="sm" variant="outline" onClick={() => setSelected(s)}>مراجعة</Button>
                    </td>
                  </tr>
                ))}
                {pending.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">لا يوجد ورديات بانتظار الاعتماد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل الاعتمادات</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">لا يوجد سجل</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-start">المرجع</th>
                    <th className="px-3 py-2 text-start">الكاشير</th>
                    <th className="px-3 py-2 text-start">التاريخ</th>
                    <th className="px-3 py-2 text-end">المبلغ</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2 text-start">المعتمد/السبب</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{s.ref}</td>
                      <td className="px-3 py-2">{s.cashierName}</td>
                      <td className="px-3 py-2 text-xs">{s.approvedAt ? new Date(s.approvedAt).toLocaleString("ar-SA") : "—"}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(s.countedCash || 0)}</td>
                      <td className="px-3 py-2">{statusBadge(s.status)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{s.approvedBy}{s.rejectedReason ? ` — ${s.rejectedReason}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReason(""); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>مراجعة وردية {selected?.ref}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <SummaryCard label="نقدي نظام" value={fmtSAR(selected.systemCash || 0)} />
                <SummaryCard label="معدود" value={fmtSAR(selected.countedCash || 0)} />
                <SummaryCard label="عهدة افتتاحية" value={fmtSAR(selected.openingFloat)} />
                <SummaryCard label="الفرق" value={fmtSAR(selected.variance || 0)} tone={Math.abs(selected.variance || 0) > 0.005 ? "destructive" : "emerald"} />
              </div>
              {selected.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="font-semibold mb-1">ملاحظات الكاشير:</div>
                  <div className="whitespace-pre-wrap">{selected.notes}</div>
                </div>
              )}
              <div>
                <Label className="text-xs">سبب الرفض (في حال الرفض)</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setSelected(null); setReason(""); }}>إغلاق</Button>
            {selected && (
              <>
                <Button variant="destructive" onClick={() => selected && reject(selected)}>
                  <XCircle className="h-4 w-4 me-1" /> رفض
                </Button>
                <Button onClick={() => selected && approve(selected)}>
                  <CheckCircle2 className="h-4 w-4 me-1" /> اعتماد وتحويل للنقدية
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
