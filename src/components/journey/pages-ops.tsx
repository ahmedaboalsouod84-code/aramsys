import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useInvoices, usePayments, useRadiology, usePackets, useMatRequests,
  useBatches, useActivity, useCases, useDoctors, useServices, usePatients,
  fmtSAR, statusColor, STATUS_LABEL_AR,
  type AccountingBatch, type BatchType, type BatchLine,
} from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Receipt, Wallet, Radiation, Box, PackageCheck, BookOpen, TrendingUp, History } from "lucide-react";

/* ============================================================
   INVOICES PAGE
   ============================================================ */
export function InvoicesPage() {
  const [invoices] = useInvoices();
  const [patients] = usePatients();
  const [doctors] = useDoctors();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = invoices.filter(i => {
    if (status !== "all" && i.status !== status) return false;
    if (!q) return true;
    const p = patients.find(x => x.id === i.patientId);
    return i.invoiceNo.includes(q) || (p && p.name_ar.includes(q));
  });
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Receipt className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">الفواتير</h1><p className="text-sm text-muted-foreground">{invoices.length} فاتورة</p></div>
      </header>
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="ابحث..." value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {["draft","pending","partial","paid","cancelled","refunded"].map(s => <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">رقم</th><th className="text-start px-3 py-2">المريض</th>
            <th className="text-start px-3 py-2">الطبيب</th><th className="text-start px-3 py-2">التاريخ</th>
            <th className="text-end px-3 py-2">الصافي</th><th className="text-end px-3 py-2">ضريبة</th>
            <th className="text-end px-3 py-2">الإجمالي</th><th className="text-end px-3 py-2">مدفوع</th>
            <th className="text-end px-3 py-2">متبقي</th><th className="text-start px-3 py-2">الحالة</th>
          </tr></thead>
          <tbody>{filtered.map(i => {
            const p = patients.find(x => x.id === i.patientId);
            const d = doctors.find(x => x.id === i.doctorId);
            return <tr key={i.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-mono text-xs">{i.invoiceNo}</td>
              <td className="px-3 py-2">{p?.name_ar}</td>
              <td className="px-3 py-2 text-muted-foreground">{d?.name_ar}</td>
              <td className="px-3 py-2 text-xs">{new Date(i.createdAt).toLocaleDateString("ar-SA")}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.subtotal)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.vatAmount)}</td>
              <td className="px-3 py-2 text-end font-mono font-semibold">{fmtSAR(i.total)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(i.paid)}</td>
              <td className="px-3 py-2 text-end font-mono">{i.total - i.paid > 0 ? <span className="text-destructive">{fmtSAR(i.total - i.paid)}</span> : "—"}</td>
              <td className="px-3 py-2"><Badge className={statusColor(i.status)}>{STATUS_LABEL_AR[i.status]}</Badge></td>
            </tr>;
          })}
          {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">لا توجد فواتير</td></tr>}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ============================================================
   PAYMENTS PAGE
   ============================================================ */
export function PaymentsPage() {
  const [payments] = usePayments();
  const [cases] = useCases();
  const total = payments.reduce((a, p) => a + p.amount, 0);
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Wallet className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">المدفوعات</h1><p className="text-sm text-muted-foreground">{payments.length} دفعة • إجمالي {fmtSAR(total)}</p></div>
      </header>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">الحالة</th>
            <th className="text-start px-3 py-2">التاريخ</th><th className="text-end px-3 py-2">المبلغ</th>
            <th className="text-start px-3 py-2">الطريقة</th><th className="text-start px-3 py-2">المستلم</th>
          </tr></thead>
          <tbody>{payments.map(p => {
            const c = cases.find(x => x.id === p.caseId);
            return <tr key={p.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-mono text-xs">{p.ref}</td>
              <td className="px-3 py-2 font-mono text-xs">{c?.caseNo || "—"}</td>
              <td className="px-3 py-2 text-xs">{new Date(p.at).toLocaleString("ar-SA")}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(p.amount)}</td>
              <td className="px-3 py-2"><Badge variant="secondary">{p.method}</Badge></td>
              <td className="px-3 py-2">{p.receivedBy}</td>
            </tr>;
          })}
          {payments.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">لا توجد دفعات</td></tr>}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ============================================================
   RADIOLOGY DASHBOARD
   ============================================================ */
export function RadiologyDashboard() {
  const [radiology, setRadiology] = useRadiology();
  const [services] = useServices();
  const [cases] = useCases();
  const [patients] = usePatients();
  const [doctors] = useDoctors();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [filter, setFilter] = useState("active");

  const list = radiology.filter(r => {
    if (filter === "all") return true;
    if (filter === "active") return !["reviewed", "cancelled"].includes(r.status);
    return r.status === filter;
  });

  const update = (id: string, status: typeof radiology[number]["status"]) => {
    setRadiology(prev => prev.map(r => r.id === id ? { ...r, status, reviewedAt: status === "reviewed" ? new Date().toISOString() : r.reviewedAt } : r));
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "تحديث حالة أشعة", newValue: status }, ...prev]);
    toast.success("تم");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Radiation className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">قسم الأشعة</h1><p className="text-sm text-muted-foreground">{list.length} طلب</p></div>
      </header>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">النشطة</SelectItem><SelectItem value="all">الكل</SelectItem>
          {["requested","awaiting_payment","paid","in_progress","result_uploaded","reviewed","cancelled"].map(s =>
            <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">الحالة</th>
            <th className="text-start px-3 py-2">المريض</th><th className="text-start px-3 py-2">الطبيب</th>
            <th className="text-start px-3 py-2">الفحص</th><th className="text-start px-3 py-2">النوع</th>
            <th className="text-start px-3 py-2">الحالة</th><th className="text-end px-3 py-2">إجراء</th>
          </tr></thead>
          <tbody>{list.map(r => {
            const c = cases.find(x => x.id === r.caseId);
            const p = patients.find(x => x.id === c?.patientId);
            const d = doctors.find(x => x.id === r.doctorId);
            const sv = services.find(x => x.id === r.serviceId);
            return <tr key={r.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
              <td className="px-3 py-2 font-mono text-xs">{c?.caseNo}</td>
              <td className="px-3 py-2">{p?.name_ar}</td>
              <td className="px-3 py-2 text-muted-foreground">{d?.name_ar}</td>
              <td className="px-3 py-2">{sv?.name_ar}</td>
              <td className="px-3 py-2">{r.free ? <Badge variant="outline">مجاني</Badge> : <Badge>مدفوع</Badge>}</td>
              <td className="px-3 py-2"><Badge className={statusColor(r.status)}>{STATUS_LABEL_AR[r.status] || r.status}</Badge></td>
              <td className="px-3 py-2 text-end">
                <Select value={r.status} onValueChange={v => update(r.id, v as typeof r.status)}>
                  <SelectTrigger className="h-8 w-36 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>{["requested","awaiting_payment","paid","in_progress","result_uploaded","reviewed","cancelled"].map(s =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>;
          })}
          {list.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">لا يوجد</td></tr>}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ============================================================
   PACKETS / TOOLS PAGE
   ============================================================ */
export function PacketsPage() {
  const [packets, setPackets] = usePackets();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name_ar: "", cost: 0, qty: 1, room: "" });

  const add = () => {
    if (!form.code || !form.name_ar) return toast.error("الكود والاسم");
    setPackets(prev => [...prev, { id: crypto.randomUUID(), ...form, status: "available" }]);
    setOpen(false);
    setForm({ code: "", name_ar: "", cost: 0, qty: 1, room: "" });
    toast.success("تمت الإضافة");
  };

  const updateStatus = (id: string, status: typeof packets[number]["status"]) => {
    setPackets(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "تغيير حالة طقم", newValue: status }, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Box className="h-6 w-6" /></div>
        <div className="flex-1"><h1 className="text-2xl font-semibold">الأطقم والأدوات</h1><p className="text-sm text-muted-foreground">{packets.length} طقم</p></div>
        <Button onClick={() => setOpen(true)}>+ طقم جديد</Button>
      </header>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">الكود</th><th className="text-start px-3 py-2">الاسم</th>
            <th className="text-start px-3 py-2">الغرفة</th><th className="text-end px-3 py-2">التكلفة</th>
            <th className="text-end px-3 py-2">الكمية</th><th className="text-start px-3 py-2">الحالة</th>
            <th className="text-end px-3 py-2">إجراء</th>
          </tr></thead>
          <tbody>{packets.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
              <td className="px-3 py-2">{p.name_ar}</td>
              <td className="px-3 py-2">{p.room}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(p.cost)}</td>
              <td className="px-3 py-2 text-end">{p.qty}</td>
              <td className="px-3 py-2"><Badge className={statusColor(p.status)}>{STATUS_LABEL_AR[p.status] || p.status}</Badge></td>
              <td className="px-3 py-2 text-end">
                <Select value={p.status} onValueChange={v => updateStatus(p.id, v as typeof p.status)}>
                  <SelectTrigger className="h-8 w-32 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>{["available","used","returned","damaged","sterilization"].map(s =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>

      {open && (
        <Card className="fixed inset-x-4 top-20 max-w-md mx-auto z-50 shadow-xl">
          <CardHeader><CardTitle>طقم جديد</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="الكود" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <Input placeholder="الاسم" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
            <Input placeholder="الغرفة" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
            <Input type="number" placeholder="التكلفة" value={form.cost} onChange={e => setForm({ ...form, cost: +e.target.value })} />
            <Input type="number" placeholder="الكمية" value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })} />
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={add}>حفظ</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   MATERIAL REQUESTS PAGE (storage perspective)
   ============================================================ */
export function MaterialRequestsPage() {
  const [matreq, setMatreq] = useMatRequests();
  const [cases] = useCases();
  const [doctors] = useDoctors();
  const { user } = useAuth();
  const [filter, setFilter] = useState("active");

  const list = matreq.filter(m => {
    if (filter === "all") return true;
    if (filter === "active") return !["used", "cancelled", "returned"].includes(m.status);
    return m.status === filter;
  });

  const advance = (id: string, status: typeof matreq[number]["status"]) => {
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
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><PackageCheck className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">طلبات المواد</h1><p className="text-sm text-muted-foreground">{list.length} طلب</p></div>
      </header>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">النشطة</SelectItem><SelectItem value="all">الكل</SelectItem>
          {["requested","approved","issued","received","used","returned","cancelled"].map(s =>
            <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">المرجع</th><th className="text-start px-3 py-2">الحالة</th>
            <th className="text-start px-3 py-2">الطبيب</th><th className="text-start px-3 py-2">الصنف</th>
            <th className="text-end px-3 py-2">كمية</th><th className="text-end px-3 py-2">التكلفة</th>
            <th className="text-start px-3 py-2">الحالة</th><th className="text-end px-3 py-2">إجراء</th>
          </tr></thead>
          <tbody>{list.map(r => {
            const c = cases.find(x => x.id === r.caseId);
            const d = doctors.find(x => x.id === r.doctorId);
            return <tr key={r.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{r.ref}</td>
              <td className="px-3 py-2 font-mono text-xs">{c?.caseNo}</td>
              <td className="px-3 py-2 text-muted-foreground">{d?.name_ar}</td>
              <td className="px-3 py-2">{r.itemName}</td>
              <td className="px-3 py-2 text-end">{r.qty}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.totalCost)}</td>
              <td className="px-3 py-2"><Badge className={statusColor(r.status)}>{STATUS_LABEL_AR[r.status] || r.status}</Badge></td>
              <td className="px-3 py-2 text-end">
                <Select value={r.status} onValueChange={v => advance(r.id, v as typeof r.status)}>
                  <SelectTrigger className="h-8 w-32 inline-flex"><SelectValue /></SelectTrigger>
                  <SelectContent>{["requested","approved","issued","received","used","returned","cancelled"].map(s =>
                    <SelectItem key={s} value={s}>{STATUS_LABEL_AR[s] || s}</SelectItem>)}</SelectContent>
                </Select>
              </td>
            </tr>;
          })}
          {list.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">لا يوجد</td></tr>}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ============================================================
   ACCOUNTING BATCHES PAGE
   ============================================================ */
export function AccountingBatchesPage() {
  const [batches, setBatches] = useBatches();
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [packets] = usePackets();
  const [matreq] = useMatRequests();
  const [doctors] = useDoctors();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const canPost = ["admin", "finance_manager", "accountant"].includes(role || "");

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(today);

  const inRange = (iso: string) => iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;

  const generateRevenue = () => {
    const periodInv = invoices.filter(i => inRange(i.createdAt) && i.status !== "cancelled");
    if (periodInv.length === 0) return toast.error("لا توجد فواتير في الفترة");
    const periodPay = payments.filter(p => inRange(p.at));
    const totalCash = periodPay.filter(p => p.method === "cash").reduce((a, p) => a + p.amount, 0);
    const totalCard = periodPay.filter(p => p.method === "card").reduce((a, p) => a + p.amount, 0);
    const totalBank = periodPay.filter(p => p.method === "bank").reduce((a, p) => a + p.amount, 0);
    const totalIns = periodPay.filter(p => p.method === "insurance").reduce((a, p) => a + p.amount, 0);
    const totalTabby = periodPay.filter(p => p.method === "tabby").reduce((a, p) => a + p.amount, 0);
    const totalTamara = periodPay.filter(p => p.method === "tamara").reduce((a, p) => a + p.amount, 0);
    const subtotal = periodInv.reduce((a, i) => a + i.subtotal, 0);
    const vat = periodInv.reduce((a, i) => a + i.vatAmount, 0);
    const totalCollected = totalCash + totalCard + totalBank + totalIns + totalTabby + totalTamara;
    const receivable = periodInv.reduce((a, i) => a + i.total, 0) - totalCollected;

    const lines: BatchLine[] = [];
    if (totalCash) lines.push({ label: "النقدية بالصندوق", debit: totalCash, credit: 0, dim: { method: "cash" } });
    if (totalCard) lines.push({ label: "البنك / الشبكة", debit: totalCard, credit: 0, dim: { method: "card" } });
    if (totalBank) lines.push({ label: "البنك - تحويلات", debit: totalBank, credit: 0, dim: { method: "bank" } });
    if (totalIns) lines.push({ label: "ذمم التأمين", debit: totalIns, credit: 0, dim: { method: "insurance" } });
    if (totalTabby) lines.push({ label: "ذمم Tabby", debit: totalTabby, credit: 0, dim: { method: "tabby" } });
    if (totalTamara) lines.push({ label: "ذمم Tamara", debit: totalTamara, credit: 0, dim: { method: "tamara" } });
    if (receivable > 0) lines.push({ label: "ذمم المرضى", debit: receivable, credit: 0 });
    lines.push({ label: "إيرادات الخدمات الطبية", debit: 0, credit: subtotal });
    if (vat) lines.push({ label: "ضريبة القيمة المضافة المستحقة", debit: 0, credit: vat });

    const td = lines.reduce((a, l) => a + l.debit, 0);
    const tc = lines.reduce((a, l) => a + l.credit, 0);
    const batch: AccountingBatch = {
      id: crypto.randomUUID(), ref: `BATCH-REV-${Date.now()}`, type: "revenue",
      periodFrom: from, periodTo: to, status: "draft",
      createdAt: new Date().toISOString(), createdBy: user?.username || "?",
      lines, totalDebit: td, totalCredit: tc, sourceIds: periodInv.map(i => i.id),
    };
    setBatches(prev => [batch, ...prev]);
    setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?", action: "إنشاء دفعة إيرادات", detail: batch.ref }, ...prev]);
    toast.success("تم إنشاء دفعة الإيرادات");
  };

  const generateConsumption = () => {
    const usedPackets = packets.filter(p => p.status === "used" && p.usedAt && inRange(p.usedAt));
    const usedMats = matreq.filter(m => m.status === "used" && m.usedAt && inRange(m.usedAt));
    const packetCost = usedPackets.reduce((a, p) => a + p.cost * p.qty, 0);
    const matCost = usedMats.reduce((a, m) => a + m.totalCost, 0);
    const total = packetCost + matCost;
    if (total === 0) return toast.error("لا يوجد استهلاك في الفترة");
    const lines: BatchLine[] = [
      { label: "تكلفة المستلزمات الطبية المستهلكة", debit: total, credit: 0 },
      { label: "مخزون المستلزمات الطبية", debit: 0, credit: total },
    ];
    const batch: AccountingBatch = {
      id: crypto.randomUUID(), ref: `BATCH-CON-${Date.now()}`, type: "consumption",
      periodFrom: from, periodTo: to, status: "draft",
      createdAt: new Date().toISOString(), createdBy: user?.username || "?",
      lines, totalDebit: total, totalCredit: total,
      sourceIds: [...usedPackets.map(p => p.id), ...usedMats.map(m => m.id)],
    };
    setBatches(prev => [batch, ...prev]);
    toast.success("تم إنشاء دفعة الاستهلاك");
  };

  const post = (id: string) => {
    if (!canPost) return toast.error("لا تملك صلاحية الترحيل");
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: "posted", postedAt: new Date().toISOString(), postedBy: user?.username } : b));
    toast.success("تم الترحيل");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BookOpen className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">الدفعات المحاسبية</h1><p className="text-sm text-muted-foreground">قيود مجمّعة بدلاً من قيد لكل عملية</p></div>
      </header>
      <Card><CardHeader><CardTitle className="text-base">إنشاء دفعة لفترة</CardTitle><CardDescription>اختر الفترة ثم نوع الدفعة</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap items-end">
            <div><label className="text-xs">من</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div><label className="text-xs">إلى</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            <Button onClick={generateRevenue}>دفعة إيرادات</Button>
            <Button variant="outline" onClick={generateConsumption}>دفعة استهلاك</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {batches.map(b => (
          <Card key={b.id}>
            <CardHeader className="pb-2"><div className="flex items-center justify-between gap-2">
              <div><CardTitle className="text-sm font-mono">{b.ref}</CardTitle>
                <CardDescription>{b.type} • {b.periodFrom} → {b.periodTo}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor(b.status)}>{STATUS_LABEL_AR[b.status] || b.status}</Badge>
                {b.status === "draft" && canPost && <Button size="sm" onClick={() => post(b.id)}>ترحيل</Button>}
              </div>
            </div></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground text-xs">
                  <tr><th className="text-start px-3 py-1.5">الحساب</th><th className="text-end px-3 py-1.5">مدين</th><th className="text-end px-3 py-1.5">دائن</th></tr>
                </thead>
                <tbody>{b.lines.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5">{l.label}</td>
                    <td className="px-3 py-1.5 text-end font-mono">{l.debit ? fmtSAR(l.debit) : "—"}</td>
                    <td className="px-3 py-1.5 text-end font-mono">{l.credit ? fmtSAR(l.credit) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-semibold bg-muted/20">
                  <td className="px-3 py-1.5">الإجمالي</td>
                  <td className="px-3 py-1.5 text-end font-mono">{fmtSAR(b.totalDebit)}</td>
                  <td className="px-3 py-1.5 text-end font-mono">{fmtSAR(b.totalCredit)}</td>
                </tr></tbody>
              </table>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">لا توجد دفعات بعد</CardContent></Card>}
      </div>
    </div>
  );
}

/* ============================================================
   DOCTOR PROFITABILITY
   ============================================================ */
export function DoctorProfitabilityPage() {
  const [doctors] = useDoctors();
  const [cases] = useCases();
  const [invoices] = useInvoices();
  const [packets] = usePackets();
  const [matreq] = useMatRequests();

  const rows = useMemo(() => doctors.map(d => {
    const myCases = cases.filter(c => c.doctorId === d.id);
    const myInv = invoices.filter(i => i.doctorId === d.id && i.status !== "cancelled");
    const revenue = myInv.reduce((a, i) => a + i.subtotal, 0);
    const patientCount = new Set(myCases.map(c => c.patientId)).size;
    const procedures = myCases.reduce((a, c) => a + c.services.length, 0);
    const packetCost = packets.filter(p => p.doctorId === d.id && p.status === "used").reduce((a, p) => a + p.cost * p.qty, 0);
    const matCost = matreq.filter(m => m.doctorId === d.id && m.status === "used").reduce((a, m) => a + m.totalCost, 0);
    const inventoryCost = packetCost + matCost;
    // Allocated overhead: simple 10% of revenue
    const allocatedOverhead = revenue * 0.10;
    const commission = revenue * ((d.commissionPct || 0) / 100);
    const totalCost = inventoryCost + allocatedOverhead + commission;
    const netProfit = revenue - totalCost;
    return { d, revenue, patientCount, procedures, inventoryCost, allocatedOverhead, commission, totalCost, netProfit };
  }), [doctors, cases, invoices, packets, matreq]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><TrendingUp className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">ربحية الأطباء</h1><p className="text-sm text-muted-foreground">تحليل تشغيلي لكل طبيب</p></div>
      </header>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">الطبيب</th><th className="text-start px-3 py-2">القسم</th>
            <th className="text-end px-3 py-2">مرضى</th><th className="text-end px-3 py-2">إجراءات</th>
            <th className="text-end px-3 py-2">الإيراد</th><th className="text-end px-3 py-2">تكلفة المستلزمات</th>
            <th className="text-end px-3 py-2">عمولة</th><th className="text-end px-3 py-2">مصاريف موزعة</th>
            <th className="text-end px-3 py-2">إجمالي التكلفة</th><th className="text-end px-3 py-2">صافي الربح</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.d.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{r.d.name_ar}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.d.department}</td>
              <td className="px-3 py-2 text-end">{r.patientCount}</td>
              <td className="px-3 py-2 text-end">{r.procedures}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.revenue)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.inventoryCost)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.commission)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.allocatedOverhead)}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(r.totalCost)}</td>
              <td className={`px-3 py-2 text-end font-mono font-semibold ${r.netProfit >= 0 ? "text-success" : "text-destructive"}`}>{fmtSAR(r.netProfit)}</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ============================================================
   ACTIVITY LOG
   ============================================================ */
export function ActivityLogPage() {
  const [activity] = useActivity();
  const [cases] = useCases();
  const [q, setQ] = useState("");
  const filtered = activity.filter(a => !q || a.action.includes(q) || (a.detail || "").includes(q) || a.user.includes(q));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><History className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-semibold">سجل النشاط</h1><p className="text-sm text-muted-foreground">{activity.length} حدث</p></div>
      </header>
      <Input placeholder="ابحث في السجل..." value={q} onChange={e => setQ(e.target.value)} className="max-w-md" />
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">الوقت</th><th className="text-start px-3 py-2">المستخدم</th>
            <th className="text-start px-3 py-2">الدور</th><th className="text-start px-3 py-2">الحدث</th>
            <th className="text-start px-3 py-2">الحالة</th><th className="text-start px-3 py-2">التفاصيل</th>
          </tr></thead>
          <tbody>{filtered.slice(0, 200).map(a => {
            const c = a.caseId ? cases.find(x => x.id === a.caseId) : null;
            return <tr key={a.id} className="border-t">
              <td className="px-3 py-2 text-xs">{new Date(a.at).toLocaleString("ar-SA")}</td>
              <td className="px-3 py-2">{a.user}</td>
              <td className="px-3 py-2"><Badge variant="secondary">{a.role}</Badge></td>
              <td className="px-3 py-2">{a.action}</td>
              <td className="px-3 py-2 font-mono text-xs">{c?.caseNo || "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{a.detail || ""} {a.oldValue && `${a.oldValue} → ${a.newValue}`}</td>
            </tr>;
          })}
          {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">لا يوجد</td></tr>}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
