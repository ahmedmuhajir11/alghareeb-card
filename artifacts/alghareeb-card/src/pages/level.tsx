import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Lock, Check, Loader2, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type LevelInfo = {
  key: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  color: string;
  minUsd: number;
  maxUsd: number | null;
  minUserCcy: number;
  maxUserCcy: number | null;
  status: "achieved" | "current" | "locked";
};

type LevelData = {
  currency: string;
  totalDepositsUsd: number;
  totalDepositsUserCcy: number;
  currentLevel: { key: string; nameAr: string; nameEn: string; emoji: string; color: string };
  nextLevel: { key: string; nameAr: string; nameEn: string; emoji: string; minUsd: number; minUserCcy: number } | null;
  progressToNext: number;
  amountToNextUsd: number;
  amountToNextUserCcy: number;
  allLevels: LevelInfo[];
};

function fmtNum(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export default function LevelPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);

  const { data, isLoading, error } = useQuery<LevelData>({
    queryKey: ["my-level"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/me/level`, { credentials: "include" });
      if (!res.ok) throw new Error(t('level.loadError'));
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
        <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">{t('level.loginPrompt')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('level.loginSub')}</p>
        <Link href="/sign-in">
          <Button className="w-full">{t('level.loginBtn')}</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-rose-400 text-center py-12 bg-rose-500/5 border border-rose-500/20 rounded-xl max-w-2xl mx-auto">
        {(error as Error)?.message || t('level.genericError')}
      </div>
    );
  }

  const ccy = data.currency;
  const decimals = ccy === "SYP" || ccy === "IQD" || ccy === "DZD" ? 0 : 2;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 border border-primary/30 bg-gradient-to-br from-purple-900/40 via-purple-700/20 to-purple-500/10 relative overflow-hidden">
        <div className="absolute top-2 start-2 text-7xl opacity-20 select-none">
          {data.currentLevel.emoji}
        </div>
        <div className="relative">
          <p className="text-xs font-semibold text-purple-200/80 mb-1">{t('level.currentLevel')}</p>
          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
            <span>{data.currentLevel.emoji}</span>
            <span style={{ color: data.currentLevel.color }} className="neon-text">
              {t('level.prefix')} {isRtlLang ? (data.currentLevel.nameAr || t(`level.${data.currentLevel.key}`)) : (data.currentLevel.nameEn || t(`level.${data.currentLevel.key}`) || data.currentLevel.nameAr)}
            </span>
          </h1>
          <p className="text-sm text-purple-100/80 mt-3 leading-relaxed">
            {data.nextLevel ? (
              <>
                {t('level.upgradeMsg')}{" "}
                <span className="font-bold text-white">{isRtlLang ? (data.nextLevel.nameAr || t(`level.${data.nextLevel.key}`)) : (data.nextLevel.nameEn || t(`level.${data.nextLevel.key}`) || data.nextLevel.nameAr)}</span>{" "}
                {t('level.upgradeMsg2')}
              </>
            ) : (
              <>{t('level.maxLevel')}</>
            )}
          </p>
        </div>
      </div>

      {/* Total deposits + progress */}
      <div className="rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 to-emerald-500/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-200/80 flex items-center gap-1.5">
            <ArrowDownCircle className="w-4 h-4" /> {t('level.totalDeposits')}
          </span>
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-2xl font-black text-emerald-300">
          {fmtNum(data.totalDepositsUserCcy, decimals)}{" "}
          <span className="text-xs font-semibold text-emerald-200/70">{ccy}</span>
        </p>

        {data.nextLevel && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {t('level.remaining')} {isRtlLang ? (data.nextLevel.nameAr || t(`level.${data.nextLevel.key}`)) : (data.nextLevel.nameEn || t(`level.${data.nextLevel.key}`) || data.nextLevel.nameAr)} {data.nextLevel.emoji}
              </span>
              <span className="font-bold text-primary">
                {data.progressToNext.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-purple-500 to-purple-300 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, data.progressToNext))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('level.toReachNext')}{" "}
              <span className="font-bold text-purple-300">
                {fmtNum(data.amountToNextUserCcy, decimals)} {ccy}
              </span>{" "}
              {t('level.toReachNext2')}
            </p>
          </div>
        )}
      </div>

      {/* All levels list */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 md:p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {t('level.allLevels')}
        </h2>
        <div className="space-y-3">
          {data.allLevels.map((lv) => {
            const isCurrent = lv.status === "current";
            const isAchieved = lv.status === "achieved";
            const isLocked = lv.status === "locked";

            return (
              <div
                key={lv.key}
                className={`rounded-xl p-4 border transition-all ${
                  isCurrent
                    ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                    : isAchieved
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/40 bg-muted/20 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl shrink-0">{lv.emoji}</span>
                    <div className="min-w-0">
                      <p
                        className={`font-bold text-base ${isCurrent ? "neon-text" : ""}`}
                        style={isCurrent ? { color: lv.color } : {}}
                      >
                        {t('level.prefix')} {isRtlLang ? (lv.nameAr || t(`level.${lv.key}`)) : (lv.nameEn || t(`level.${lv.key}`) || lv.nameAr)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lv.maxUserCcy === null
                          ? `${fmtNum(lv.minUserCcy, decimals)}+ ${ccy}`
                          : `${fmtNum(lv.minUserCcy, decimals)} - ${fmtNum(lv.maxUserCcy, decimals)} ${ccy}`}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isAchieved && (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                    {isCurrent && (
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/20 border border-primary/40 text-primary">
                        {t('level.current')}
                      </span>
                    )}
                    {isLocked && (
                      <div className="w-9 h-9 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center pt-2">
        <Link href="/payment-methods">
          <Button size="lg" className="gap-2">
            <ArrowDownCircle className="w-5 h-5" />
            {t('level.depositBtn')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
