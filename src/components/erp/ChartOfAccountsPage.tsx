import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAccounts, useJournal, accountBalance, fmtSAR } from "@/lib/erp-store";
import { usePendingBankCodes } from "@/lib/bank-recon-store";
import { ListTree, Search } from "lucide-react";

const TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  asset: { en: "Assets", ar: "الأصول" },
  liability: { en: "Liabilities", ar: "الخصوم" },
  equity: { en: "Equity", ar: "حقوق الملكية" },
  revenue: { en: "Revenue", ar: "الإيرادات" },
  expense: { en: "Expenses", ar: "المصروفات" },
};

export function ChartOfAccountsPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [entries] = useJournal();
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filtered = q
      ? accounts.filter((a) => a.code.includes(q) || a.name_en.toLowerCase().includes(q.toLowerCase()) || a.name_ar.includes(q))
      : accounts;
    return ["asset", "liability", "equity", "revenue", "expense"].map((tp) => ({
      type: tp,
      items: filtered.filter((a) => a.type === tp),
    }));
  }, [accounts, q]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ListTree className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Chart of Accounts", "دليل الحسابات")}</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} {t("accounts", "حساب")}</p>
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input className="ps-9" placeholder={t("Search by code or name…", "بحث بالرمز أو الاسم…")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {grouped.map((g) => g.items.length > 0 && (
          <Card key={g.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{lang === "ar" ? TYPE_LABEL[g.type].ar : TYPE_LABEL[g.type].en}</CardTitle>
              <CardDescription>{g.items.length} {t("accounts", "حساب")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {g.items.map((a) => {
                      const bal = accountBalance(a.code, entries);
                      return (
                        <tr key={a.code} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs w-16">{a.code}</td>
                          <td className="px-3 py-2">{lang === "ar" ? a.name_ar : a.name_en}</td>
                          <td className="px-3 py-2 text-end font-mono">
                            <Badge variant="outline">{fmtSAR(bal.balance)}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
