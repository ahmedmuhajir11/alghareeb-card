import { useState } from "react";
import IpDetailPanel from "./IpDetailPanel";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, Globe, Ban, AlertTriangle, Users, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

type Overview = {
  totalActiveIps: number;
  failedLogins24h: number;
  bannedIpsCount: number;
  topActiveIps: { ipAddress: string; eventCount: number }[];
  topMultiAccountIps: { ipAddress: string; accountCount: number }[];
};

type IpRow = {
  ipAddress: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  isProxyOrVpn: boolean | null;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  accountCount: number;
  isBanned: boolean;
  isWhitelisted: boolean;
};

type PagedIps = { data: IpRow[]; total: number; page: number; pageSize: number; totalPages: number };

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function IpSecurityManager() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  const overviewQuery = useQuery<Overview>({
    queryKey: ["admin-ip-security-overview"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/ip-security/overview`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل الإحصائيات");
      return res.json();
    },
  });

  const ipsQuery = useQuery<PagedIps>({
    queryKey: ["admin-ip-security-ips", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`${API_BASE}/admin/ip-security/ips?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل قائمة عناوين IP");
      return res.json();
    },
  });

  const ips = ipsQuery.data?.data ?? [];
  const totalIps = ipsQuery.data?.total ?? 0;
  const totalPages = ipsQuery.data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">مراقبة وحماية IP</h2>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Globe className="w-3.5 h-3.5" /> إجمالي عناوين IP
          </div>
          <p className="text-2xl font-bold text-primary">
            {overviewQuery.isLoading ? "…" : overviewQuery.data?.totalActiveIps ?? 0}
          </p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> محاولات دخول فاشلة (24 س)
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {overviewQuery.isLoading ? "…" : overviewQuery.data?.failedLogins24h ?? 0}
          </p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Ban className="w-3.5 h-3.5" /> عناوين محظورة
          </div>
          <p className="text-2xl font-bold text-red-400">
            {overviewQuery.isLoading ? "…" : overviewQuery.data?.bannedIpsCount ?? 0}
          </p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> IPs بحسابات متعددة
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {overviewQuery.isLoading ? "…" : overviewQuery.data?.topMultiAccountIps?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Top lists */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-sm font-bold mb-3">أكثر عناوين IP نشاطاً</p>
          {(overviewQuery.data?.topActiveIps ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد بيانات بعد</p>
          ) : (
            <div className="space-y-1.5">
              {overviewQuery.data!.topActiveIps.map(row => (
                <div key={row.ipAddress} role="button" tabIndex={0} onClick={() => setSelectedIp(row.ipAddress)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIp(row.ipAddress); } }} className="flex items-center justify-between text-xs cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors">
                  <span className="font-mono" dir="ltr">{row.ipAddress}</span>
                  <span className="text-muted-foreground">{row.eventCount} عملية</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-sm font-bold mb-3">أكثر عناوين IP ارتباطاً بحسابات متعددة</p>
          {(overviewQuery.data?.topMultiAccountIps ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد بيانات بعد — طبيعي جداً؛ لا يعني بالضرورة احتيال (شبكة مشتركة، واي فاي عام، ...)</p>
          ) : (
            <div className="space-y-1.5">
              {overviewQuery.data!.topMultiAccountIps.map(row => (
                <div key={row.ipAddress} role="button" tabIndex={0} onClick={() => setSelectedIp(row.ipAddress)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIp(row.ipAddress); } }} className="flex items-center justify-between text-xs cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors">
                  <span className="font-mono" dir="ltr">{row.ipAddress}</span>
                  <span className="text-muted-foreground">{row.accountCount} حساب</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          dir="rtl"
          placeholder="ابحث بعنوان IP، أو بالبريد/رقم الحساب/اسم مستخدم لعرض عناوينه"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* IP list */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-sm font-bold">قائمة عناوين IP {ipsQuery.data ? `(${totalIps})` : ""}</p>
        </div>
        {ipsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : ipsQuery.error ? (
          <p className="text-center text-rose-400 py-8 text-sm">{(ipsQuery.error as Error).message}</p>
        ) : ips.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">لا يوجد نتائج</p>
        ) : (
          <div className="divide-y divide-border/40">
            {ips.map(row => (
              <div key={row.ipAddress} role="button" tabIndex={0} onClick={() => setSelectedIp(row.ipAddress)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIp(row.ipAddress); } }} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap gap-y-2 cursor-pointer hover:bg-muted/40 transition-colors">
                <div className="min-w-[55%]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm" dir="ltr">{row.ipAddress}</span>
                    {row.isBanned && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">محظور</span>
                    )}
                    {row.isWhitelisted && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">موثوق</span>
                    )}
                    {row.isProxyOrVpn && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">VPN/Proxy محتمل</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {row.country ? `${row.country}${row.city ? " — " + row.city : ""}` : "الموقع غير معروف بعد"}
                    {" · "}آخر نشاط: {fmtDate(row.lastSeenAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span>{row.eventCount} عملية</span>
                  <span>{row.accountCount} حساب</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedIp && (
        <IpDetailPanel key={selectedIp} ip={selectedIp} onClose={() => setSelectedIp(null)} />
      )}
      {/* Pagination */}
      {!ipsQuery.isLoading && totalIps > 0 && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="gap-1.5">
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            الصفحة <span className="font-bold text-foreground">{page}</span> من <span className="font-bold text-foreground">{totalPages}</span>
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="gap-1.5">
            التالي <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
