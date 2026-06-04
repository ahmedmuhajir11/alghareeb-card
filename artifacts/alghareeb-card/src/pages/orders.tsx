import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Clock, CheckCircle2, XCircle, LogIn, ShoppingBag, Calendar, Hash } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type OrderStatus = "pending" | "approved" | "completed" | "rejected" | "cancelled";

type Order = {
  id: number;
  itemName: string;
  packageName: string | null;
  targetId: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
};

function translatePkgName(name: string | null, t: (k: any) => string): string | null {
  if (!name) return null;
  const match = name.match(/^(\d[\d,]*)\s+(.+)$/);
  if (match) {
    const qty = match[1];
    const unit = match[2].trim();
    const key = `unit.${unit}` as Parameters<typeof t>[0];
    const translated = t(key) !== key ? t(key) : unit;
    return `${qty} ${translated}`;
  }
  return name;
}

export default function OrdersPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const STATUS_META: Record<string, { label: string; icon: any; classes: string }> = {
    pending:   { label: t('orders.pending'),   icon: Clock,         classes: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" },
    approved:  { label: t('orders.approved'),  icon: CheckCircle2,  classes: "bg-green-500/10 border-green-500/30 text-green-300" },
    completed: { label: t('orders.completed'), icon: CheckCircle2,  classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
    rejected:  { label: t('orders.rejected'),  icon: XCircle,       classes: "bg-red-500/10 border-red-500/30 text-red-300" },
    cancelled: { label: t('orders.cancelled'), icon: XCircle,       classes: "bg-gray-500/10 border-gray-500/30 text-gray-300" },
  };

  function formatDate(d: string) {
    try {
      return new Date(d).toLocaleString(lang === "ar" ? "ar-EG" : lang, {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/orders`, { credentials: "include" });
        if (!res.ok) throw new Error("فشل في جلب الطلبات");
        const data = await res.json();
        if (!cancelled) setOrders(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "خطأ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          <LogIn className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white mb-2">{t('orders.loginRequired')}</h2>
          <p className="text-muted-foreground text-sm">{t('orders.loginSub')}</p>
        </div>
        <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
          <Link href="/sign-in?returnUrl=/orders">{t('orders.loginBtn')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-black neon-text">{t('orders.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('orders.subtitle')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-red-300 bg-red-500/5 border-red-500/20">
          {error}
        </Card>
      ) : !orders || orders.length === 0 ? (
        <Card className="p-10 text-center bg-card/30 border-primary/20 neon-border">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-bold text-lg mb-1">{t('orders.none')}</p>
          <p className="text-sm text-muted-foreground mb-5">{t('orders.noneDesc')}</p>
          <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
            <Link href="/">{t('orders.browse')}</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const meta = STATUS_META[o.status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <Card key={o.id} className="p-4 bg-card/40 border-primary/15 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground">#{o.id}</span>
                    </div>
                    <h3 className="font-bold text-white truncate">{o.itemName}</h3>
                    {o.packageName && (
                      <p className="text-sm text-purple-300/80 mt-0.5">{translatePkgName(o.packageName, t)}</p>
                    )}
                    {o.targetId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('orders.targetId')}: <span dir="ltr" className="font-mono">{o.targetId}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${meta.classes}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    <div className="text-end">
                      <span className="font-black text-base text-primary">
                        {o.amount.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground ms-1">{o.currency}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
