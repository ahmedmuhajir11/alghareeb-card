import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy, Check, Ban, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

type BanRow = {
  id: number;
  ipAddress: string;
  scope: string;
  reason: string | null;
  bannedBy: string;
  bannedAt: string;
  unbannedAt: string | null;
  unbannedBy: string | null;
};

type Detail = {
  ipAddress: string;
  profile: {
    country: string | null;
    countryCode: string | null;
    city: string | null;
    isProxyOrVpn: boolean | null;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  isWhitelisted: boolean;
  whitelist: { reason: string | null; addedBy: string; createdAt: string } | null;
  activeBans: BanRow[];
  banHistory: BanRow[];
  stats: { total: number; failed: number; firstEventAt: string | null; lastEventAt: string | null };
  eventsByType: { eventType: string; count: number }[];
  accounts: {
    userId: number | null;
    name: string;
    email: string | null;
    phone: string | null;
    accountNumber: string;
    eventCount: number;
    lastSeenAt: string;
  }[];
  recentEvents: {
    id: number;
    eventType: string;
    success: boolean;
    orderId: number | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: string;
    userId: number | null;
    userName: string | null;
    accountNumber: string | null;
  }[];
};

type Action = "ban" | "unban" | "whitelist" | "unwhitelist";

const EVENT_LABELS: Record<string, string> = {
  register: "إنشاء حساب",
  login: "تسجيل دخول",
  login_failed: "دخول فاشل",
  logout: "تسجيل خروج",
  order_create: "إنشاء طلب",
  order_create_failed: "فشل إنشاء طلب",
  order_complete: "إتمام طلب",
  deposit_request: "طلب إيداع",
};

const SCOPE_LABELS: Record<string, string> = {
  all: "كل العمليات",
  login: "تسجيل الدخول",
  register: "إنشاء الحسابات",
  orders: "الطلبات",
};

const OK_TEXT: Record<Action, string> = {
  ban: "تم حظر العنوان",
  unban: "تم رفع الحظر",
  whitelist: "تمت إضافته إلى القائمة الموثوقة",
  unwhitelist: "تمت إزالته من القائمة الموثوقة",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function metaReason(m: unknown): string | null {
  if (m && typeof m === "object" && "reason" in m) {
    const r = (m as Record<string, unknown>).reason;
    return typeof r === "string" ? r : null;
  }
  return null;
}

export default function IpDetailPanel({ ip, onClose }: { ip: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState("all");
  const [reason, setReason] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const detailQuery = useQuery<Detail>({
    queryKey: ["admin-ip-security-detail", ip],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/ip-security/detail?ip=${encodeURIComponent(ip)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل تحميل تفاصيل العنوان");
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (p: { action: Action; body: Record<string, unknown> }) => {
      const res = await fetch(`${API_BASE}/admin/ip-security/${p.action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p.body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "فشلت العملية");
      return data;
    },
    onSuccess: (_d, vars) => {
      setMsg({ type: "ok", text: OK_TEXT[vars.action] });
      if (vars.action === "ban") {
        setShowBanForm(false);
        setReason("");
      }
      qc.invalidateQueries({ queryKey: ["admin-ip-security-detail", ip] });
      qc.invalidateQueries({ queryKey: ["admin-ip-security-ips"] });
      qc.invalidateQueries({ queryKey: ["admin-ip-security-overview"] });
    },
    onError: (e: Error) => setMsg({ type: "err", text: e.message }),
  });

  const busy = actionMutation.isPending;
  const d = detailQuery.data;
  const isBanned = (d?.activeBans.length ?? 0) > 0;

  function run(action: Action, body: Record<string, unknown>) {
    setMsg(null);
    actionMutation.mutate({ action, body });
  }

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMsg({ type: "err", text: "تعذر النسخ" });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono" dir="ltr">{ip}</span>
            <button type="button" onClick={copyIp} aria-label="نسخ العنوان" className="text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            {isBanned && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">محظور</span>
            )}
            {d?.isWhitelisted && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">موثوق</span>
            )}
            {d?.profile?.isProxyOrVpn && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">VPN/Proxy محتمل</span>
            )}
          </DialogTitle>
          <DialogDescription>النشاط والحسابات المرتبطة بهذا العنوان</DialogDescription>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : detailQuery.error ? (
          <p className="text-center text-rose-400 py-8 text-sm">{(detailQuery.error as Error).message}</p>
        ) : d ? (
          <div className="space-y-5">
            {msg && (
              <p className={`text-xs rounded-lg px-3 py-2 border ${msg.type === "ok" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10"}`}>
                {msg.text}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {d.profile?.country ? `${d.profile.country}${d.profile.city ? " — " + d.profile.city : ""}` : "الموقع غير معروف"}
              {" · "}أول ظهور: {fmtDate(d.profile?.firstSeenAt)}
              {" · "}آخر نشاط: {fmtDate(d.profile?.lastSeenAt)}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-primary">{d.stats.total}</p>
                <p className="text-[11px] text-muted-foreground">عملية</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">{d.stats.failed}</p>
                <p className="text-[11px] text-muted-foreground">فاشلة</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-400">{d.accounts.length}</p>
                <p className="text-[11px] text-muted-foreground">حساب</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isBanned ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unban", { ip })} className="gap-1.5">
                  <Unlock className="w-4 h-4" /> رفع الحظر
                </Button>
              ) : !d.isWhitelisted ? (
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => setShowBanForm(v => !v)} className="gap-1.5">
                  <Ban className="w-4 h-4" /> حظر العنوان
                </Button>
              ) : null}
              {d.isWhitelisted ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unwhitelist", { ip })} className="gap-1.5">
                  <ShieldOff className="w-4 h-4" /> إزالة من الموثوقة
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("whitelist", { ip })} className="gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> إضافة للموثوقة
                </Button>
              )}
              {busy && <Loader2 className="w-4 h-4 animate-spin text-primary self-center" />}
            </div>

            {showBanForm && !isBanned && !d.isWhitelisted && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-3 space-y-2">
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                >
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <Input dir="rtl" placeholder="سبب الحظر (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => run("ban", { ip, scope, reason })}>
                  تأكيد الحظر
                </Button>
              </div>
            )}

            <div>
              <p className="text-sm font-bold mb-2">الحسابات المرتبطة ({d.accounts.length})</p>
              {d.accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد حسابات مرتبطة</p>
              ) : (
                <div className="space-y-1.5">
                  {d.accounts.map(a => (
                    <div key={a.userId ?? a.accountNumber} className="bg-muted/30 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-bold">{a.name} <span className="font-mono text-muted-foreground" dir="ltr">#{a.accountNumber}</span></p>
                        <p className="text-muted-foreground" dir="ltr">{a.email ?? a.phone ?? "—"}</p>
                      </div>
                      <div className="text-muted-foreground text-left">
                        <p>{a.eventCount} عملية</p>
                        <p>{fmtDate(a.lastSeenAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {d.eventsByType.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.eventsByType.map(t => (
                  <span key={t.eventType} className="text-[11px] px-2 py-1 rounded-full bg-muted/40 text-muted-foreground">
                    {EVENT_LABELS[t.eventType] ?? t.eventType}: <span className="font-bold text-foreground">{t.count}</span>
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm font-bold mb-2">آخر العمليات</p>
              {d.recentEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد عمليات</p>
              ) : (
                <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden">
                  {d.recentEvents.map(ev => (
                    <div key={ev.id} className="px-3 py-2 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold ${ev.success ? "" : "text-rose-400"}`}>
                          {EVENT_LABELS[ev.eventType] ?? ev.eventType}{ev.success ? "" : " (فشل)"}
                        </span>
                        <span className="text-muted-foreground">{fmtDate(ev.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground">
                        {ev.userName ? `${ev.userName} #${ev.accountNumber}` : "بدون حساب"}
                        {ev.orderId ? ` · طلب ${ev.orderId}` : ""}
                        {metaReason(ev.metadata) ? ` · ${metaReason(ev.metadata)}` : ""}
                      </p>
                      {ev.userAgent && (
                        <p className="text-[10px] text-muted-foreground/70 truncate" dir="ltr" title={ev.userAgent}>{ev.userAgent}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {d.banHistory.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-2">سجل الحظر السابق</p>
                <div className="space-y-1.5">
                  {d.banHistory.map(b => (
                    <div key={b.id} className="bg-muted/30 rounded-lg px-3 py-2 text-xs">
                      <p>{SCOPE_LABELS[b.scope] ?? b.scope}{b.reason ? ` — ${b.reason}` : ""}</p>
                      <p className="text-muted-foreground">{fmtDate(b.bannedAt)} ← {fmtDate(b.unbannedAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
