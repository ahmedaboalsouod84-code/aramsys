// Doctor Workspace tabs — Treatment Plan + Prescriptions.
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pill, Stethoscope, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  useTreatmentPlans, usePrescriptions, useServices, useCases, useActivity,
  fmtSAR, nextRef,
  type TreatmentPlanItem, type Prescription, type PrescriptionItem,
} from "@/lib/journey-store";
import { useAuth } from "@/lib/auth";

const CLINICAL_ROLES = ["doctor", "medical_manager", "admin"];

/* ============================================================
   Treatment Plan Tab
   ============================================================ */
export function TreatmentPlanTab({ caseId }: { caseId: string }) {
  const [plans, setPlans] = useTreatmentPlans();
  const [services] = useServices();
  const [cases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const isClinical = role && CLINICAL_ROLES.includes(role);
  const c = cases.find(x => x.id === caseId)!;

  const list = plans.filter(p => p.caseId === caseId);
  const planned = list.filter(p => p.status === "planned" || p.status === "in_progress");
  const estimatedTotal = list.filter(p => p.status !== "cancelled").reduce((s, p) => s + p.estimatedCost, 0);

  const [open, setOpen] = useState(false);
  const blank = { title: "", toothCode: "", serviceId: "none", sessions: 1, estimatedCost: 0, scheduledAt: "", notes: "" };
  const [form, setForm] = useState(blank);

  const submit = () => {
    if (!isClinical) return toast.error("الإضافة مقصورة على الطاقم الطبي");
    if (!form.title.trim()) return toast.error("أدخل عنوان البند");
    const item: TreatmentPlanItem = {
      id: crypto.randomUUID(),
      caseId, doctorId: c.doctorId,
      serviceId: form.serviceId === "none" ? undefined : form.serviceId,
      title: form.title,
      toothCode: form.toothCode || undefined,
      sessions: form.sessions || 1,
      estimatedCost: form.estimatedCost || 0,
      scheduledAt: form.scheduledAt || undefined,
      status: "planned",
      createdBy: user?.username || "?",
      createdAt: new Date().toISOString(),
      notes: form.notes || undefined,
    };
    setPlans(prev => [item, ...prev]);
    setActivity(prev => [{
      id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?",
      action: "إضافة بند خطة علاج", caseId, detail: form.title,
    }, ...prev]);
    setForm(blank); setOpen(false);
    toast.success("تمت إضافة البند");
  };

  const updateStatus = (id: string, status: TreatmentPlanItem["status"]) => {
    if (!isClinical) return toast.error("التحديث مقصور على الطاقم الطبي");
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const remove = (id: string) => {
    if (!isClinical) return toast.error("الحذف مقصور على الطاقم الطبي");
    const p = plans.find(x => x.id === id);
    if (p?.status === "done") return toast.error("لا يمكن حذف بند منفّذ");
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 text-sm grid grid-cols-3 gap-2">
          <Stat label="بنود الخطة" value={String(list.length)} />
          <Stat label="نشطة" value={String(planned.length)} />
          <Stat label="التكلفة التقديرية" value={fmtSAR(estimatedTotal)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" disabled={!isClinical} onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 me-1" />بند جديد
        </Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground"><tr>
            <th className="text-start px-3 py-2">العنوان</th>
            <th className="text-start px-3 py-2">السن</th>
            <th className="text-end px-3 py-2">جلسات</th>
            <th className="text-end px-3 py-2">تكلفة</th>
            <th className="text-start px-3 py-2">الموعد</th>
            <th className="text-start px-3 py-2">الحالة</th>
            <th></th>
          </tr></thead>
          <tbody>{list.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2">{p.title}</td>
              <td className="px-3 py-2 font-mono text-xs">{p.toothCode || "—"}</td>
              <td className="px-3 py-2 text-end">{p.sessions}</td>
              <td className="px-3 py-2 text-end font-mono">{fmtSAR(p.estimatedCost)}</td>
              <td className="px-3 py-2 text-xs">{p.scheduledAt || "—"}</td>
              <td className="px-3 py-2">
                <Select value={p.status} onValueChange={v => updateStatus(p.id, v as TreatmentPlanItem["status"])} disabled={!isClinical}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">مخطط</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="done">منفّذ</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 text-end">
                {isClinical && p.status !== "done" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">لا توجد بنود خطة علاج</td></tr>}</tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>بند خطة علاج</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label>العنوان</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: حشو مركّب — ضرس علوي أيمن" /></div>
            <div><Label>رقم السن (اختياري)</Label><Input value={form.toothCode} onChange={e => setForm({ ...form, toothCode: e.target.value })} placeholder="16" /></div>
            <div>
              <Label>خدمة مرتبطة (اختياري)</Label>
              <Select value={form.serviceId} onValueChange={v => {
                const sv = services.find(s => s.id === v);
                setForm({ ...form, serviceId: v, estimatedCost: sv?.price || form.estimatedCost });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون —</SelectItem>
                  {services.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.code} • {s.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>عدد الجلسات</Label><Input type="number" min={1} value={form.sessions} onChange={e => setForm({ ...form, sessions: +e.target.value })} /></div>
            <div><Label>التكلفة التقديرية</Label><Input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: +e.target.value })} /></div>
            <div className="col-span-2"><Label>موعد متوقع</Label><Input type="date" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Prescriptions Tab
   ============================================================ */
export function PrescriptionsTab({ caseId }: { caseId: string }) {
  const [rxs, setRxs] = usePrescriptions();
  const [cases] = useCases();
  const [, setActivity] = useActivity();
  const { user, role } = useAuth();
  const isClinical = role && CLINICAL_ROLES.includes(role);
  const c = cases.find(x => x.id === caseId)!;
  const list = rxs.filter(r => r.caseId === caseId);

  const [open, setOpen] = useState(false);
  const blankItem = (): PrescriptionItem => ({ drugName: "", dose: "", frequency: "", durationDays: 5, route: "فموي", notes: "" });
  const [form, setForm] = useState<{ diagnosis: string; followUpDate: string; items: PrescriptionItem[] }>(
    { diagnosis: "", followUpDate: "", items: [blankItem()] }
  );

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updItem = (i: number, patch: Partial<PrescriptionItem>) =>
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));

  const submit = () => {
    if (!isClinical) return toast.error("الوصف مقصور على الطبيب");
    const valid = form.items.filter(i => i.drugName.trim() && i.dose.trim());
    if (valid.length === 0) return toast.error("أضف دواءً واحداً على الأقل (الاسم والجرعة)");
    const rx: Prescription = {
      id: crypto.randomUUID(),
      ref: nextRef("RX", rxs),
      caseId, patientId: c.patientId, doctorId: c.doctorId,
      issuedAt: new Date().toISOString(),
      items: valid,
      diagnosis: form.diagnosis || undefined,
      followUpDate: form.followUpDate || undefined,
      status: "issued",
    };
    setRxs(prev => [rx, ...prev]);
    setActivity(prev => [{
      id: crypto.randomUUID(), at: new Date().toISOString(),
      user: user?.username || "?", role: role || "?",
      action: "إصدار وصفة طبية", caseId, detail: `${rx.ref} (${valid.length} أدوية)`,
    }, ...prev]);
    setForm({ diagnosis: "", followUpDate: "", items: [blankItem()] });
    setOpen(false);
    toast.success(`تم إصدار الوصفة ${rx.ref}`);
  };

  const cancel = (id: string) => {
    if (!isClinical) return toast.error("غير مصرح");
    setRxs(prev => prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" disabled={!isClinical} onClick={() => setOpen(true)}>
          <Pill className="h-4 w-4 me-1" />وصفة جديدة
        </Button>
      </div>

      <div className="space-y-3">
        {list.map(rx => (
          <Card key={rx.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm">{rx.ref}</span>
                  <Badge variant={rx.status === "cancelled" ? "destructive" : "secondary"}>
                    {rx.status === "issued" ? "صادرة" : rx.status === "dispensed" ? "مصروفة" : rx.status === "cancelled" ? "ملغاة" : "مسودة"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(rx.issuedAt).toLocaleString("ar-SA")}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  {isClinical && rx.status !== "cancelled" && (
                    <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => cancel(rx.id)}>إلغاء</Button>
                  )}
                </div>
              </div>
              {rx.diagnosis && <div className="text-xs"><span className="text-muted-foreground">التشخيص: </span>{rx.diagnosis}</div>}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground"><tr>
                    <th className="text-start px-2 py-1">الدواء</th>
                    <th className="text-start px-2 py-1">الجرعة</th>
                    <th className="text-start px-2 py-1">التكرار</th>
                    <th className="text-end px-2 py-1">أيام</th>
                    <th className="text-start px-2 py-1">طريقة</th>
                  </tr></thead>
                  <tbody>{rx.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 font-medium">{it.drugName}</td>
                      <td className="px-2 py-1">{it.dose}</td>
                      <td className="px-2 py-1">{it.frequency}</td>
                      <td className="px-2 py-1 text-end">{it.durationDays}</td>
                      <td className="px-2 py-1">{it.route || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {rx.followUpDate && <div className="text-xs text-muted-foreground">موعد المتابعة: {rx.followUpDate}</div>}
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">لا توجد وصفات</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>وصفة طبية جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>التشخيص</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
              <div><Label>موعد المتابعة</Label><Input type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الأدوية</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 me-1" />دواء</Button>
              </div>
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
                  <div className="col-span-4"><Label className="text-xs">اسم الدواء</Label><Input value={it.drugName} onChange={e => updItem(i, { drugName: e.target.value })} /></div>
                  <div className="col-span-2"><Label className="text-xs">الجرعة</Label><Input value={it.dose} onChange={e => updItem(i, { dose: e.target.value })} placeholder="500 mg" /></div>
                  <div className="col-span-3"><Label className="text-xs">التكرار</Label><Input value={it.frequency} onChange={e => updItem(i, { frequency: e.target.value })} placeholder="كل 8 ساعات" /></div>
                  <div className="col-span-1"><Label className="text-xs">أيام</Label><Input type="number" min={1} value={it.durationDays} onChange={e => updItem(i, { durationDays: +e.target.value })} /></div>
                  <div className="col-span-1"><Label className="text-xs">طريقة</Label><Input value={it.route} onChange={e => updItem(i, { route: e.target.value })} /></div>
                  <div className="col-span-1 flex justify-end">
                    {form.items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={submit}>إصدار الوصفة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}
