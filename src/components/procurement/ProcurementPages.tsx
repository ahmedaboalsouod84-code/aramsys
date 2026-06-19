// Procurement document chain: PR → PO → GR → VI → CN
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
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useSuppliers, usePRs, usePOs, useGRs, useVIs, useCNs, useOffers,
  nextRef, fmtSAR, poTotals, viTotals, cnTotals, statusBadge, STATUS_LABEL,
  type PrLine, type PoLine, type GrLine, type ViLine, type CnLine, type Supplier,
} from "@/lib/procurement-store";
import { postEvent } from "@/lib/posting-rules";

function StatusBadge({ s }: { s: string }) {
  return <Badge className={statusBadge(s)}>{STATUS_LABEL[s] || s}</Badge>;
}

function PageShell({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function ChainNote({ text }: { text: string }) {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>سلسلة المستندات</AlertTitle>
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}

/* =========================================================
 * 1) Suppliers
 * ========================================================= */
export function SuppliersPage() {
  const [suppliers, setSuppliers] = useSuppliers();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Supplier>>({ active: true });

  const add = () => {
    if (!draft.name_ar?.trim()) return toast.error("الاسم مطلوب");
    const code = draft.code?.trim() || `SUP-${String(suppliers.length + 1).padStart(3, "0")}`;
    setSuppliers((p) => [{ id: crypto.randomUUID(), code, name_ar: draft.name_ar!, vatNo: draft.vatNo, phone: draft.phone, paymentTerms: draft.paymentTerms, active: true }, ...p]);
    setDraft({ active: true });
    setOpen(false);
  };

  return (
    <PageShell title="الموردون" desc="إدارة بيانات الموردين">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 me-1" />مورد جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مورد</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1"><Label>الاسم</Label><Input value={draft.name_ar || ""} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} /></div>
              <div className="space-y-1"><Label>كود</Label><Input value={draft.code || ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div>
              <div className="space-y-1"><Label>الرقم الضريبي</Label><Input value={draft.vatNo || ""} onChange={(e) => setDraft({ ...draft, vatNo: e.target.value })} /></div>
              <div className="space-y-1"><Label>الجوال</Label><Input value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>شروط السداد</Label><Input value={draft.paymentTerms || ""} onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })} placeholder="Net 30 / 45 / Cash" /></div>
            </div>
            <DialogFooter><Button onClick={add}>حفظ</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>كود</TableHead><TableHead>الاسم</TableHead><TableHead>الرقم الضريبي</TableHead><TableHead>الجوال</TableHead><TableHead>الشروط</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell>{s.name_ar}</TableCell>
                  <TableCell className="font-mono text-xs">{s.vatNo || "—"}</TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell>{s.paymentTerms || "—"}</TableCell>
                  <TableCell><Badge variant={s.active ? "default" : "secondary"}>{s.active ? "نشط" : "موقوف"}</Badge></TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا موردين</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

/* =========================================================
 * 2) Purchase Requests (PR)
 * ========================================================= */
export function PurchaseRequestsPage() {
  const { user } = useAuth();
  const username = user?.username || "user";
  const [prs, setPrs] = usePRs();
  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState("");
  const [needBy, setNeedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PrLine[]>([{ id: crypto.randomUUID(), itemName: "", qty: 1, estUnitCost: 0 }]);

  const addLine = () => setLines((p) => [...p, { id: crypto.randomUUID(), itemName: "", qty: 1, estUnitCost: 0 }]);
  const rmLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id));
  const upLine = (id: string, k: keyof PrLine, v: string) => setLines((p) => p.map((l) => l.id === id ? { ...l, [k]: k === "qty" || k === "estUnitCost" ? Number(v) : v } : l));

  const submit = () => {
    const valid = lines.filter((l) => l.itemName.trim() && l.qty > 0);
    if (!valid.length) return toast.error("أضف صنفاً واحداً على الأقل");
    setPrs((p) => [{
      id: crypto.randomUUID(), ref: nextRef("PR", p),
      requestedBy: username || "user", department: department || "—",
      needBy: needBy || undefined, status: "submitted", lines: valid,
      notes: notes || undefined, createdAt: new Date().toISOString(),
    }, ...p]);
    setDepartment(""); setNeedBy(""); setNotes("");
    setLines([{ id: crypto.randomUUID(), itemName: "", qty: 1, estUnitCost: 0 }]);
    setOpen(false);
    toast.success("تم إنشاء PR");
  };

  const approve = (id: string) => setPrs((p) => p.map((r) => r.id === id ? { ...r, status: "approved", approvedAt: new Date().toISOString(), approvedBy: username || "user" } : r));
  const reject = (id: string) => setPrs((p) => p.map((r) => r.id === id ? { ...r, status: "rejected" } : r));

  return (
    <PageShell title="طلبات الشراء (PR)" desc="بدء سلسلة المشتريات: طلب شراء داخلي يحتاج اعتماداً قبل تحويله إلى أمر شراء (PO).">
      <ChainNote text="PR → PO → GR → VI → CN. لا تُنشأ أوامر شراء بدون PR معتمد." />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />طلب جديد</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>طلب شراء جديد</DialogTitle><DialogDescription>اكتب البنود المطلوبة. لن يتم الشراء قبل اعتماد المدير.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1"><Label>القسم</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
              <div className="space-y-1"><Label>مطلوب بحلول</Label><Input type="date" value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>البنود</Label><Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5 me-1" />سطر</Button></div>
              <Table><TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead className="w-24">الكمية</TableHead><TableHead className="w-32">تكلفة تقديرية</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                <TableBody>{lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Input value={l.itemName} onChange={(e) => upLine(l.id, "itemName", e.target.value)} /></TableCell>
                    <TableCell><Input type="number" min={1} value={l.qty} onChange={(e) => upLine(l.id, "qty", e.target.value)} /></TableCell>
                    <TableCell><Input type="number" min={0} value={l.estUnitCost} onChange={(e) => upLine(l.id, "estUnitCost", e.target.value)} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => rmLine(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="space-y-1"><Label>ملاحظات</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
            <DialogFooter><Button onClick={submit}>تقديم الطلب</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>القسم</TableHead><TableHead>مقدّم بواسطة</TableHead><TableHead>بنود</TableHead><TableHead>تقديرية</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>
              {prs.map((pr) => {
                const est = pr.lines.reduce((a, l) => a + l.qty * l.estUnitCost, 0);
                return (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono text-xs">{pr.ref}</TableCell>
                    <TableCell>{pr.department}</TableCell>
                    <TableCell>{pr.requestedBy}</TableCell>
                    <TableCell>{pr.lines.length}</TableCell>
                    <TableCell>{fmtSAR(est)}</TableCell>
                    <TableCell><StatusBadge s={pr.status} /></TableCell>
                    <TableCell>
                      {pr.status === "submitted" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => approve(pr.id)}>اعتماد</Button>
                          <Button size="sm" variant="ghost" onClick={() => reject(pr.id)}>رفض</Button>
                        </div>
                      )}
                      {pr.status === "approved" && <Badge variant="secondary">جاهز للتحويل إلى PO</Badge>}
                      {pr.status === "converted" && pr.poRef && <span className="text-xs text-muted-foreground">→ {pr.poRef}</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {prs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">لا طلبات</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

/* =========================================================
 * 3) Purchase Orders (PO) — built from approved PRs
 * ========================================================= */
export function PurchaseOrdersPage() {
  const { user } = useAuth();
  const username = user?.username || "user";
  const [prs, setPrs] = usePRs();
  const [pos, setPos] = usePOs();
  const [suppliers] = useSuppliers();
  const [open, setOpen] = useState(false);
  const [prId, setPrId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [lines, setLines] = useState<PoLine[]>([]);

  const approvedPRs = useMemo(() => prs.filter((p) => p.status === "approved"), [prs]);
  const pickPR = (id: string) => {
    setPrId(id);
    const pr = prs.find((p) => p.id === id);
    if (pr) setLines(pr.lines.map((l) => ({
      id: crypto.randomUUID(), itemName: l.itemName, qty: l.qty, unitCost: l.estUnitCost,
      receivedQty: 0, invoicedQty: 0, vatPct: 15,
    })));
  };

  const upLine = (id: string, k: keyof PoLine, v: string) => setLines((p) => p.map((l) => l.id === id ? { ...l, [k]: ["qty", "unitCost", "vatPct"].includes(k) ? Number(v) : v } : l));

  const totals = poTotals({ lines });

  const create = () => {
    if (!supplierId) return toast.error("اختر مورداً");
    if (!lines.length) return toast.error("لا بنود");
    const pr = prs.find((p) => p.id === prId);
    const id = crypto.randomUUID();
    const ref = nextRef("PO", pos);
    setPos((p) => [{
      id, ref, prRef: pr?.ref, supplierId, lines,
      subtotal: totals.subtotal, vatAmount: totals.vat, total: totals.total,
      status: "approved", createdBy: username || "user", createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(), expectedAt: expectedAt || undefined,
    }, ...p]);
    if (pr) setPrs((p) => p.map((r) => r.id === pr.id ? { ...r, status: "converted", poRef: ref } : r));
    setOpen(false); setPrId(""); setSupplierId(""); setExpectedAt(""); setLines([]);
    toast.success(`تم إنشاء ${ref}`);
  };

  return (
    <PageShell title="أوامر الشراء (PO)" desc="إصدار أوامر شراء للموردين انطلاقاً من طلبات الشراء المعتمدة فقط.">
      <ChainNote text="يُسمح بإنشاء PO فقط من PR معتمد. الاستلام يتم لاحقاً عبر GR." />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={!approvedPRs.length}><Plus className="h-4 w-4 me-1" />أمر شراء جديد</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>أمر شراء جديد</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="space-y-1"><Label>PR المصدر</Label>
                <Select value={prId} onValueChange={pickPR}>
                  <SelectTrigger><SelectValue placeholder="اختر PR" /></SelectTrigger>
                  <SelectContent>{approvedPRs.map((p) => <SelectItem key={p.id} value={p.id}>{p.ref} — {p.department}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>المورد</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                  <SelectContent>{suppliers.filter((s) => s.active).map((s) => <SelectItem key={s.id} value={s.id}>{s.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>تاريخ التسليم المتوقع</Label><Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} /></div>
            </div>
            {lines.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead>الكمية</TableHead><TableHead>التكلفة</TableHead><TableHead>VAT %</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell><Input value={l.itemName} onChange={(e) => upLine(l.id, "itemName", e.target.value)} /></TableCell>
                      <TableCell><Input type="number" value={l.qty} onChange={(e) => upLine(l.id, "qty", e.target.value)} className="w-20" /></TableCell>
                      <TableCell><Input type="number" value={l.unitCost} onChange={(e) => upLine(l.id, "unitCost", e.target.value)} className="w-28" /></TableCell>
                      <TableCell><Input type="number" value={l.vatPct} onChange={(e) => upLine(l.id, "vatPct", e.target.value)} className="w-20" /></TableCell>
                      <TableCell>{fmtSAR(l.qty * l.unitCost * (1 + l.vatPct / 100))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex justify-end gap-4 text-sm">
              <div>المجموع: {fmtSAR(totals.subtotal)}</div>
              <div>VAT: {fmtSAR(totals.vat)}</div>
              <div className="font-semibold">الإجمالي: {fmtSAR(totals.total)}</div>
            </div>
            <DialogFooter><Button onClick={create}>اعتماد وإصدار</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>PR</TableHead><TableHead>المورد</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead><TableHead>تاريخ</TableHead></TableRow></TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.ref}</TableCell>
                  <TableCell className="font-mono text-xs">{po.prRef || "—"}</TableCell>
                  <TableCell>{suppliers.find((s) => s.id === po.supplierId)?.name_ar || "—"}</TableCell>
                  <TableCell>{fmtSAR(po.total)}</TableCell>
                  <TableCell><StatusBadge s={po.status} /></TableCell>
                  <TableCell className="text-xs">{new Date(po.createdAt).toLocaleDateString("ar-SA")}</TableCell>
                </TableRow>
              ))}
              {pos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا أوامر</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

/* =========================================================
 * 4) Goods Receipts (GR) — built from approved POs
 * ========================================================= */
export function GoodsReceiptsPage() {
  const { user } = useAuth();
  const username = user?.username || "user";
  const [pos, setPos] = usePOs();
  const [grs, setGrs] = useGRs();
  const [suppliers] = useSuppliers();
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<GrLine[]>([]);

  const openPOs = useMemo(() => pos.filter((p) => p.status === "approved" || p.status === "partial_received"), [pos]);

  const pickPO = (id: string) => {
    setPoId(id);
    const po = pos.find((p) => p.id === id);
    if (po) setLines(po.lines.map((l) => ({
      id: crypto.randomUUID(), poLineId: l.id, itemName: l.itemName,
      qtyReceived: l.qty - l.receivedQty, qtyAccepted: l.qty - l.receivedQty, qtyRejected: 0,
      unitCost: l.unitCost, invoicedQty: 0,
    })));
  };

  const upLine = (id: string, k: keyof GrLine, v: string) => setLines((p) => p.map((l) => {
    if (l.id !== id) return l;
    const next = { ...l, [k]: Number(v) };
    if (k === "qtyReceived" || k === "qtyRejected") {
      next.qtyAccepted = Math.max(0, (next.qtyReceived || 0) - (next.qtyRejected || 0));
    }
    return next;
  }));

  const post = () => {
    const po = pos.find((p) => p.id === poId);
    if (!po) return toast.error("اختر PO");
    const valid = lines.filter((l) => l.qtyReceived > 0);
    if (!valid.length) return toast.error("لا كميات مستلمة");
    setGrs((p) => [{
      id: crypto.randomUUID(), ref: nextRef("GR", p), poRef: po.ref,
      supplierId: po.supplierId, receivedBy: username || "user",
      receivedAt: new Date().toISOString(), status: "posted",
      warehouse: warehouse || undefined, lines: valid, notes: notes || undefined,
    }, ...p]);
    // update PO line receivedQty + status
    setPos((p) => p.map((x) => {
      if (x.id !== poId) return x;
      const newLines = x.lines.map((pl) => {
        const grl = valid.find((g) => g.poLineId === pl.id);
        return grl ? { ...pl, receivedQty: pl.receivedQty + grl.qtyAccepted } : pl;
      });
      const allReceived = newLines.every((pl) => pl.receivedQty >= pl.qty);
      const anyReceived = newLines.some((pl) => pl.receivedQty > 0);
      return { ...x, lines: newLines, status: allReceived ? "received" : anyReceived ? "partial_received" : x.status };
    }));
    setOpen(false); setPoId(""); setWarehouse(""); setNotes(""); setLines([]);
    toast.success("تم ترحيل GR");
  };

  return (
    <PageShell title="إيصالات الاستلام (GR)" desc="تأكيد الاستلام الفعلي للأصناف من المورد وفحصها. لا تُنشأ فاتورة مورد بدون GR.">
      <ChainNote text="GR يحوّل البضاعة إلى المخزون ويفتح الباب لإصدار VI." />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={!openPOs.length}><Plus className="h-4 w-4 me-1" />استلام جديد</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>استلام بضاعة</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1"><Label>أمر الشراء</Label>
                <Select value={poId} onValueChange={pickPO}>
                  <SelectTrigger><SelectValue placeholder="اختر PO" /></SelectTrigger>
                  <SelectContent>{openPOs.map((p) => <SelectItem key={p.id} value={p.id}>{p.ref}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>المستودع</Label><Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></div>
            </div>
            {lines.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead>مستلم</TableHead><TableHead>مرفوض</TableHead><TableHead>مقبول</TableHead></TableRow></TableHeader>
                <TableBody>{lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.itemName}</TableCell>
                    <TableCell><Input type="number" value={l.qtyReceived} onChange={(e) => upLine(l.id, "qtyReceived", e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input type="number" value={l.qtyRejected} onChange={(e) => upLine(l.id, "qtyRejected", e.target.value)} className="w-24" /></TableCell>
                    <TableCell className="font-semibold">{l.qtyAccepted}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
            <div className="space-y-1"><Label>ملاحظات</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
            <DialogFooter><Button onClick={post}>ترحيل الاستلام</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>PO</TableHead><TableHead>المورد</TableHead><TableHead>بنود</TableHead><TableHead>الحالة</TableHead><TableHead>تاريخ</TableHead></TableRow></TableHeader>
          <TableBody>
            {grs.map((gr) => (
              <TableRow key={gr.id}>
                <TableCell className="font-mono text-xs">{gr.ref}</TableCell>
                <TableCell className="font-mono text-xs">{gr.poRef}</TableCell>
                <TableCell>{suppliers.find((s) => s.id === gr.supplierId)?.name_ar || "—"}</TableCell>
                <TableCell>{gr.lines.length}</TableCell>
                <TableCell><StatusBadge s={gr.status} /></TableCell>
                <TableCell className="text-xs">{new Date(gr.receivedAt).toLocaleDateString("ar-SA")}</TableCell>
              </TableRow>
            ))}
            {grs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا إيصالات</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageShell>
  );
}

/* =========================================================
 * 5) Vendor Invoices (VI) — built from GRs (3-way match)
 * ========================================================= */
export function VendorInvoicesPage() {
  const [grs, setGrs] = useGRs();
  const [pos] = usePOs();
  const [vis, setVis] = useVIs();
  const [suppliers] = useSuppliers();
  const [open, setOpen] = useState(false);
  const [grId, setGrId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<ViLine[]>([]);

  const openGRs = useMemo(() => grs.filter((g) => g.status === "posted" || g.status === "partial_invoiced"), [grs]);

  const pickGR = (id: string) => {
    setGrId(id);
    const gr = grs.find((g) => g.id === id);
    const po = gr ? pos.find((p) => p.ref === gr.poRef) : null;
    if (gr) setLines(gr.lines.map((l) => {
      const poLine = po?.lines.find((pl) => pl.id === l.poLineId);
      return {
        id: crypto.randomUUID(), grLineId: l.id, itemName: l.itemName,
        qty: l.qtyAccepted - l.invoicedQty, unitCost: l.unitCost,
        vatPct: poLine?.vatPct ?? 15, creditedQty: 0,
      };
    }).filter((x) => x.qty > 0));
  };

  const upLine = (id: string, k: keyof ViLine, v: string) => setLines((p) => p.map((l) => l.id === id ? { ...l, [k]: Number(v) } : l));
  const totals = viTotals({ lines });

  const create = () => {
    const gr = grs.find((g) => g.id === grId);
    if (!gr) return toast.error("اختر GR");
    if (!invoiceNo.trim()) return toast.error("رقم فاتورة المورد مطلوب");
    const valid = lines.filter((l) => l.qty > 0);
    if (!valid.length) return toast.error("لا بنود للفوترة");
    setVis((p) => [{
      id: crypto.randomUUID(), ref: nextRef("VI", p), invoiceNo: invoiceNo.trim(),
      grRef: gr.ref, poRef: gr.poRef, supplierId: gr.supplierId, lines: valid,
      subtotal: totals.subtotal, vatAmount: totals.vat, total: totals.total,
      status: "approved", createdAt: new Date().toISOString(),
      dueDate: dueDate || undefined,
    }, ...p]);
    // Mark GR lines invoiced
    setGrs((p) => p.map((g) => {
      if (g.id !== gr.id) return g;
      const newLines = g.lines.map((gl) => {
        const vl = valid.find((v) => v.grLineId === gl.id);
        return vl ? { ...gl, invoicedQty: gl.invoicedQty + vl.qty } : gl;
      });
      const fully = newLines.every((gl) => gl.invoicedQty >= gl.qtyAccepted);
      return { ...g, lines: newLines, status: fully ? "invoiced" : "partial_invoiced" };
    }));
    setOpen(false); setGrId(""); setInvoiceNo(""); setDueDate(""); setLines([]);
    toast.success("تم إصدار VI");
  };

  return (
    <PageShell title="فواتير الموردين (VI)" desc="مطابقة ثلاثية PO ↔ GR ↔ Vendor Invoice. لن تُسجّل ذمم دائنة بدون GR مسبق.">
      <ChainNote text="VI تُنشأ فقط من GR مرحّل. مطابقة الكميات والأسعار قبل الاعتماد." />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={!openGRs.length}><Plus className="h-4 w-4 me-1" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>فاتورة مورد</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="space-y-1"><Label>GR المصدر</Label>
                <Select value={grId} onValueChange={pickGR}>
                  <SelectTrigger><SelectValue placeholder="اختر GR" /></SelectTrigger>
                  <SelectContent>{openGRs.map((g) => <SelectItem key={g.id} value={g.id}>{g.ref} ← {g.poRef}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>رقم فاتورة المورد</Label><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
              <div className="space-y-1"><Label>تاريخ الاستحقاق</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            </div>
            {lines.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead>الكمية</TableHead><TableHead>التكلفة</TableHead><TableHead>VAT %</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader>
                <TableBody>{lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.itemName}</TableCell>
                    <TableCell><Input type="number" value={l.qty} onChange={(e) => upLine(l.id, "qty", e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" value={l.unitCost} onChange={(e) => upLine(l.id, "unitCost", e.target.value)} className="w-28" /></TableCell>
                    <TableCell><Input type="number" value={l.vatPct} onChange={(e) => upLine(l.id, "vatPct", e.target.value)} className="w-20" /></TableCell>
                    <TableCell>{fmtSAR(l.qty * l.unitCost * (1 + l.vatPct / 100))}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
            <div className="flex justify-end gap-4 text-sm">
              <div>المجموع: {fmtSAR(totals.subtotal)}</div>
              <div>VAT: {fmtSAR(totals.vat)}</div>
              <div className="font-semibold">الإجمالي: {fmtSAR(totals.total)}</div>
            </div>
            <DialogFooter><Button onClick={create}>اعتماد الفاتورة</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>رقم المورد</TableHead><TableHead>GR / PO</TableHead><TableHead>المورد</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
          <TableBody>
            {vis.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs">{v.ref}</TableCell>
                <TableCell className="font-mono text-xs">{v.invoiceNo}</TableCell>
                <TableCell className="font-mono text-xs">{v.grRef} / {v.poRef}</TableCell>
                <TableCell>{suppliers.find((s) => s.id === v.supplierId)?.name_ar || "—"}</TableCell>
                <TableCell>{fmtSAR(v.total)}</TableCell>
                <TableCell><StatusBadge s={v.status} /></TableCell>
              </TableRow>
            ))}
            {vis.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا فواتير</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageShell>
  );
}

/* =========================================================
 * 6) Credit Notes (CN) — replaces "Purchase Returns"
 * ========================================================= */
export function CreditNotesPage() {
  const { user } = useAuth();
  const username = user?.username || "user";
  const [vis, setVis] = useVIs();
  const [cns, setCns] = useCNs();
  const [suppliers] = useSuppliers();
  const [open, setOpen] = useState(false);
  const [viId, setViId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<CnLine[]>([]);

  const openVIs = useMemo(() => vis.filter((v) => v.status === "approved" || v.status === "partial_credited" || v.status === "paid"), [vis]);

  const pickVI = (id: string) => {
    setViId(id);
    const vi = vis.find((v) => v.id === id);
    if (vi) setLines(vi.lines.map((l) => ({
      id: crypto.randomUUID(), viLineId: l.id, itemName: l.itemName,
      qty: 0, unitCost: l.unitCost, vatPct: l.vatPct, reason: "damaged",
    })));
  };
  const upLine = (id: string, k: keyof CnLine, v: string) => setLines((p) => p.map((l) => l.id === id ? { ...l, [k]: (k === "qty" || k === "unitCost" || k === "vatPct") ? Number(v) : v } : l));
  const totals = cnTotals({ lines: lines.filter((l) => l.qty > 0) });

  const create = () => {
    const vi = vis.find((v) => v.id === viId);
    if (!vi) return toast.error("اختر فاتورة مورد");
    const valid = lines.filter((l) => l.qty > 0);
    if (!valid.length) return toast.error("لا كميات للإشعار الدائن");
    // validate not exceeding remaining
    for (const cl of valid) {
      const vl = vi.lines.find((x) => x.id === cl.viLineId)!;
      const remaining = vl.qty - vl.creditedQty;
      if (cl.qty > remaining) return toast.error(`الكمية للصنف "${cl.itemName}" تتجاوز المتبقي (${remaining})`);
    }
    setCns((p) => [{
      id: crypto.randomUUID(), ref: nextRef("CN", p), viRef: vi.ref,
      supplierId: vi.supplierId, lines: valid,
      subtotal: totals.subtotal, vatAmount: totals.vat, total: totals.total,
      reason: reason || "—", createdBy: username || "user",
      createdAt: new Date().toISOString(), status: "approved",
    }, ...p]);
    // Update VI line creditedQty + status
    setVis((p) => p.map((v) => {
      if (v.id !== vi.id) return v;
      const newLines = v.lines.map((vl) => {
        const cl = valid.find((c) => c.viLineId === vl.id);
        return cl ? { ...vl, creditedQty: vl.creditedQty + cl.qty } : vl;
      });
      const allCredited = newLines.every((vl) => vl.creditedQty >= vl.qty);
      const any = newLines.some((vl) => vl.creditedQty > 0);
      return { ...v, lines: newLines, status: allCredited ? "credited" : any ? "partial_credited" : v.status };
    }));
    setOpen(false); setViId(""); setReason(""); setLines([]);
    toast.success("تم إصدار إشعار دائن");
  };

  return (
    <PageShell title="إشعارات دائنة (CN)" desc="استبدال نهائي لـ Purchase Returns. كل مرتجع/خصم لاحق على فاتورة مورد يُسجّل كإشعار دائن مرتبط بـ VI الأصلي.">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>لماذا تم حذف مرتجعات الشراء؟</AlertTitle>
        <AlertDescription>
          تم استبدال شاشة "مرتجعات الشراء" المنفصلة بشاشة الإشعارات الدائنة لضمان أن كل مرتجع
          يقابله مستند محاسبي مرتبط بفاتورة المورد الأصلية (VI) ضمن سلسلة PR→PO→GR→VI→CN.
        </AlertDescription>
      </Alert>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={!openVIs.length}><Plus className="h-4 w-4 me-1" />إشعار دائن جديد</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إشعار دائن من VI</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1"><Label>فاتورة المورد</Label>
                <Select value={viId} onValueChange={pickVI}>
                  <SelectTrigger><SelectValue placeholder="اختر VI" /></SelectTrigger>
                  <SelectContent>{openVIs.map((v) => <SelectItem key={v.id} value={v.id}>{v.ref} — {v.invoiceNo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>السبب العام</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            </div>
            {lines.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>الصنف</TableHead><TableHead>كمية الإرجاع</TableHead><TableHead>التكلفة</TableHead><TableHead>السبب</TableHead></TableRow></TableHeader>
                <TableBody>{lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.itemName}</TableCell>
                    <TableCell><Input type="number" value={l.qty} onChange={(e) => upLine(l.id, "qty", e.target.value)} className="w-24" /></TableCell>
                    <TableCell><Input type="number" value={l.unitCost} onChange={(e) => upLine(l.id, "unitCost", e.target.value)} className="w-28" /></TableCell>
                    <TableCell>
                      <Select value={l.reason} onValueChange={(v) => upLine(l.id, "reason", v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="damaged">تالف</SelectItem>
                          <SelectItem value="wrong_item">صنف خاطئ</SelectItem>
                          <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                          <SelectItem value="overdelivery">زيادة تسليم</SelectItem>
                          <SelectItem value="quality">جودة</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
            <div className="flex justify-end gap-4 text-sm">
              <div>المجموع: {fmtSAR(totals.subtotal)}</div>
              <div>VAT: {fmtSAR(totals.vat)}</div>
              <div className="font-semibold">الإجمالي: {fmtSAR(totals.total)}</div>
            </div>
            <DialogFooter><Button onClick={create}>اعتماد الإشعار</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>VI</TableHead><TableHead>المورد</TableHead><TableHead>السبب</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
          <TableBody>
            {cns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.ref}</TableCell>
                <TableCell className="font-mono text-xs">{c.viRef}</TableCell>
                <TableCell>{suppliers.find((s) => s.id === c.supplierId)?.name_ar || "—"}</TableCell>
                <TableCell className="text-xs">{c.reason}</TableCell>
                <TableCell>-{fmtSAR(c.total)}</TableCell>
                <TableCell><StatusBadge s={c.status} /></TableCell>
              </TableRow>
            ))}
            {cns.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">لا إشعارات</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageShell>
  );
}

/* =========================================================
 * 7) Supplier Offers (light)
 * ========================================================= */
export function SupplierOffersPage() {
  const [offers, setOffers] = useOffers();
  const [suppliers] = useSuppliers();
  const [prs] = usePRs();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [prRef, setPrRef] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const add = () => {
    if (!supplierId || !itemName.trim()) return toast.error("بيانات ناقصة");
    setOffers((p) => [{
      id: crypto.randomUUID(), ref: nextRef("RFQ", p), supplierId,
      prRef: prRef || undefined, lines: [{ itemName, qty, unitCost }],
      total: qty * unitCost, status: "received", createdAt: new Date().toISOString(),
    }, ...p]);
    setItemName(""); setQty(1); setUnitCost(0); setSupplierId(""); setPrRef("");
    setOpen(false);
  };

  return (
    <PageShell title="عروض الموردين (RFQ)" desc="تسجيل عروض الأسعار قبل إصدار أمر الشراء.">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 me-1" />عرض جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تسجيل عرض</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1"><Label>المورد</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>PR (اختياري)</Label>
                <Select value={prRef} onValueChange={setPrRef}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{prs.map((p) => <SelectItem key={p.id} value={p.ref}>{p.ref}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2"><Label>الصنف</Label><Input value={itemName} onChange={(e) => setItemName(e.target.value)} /></div>
              <div className="space-y-1"><Label>الكمية</Label><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>السعر</Label><Input type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} /></div>
            </div>
            <DialogFooter><Button onClick={add}>حفظ</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>المورد</TableHead><TableHead>PR</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
          <TableBody>
            {offers.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.ref}</TableCell>
                <TableCell>{suppliers.find((s) => s.id === o.supplierId)?.name_ar || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{o.prRef || "—"}</TableCell>
                <TableCell>{fmtSAR(o.total)}</TableCell>
                <TableCell><StatusBadge s={o.status} /></TableCell>
              </TableRow>
            ))}
            {offers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">لا عروض</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageShell>
  );
}
