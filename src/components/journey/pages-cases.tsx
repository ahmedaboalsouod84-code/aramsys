import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ArrowLeft, Trash2, FileText, Receipt as ReceiptIcon, AlertCircle } from "lucide-react";
import {
  useServices, useDoctors, usePatients, useCases, useInvoices, usePayments,
  useRadiology, useMatRequests, useActivity, usePackets,
  fmtSAR, statusColor, STATUS_LABEL_AR, caseTotals, nextCaseNo, nextInvoiceNo, nextRef,
  type PatientCase, type CaseService, type Invoice, type Payment, type PaymentMethod,
  type RadiologyRequest, type MaterialRequest,
} from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

/* ============================================================
   CASES LIST + DETAIL (with tabs)
   ============================================================ */
export function CasesPage() {
  const [cases, setCases] = useCases();
  const [patients] = usePatients();
  const [doctors] = useDoctors();
  const [services] = useServices();
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState({ patientId: "", doctorId: "", branch: "الفرع الرئيسي", initialServiceId: "" });

  const selected = cases.find(c => c.id === selectedId);

  const filtered = useMemo(() => cases.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!q) return true;
    const p = patients.find(x => x.id === c.patientId);
    return c.caseNo.includes(q) || (p && (p.name_ar.includes(q) || p.fileNo.includes(q) || p.phone.includes(q)));
  }), [cases, patients, q, statusFilter]);

  const openCase = () => {
    if (!form.patientId || !form.doctorId) return toast.error("اختر المريض والطبيب");
    const doctor = doctors.find(d => d.id === form.doctorId)!;
    const newCase: PatientCase = {
      id: crypto.randomUUID(),
      caseNo: nextCaseNo(cases),
      patientId: form.patientId,
      doctorId: form.doctorId,
      branch: form.branch,
      department: doctor.department,
      room: doctor.room,
      status: "active",
      payStatus: "unpaid",
      openedAt: new Date().toISOString(),
      services: [],
      notes: [],
      needsFollowUp: false,
      medicallyCompleted: false,
    };
    if (form.initialServiceId) {
      const sv = services.find(s => s.id === form.initialServiceId)!;
      newCase.services.push({
        id: crypto.randomUUID(), serviceId: sv.id, code: sv.code, name_ar: sv.name_ar,
        qty: 1, unitPrice: sv.price, originalPrice: sv.price, free: false,
        taxable: sv.taxable, vat: sv.vat,
        addedBy: user?.username || "?", addedByRole: role || "?",
        addedAt: new Date().toISOString(), invoiced: false,
      });
    }
    setCases(prev => [newCase, ...prev]);
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?",
      action: "فتح حالة جديدة", caseId: newCase.id, detail: newCase.caseNo }, ...prev]);
    setOpen(false);
    setForm({ patientId: "", doctorId: "", branch: "الفرع الرئيسي", initialServiceId: "" });
    setSelectedId(newCase.id);
    toast.success(`تم فتح ${newCase.caseNo}`);
  };

  if (selected) {
    return <CaseDetail caseId={selected.id} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><FileText className="h-6 w-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">حالات المرضى</h1>
          <p className="text-sm text-muted-foreground">{cases.length} حالة • الكيان الرئيسي للنظام</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />حالة جديدة</Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="رقم الحالة/اسم المريض/الجوال…" className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشطة</SelectItem>
            <SelectItem value="pending_payment">بانتظار الدفع</SelectItem>
            <SelectItem value="medically_completed">مكتملة طبياً</SelectItem>
            <SelectItem value="closed">مغلقة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-start px-3 py-2">رقم الحالة</th>
              <th className="text-start px-3 py-2">المريض</th>
              <th className="text-start px-3 py-2">الطبيب</th>
              <th className="text-start px-3 py-2">الحالة</th>
              <th className="text-start px-3 py-2">الدفع</th>
              <th className="text-end px-3 py-2">الإجمالي</th>
              <th className="text-end px-3 py-2">المتبقي</th>
              <th className="text-end px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const p = patients.find(x => x.id === c.patientId);
              const d = doctors.find(x => x.id === c.doctorId);
              const t = caseTotals(c, invoices, payments);
              return <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{c.caseNo}</td>
                <td className="px-3 py-2 font-medium">{p?.name_ar || "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{d?.name_ar || "-"}</td>
                <td className="px-3 py-2"><Badge className={statusColor(c.status)}>{STATUS_LABEL_AR[c.status]}</Badge></td>
                <td className="px-3 py-2"><Badge className={statusColor(c.payStatus)}>{STATUS_LABEL_AR[c.payStatus]}</Badge></td>
                <td className="px-3 py-2 text-end font-mono">{fmtSAR(t.total)}</td>
                <td className="px-3 py-2 text-end font-mono">{t.remaining > 0 ? <span className="text-destructive">{fmtSAR(t.remaining)}</span> : "—"}</td>
                <td className="px-3 py-2 text-end"><Button size="sm" variant="outline" onClick={() => setSelectedId(c.id)}>فتح</Button></td>
              </tr>;
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">لا توجد حالات</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>فتح حالة جديدة</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>المريض</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.fileNo} • {p.name_ar} • {p.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الطبيب</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name_ar} - {d.department}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الفرع</Label><Input value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>خدمة استقبال أولية (اختياري - عادةً كشف)</Label>
              <Select value={form.initialServiceId} onValueChange={v => setForm({ ...form, initialServiceId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر خدمة الكشف" /></SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.active && (s.category === "consultation" || s.category === "followup")).map(s =>
                    <SelectItem key={s.id} value={s.id}>{s.code} • {s.name_ar} • {fmtSAR(s.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={openCase}>فتح الحالة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   CASE DETAIL with tabs
   ============================================================ */
function CaseDetail({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [cases, setCases] = useCases();
  const [patients] = usePatients();
  const [doctors] = useDoctors();
  const [services] = useServices();
  const [invoices, setInvoices] = useInvoices();
  const [payments, setPayments] = usePayments();
  const [radiology, setRadiology] = useRadiology();
  const [matreq, setMatreq] = useMatRequests();
  const [packets, setPackets] = usePackets();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();

  const c = cases.find(x => x.id === caseId);
  if (!c) return <div className="p-6">الحالة غير موجودة <Button onClick={onBack}>رجوع</Button></div>;
  const patient = patients.find(p => p.id === c.patientId);
  const doctor = doctors.find(d => d.id === c.doctorId);
  const t = caseTotals(c, invoices, payments, patient);
  const caseInvoices = invoices.filter(i => i.caseId === c.id);
  const casePayments = payments.filter(p => p.caseId === c.id);
  const caseRad = radiology.filter(r => r.caseId === c.id);
  const caseMat = matreq.filter(m => m.caseId === c.id);
  const casePackets = packets.filter(p => p.caseId === c.id);

  const updateCase = (mut: (c: PatientCase) => PatientCase) => {
    setCases(prev => prev.map(x => x.id === c.id ? mut(x) : x));
  };

  const log = (action: string, detail?: string, oldV?: string, newV?: string) => {
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action, caseId: c.id, detail, oldValue: oldV, newValue: newV }, ...prev]);
  };

  // Recompute payStatus + status based on totals
  const refreshStatus = (next: PatientCase) => {
    const nt = caseTotals(next, invoices, payments);
    let payStatus: typeof next.payStatus = "unpaid";
    if (nt.paid >= nt.total && nt.total > 0) payStatus = "paid";
    else if (nt.paid > 0) payStatus = "partial";
    next.payStatus = payStatus;
    return next;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{c.caseNo}</h1>
            <Badge className={statusColor(c.status)}>{STATUS_LABEL_AR[c.status]}</Badge>
            <Badge className={statusColor(c.payStatus)}>{STATUS_LABEL_AR[c.payStatus]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{patient?.name_ar} • {patient?.phone} • {doctor?.name_ar}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <MetricCard label="إجمالي" value={fmtSAR(t.subtotal)} />
        <MetricCard label="ضريبة" value={fmtSAR(t.vat)} />
        <MetricCard label="الكلي" value={fmtSAR(t.total)} bold />
        <MetricCard label="المدفوع" value={fmtSAR(t.paid)} className="text-success" />
        <MetricCard label="المتبقي" value={fmtSAR(t.remaining)} className={t.remaining > 0 ? "text-destructive" : ""} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="services">الخدمات ({c.services.length})</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير ({caseInvoices.length})</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات ({casePayments.length})</TabsTrigger>
          <TabsTrigger value="radiology">الأشعة ({caseRad.length})</TabsTrigger>
          <TabsTrigger value="materials">المواد ({caseMat.length})</TabsTrigger>
          <TabsTrigger value="packets">الأطقم ({casePackets.length})</TabsTrigger>
          <TabsTrigger value="notes">الملاحظات ({c.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card><CardContent className="p-4 space-y-2 text-sm">
            <Row label="رقم الملف" v={patient?.fileNo || "-"} />
            <Row label="القسم" v={c.department} />
            <Row label="الغرفة" v={c.room || "-"} />
            <Row label="الفرع" v={c.branch} />
            <Row label="فتحت" v={new Date(c.openedAt).toLocaleString("ar-SA")} />
            <Row label="مكتملة طبياً" v={c.medicallyCompleted ? "نعم" : "لا"} />
            {c.followUpDate && <Row label="موعد المتابعة" v={c.followUpDate} />}
          </CardContent></Card>
          {t.remaining > 0 && <Card className="border-amber-500/40 bg-amber-500/5"><CardContent className="p-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" /> يوجد مبلغ متبقٍ {fmtSAR(t.remaining)} - لا يمكن إغلاق الحالة قبل التحصيل أو اعتماد الذمم.
          </CardContent></Card>}
          <div className="flex flex-wrap gap-2">
            {!c.medicallyCompleted && role !== "reception" && (
              <Button onClick={() => {
                updateCase(p => ({ ...p, medicallyCompleted: true, status: t.remaining > 0 ? "pending_payment" : "medically_completed" }));
                log("تعليم كمكتمل طبياً");
                toast.success("تم");
              }}>تعليم كمكتمل طبياً</Button>
            )}
            {c.status !== "closed" && c.status !== "cancelled" && (
              <Button variant="outline" onClick={() => {
                if (t.remaining > 0 && !confirm("يوجد مبلغ متبقٍ. اعتمد كذمم وأغلق؟")) return;
                updateCase(p => ({ ...p, status: "closed", closedAt: new Date().toISOString() }));
                log("إغلاق الحالة");
                toast.success("تم الإغلاق");
              }}>إغلاق الحالة</Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab caseId={c.id} onChange={refreshStatus} log={log} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab caseId={c.id} />
          <div className="mt-3">
            <Button onClick={() => {
              const pending = c.services.filter(s => !s.invoiced && !s.free);
              if (pending.length === 0) return toast.error("لا توجد خدمات بانتظار الفوترة");
              const vatExempt = patient?.nationality === "SA";
              let subtotal = 0, vat = 0;
              const lines = pending.map(s => {
                const line = s.qty * s.unitPrice;
                subtotal += line;
                if (s.taxable && !vatExempt) vat += line * (s.vat / 100);
                return { serviceId: s.serviceId, code: s.code, name_ar: s.name_ar, qty: s.qty, unitPrice: s.unitPrice, taxable: s.taxable && !vatExempt, vat: vatExempt ? 0 : s.vat };
              });
              const inv: Invoice = {
                id: crypto.randomUUID(),
                invoiceNo: nextInvoiceNo(invoices),
                caseId: c.id, patientId: c.patientId, doctorId: c.doctorId,
                lines, subtotal, vatAmount: vat, discount: 0, total: subtotal + vat,
                paid: 0, status: "pending",
                createdBy: user?.username || "?", createdAt: new Date().toISOString(),
              };
              setInvoices(prev => [inv, ...prev]);
              setCases(prev => prev.map(x => x.id !== c.id ? x : {
                ...x,
                services: x.services.map(s => pending.find(p => p.id === s.id) ? { ...s, invoiced: true, invoiceId: inv.id } : s),
              }));
              log("إنشاء فاتورة", inv.invoiceNo);
              toast.success(`تم إنشاء ${inv.invoiceNo}${vatExempt ? " (بدون ضريبة - سعودي)" : ""}`);
            }}><ReceiptIcon className="h-4 w-4 me-1" />إنشاء فاتورة من الخدمات المعلقة</Button>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab caseId={c.id} onChange={(p) => {
            const newCase = { ...c };
            const np = caseTotals(newCase, invoices, [...payments, p], patient);
            let payStatus: typeof c.payStatus = "unpaid";
            if (np.paid >= np.total && np.total > 0) payStatus = "paid";
            else if (np.paid > 0) payStatus = "partial";
            updateCase(prev => ({ ...prev, payStatus }));
          }} />
        </TabsContent>

        <TabsContent value="radiology">
          <RadiologyTab caseId={c.id} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab caseId={c.id} />
        </TabsContent>

        <TabsContent value="packets">
          <PacketsTab caseId={c.id} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab caseId={c.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-mono ${bold ? "text-lg font-semibold" : ""} ${className || ""}`}>{value}</div>
    </CardContent></Card>
  );
}
function Row({ label, v }: { label: string; v: string }) {
  return <div className="flex justify-between border-b last:border-0 py-1"><span className="text-muted-foreground">{label}</span><span className="font-medium">{v}</span></div>;
}

/* --- Services Tab --- */
function ServicesTab({ caseId, log }: { caseId: string; onChange: (c: PatientCase) => PatientCase; log: (a: string, d?: string, o?: string, n?: string) => void }) {
  const [cases, setCases] = useCases();
  const [services] = useServices();
  const { user, role } = useAuth();
  const c = cases.find(x => x.id === caseId)!;
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ serviceId: "", qty: 1, unitPrice: 0, free: false, reason: "" });

  const addService = () => {
    if (!form.serviceId) return toast.error("اختر خدمة");
    const sv = services.find(s => s.id === form.serviceId)!;
    const price = form.free ? 0 : (form.unitPrice || sv.price);
    const cs: CaseService = {
      id: crypto.randomUUID(), serviceId: sv.id, code: sv.code, name_ar: sv.name_ar,
      qty: form.qty, unitPrice: price, originalPrice: sv.price,
      priceChangeReason: price !== sv.price ? form.reason : undefined,
      priceChangedBy: price !== sv.price ? user?.username : undefined,
      free: form.free, taxable: sv.taxable && !form.free, vat: sv.vat,
      addedBy: user?.username || "?", addedByRole: role || "?",
      addedAt: new Date().toISOString(), invoiced: false,
    };
    setCases(prev => prev.map(x => x.id === c.id ? { ...x, services: [...x.services, cs] } : x));
    log("إضافة خدمة للحالة", `${sv.code} - ${sv.name_ar}`);
    setAddOpen(false);
    setForm({ serviceId: "", qty: 1, unitPrice: 0, free: false, reason: "" });
    toast.success("تمت الإضافة");
  };

  const removeService = (sid: string) => {
    const s = c.services.find(x => x.id === sid);
    if (s?.invoiced) return toast.error("الخدمة مفوترة، لا يمكن حذفها");
    setCases(prev => prev.map(x => x.id === c.id ? { ...x, services: x.services.filter(y => y.id !== sid) } : x));
    log("حذف خدمة", s?.name_ar);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 me-1" />إضافة خدمة</Button>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr><th className="text-start px-3 py-2">الكود</th><th className="text-start px-3 py-2">الخدمة</th><th className="text-end px-3 py-2">كمية</th><th className="text-end px-3 py-2">سعر</th><th className="text-end px-3 py-2">الإجمالي</th><th className="text-start px-3 py-2">الحالة</th><th></th></tr>
          </thead>
          <tbody>{c.services.map(s => (
            <tr key={s.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
              <td className="px-3 py-2">{s.name_ar} {s.free && <Badge variant="outline" className="ms-1 text-xs">مجاناً</Badge>}</td>
              <td className="px-3 py-2 text-end">{s.qty}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(s.unitPrice)}{s.unitPrice !== s.originalPrice && <span className="text-xs text-muted-foreground ms-1">(أصلي {fmtSAR(s.originalPrice)})</span>}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(s.qty * s.unitPrice)}</td>
              <td className="px-3 py-2">{s.invoiced ? <Badge className="bg-emerald-500/15 text-emerald-700">مفوتر</Badge> : <Badge variant="outline">معلق</Badge>}</td>
              <td className="px-3 py-2 text-end">{!s.invoiced && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeService(s.id)}><Trash2 className="h-4 w-4" /></Button>}</td>
            </tr>
          ))}
          {c.services.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">لا توجد خدمات</td></tr>}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة خدمة للحالة</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>الخدمة</Label>
              <Select value={form.serviceId} onValueChange={v => {
                const sv = services.find(s => s.id === v);
                setForm({ ...form, serviceId: v, unitPrice: sv?.price || 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>{services.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.code} • {s.name_ar} • {fmtSAR(s.price)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الكمية</Label><Input type="number" min={1} value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })} /></div>
            <div><Label>السعر</Label><Input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: +e.target.value })} disabled={form.free} /></div>
            <div className="col-span-2 flex items-center gap-2"><input type="checkbox" id="free" checked={form.free} onChange={e => setForm({ ...form, free: e.target.checked })} /><Label htmlFor="free">مجاني</Label></div>
            {form.serviceId && form.unitPrice !== (services.find(s => s.id === form.serviceId)?.price || 0) &&
              <div className="col-span-2"><Label>سبب تعديل السعر</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button><Button onClick={addService}>إضافة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --- Invoices Tab --- */
function InvoicesTab({ caseId }: { caseId: string }) {
  const [invoices] = useInvoices();
  const list = invoices.filter(i => i.caseId === caseId);
  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground"><tr>
          <th className="text-start px-3 py-2">الرقم</th><th className="text-start px-3 py-2">التاريخ</th>
          <th className="text-end px-3 py-2">الصافي</th><th className="text-end px-3 py-2">الضريبة</th>
          <th className="text-end px-3 py-2">الإجمالي</th><th className="text-end px-3 py-2">المدفوع</th>
          <th className="text-start px-3 py-2">الحالة</th>
        </tr></thead>
        <tbody>{list.map(i => (
          <tr key={i.id} className="border-t">
            <td className="px-3 py-2 font-mono text-xs">{i.invoiceNo}</td>
            <td className="px-3 py-2">{new Date(i.createdAt).toLocaleDateString("ar-SA")}</td>
            <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.subtotal)}</td>
            <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.vatAmount)}</td>
            <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.total)}</td>
            <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.paid)}</td>
            <td className="px-3 py-2"><Badge className={statusColor(i.status)}>{STATUS_LABEL_AR[i.status]}</Badge></td>
          </tr>
        ))}
        {list.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">لا توجد فواتير</td></tr>}</tbody>
      </table>
    </CardContent></Card>
  );
}

/* --- Payments Tab --- */
function PaymentsTab({ caseId, onChange }: { caseId: string; onChange: (p: Payment) => void }) {
  const [payments, setPayments] = usePayments();
  const [invoices, setInvoices] = useInvoices();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ amount: number; method: PaymentMethod; reference: string; invoiceId: string }>({ amount: 0, method: "cash", reference: "", invoiceId: "" });
  const caseInvoices = invoices.filter(i => i.caseId === caseId && i.status !== "cancelled" && i.status !== "paid");
  const list = payments.filter(p => p.caseId === caseId);

  const submit = () => {
    if (!form.amount || form.amount <= 0) return toast.error("أدخل المبلغ");
    const p: Payment = {
      id: crypto.randomUUID(), ref: nextRef("PMT", payments),
      caseId, invoiceId: form.invoiceId || undefined,
      amount: form.amount, method: form.method, reference: form.reference,
      receivedBy: user?.username || "?", at: new Date().toISOString(),
    };
    setPayments(prev => [p, ...prev]);
    // Unified posting layer — single source of truth for GL entries.
    import("@/lib/posting-rules").then(({ postEvent }) => {
      postEvent("reception:payment", {
        kind: "payment.received",
        ref: p.ref,
        date: p.at,
        patientRef: caseId,
        method: p.method,
        amount: p.amount,
      });
    });
    // Update invoice paid
    if (form.invoiceId) {
      setInvoices(prev => prev.map(i => {
        if (i.id !== form.invoiceId) return i;
        const newPaid = i.paid + form.amount;
        const status: Invoice["status"] = newPaid >= i.total ? "paid" : "partial";
        return { ...i, paid: newPaid, status };
      }));
    }
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "تحصيل دفعة", caseId, detail: `${fmtSAR(form.amount)} - ${form.method}` }, ...prev]);
    onChange(p);
    setOpen(false);
    setForm({ amount: 0, method: "cash", reference: "", invoiceId: "" });
    toast.success("تم التحصيل");
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />تحصيل دفعة</Button></div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">التاريخ</th>
            <th className="text-end px-3 py-2">المبلغ</th><th className="text-start px-3 py-2">الطريقة</th>
            <th className="text-start px-3 py-2">المرجع الخارجي</th><th className="text-start px-3 py-2">المستلم</th>
          </tr></thead>
          <tbody>{list.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{p.ref}</td>
              <td className="px-3 py-2">{new Date(p.at).toLocaleString("ar-SA")}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(p.amount)}</td>
              <td className="px-3 py-2"><Badge variant="secondary">{p.method}</Badge></td>
              <td className="px-3 py-2 font-mono text-xs">{p.reference || "—"}</td>
              <td className="px-3 py-2">{p.receivedBy}</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">لا توجد مدفوعات</td></tr>}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تحصيل دفعة</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>الفاتورة (اختياري)</Label>
              <Select value={form.invoiceId} onValueChange={v => setForm({ ...form, invoiceId: v })}>
                <SelectTrigger><SelectValue placeholder="بدون فاتورة محددة" /></SelectTrigger>
                <SelectContent>{caseInvoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoiceNo} - متبقي {fmtSAR(i.total - i.paid)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} /></div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={form.method} onValueChange={v => setForm({ ...form, method: v as PaymentMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem><SelectItem value="card">شبكة</SelectItem>
                  <SelectItem value="bank">تحويل بنكي</SelectItem><SelectItem value="insurance">تأمين</SelectItem>
                  <SelectItem value="tabby">Tabby</SelectItem><SelectItem value="tamara">Tamara</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>رقم المرجع</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>تحصيل</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --- Radiology Tab --- */
function RadiologyTab({ caseId }: { caseId: string }) {
  const [radiology, setRadiology] = useRadiology();
  const [services] = useServices();
  const [cases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ serviceId: "", free: false });
  const c = cases.find(x => x.id === caseId)!;
  const list = radiology.filter(r => r.caseId === caseId);
  const radServices = services.filter(s => s.active && s.category === "radiology");

  const submit = () => {
    if (!form.serviceId) return toast.error("اختر فحص");
    const r: RadiologyRequest = {
      id: crypto.randomUUID(), ref: nextRef("RAD", radiology),
      caseId, serviceId: form.serviceId, doctorId: c.doctorId,
      free: form.free,
      status: form.free ? "in_progress" : "awaiting_payment",
      requestedAt: new Date().toISOString(),
    };
    setRadiology(prev => [r, ...prev]);
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "طلب أشعة", caseId, detail: r.ref }, ...prev]);
    setOpen(false);
    setForm({ serviceId: "", free: false });
    toast.success("تم الطلب");
  };

  const updateStatus = (id: string, status: RadiologyRequest["status"]) => {
    setRadiology(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "تحديث حالة أشعة", caseId, newValue: status }, ...prev]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />طلب أشعة</Button></div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">الفحص</th>
            <th className="text-start px-3 py-2">النوع</th><th className="text-start px-3 py-2">الحالة</th>
            <th className="text-end px-3 py-2">إجراء</th>
          </tr></thead>
          <tbody>{list.map(r => {
            const sv = services.find(s => s.id === r.serviceId);
            return <tr key={r.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
              <td className="px-3 py-2">{sv?.name_ar}</td>
              <td className="px-3 py-2">{r.free ? <Badge variant="outline">مجاني</Badge> : <Badge>مدفوع</Badge>}</td>
              <td className="px-3 py-2"><Badge className={statusColor(r.status)}>{STATUS_LABEL_AR[r.status] || r.status}</Badge></td>
              <td className="px-3 py-2 text-end">
                <Select value={r.status} onValueChange={v => updateStatus(r.id, v as RadiologyRequest["status"])}>
                  <SelectTrigger className="h-8 w-40 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["requested","awaiting_payment","paid","in_progress","result_uploaded","reviewed","cancelled"].map(s =>
                      <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
            </tr>;
          })}
          {list.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">لا توجد طلبات أشعة</td></tr>}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>طلب أشعة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>الفحص</Label>
              <Select value={form.serviceId} onValueChange={v => setForm({ ...form, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>{radServices.map(s => <SelectItem key={s.id} value={s.id}>{s.code} • {s.name_ar} • {fmtSAR(s.price)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rfree" checked={form.free} onChange={e => setForm({ ...form, free: e.target.checked })} />
              <Label htmlFor="rfree">مجاني (لا يحتاج دفع)</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>إرسال الطلب</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --- Materials Tab --- */
function MaterialsTab({ caseId }: { caseId: string }) {
  const [matreq, setMatreq] = useMatRequests();
  const [cases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ itemName: "", qty: 1, unitCost: 0 });
  const c = cases.find(x => x.id === caseId)!;
  const list = matreq.filter(m => m.caseId === caseId);

  const submit = () => {
    if (!form.itemName) return toast.error("أدخل اسم الصنف");
    const r: MaterialRequest = {
      id: crypto.randomUUID(), ref: nextRef("MR", matreq),
      caseId, doctorId: c.doctorId,
      requestedBy: user?.username || "?",
      itemName: form.itemName, qty: form.qty, unitCost: form.unitCost,
      totalCost: form.qty * form.unitCost,
      status: "requested",
    };
    setMatreq(prev => [r, ...prev]);
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "طلب مواد", caseId, detail: `${form.itemName} x${form.qty}` }, ...prev]);
    setOpen(false);
    setForm({ itemName: "", qty: 1, unitCost: 0 });
    toast.success("تم الطلب");
  };

  const advance = (id: string, status: MaterialRequest["status"]) => {
    setMatreq(prev => prev.map(m => m.id === id ? {
      ...m, status,
      issuedAt: status === "issued" ? new Date().toISOString() : m.issuedAt,
      issuedBy: status === "issued" ? user?.username : m.issuedBy,
      receivedAt: status === "received" ? new Date().toISOString() : m.receivedAt,
      receivedBy: status === "received" ? user?.username : m.receivedBy,
      usedAt: status === "used" ? new Date().toISOString() : m.usedAt,
    } : m));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />طلب مادة</Button></div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">الصنف</th>
            <th className="text-end px-3 py-2">كمية</th><th className="text-end px-3 py-2">التكلفة</th>
            <th className="text-start px-3 py-2">الحالة</th><th className="text-end px-3 py-2">إجراء</th>
          </tr></thead>
          <tbody>{list.map(r => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
              <td className="px-3 py-2">{r.itemName}</td>
              <td className="px-3 py-2 text-end">{r.qty}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.totalCost)}</td>
              <td className="px-3 py-2"><Badge className={statusColor(r.status)}>{STATUS_LABEL_AR[r.status] || r.status}</Badge></td>
              <td className="px-3 py-2 text-end">
                <Select value={r.status} onValueChange={v => advance(r.id, v as MaterialRequest["status"])}>
                  <SelectTrigger className="h-8 w-32 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>{["requested","approved","issued","received","used","returned","cancelled"].map(s =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">لا توجد طلبات</td></tr>}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>طلب مادة من المخزن</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label>اسم الصنف</Label><Input value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} /></div>
            <div><Label>الكمية</Label><Input type="number" min={1} value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })} /></div>
            <div><Label>تكلفة الوحدة</Label><Input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: +e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>طلب</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --- Packets Tab --- */
function PacketsTab({ caseId }: { caseId: string }) {
  const [packets, setPackets] = usePackets();
  const [cases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const c = cases.find(x => x.id === caseId)!;
  const used = packets.filter(p => p.caseId === caseId);
  const available = packets.filter(p => p.status === "available" && (!c.room || p.room === c.room));

  const markUsed = (pid: string) => {
    setPackets(prev => prev.map(p => p.id === pid ? {
      ...p, status: "used", caseId: c.id, doctorId: c.doctorId,
      usedAt: new Date().toISOString(), usedBy: user?.username,
    } : p));
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "استخدام طقم/أدوات", caseId: c.id, detail: pid }, ...prev]);
    toast.success("تم تسجيل الاستخدام");
  };

  return (
    <div className="space-y-3">
      <Card><CardHeader><CardTitle className="text-base">أطقم مستخدمة لهذه الحالة</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground"><tr>
              <th className="text-start px-3 py-2">الكود</th><th className="text-start px-3 py-2">الاسم</th>
              <th className="text-end px-3 py-2">التكلفة</th><th className="text-start px-3 py-2">الوقت</th>
            </tr></thead>
            <tbody>{used.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{p.code}</td><td className="px-3 py-2">{p.name_ar}</td>
                <td className="px-3 py-2 text-end font-mono">{fmtSAR(p.cost)}</td>
                <td className="px-3 py-2 text-xs">{p.usedAt ? new Date(p.usedAt).toLocaleString("ar-SA") : "—"}</td>
              </tr>
            ))}
            {used.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-sm text-muted-foreground">لا يوجد</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">أطقم متاحة (يمكن وضعها استخدام)</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground"><tr>
              <th className="text-start px-3 py-2">الكود</th><th className="text-start px-3 py-2">الاسم</th>
              <th className="text-start px-3 py-2">الغرفة</th><th className="text-end px-3 py-2">التكلفة</th><th className="text-end px-3 py-2"></th>
            </tr></thead>
            <tbody>{available.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{p.code}</td><td className="px-3 py-2">{p.name_ar}</td>
                <td className="px-3 py-2">{p.room}</td><td className="px-3 py-2 text-end font-mono">{fmtSAR(p.cost)}</td>
                <td className="px-3 py-2 text-end"><Button size="sm" variant="outline" onClick={() => markUsed(p.id)}>تسجيل كاستخدام</Button></td>
              </tr>
            ))}
            {available.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">لا يوجد متاح</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* --- Notes Tab --- */
function NotesTab({ caseId }: { caseId: string }) {
  const [cases, setCases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [text, setText] = useState("");
  const [followUp, setFollowUp] = useState("");
  const c = cases.find(x => x.id === caseId)!;

  const add = () => {
    if (!text.trim()) return;
    setCases(prev => prev.map(x => x.id !== c.id ? x : {
      ...x,
      notes: [{ id: crypto.randomUUID(), by: user?.username || "?", byRole: role || "?", at: new Date().toISOString(), text, followUp: followUp || undefined }, ...x.notes],
      followUpDate: followUp || x.followUpDate,
      needsFollowUp: !!followUp || x.needsFollowUp,
    }));
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "إضافة ملاحظة طبية", caseId }, ...prev]);
    setText(""); setFollowUp("");
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 space-y-2">
        <Textarea placeholder="اكتب ملاحظة طبية أو خطة علاج..." value={text} onChange={e => setText(e.target.value)} rows={3} />
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label>تاريخ متابعة (اختياري)</Label><Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} /></div>
          <Button onClick={add}>إضافة</Button>
        </div>
      </CardContent></Card>
      <div className="space-y-2">
        {c.notes.map(n => (
          <Card key={n.id}><CardContent className="p-3 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{n.by} ({n.byRole})</span>
              <span>{new Date(n.at).toLocaleString("ar-SA")}</span>
            </div>
            <p>{n.text}</p>
            {n.followUp && <p className="text-xs text-amber-700 mt-1">متابعة: {n.followUp}</p>}
          </CardContent></Card>
        ))}
        {c.notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد ملاحظات</p>}
      </div>
    </div>
  );
}
