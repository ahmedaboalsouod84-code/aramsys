// Period Close & Year-End page
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useJournal, fmtSAR } from "@/lib/erp-store";
import { usePeriods, useYearEnds, closePeriod, reopenPeriod, closeYear } from "@/lib/period-close-store";
import { Lock, Unlock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function PeriodClosePage() {
  const { t } = useI18n();
  const [journal] = useJournal();
  const [periods] = usePeriods();
  const [yearEnds] = useYearEnds();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Build months for the selected year
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
      const p = periods.find(x => x.yearMonth === ym);
      const entries = journal.filter(e => e.date.startsWith(ym));
      const dr = entries.reduce((s, e) => s + e.lines.reduce((a, l) => a + l.debit, 0), 0);
      const cr = entries.reduce((s, e) => s + e.lines.reduce((a, l) => a + l.credit, 0), 0);
      return { ym, status: p?.status || "open", count: entries.length, dr, cr, balanced: Math.abs(dr - cr) < 0.01 };
    });
  }, [periods, journal, year]);

  // Year-end summary
  const yearSummary = useMemo(() => {
    let rev = 0, exp = 0;
    for (const e of journal) {
      if (!e.date.startsWith(String(year))) continue;
      for (const l of e.lines) {
        if (l.accountCode.startsWith("4")) rev += l.credit - l.debit;
        else if (l.accountCode.startsWith("5")) exp += l.debit - l.credit;
      }
    }
    return { revenue: rev, expense: exp, netIncome: rev - exp };
  }, [journal, year]);

  const yearRecord = yearEnds.find(y => y.year === year);

  const onClosePeriod = (ym: string) => {
    try { closePeriod(ym, "user"); toast.success(`Closed ${ym}`); }
    catch (e) { toast.error((e as Error).message); }
  };
  const onReopen = (ym: string) => { reopenPeriod(ym); toast.success(`Reopened ${ym}`); };

  const onCloseYear = () => {
    try {
      const ye = closeYear(year, journal);
      toast.success(`Year ${year} closed · Net income ${fmtSAR(ye.netIncome)}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Period Close & Year-End", "إقفال الفترات والسنة المالية")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Close monthly periods to lock posting; year-end zeroes revenue and expense to Retained Earnings.", "أقفل الفترات الشهرية لمنع الترحيل؛ إقفال السنة يصفّر الإيرادات والمصروفات إلى الأرباح المحتجزة.")}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">{t("Year", "السنة")}</label>
            <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || currentYear)} className="w-28" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>{t("Total Revenue", "إجمالي الإيرادات")}</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{fmtSAR(yearSummary.revenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>{t("Total Expenses", "إجمالي المصروفات")}</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-rose-600">{fmtSAR(yearSummary.expense)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>{t("Net Income", "صافي الدخل")}</CardDescription></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${yearSummary.netIncome >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {fmtSAR(yearSummary.netIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{t(`Monthly Periods · ${year}`, `الفترات الشهرية · ${year}`)}</CardTitle>
              <CardDescription>{t("Close each month after reconciliations.", "أقفل كل شهر بعد إنهاء التسويات.")}</CardDescription>
            </div>
            {yearRecord ? (
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />
                {t(`Year closed · ${yearRecord.closingJournalRef}`, `السنة مقفلة · ${yearRecord.closingJournalRef}`)}
              </Badge>
            ) : (
              <Button onClick={onCloseYear} className="gap-1.5">
                <Lock className="h-4 w-4" />{t(`Close Year ${year}`, `إقفال السنة ${year}`)}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Period", "الفترة")}</TableHead>
                <TableHead className="text-end">{t("Entries", "القيود")}</TableHead>
                <TableHead className="text-end">{t("Debit", "مدين")}</TableHead>
                <TableHead className="text-end">{t("Credit", "دائن")}</TableHead>
                <TableHead>{t("Status", "الحالة")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map(m => (
                <TableRow key={m.ym}>
                  <TableCell className="font-medium">{m.ym}</TableCell>
                  <TableCell className="text-end">{m.count}</TableCell>
                  <TableCell className="text-end">{fmtSAR(m.dr)}</TableCell>
                  <TableCell className="text-end">{fmtSAR(m.cr)}</TableCell>
                  <TableCell>
                    {m.status === "closed" ? (
                      <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />{t("Closed", "مقفلة")}</Badge>
                    ) : !m.balanced && m.count > 0 ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t("Unbalanced", "غير متوازنة")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("Open", "مفتوحة")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {m.status === "closed" ? (
                      <Button size="sm" variant="ghost" onClick={() => onReopen(m.ym)} disabled={!!yearRecord}>
                        <Unlock className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onClosePeriod(m.ym)} disabled={!m.balanced && m.count > 0}>
                        <Lock className="h-4 w-4 me-1" />{t("Close", "إقفال")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
