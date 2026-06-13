import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Search, Tags, Stethoscope, ClipboardList, Wallet, Activity } from "lucide-react";
import {
  useServices, useDoctors, usePatients, useCases, useInvoices, usePayments,
  useRadiology, useMatRequests, useActivity, useBatches,
  fmtSAR, statusColor, STATUS_LABEL_AR, caseTotals,
  type Service, type ServiceCategory,
} from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const CAT_LABELS: Record<ServiceCategory, string> = {
  consultation: "كشف", radiology: "أشعة", dental: "أسنان", surgery: "جراحة",
  orthodontics: "تقويم", followup: "متابعة", other: "أخرى",
};

const PRICE_EDIT_ROLES = ["admin", "medical_manager", "finance_manager"];

/* ============================================================
   SERVICES / PRICE LIST PAGE
   ============================================================ */
export function ServicesPage() {
  const [services, setServices] = useServices();
  const { role, user } = useAuth();
  const [, setActivity] = useActivity();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const canEdit = PRICE_EDIT_ROLES.includes(role || "");

  const blank: Service = {
    id: "", code: "", name_en: "", name_ar: "", category: "consultation",
    department: "", price: 0, taxable: true, vat: 15, active: true,
    requiresApproval: false, editableByDoctor: false,
  };
  const [form, setForm] = useState<Service>(blank);

  const filtered = useMemo(() => services.filter(s =>
    !q || s.code.includes(q) || s.name_ar.includes(q) || s.name_en.toLowerCase().includes(q.toLowerCase())
  ), [services, q]);

  const startNew = () => { setEditing(null); setForm(blank); setOpen(true); };
  const startEdit = (s: Service) => { setEditing(s); setForm(s); setOpen(true); };

  const submit = () => {
    if (!form.code || !form.name_ar) return toast.error("الكود والاسم مطلوبان");
    if (editing) {
      setServices(prev => prev.map(s => s.id === editing.id ? { ...form, id: editing.id } : s));
      setActivity(prev => [{ id: crypto.randomUUID(), at: new Date().toISOString(),
        user: user?.username || "?", role: role || "?",
        action: "تعديل خدمة", oldValue: `${editing.price}`, newValue: `${form.price}`,
        detail: form.code }, ...prev]);
      toast.success("تم التعديل");
    } else {
      setServices(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
      toast.success("تمت الإضافة");
    }
    setOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Tags className="h-6 w-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">قائمة الخدمات والأسعار</h1>
          <p className="text-sm text-muted-foreground">{services.length} خدمة • السعر يعدّله الإدارة الطبية/المالية فقط</p>
        </div>
        {canEdit && <Button onClick={startNew}><Plus className="h-4 w-4 me-1" />خدمة جديدة</Button>}
      </header>

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالكود أو الاسم…" className="ps-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2">الكود</th>
                  <th className="text-start px-3 py-2">الاسم</th>
                  <th className="text-start px-3 py-2">القسم</th>
                  <th className="text-start px-3 py-2">الفئة</th>
                  <th className="text-end px-3 py-2">السعر</th>
                  <th className="text-center px-3 py-2">ضريبة</th>
                  <th className="text-center px-3 py-2">نشط</th>
                  <th className="text-end px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                    <td className="px-3 py-2">{s.name_ar}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.department}</td>
                    <td className="px-3 py-2"><Badge variant="secondary">{CAT_LABELS[s.category]}</Badge></td>
                    <td className="px-3 py-2 text-end font-mono">{fmtSAR(s.price)}</td>
                    <td className="px-3 py-2 text-center text-xs">{s.taxable ? `${s.vat}%` : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {s.active ? <Badge className="bg-success text-success-foreground">نعم</Badge> : <Badge variant="destructive">لا</Badge>}
                    </td>
                    <td className="px-3 py-2 text-end">
                      {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "تعديل خدمة" : "خدمة جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label>الكود</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>القسم</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div className="col-span-2"><Label>الاسم بالعربية</Label><Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div className="col-span-2"><Label>الاسم بالإنجليزية</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div>
              <Label>الفئة</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as ServiceCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>السعر</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} /></div>
            <div><Label>نسبة الضريبة %</Label><Input type="number" value={form.vat} onChange={e => setForm({ ...form, vat: +e.target.value })} /></div>
            <div className="flex items-center justify-between pe-2"><Label>خاضع للضريبة</Label><Switch checked={form.taxable} onCheckedChange={v => setForm({ ...form, taxable: v })} /></div>
            <div className="flex items-center justify-between pe-2"><Label>نشط</Label><Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} /></div>
            <div className="flex items-center justify-between pe-2"><Label>يحتاج موافقة</Label><Switch checked={form.requiresApproval} onCheckedChange={v => setForm({ ...form, requiresApproval: v })} /></div>
            <div className="flex items-center justify-between pe-2"><Label>يعدله الطبيب لحالة</Label><Switch checked={form.editableByDoctor} onCheckedChange={v => setForm({ ...form, editableByDoctor: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={submit}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   RECEPTION DASHBOARD
   ============================================================ */
export function ReceptionDashboard() {
  const [cases] = useCases();
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [radiology] = useRadiology();

  const today = new Date().toISOString().slice(0, 10);
  const todayCases = cases.filter(c => c.openedAt.slice(0, 10) === today);
  const todayCollected = payments.filter(p => p.at.slice(0, 10) === today).reduce((a, p) => a + p.amount, 0);
  const pendingInv = invoices.filter(i => i.status === "pending" || i.status === "partial");
  const pendingRad = radiology.filter(r => r.status === "awaiting_payment");
  const pendingFromDoctors = cases.filter(c => c.services.some(s => !s.invoiced && !s.free));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ClipboardList className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold">لوحة الاستقبال</h1>
          <p className="text-sm text-muted-foreground">ملخص اليوم</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<ClipboardList className="h-4 w-4" />} label="حالات اليوم" value={String(todayCases.length)} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="المحصّل اليوم" value={fmtSAR(todayCollected)} />
        <Stat icon={<Activity className="h-4 w-4" />} label="فواتير معلقة" value={String(pendingInv.length)} />
        <Stat icon={<Stethoscope className="h-4 w-4" />} label="أشعة بانتظار الدفع" value={String(pendingRad.length)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">خدمات أضافها الأطباء بانتظار التحصيل</CardTitle></CardHeader>
        <CardContent>
          {pendingFromDoctors.length === 0
            ? <p className="text-sm text-muted-foreground">لا يوجد</p>
            : <ul className="space-y-2">{pendingFromDoctors.slice(0, 10).map(c => {
                const t = caseTotals(c, invoices, payments);
                return <li key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <span className="font-medium">{c.caseNo}</span>
                  <span className="text-muted-foreground">{c.services.filter(s => !s.invoiced).length} خدمة</span>
                  <span className="font-mono">{fmtSAR(t.remaining)}</span>
                </li>;
              })}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   DOCTOR DASHBOARD
   ============================================================ */
export function DoctorDashboard() {
  const [doctors] = useDoctors();
  const [cases] = useCases();
  const [invoices] = useInvoices();
  const [payments] = usePayments();
  const [radiology] = useRadiology();
  const [matreq] = useMatRequests();
  const { user } = useAuth();

  // Try to match doctor by username; else first doctor
  const me = doctors.find(d => d.code.toLowerCase().includes((user?.username || "").toLowerCase())) || doctors[0];
  if (!me) return <div className="p-6">لا يوجد طبيب</div>;

  const myCases = cases.filter(c => c.doctorId === me.id);
  const active = myCases.filter(c => c.status === "active");
  const pendingRad = radiology.filter(r => r.doctorId === me.id && (r.status === "requested" || r.status === "in_progress" || r.status === "awaiting_payment"));
  const pendingMat = matreq.filter(m => m.doctorId === me.id && (m.status === "requested" || m.status === "issued"));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Stethoscope className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold">لوحة الطبيب</h1>
          <p className="text-sm text-muted-foreground">{me.name_ar} • {me.department}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<ClipboardList className="h-4 w-4" />} label="حالاتي النشطة" value={String(active.length)} />
        <Stat icon={<Activity className="h-4 w-4" />} label="إجمالي الحالات" value={String(myCases.length)} />
        <Stat icon={<Stethoscope className="h-4 w-4" />} label="طلبات أشعة" value={String(pendingRad.length)} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="طلبات مواد" value={String(pendingMat.length)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">حالات نشطة</CardTitle><CardDescription>افتح ملف الحالة من شاشة "حالات المرضى"</CardDescription></CardHeader>
        <CardContent>
          {active.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد</p> :
            <ul className="space-y-2">{active.slice(0, 8).map(c => {
              const t = caseTotals(c, invoices, payments);
              return <li key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <span className="font-medium">{c.caseNo}</span>
                <Badge className={statusColor(c.status)}>{STATUS_LABEL_AR[c.status]}</Badge>
                <span className="font-mono">{fmtSAR(t.total)}</span>
              </li>;
            })}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
      <div className="text-xl font-semibold">{value}</div>
    </CardContent></Card>
  );
}

/* ============================================================
   PATIENT LIST + REGISTER
   ============================================================ */
const NATIONALITIES: { code: string; label: string }[] = [
  { code: "SA", label: "سعودي" },
  { code: "EG", label: "مصري" },
  { code: "YE", label: "يمني" },
  { code: "SD", label: "سوداني" },
  { code: "SY", label: "سوري" },
  { code: "JO", label: "أردني" },
  { code: "PK", label: "باكستاني" },
  { code: "IN", label: "هندي" },
  { code: "PH", label: "فلبيني" },
  { code: "BD", label: "بنغلاديشي" },
  { code: "OTHER", label: "أخرى" },
];

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const MAX_FILE_MB = 5;

const blankPatientForm = {
  idNumber: "", name_ar: "", phone: "", nationality: "SA",
  gender: "M", dob: "", employer: "",
  attachments: [] as import("@/lib/journey-store").PatientAttachment[],
};

export function PatientsPage() {
  const [patients, setPatients] = usePatients();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankPatientForm);

  const filtered = patients.filter(p => !q
    || p.name_ar.includes(q) || p.phone.includes(q)
    || p.fileNo.includes(q) || p.idNumber.includes(q));

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const out: typeof form.attachments = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: يتجاوز ${MAX_FILE_MB}MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(f);
      });
      out.push({
        id: crypto.randomUUID(), name: f.name, type: f.type,
        size: f.size, dataUrl, uploadedAt: new Date().toISOString(),
      });
    }
    setForm(s => ({ ...s, attachments: [...s.attachments, ...out] }));
  };

  const submit = () => {
    const idNumber = form.idNumber.trim();
    if (!idNumber) return toast.error("رقم الهوية/الإقامة مطلوب");
    if (!/^[0-9]{10}$/.test(idNumber)) return toast.error("رقم الهوية/الإقامة يجب أن يتكون من 10 أرقام بالضبط");
    if (!form.name_ar.trim()) return toast.error("الاسم مطلوب");
    if (!form.phone.trim()) return toast.error("رقم التواصل مطلوب");
    if (!form.nationality) return toast.error("الجنسية مطلوبة");
    if (patients.some(p => p.idNumber === idNumber)) return toast.error("رقم الهوية مسجل مسبقاً");

    setPatients(prev => [...prev, {
      id: idNumber,
      fileNo: idNumber,
      idNumber,
      nationality: form.nationality,
      name_ar: form.name_ar.trim(),
      phone: form.phone.trim(),
      gender: form.gender as "M" | "F",
      dob: form.dob || undefined,
      employer: form.employer.trim() || undefined,
      attachments: form.attachments,
    }]);
    setForm(blankPatientForm);
    setOpen(false);
    toast.success("تم تسجيل المريض");
  };

  const natLabel = (c: string) => NATIONALITIES.find(n => n.code === c)?.label || c;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ClipboardList className="h-6 w-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">المرضى</h1>
          <p className="text-sm text-muted-foreground">{patients.length} ملف مريض • رقم الملف = رقم الهوية</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />مريض جديد</Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم/الجوال/رقم الهوية…" className="ps-9" />
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-start px-3 py-2">رقم الهوية</th>
              <th className="text-start px-3 py-2">الاسم</th>
              <th className="text-start px-3 py-2">الجنسية</th>
              <th className="text-start px-3 py-2">الجوال</th>
              <th className="text-start px-3 py-2">جهة العمل</th>
              <th className="text-center px-3 py-2">الضريبة</th>
              <th className="text-center px-3 py-2">مرفقات</th>
            </tr>
          </thead>
          <tbody>{filtered.map(p => (
            <tr key={p.id} className="border-t hover:bg-muted/30">
              <td className="px-3 py-2 font-mono text-xs">{p.idNumber}</td>
              <td className="px-3 py-2 font-medium">{p.name_ar}</td>
              <td className="px-3 py-2">{natLabel(p.nationality)}</td>
              <td className="px-3 py-2 font-mono text-xs">{p.phone}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.employer || "—"}</td>
              <td className="px-3 py-2 text-center">
                {p.nationality === "SA"
                  ? <Badge variant="secondary">معفى</Badge>
                  : <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">15%</Badge>}
              </td>
              <td className="px-3 py-2 text-center text-xs">{p.attachments?.length || 0}</td>
            </tr>
          ))}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تسجيل مريض جديد</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>رقم الهوية / الإقامة <span className="text-destructive">*</span></Label>
              <Input value={form.idNumber} inputMode="numeric"
                onChange={e => setForm({ ...form, idNumber: e.target.value.replace(/\D/g, "") })}
                placeholder="سيكون رقم الملف داخل النظام" />
            </div>
            <div className="col-span-2"><Label>الاسم الكامل <span className="text-destructive">*</span></Label>
              <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div><Label>رقم التواصل <span className="text-destructive">*</span></Label>
              <Input value={form.phone} inputMode="tel"
                onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>الجنسية <span className="text-destructive">*</span></Label>
              <Select value={form.nationality} onValueChange={v => setForm({ ...form, nationality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map(n => <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.nationality === "SA"
                ? <p className="text-xs text-muted-foreground mt-1">سعودي: لا تُحتسب ضريبة قيمة مضافة</p>
                : <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">غير سعودي: تُضاف ضريبة 15%</p>}
            </div>
            <div><Label>تاريخ الميلاد</Label>
              <Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
            <div>
              <Label>الجنس</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="M">ذكر</SelectItem><SelectItem value="F">أنثى</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>جهة العمل</Label>
              <Input value={form.employer} onChange={e => setForm({ ...form, employer: e.target.value })} /></div>

            <div className="col-span-2 space-y-2">
              <Label>المرفقات (PDF, JPG, PNG, DOC) — حد أقصى {MAX_FILE_MB}MB لكل ملف</Label>
              <Input type="file" multiple accept={ACCEPTED_TYPES}
                onChange={e => { onFiles(e.target.files); e.target.value = ""; }} />
              {form.attachments.length > 0 && (
                <ul className="space-y-1 text-xs border rounded-md p-2">
                  {form.attachments.map(a => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">📎 {a.name} <span className="text-muted-foreground">({Math.round(a.size / 1024)} KB)</span></span>
                      <button type="button" className="text-destructive hover:underline"
                        onClick={() => setForm(s => ({ ...s, attachments: s.attachments.filter(x => x.id !== a.id) }))}>إزالة</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
