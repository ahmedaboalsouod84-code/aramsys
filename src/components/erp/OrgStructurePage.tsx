// Organizational Structure — full CRUD for positions, levels, cost centers, profit centers.
// Supports edit / delete / bulk paste import (CSV / TSV / Excel paste).
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, TrendingUp, Search, Plus, Pencil, Trash2, Upload, Download, Layers } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  useOrgLevels, useOrgPositions, useOrgCostCenters, useOrgProfitCenters,
  parseDelimited, nextSeq,
  type OrgLevel, type Position, type CostCenterRow, type ProfitCenterRow,
} from "@/lib/org-structure-store";

export function OrgStructurePage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Organizational Structure", "الهيكل الوظيفي ومراكز التكلفة والربحية")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Manage levels, positions, cost centers and profit centers.", "إدارة المستويات والوظائف ومراكز التكلفة والربحية.")}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Search…", "بحث…")} className="ps-8 w-64" />
        </div>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="positions" className="gap-1.5"><Users className="h-3.5 w-3.5" />{t("Positions", "الوظائف")}</TabsTrigger>
          <TabsTrigger value="levels" className="gap-1.5"><Layers className="h-3.5 w-3.5" />{t("Levels", "المستويات")}</TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />{t("Cost Centers", "مراكز التكلفة")}</TabsTrigger>
          <TabsTrigger value="profit" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />{t("Profit Centers", "المراكز الربحية")}</TabsTrigger>
        </TabsList>

        <TabsContent value="positions"><PositionsTab q={q} /></TabsContent>
        <TabsContent value="levels"><LevelsTab q={q} /></TabsContent>
        <TabsContent value="cost"><CostCentersTab q={q} /></TabsContent>
        <TabsContent value="profit"><ProfitCentersTab q={q} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== POSITIONS ============================== */

function PositionsTab({ q }: { q: string }) {
  const { t } = useI18n();
  const [levels] = useOrgLevels();
  const [positions, setPositions] = useOrgPositions();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Position | null>(null);
  const [form, setForm] = useState<Partial<Position>>({});
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return positions;
    return positions.filter(p =>
      p.title_ar.includes(q) ||
      (levels.find(l => l.id === p.levelId)?.name_ar || "").includes(q),
    );
  }, [positions, levels, q]);

  const openNew = () => { setEdit(null); setForm({ levelId: levels[0]?.id }); setOpen(true); };
  const openEdit = (p: Position) => { setEdit(p); setForm(p); setOpen(true); };

  const save = () => {
    if (!form.title_ar?.trim() || !form.levelId) return toast.error("املأ الحقول المطلوبة");
    if (edit) {
      setPositions(list => list.map(x => x.id === edit.id ? { ...edit, ...form } as Position : x));
      toast.success("تم تحديث الوظيفة");
    } else {
      const p: Position = {
        id: crypto.randomUUID(),
        no: nextSeq(positions),
        levelId: form.levelId!,
        title_ar: form.title_ar!,
        title_en: form.title_en,
        desc_ar: form.desc_ar,
      };
      setPositions(list => [...list, p]);
      toast.success("تمت إضافة الوظيفة");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    setPositions(list => list.filter(x => x.id !== id));
    toast.success("تم الحذف");
  };

  const bulkImport = (text: string) => {
    const rows = parseDelimited(text);
    if (rows.length === 0) return;
    // detect header
    const start = /level|مستوى/i.test(rows[0].join(" ")) ? 1 : 0;
    const added: Position[] = [];
    let no = nextSeq(positions);
    for (const r of rows.slice(start)) {
      const [levelName, title] = r;
      if (!title?.trim()) continue;
      const lvl = levels.find(l => l.name_ar === levelName?.trim() || l.name_en === levelName?.trim());
      if (!lvl) continue;
      added.push({ id: crypto.randomUUID(), no: no++, levelId: lvl.id, title_ar: title.trim() });
    }
    if (added.length === 0) return toast.error("لم يتم استيراد أي صف. تأكد من تطابق اسم المستوى.");
    setPositions(list => [...list, ...added]);
    toast.success(`تم استيراد ${added.length} وظيفة`);
    setImportOpen(false);
  };

  const exportCsv = () => downloadCsv("positions.csv",
    ["Level", "Title"],
    positions.map(p => [levels.find(l => l.id === p.levelId)?.name_ar || "", p.title_ar]),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t("Positions", "الوظائف")}</CardTitle>
            <CardDescription>{positions.length} {t("total", "إجمالي")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
            <ImportDialog
              open={importOpen} setOpen={setImportOpen}
              title={t("Import Positions", "استيراد الوظائف")}
              hint="Level (اسم المستوى) ، Title (اسم الوظيفة)"
              example={"الإدارة العليا\tمدير عام\nالمالية والإدارية\tمحاسب أول"}
              onImport={bulkImport}
            />
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />{t("New", "جديد")}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>{t("Level", "المستوى")}</TableHead>
              <TableHead>{t("Position", "الوظيفة")}</TableHead>
              <TableHead className="w-32 text-end">{t("Actions", "إجراءات")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => {
              const lvl = levels.find(l => l.id === p.levelId);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.no}</TableCell>
                  <TableCell><Badge className={lvl?.color || ""}>{lvl?.name_ar}</Badge></TableCell>
                  <TableCell className="font-medium">{p.title_ar}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <DeleteBtn onConfirm={() => remove(p.id)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{edit ? t("Edit Position", "تعديل الوظيفة") : t("New Position", "وظيفة جديدة")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t("Level", "المستوى")} *</Label>
                <Select value={form.levelId} onValueChange={v => setForm(f => ({ ...f, levelId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Title (Arabic)", "اسم الوظيفة")} *</Label>
                <Input value={form.title_ar || ""} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Title (English)", "بالإنجليزية")}</Label>
                <Input value={form.title_en || ""} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Description", "الوصف")}</Label>
                <Textarea value={form.desc_ar || ""} onChange={e => setForm(f => ({ ...f, desc_ar: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
              <Button onClick={save}>{t("Save", "حفظ")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ============================== LEVELS ============================== */

function LevelsTab({ q }: { q: string }) {
  const { t } = useI18n();
  const [levels, setLevels] = useOrgLevels();
  const [positions] = useOrgPositions();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<OrgLevel | null>(null);
  const [form, setForm] = useState<Partial<OrgLevel>>({});

  const filtered = useMemo(() => q ? levels.filter(l => l.name_ar.includes(q)) : levels, [levels, q]);

  const openNew = () => { setEdit(null); setForm({ order: levels.length + 1 }); setOpen(true); };
  const openEdit = (l: OrgLevel) => { setEdit(l); setForm(l); setOpen(true); };

  const save = () => {
    if (!form.name_ar?.trim()) return toast.error("الاسم مطلوب");
    if (edit) {
      setLevels(list => list.map(x => x.id === edit.id ? { ...edit, ...form } as OrgLevel : x));
      toast.success("تم التحديث");
    } else {
      const l: OrgLevel = {
        id: crypto.randomUUID(),
        name_ar: form.name_ar!, name_en: form.name_en,
        order: form.order ?? levels.length + 1,
        color: form.color || "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      };
      setLevels(list => [...list, l]);
      toast.success("تمت الإضافة");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    const used = positions.some(p => p.levelId === id);
    if (used) return toast.error("لا يمكن الحذف: المستوى مستخدم في وظائف");
    setLevels(list => list.filter(x => x.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t("Levels", "المستويات الإدارية")}</CardTitle>
            <CardDescription>{levels.length} {t("levels", "مستوى")}</CardDescription>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />{t("New", "جديد")}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("Order", "الترتيب")}</TableHead>
              <TableHead>{t("Name", "الاسم")}</TableHead>
              <TableHead className="text-end">{t("Positions", "الوظائف")}</TableHead>
              <TableHead className="w-32 text-end">{t("Actions", "إجراءات")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.sort((a, b) => a.order - b.order).map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.order}</TableCell>
                <TableCell><Badge className={l.color || ""}>{l.name_ar}</Badge></TableCell>
                <TableCell className="text-end">{positions.filter(p => p.levelId === l.id).length}</TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <DeleteBtn onConfirm={() => remove(l.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{edit ? t("Edit Level", "تعديل المستوى") : t("New Level", "مستوى جديد")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t("Name", "الاسم")} *</Label>
                <Input value={form.name_ar || ""} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Order", "الترتيب")}</Label>
                <Input type="number" value={form.order || 0} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
              <Button onClick={save}>{t("Save", "حفظ")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ============================== COST CENTERS ============================== */

function CostCentersTab({ q }: { q: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useOrgCostCenters();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [edit, setEdit] = useState<CostCenterRow | null>(null);
  const [form, setForm] = useState<Partial<CostCenterRow>>({});

  const groups = Array.from(new Set(rows.map(r => r.group_ar)));
  const filtered = useMemo(() =>
    q ? rows.filter(r => r.name_ar.includes(q) || r.group_ar.includes(q)) : rows,
    [rows, q],
  );

  const openNew = () => { setEdit(null); setForm({ group_ar: groups[0] }); setOpen(true); };
  const openEdit = (r: CostCenterRow) => { setEdit(r); setForm(r); setOpen(true); };

  const save = () => {
    if (!form.name_ar?.trim() || !form.group_ar?.trim()) return toast.error("الاسم والمجموعة مطلوبان");
    if (edit) {
      setRows(list => list.map(x => x.id === edit.id ? { ...edit, ...form } as CostCenterRow : x));
      toast.success("تم التحديث");
    } else {
      const r: CostCenterRow = {
        id: crypto.randomUUID(), no: nextSeq(rows),
        group_ar: form.group_ar!, name_ar: form.name_ar!, name_en: form.name_en,
      };
      setRows(list => [...list, r]);
      toast.success("تمت الإضافة");
    }
    setOpen(false);
  };

  const remove = (id: string) => { setRows(list => list.filter(x => x.id !== id)); toast.success("تم الحذف"); };

  const bulkImport = (text: string) => {
    const parsed = parseDelimited(text);
    if (parsed.length === 0) return;
    const start = /group|مجموعة/i.test(parsed[0].join(" ")) ? 1 : 0;
    const added: CostCenterRow[] = [];
    let no = nextSeq(rows);
    for (const r of parsed.slice(start)) {
      const [group, name] = r;
      if (!name?.trim() || !group?.trim()) continue;
      added.push({ id: crypto.randomUUID(), no: no++, group_ar: group.trim(), name_ar: name.trim() });
    }
    if (added.length === 0) return toast.error("لم يتم استيراد أي صف");
    setRows(list => [...list, ...added]);
    toast.success(`تم استيراد ${added.length} مركز`);
    setImportOpen(false);
  };

  const exportCsv = () => downloadCsv("cost-centers.csv",
    ["Group", "Name"], rows.map(r => [r.group_ar, r.name_ar]));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t("Cost Centers", "مراكز التكلفة")}</CardTitle>
            <CardDescription>{rows.length} {t("centers", "مركز")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
            <ImportDialog
              open={importOpen} setOpen={setImportOpen}
              title={t("Import Cost Centers", "استيراد مراكز التكلفة")}
              hint="Group (المجموعة) ، Name (الاسم)"
              example={"مراكز التكلفة للغرف\tالعيادات\nمراكز التكلفة للمبنى\tالطابق الثاني"}
              onImport={bulkImport}
            />
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />{t("New", "جديد")}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>{t("Group", "المجموعة")}</TableHead>
              <TableHead>{t("Name", "الاسم")}</TableHead>
              <TableHead className="w-32 text-end">{t("Actions", "إجراءات")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.no}</TableCell>
                <TableCell><Badge variant="outline">{r.group_ar}</Badge></TableCell>
                <TableCell className="font-medium">{r.name_ar}</TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <DeleteBtn onConfirm={() => remove(r.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{edit ? t("Edit Cost Center", "تعديل المركز") : t("New Cost Center", "مركز جديد")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t("Group", "المجموعة")} *</Label>
                <Input
                  list="cc-groups"
                  value={form.group_ar || ""}
                  onChange={e => setForm(f => ({ ...f, group_ar: e.target.value }))}
                />
                <datalist id="cc-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Name", "الاسم")} *</Label>
                <Input value={form.name_ar || ""} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
              <Button onClick={save}>{t("Save", "حفظ")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ============================== PROFIT CENTERS ============================== */

function ProfitCentersTab({ q }: { q: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useOrgProfitCenters();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [edit, setEdit] = useState<ProfitCenterRow | null>(null);
  const [form, setForm] = useState<Partial<ProfitCenterRow>>({});

  const filtered = useMemo(() =>
    q ? rows.filter(r => r.name_ar.includes(q) || r.code.includes(q) || r.services_ar.includes(q)) : rows,
    [rows, q],
  );

  const nextCode = () => {
    const max = rows.reduce((m, r) => {
      const n = parseInt(r.code.replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return `PR-${String(max + 1).padStart(2, "0")}`;
  };

  const openNew = () => { setEdit(null); setForm({ code: nextCode() }); setOpen(true); };
  const openEdit = (r: ProfitCenterRow) => { setEdit(r); setForm(r); setOpen(true); };

  const save = () => {
    if (!form.name_ar?.trim() || !form.code?.trim()) return toast.error("الكود والاسم مطلوبان");
    if (edit) {
      setRows(list => list.map(x => x.id === edit.id ? { ...edit, ...form } as ProfitCenterRow : x));
      toast.success("تم التحديث");
    } else {
      const r: ProfitCenterRow = {
        id: crypto.randomUUID(),
        code: form.code!, name_ar: form.name_ar!, name_en: form.name_en,
        services_ar: form.services_ar || "",
      };
      setRows(list => [...list, r]);
      toast.success("تمت الإضافة");
    }
    setOpen(false);
  };

  const remove = (id: string) => { setRows(list => list.filter(x => x.id !== id)); toast.success("تم الحذف"); };

  const bulkImport = (text: string) => {
    const parsed = parseDelimited(text);
    if (parsed.length === 0) return;
    const start = /code|كود/i.test(parsed[0].join(" ")) ? 1 : 0;
    const added: ProfitCenterRow[] = [];
    for (const r of parsed.slice(start)) {
      const [code, name, services] = r;
      if (!name?.trim()) continue;
      added.push({
        id: crypto.randomUUID(),
        code: code?.trim() || nextCode(),
        name_ar: name.trim(),
        services_ar: services?.trim() || "",
      });
    }
    if (added.length === 0) return toast.error("لم يتم استيراد أي صف");
    setRows(list => [...list, ...added]);
    toast.success(`تم استيراد ${added.length} مركز`);
    setImportOpen(false);
  };

  const exportCsv = () => downloadCsv("profit-centers.csv",
    ["Code", "Name", "Services"], rows.map(r => [r.code, r.name_ar, r.services_ar]));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t("Profit Centers", "المراكز الربحية")}</CardTitle>
            <CardDescription>{rows.length} {t("centers", "مركز")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" />CSV</Button>
            <ImportDialog
              open={importOpen} setOpen={setImportOpen}
              title={t("Import Profit Centers", "استيراد المراكز الربحية")}
              hint="Code ، Name ، Services"
              example={"PR-12\tطب أطفال الأسنان\tخدمات أسنان الأطفال"}
              onImport={bulkImport}
            />
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />{t("New", "جديد")}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Code", "الكود")}</TableHead>
              <TableHead>{t("Profit Center", "المركز الربحي")}</TableHead>
              <TableHead>{t("Services", "الخدمات")}</TableHead>
              <TableHead className="w-32 text-end">{t("Actions", "إجراءات")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="secondary" className="font-mono">{r.code}</Badge></TableCell>
                <TableCell className="font-medium">{r.name_ar}</TableCell>
                <TableCell className="text-muted-foreground">{r.services_ar}</TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <DeleteBtn onConfirm={() => remove(r.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{edit ? t("Edit Profit Center", "تعديل المركز") : t("New Profit Center", "مركز جديد")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("Code", "الكود")} *</Label>
                  <Input value={form.code || ""} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Name", "الاسم")} *</Label>
                  <Input value={form.name_ar || ""} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Services", "الخدمات")}</Label>
                <Textarea value={form.services_ar || ""} onChange={e => setForm(f => ({ ...f, services_ar: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel", "إلغاء")}</Button>
              <Button onClick={save}>{t("Save", "حفظ")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ============================== SHARED ============================== */

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف؟</AlertDialogTitle>
          <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ImportDialog({
  open, setOpen, title, hint, example, onImport,
}: {
  open: boolean; setOpen: (v: boolean) => void;
  title: string; hint: string; example: string;
  onImport: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Upload className="h-4 w-4" />استيراد</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            الصِق صفوف من Excel أو ملف CSV/TSV. الأعمدة المتوقعة: <b>{hint}</b>.
            يدعم الفواصل: tab أو , أو ;
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>الصق البيانات هنا</Label>
          <Textarea
            value={text} onChange={e => setText(e.target.value)}
            rows={10} dir="ltr" className="font-mono text-xs"
            placeholder={example}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => onImport(text)} disabled={!text.trim()}>استيراد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function downloadCsv(name: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
