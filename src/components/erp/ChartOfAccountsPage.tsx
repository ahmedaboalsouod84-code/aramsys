import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccounts, useJournal, accountBalance, fmtSAR, type Account } from "@/lib/erp-store";
import { usePendingBankCodes } from "@/lib/bank-recon-store";
import { ListTree, Search, ChevronRight, ChevronDown } from "lucide-react";

const TYPE_LABEL: Record<string, { en: string; ar: string; color: string }> = {
  asset: { en: "Assets", ar: "الأصول", color: "text-emerald-600" },
  liability: { en: "Liabilities", ar: "الالتزامات", color: "text-rose-600" },
  equity: { en: "Equity", ar: "حقوق الملكية", color: "text-violet-600" },
  revenue: { en: "Revenue", ar: "الإيرادات", color: "text-sky-600" },
  expense: { en: "Expenses", ar: "المصروفات", color: "text-amber-600" },
};

const LEVEL_LABEL: Record<string, { en: string; ar: string }> = {
  root: { en: "Root", ar: "رئيسي" },
  group: { en: "Group", ar: "تجميعي" },
  detail: { en: "Postable", ar: "تفصيلي" },
  contra: { en: "Contra", ar: "مقابل" },
};

type Node = Account & { children: Node[]; rolledBalance: number };

function buildTree(accounts: Account[], balances: Map<string, number>): Node[] {
  const map = new Map<string, Node>();
  accounts.forEach((a) => map.set(a.code, { ...a, children: [], rolledBalance: balances.get(a.code) || 0 }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent && map.has(n.parent)) map.get(n.parent)!.children.push(n);
    else roots.push(n);
  });
  // Roll balances bottom-up.
  const roll = (n: Node): number => {
    if (n.children.length === 0) return n.rolledBalance;
    const sum = n.children.reduce((s, c) => s + roll(c), 0);
    n.rolledBalance = (balances.get(n.code) || 0) + sum;
    return n.rolledBalance;
  };
  roots.forEach(roll);
  return roots;
}

export function ChartOfAccountsPage() {
  const { t, lang } = useI18n();
  const [accounts] = useAccounts();
  const [entries] = useJournal();
  const pending = usePendingBankCodes();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(accounts.filter((a) => a.level === "root" || a.level === "group").map((a) => a.code)));

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    accounts.forEach((a) => m.set(a.code, accountBalance(a.code, entries).balance));
    return m;
  }, [accounts, entries]);

  const tree = useMemo(() => buildTree(accounts, balances), [accounts, balances]);

  const filterMatch = (n: Node): boolean => {
    if (!q) return true;
    const term = q.toLowerCase();
    if (n.code.includes(term) || n.name_ar.includes(q) || n.name_en.toLowerCase().includes(term)) return true;
    return n.children.some(filterMatch);
  };

  const toggle = (code: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  const stats = useMemo(() => {
    const byLevel = { root: 0, group: 0, detail: 0, contra: 0, none: 0 };
    accounts.forEach((a) => byLevel[(a.level || "none") as keyof typeof byLevel]++);
    return byLevel;
  }, [accounts]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ListTree className="h-6 w-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Chart of Accounts", "دليل الحسابات")}</h1>
          <p className="text-sm text-muted-foreground">
            {accounts.length} {t("accounts", "حساب")} · {stats.detail} {t("postable", "تفصيلي")} · {stats.group} {t("groups", "تجميعي")} · {stats.contra} {t("contra", "مقابل")}
          </p>
        </div>
        <Badge variant="outline">{t("ZATCA-compliant", "متوافق ZATCA")}</Badge>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input className="ps-9" placeholder={t("Search by code or name…", "بحث بالرمز أو الاسم…")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="grid grid-cols-12 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
          <div className="col-span-6">{t("Account", "الحساب")}</div>
          <div className="col-span-2">{t("Type", "النوع")}</div>
          <div className="col-span-2">{t("Level", "المستوى")}</div>
          <div className="col-span-2 text-end">{t("Balance (rolled)", "الرصيد")}</div>
        </div>
        <div>
          {tree.filter(filterMatch).map((n) => (
            <TreeRow key={n.code} node={n} depth={0} expanded={expanded} toggle={toggle} lang={lang} pending={pending} filterMatch={filterMatch} q={q} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  node, depth, expanded, toggle, lang, pending, filterMatch, q,
}: {
  node: Node; depth: number; expanded: Set<string>; toggle: (c: string) => void;
  lang: string; pending: Set<string>; filterMatch: (n: Node) => boolean; q: string;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.code) || !!q;
  const isPending = pending.has(node.code);
  const t = TYPE_LABEL[node.type];
  const lvl = LEVEL_LABEL[node.level || "detail"];
  const postable = node.level === "detail" || node.level === "contra" || node.level === undefined;

  return (
    <>
      <div
        className={`grid grid-cols-12 items-center px-3 py-1.5 text-sm border-t hover:bg-muted/30 ${isPending ? "bg-amber-50/40 dark:bg-amber-950/10" : ""} ${!postable ? "font-medium" : ""}`}
        style={{ paddingInlineStart: `${depth * 18 + 12}px` }}
      >
        <div className="col-span-6 flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => toggle(node.code)}>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          ) : <span className="w-5" />}
          <span className="font-mono text-xs text-muted-foreground shrink-0">{node.code}</span>
          <span className="truncate">{lang === "ar" ? node.name_ar : node.name_en}</span>
          {isPending && <Badge variant="outline" className="text-[10px]">{lang === "ar" ? "معلق" : "Pending"}</Badge>}
        </div>
        <div className={`col-span-2 text-xs ${t.color}`}>{lang === "ar" ? t.ar : t.en}</div>
        <div className="col-span-2 text-xs text-muted-foreground">
          <Badge variant={postable ? "outline" : "secondary"} className="text-[10px]">{lang === "ar" ? lvl.ar : lvl.en}</Badge>
        </div>
        <div className="col-span-2 text-end font-mono text-xs">{fmtSAR(node.rolledBalance)}</div>
      </div>
      {isOpen && node.children.filter(filterMatch).map((c) => (
        <TreeRow key={c.code} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} lang={lang} pending={pending} filterMatch={filterMatch} q={q} />
      ))}
    </>
  );
}
