import { useEffect, useState } from "react";
import { Users, ShoppingBag, TrendingUp, Clock, Wallet, Trophy, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type Stats = {
  users: { total: number; today: number; week: number; month: number };
  orders: { total: number; today: number; week: number; pending: number };
  sales: { total: number; today: number; week: number };
  deposits: { pending: number; approvedTotal: number };
  topServices: { name: string; count: number }[];
};

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <Card className="p-5 bg-card/50 border-primary/15 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export default function StatsManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب الإحصاءات");
      setStats(await res.json());
    } catch (e: any) {
      setError(e?.message ?? "خطأ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );

  if (error) return (
    <Card className="p-6 text-center text-red-300 bg-red-500/5 border-red-500/20">{error}</Card>
  );

  if (!stats) return null;

  const maxCount = Math.max(...stats.topServices.map(s => s.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black neon-text">الإحصاءات العامة</h2>
          <p className="text-xs text-muted-foreground mt-0.5">نظرة شاملة على أداء الموقع</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 border-primary/30 hover:border-primary/60">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {/* Users */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">المستخدمون</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="إجمالي المستخدمين" value={stats.users.total} icon={Users} color="bg-blue-500/15 text-blue-300" />
          <StatCard label="مستخدمون جدد اليوم" value={stats.users.today} icon={Users} color="bg-green-500/15 text-green-300" />
          <StatCard label="مستخدمون جدد هذا الأسبوع" value={stats.users.week} icon={Users} color="bg-purple-500/15 text-purple-300" />
          <StatCard label="مستخدمون جدد هذا الشهر" value={stats.users.month} icon={Users} color="bg-pink-500/15 text-pink-300" />
        </div>
      </section>

      {/* Orders */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">الطلبات</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="إجمالي الطلبات" value={stats.orders.total} icon={ShoppingBag} color="bg-orange-500/15 text-orange-300" />
          <StatCard label="طلبات اليوم" value={stats.orders.today} icon={ShoppingBag} color="bg-yellow-500/15 text-yellow-300" />
          <StatCard label="طلبات هذا الأسبوع" value={stats.orders.week} icon={ShoppingBag} color="bg-amber-500/15 text-amber-300" />
          <StatCard label="طلبات معلقة" value={stats.orders.pending} icon={Clock} color="bg-red-500/15 text-red-300" sub="بانتظار المراجعة" />
        </div>
      </section>

      {/* Sales */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">المبيعات (TRY)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="إجمالي المبيعات" value={`${stats.sales.total.toFixed(2)} ₺`} icon={TrendingUp} color="bg-emerald-500/15 text-emerald-300" />
          <StatCard label="مبيعات اليوم" value={`${stats.sales.today.toFixed(2)} ₺`} icon={TrendingUp} color="bg-teal-500/15 text-teal-300" />
          <StatCard label="مبيعات هذا الأسبوع" value={`${stats.sales.week.toFixed(2)} ₺`} icon={TrendingUp} color="bg-cyan-500/15 text-cyan-300" />
        </div>
      </section>

      {/* Deposits */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">الإيداعات</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="إيداعات معلقة" value={stats.deposits.pending} icon={Clock} color="bg-red-500/15 text-red-300" sub="بانتظار الموافقة" />
          <StatCard label="إجمالي الإيداعات المقبولة" value={`${stats.deposits.approvedTotal.toFixed(2)}`} icon={Wallet} color="bg-violet-500/15 text-violet-300" />
        </div>
      </section>

      {/* Top Services */}
      {stats.topServices.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            أكثر الخدمات طلباً
          </h3>
          <Card className="p-5 bg-card/50 border-primary/15 space-y-3">
            {stats.topServices.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs font-black text-muted-foreground w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate">{s.name}</span>
                    <span className="text-xs font-black text-primary ms-2 shrink-0">{s.count} طلب</span>
                  </div>
                  <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-primary rounded-full transition-all"
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
