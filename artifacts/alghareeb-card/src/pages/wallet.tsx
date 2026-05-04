import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Wallet as WalletIcon, ShoppingBag, ArrowDownCircle, Plus, ArrowUpCircle, RefreshCcw, Loader2, Trophy, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type LevelSummary = {
  currentLevel: { nameAr: string; emoji: string; color: string };
  nextLevel: { nameAr: string; emoji: string } | null;
  progressToNext: number;
  amountToNextUserCcy: number;
  currency: string;
};

type WalletTransaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
};

type WalletData = {
  balance: number;
  currency: string;
  totalPurchases: number;
  totalDeposits: number;
  transactions: WalletTransaction[];
};

function StatCard({
  icon,
  label,
  value,
  currency,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  currency: string;
  tone?: "primary" | "green" | "blue";
}) {
  const tones: Record<string, string> = {
    primary: "from-purple-600/15 to-purple-500/5 border-purple-500/30 text-purple-300",
    green: "from-emerald-600/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300",
    blue: "from-sky-600/15 to-sky-500/5 border-sky-500/30 text-sky-300",
  };
  return (
    <div className={`rounded-2xl p-5 border bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="text-2xl font-black">
        {value.toFixed(2)}
        <span className="text-xs font-semibold text-muted-foreground mr-1.5">{currency}</span>
      </p>
    </div>
  );
}

const TYPE_LABELS: Record<string, { label: string; sign: "+" | "-"; color: string; icon: React.ReactNode }> = {
  deposit: { label: "إيداع", sign: "+", color: "text-emerald-400", icon: <ArrowDownCircle className="w-4 h-4" /> },
  refund: { label: "استرداد", sign: "+", color: "text-emerald-400", icon: <RefreshCcw className="w-4 h-4" /> },
  purchase: { label: "شراء", sign: "-", color: "text-rose-400", icon: <ArrowUpCircle className="w-4 h-4" /> },
  withdrawal: { label: "سحب", sign: "-", color: "text-rose-400", icon: <ArrowUpCircle className="w-4 h-4" /> },
  transfer: { label: "تحويل", sign: "-", color: "text-rose-400", icon: <ArrowUpCircle className="w-4 h-4" /> },
};

export default function WalletPage() {
  const { isSignedIn, isLoaded } = useAuth();

  const { data, isLoading, error } = useQuery<WalletData>({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/wallet`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المحفظة");
      return res.json();
    },
    enabled: isSignedIn,
  });

  const { data: levelData } = useQuery<LevelSummary>({
    queryKey: ["my-level"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/me/level`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المستوى");
      return res.json();
    },
    enabled: isSignedIn,
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <WalletIcon className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">سجّل الدخول لعرض محفظتك</h1>
        <p className="text-muted-foreground text-sm mb-6">تابع رصيدك وعملياتك بسهولة</p>
        <Link href="/sign-in">
          <Button className="w-full">تسجيل الدخول</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black neon-text">محفظتي</h1>
          <p className="text-muted-foreground text-sm mt-1">رصيدك ومعاملاتك في مكان واحد</p>
        </div>
        <Link href="/payment-methods">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            إضافة رصيد
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-rose-400 text-center py-6 bg-rose-500/5 border border-rose-500/20 rounded-xl">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {levelData && (
            <Link href="/level">
              <div className="rounded-2xl p-4 border border-primary/30 bg-gradient-to-l from-purple-900/40 via-purple-700/15 to-purple-500/5 cursor-pointer hover:border-primary/60 transition-all">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-3xl shrink-0">{levelData.currentLevel.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-200/80">مستواك الحالي</p>
                      <p
                        className="font-black text-base"
                        style={{ color: levelData.currentLevel.color }}
                      >
                        {levelData.currentLevel.nameAr}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary shrink-0">
                    <Trophy className="w-4 h-4" />
                    <span>التفاصيل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
                {levelData.nextLevel && (
                  <>
                    <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-purple-500 to-purple-300 transition-all"
                        style={{ width: `${Math.min(100, Math.max(2, levelData.progressToNext))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                      متبقي{" "}
                      <span className="font-bold text-purple-300">
                        {levelData.amountToNextUserCcy.toFixed(2)} {levelData.currency}
                      </span>{" "}
                      للوصول إلى {levelData.nextLevel.nameAr} {levelData.nextLevel.emoji}
                    </p>
                  </>
                )}
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<WalletIcon className="w-5 h-5" />}
              label="رصيدي الحالي"
              value={data.balance}
              currency={data.currency}
              tone="primary"
            />
            <StatCard
              icon={<ShoppingBag className="w-5 h-5" />}
              label="إجمالي المشتريات"
              value={data.totalPurchases}
              currency={data.currency}
              tone="blue"
            />
            <StatCard
              icon={<ArrowDownCircle className="w-5 h-5" />}
              label="إجمالي الوارد"
              value={data.totalDeposits}
              currency={data.currency}
              tone="green"
            />
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg font-bold mb-4">آخر العمليات</h2>
            {data.transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                لا توجد معاملات بعد
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {data.transactions.map((t) => {
                  const meta = TYPE_LABELS[t.type] ?? {
                    label: t.type,
                    sign: "-" as const,
                    color: "text-muted-foreground",
                    icon: <ArrowUpCircle className="w-4 h-4" />,
                  };
                  const date = new Date(t.createdAt).toLocaleString("ar-EG", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  return (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.description || meta.label}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold whitespace-nowrap ${meta.color}`}>
                        {meta.sign}{t.amount.toFixed(2)}{" "}
                        <span className="text-xs font-semibold opacity-80">{data.currency}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
