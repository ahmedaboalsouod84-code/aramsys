import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts, useCostCenters, useJournal, nextRef, fmtSAR, type JournalLine, type JournalEntry } from "@/lib/erp-store";
import { Plus, Trash2, CheckCircle2, BookText } from "lucide-react";
import { toast } from "sonner";

type Draft = JournalLine & { _k: string };

const blank = (): Draft => ({ _k: crypto.randomUUID(), accountCode: "", debit: 0, credit: 0, costCenterId: "" });

export function JournalEntriesPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [centers] = useCostCenters();
  const [entries, setEntries] = useJournal();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narrative, setNarrative] = useState("");
  const [debits, setDebits] = useState<Draft[]>([blank()]);
  const [credits, setCredits] = useState<Draft[]>([blank()]);

  const totalD = debits.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalC = credits.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalD > 0 && Math.abs(totalD - totalC) < 0.01;

  const ref = useMemo(() => nextRef(entries), [entries]);

  const submit = () => {
    if (!balanced || !narrative.trim()) return;
    const lines: JournalLine[] = [
      ...debits.filter((l) => l.accountCode && l.debit > 0).map(({ _k, ...l }) => ({ ...l, debit: Number(l.debit), credit: 0 })),
      ...credits.filter((l) => l.accountCode && l.credit > 0).map(({ _k, ...l }) => ({ ...l, debit: 0, credit: Number(l.credit) })),
    ];
    const entry: JournalEntry = { id: crypto.randomUUID(), ref, date, narrative, lines };
    setEntries([entry, ...entries]);
    toast.success(t(`Entry ${ref} posted`, `تم ترحيل القيد ${ref}`));
    setNarrative(""); setDebits([blank()]); setCredits([blank()]);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BookText className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Journal Entries", "القيود اليومية")}</h1>
          <p className="text-sm text-muted-foreground">{t("Double-entry with cost-center allocation", "قيود مزدوجة مع تخصيص مراكز التكلفة")}</p>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">{t("New Entry", "قيد جديد")}</CardTitle>
              <CardDescription>{t("Ref", "المرجع")}: <span className="font-mono">{ref}</span></CardDescription>
            </div>
            <Badge variant={balanced ? "default" : "outline"} className={balanced ? "bg-success text-success-foreground" : ""}>
              {balanced ? <><CheckCircle2 className="h-3 w-3 mr-1" />{t("Balanced", "متوازن")}</> : t(`Diff: ${fmtSAR(totalD - totalC)}`, `الفرق: ${fmtSAR(totalD - totalC)}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Date", "التاريخ")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("Narrative", "البيان")}</Label>
              <Textarea rows={1} value={narrative} onChange={(e) => setNarrative(e.target.value)} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <LineEditor side="debit" lines={debits} setLines={setDebits} accounts={accounts} centers={centers} />
            <LineEditor side="credit" lines={credits} setLines={setCredits} accounts={accounts} centers={centers} />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {t("Total Debit", "إجمالي المدين")}: <span className="font-mono font-semibold text-foreground">{fmtSAR(totalD)}</span>
              <span className="mx-3">·</span>
              {t("Total Credit", "إجمالي الدائن")}: <span className="font-mono font-semibold text-foreground">{fmtSAR(totalC)}</span>
            </div>
            <Button disabled={!balanced || !narrative.trim()} onClick={submit}>{t("Post Entry", "ترحيل القيد")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Recent Entries", "آخر القيود")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{t("Ref", "المرجع")}</th>
                  <th className="text-start px-3 py-2 font-medium">{t("Date", "التاريخ")}</th>
                  <th className="text-start px-3 py-2 font-medium">{t("Narrative", "البيان")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Debit", "مدين")}</th>
                  <th className="text-end px-3 py-2 font-medium">{t("Credit", "دائن")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 15).map((e) => {
                  const d = e.lines.reduce((s, l) => s + l.debit, 0);
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{e.ref}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.date}</td>
                      <td className="px-3 py-2">{e.narrative}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d)}</td>
                      <td className="px-3 py-2 text-end">{fmtSAR(d)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function LineEditor({ side, lines, setLines, accounts, centers }: { side: "debit" | "credit"; lines: Draft[]; setLines: (l: Draft[]) => void; accounts: ReturnType<typeof useAccounts>[0]; centers: ReturnType<typeof useCostCenters>[0] }) {
    const isDr = side === "debit";
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{isDr ? t("Debit (Dr)", "مدين") : t("Credit (Cr)", "دائن")}</div>
          <Button size="sm" variant="ghost" onClick={() => setLines([...lines, blank()])}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        {lines.map((l, i) => (
          <div key={l._k} className="grid grid-cols-12 gap-1.5 items-center">
            <Select value={l.accountCode} onValueChange={(v) => setLines(lines.map((x, j) => j === i ? { ...x, accountCode: v } : x))}>
              <SelectTrigger className="col-span-5 h-9"><SelectValue placeholder={t("Account", "الحساب")} /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.level === "detail" || a.level === "contra" || a.level === undefined).map((a) => <SelectItem key={a.code} value={a.code}>{a.code} · {lang === "ar" ? a.name_ar : a.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={l.costCenterId || ""} onValueChange={(v) => setLines(lines.map((x, j) => j === i ? { ...x, costCenterId: v } : x))}>
              <SelectTrigger className="col-span-3 h-9"><SelectValue placeholder={t("CC", "م.ت")} /></SelectTrigger>
              <SelectContent>
                {centers.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number" className="col-span-3 h-9 text-end font-mono"
              value={isDr ? l.debit || "" : l.credit || ""}
              onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, [isDr ? "debit" : "credit"]: parseFloat(e.target.value) || 0 } : x))}
            />
            <Button size="icon" variant="ghost" className="col-span-1 h-9 w-9" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    );
  }
}
