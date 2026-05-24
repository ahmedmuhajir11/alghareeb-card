import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, CheckCircle2, XCircle, Filter, RefreshCw, Package, User as UserIcon, Copy, Zap } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type OrderRow = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAccount: string | null;
  itemName: string;
  packageName: string | null;
  targetId: string | null;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected" | "completed";
  notes: string | null;
  createdAt: string;
};

const STATUS_TABS = [
  { value: "pending", label: "بانتظار التنفيذ", icon: Clock, color: "text-amber-400" },
  { value: "completed", label: "مشحونة تلقائياً", icon: Zap, color: "text-emerald-400" },
  { value: "approved", label: "منفّذة يدوياً", icon: CheckCircle2, color: "text-green-400" },
  { value: "rejected", label: "مرفوضة (مُسترجعة)", icon: XCircle, color: "text-red-400" },
  { value: "all", label: "الكل", icon: Filter, color: "text-purple-400" },
];

export default function OrdersManager() {
  const [tab, setTab] = useState<string>("pending");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<OrderRow[]>({
    queryKey: ["/api/admin/orders", tab],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/orders?status=${tab}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json();
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action, customMessage }: { id: number; action: "approve" | "reject"; customMessage?: string }) => {
      const res = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, customMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "فشل");
      return data;
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "approve" ? "تم تنفيذ الطلب ✓" : "تم رفض الطلب وإرجاع الرصيد",
        description: "تم إرسال إشعار للعميل تلقائياً",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ", description: err?.message ?? "فشلت العملية" });
    },
  });

  const retryCharge = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/admin/orders/${id}/retry-charge`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "فشل الشحن التلقائي");
      return data;
    },
    onSuccess: (data) => {
      if (data?.status === "completed") {
        toast({ title: "✅ تم الشحن التلقائي بنجاح", description: "تم تحديث حالة الطلب إلى مكتمل" });
      } else {
        toast({ variant: "destructive", title: "فشل الشحن التلقائي", description: data?.error ?? "تحقق من ملاحظة API" });
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "فشل الاتصال بـ API", description: err?.message });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold neon-text">طلبات الشحن</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {STATUS_TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? t.color : ""}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card/50 rounded-xl animate-pulse" />)}
        </div>
      ) : !data?.length ? (
        <div className="text-center py-16 text-muted-foreground bg-card/30 rounded-2xl border border-border/40">
          لا توجد طلبات في هذا التصنيف
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(o => <OrderCard key={o.id} o={o} executor={action} retryCharge={retryCharge} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o, executor, retryCharge }: { o: OrderRow; executor: any; retryCharge: any }) {
  const { toast } = useToast();
  const [showMsg, setShowMsg] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const statusBadgeMap: Record<string, { label: string; cls: string }> = {
    pending:   { label: "بانتظار التنفيذ",         cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    approved:  { label: "منفّذة يدوياً ✓",          cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    completed: { label: "مشحونة تلقائياً ⚡",       cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    rejected:  { label: "مرفوضة (تم إرجاع الرصيد)", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  };
  const statusBadge = statusBadgeMap[o.status] ?? statusBadgeMap.pending;
  const hasApiNote = o.notes && o.notes.includes("فشل");

  async function copyTargetId() {
    if (!o.targetId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(o.targetId);
      } else {
        const ta = document.createElement("textarea");
        ta.value = o.targetId;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast({ title: "تم النسخ ✓", description: `تم نسخ معرّف العميل: ${o.targetId}` });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ variant: "destructive", title: "تعذّر النسخ", description: "اضغط مطوّلاً لتحديد المعرّف يدوياً" });
    }
  }

  return (
    <Card className="border-border/50 bg-card/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Package className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-bold text-base">{o.itemName}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge.cls}`}>{statusBadge.label}</span>
            </div>
            {o.packageName && (
              <div className="text-sm text-foreground/80 mr-6">
                الباقة: <span className="font-semibold text-primary">{o.packageName}</span>
              </div>
            )}
            {o.targetId && (
              <div className="bg-background/60 border border-primary/30 rounded-lg p-2.5 mr-6 space-y-1.5">
                <div className="text-xs text-muted-foreground">معرّف العميل (ID):</div>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-base text-foreground select-all flex-1 break-all">
                    {o.targetId}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={copyTargetId}
                    className={`h-9 px-3 gap-1.5 flex-shrink-0 ${copied ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""}`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "تم النسخ" : "نسخ"}
                  </Button>
                </div>
              </div>
            )}
            {o.notes && (
              <div className={`rounded-lg px-3 py-2 mr-0 text-xs leading-relaxed ${o.status === "completed" && o.notes.includes("تم الشحن تلقائياً") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300"}`}>
                <span className="font-bold">ملاحظة API: </span>{o.notes}
              </div>
            )}
            <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserIcon className="w-3 h-3" />
                <span className="font-semibold text-foreground">{o.userName || "بدون اسم"}</span>
                {o.userEmail && <span>· {o.userEmail}</span>}
              </div>
              {o.userAccount && (
                <div className="text-xs text-muted-foreground">
                  رقم الحساب: <span className="font-mono">{o.userAccount}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                التاريخ: {new Date(o.createdAt).toLocaleString("ar")}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-2xl font-black text-primary">{o.amount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{o.currency}</div>
          </div>
        </div>

        {o.status === "pending" && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            {hasApiNote && (
              <Button
                disabled={retryCharge.isPending}
                onClick={() => retryCharge.mutate(o.id)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-9 gap-1.5"
                size="sm"
              >
                <Zap className="w-4 h-4" />
                {retryCharge.isPending ? "جاري الشحن..." : "إعادة الشحن التلقائي"}
              </Button>
            )}
            {showMsg && (
              <Input
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="رسالة مخصصة للعميل (اختياري)"
                className="bg-background/50 h-9 text-sm"
                maxLength={200}
              />
            )}
            <div className="flex gap-2">
              <Button
                disabled={executor.isPending}
                onClick={() => executor.mutate({ id: o.id, action: "approve", customMessage: customMessage.trim() || undefined })}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 gap-1.5"
                size="sm"
              >
                <Check className="w-4 h-4" /> تنفيذ يدوي
              </Button>
              <Button
                disabled={executor.isPending}
                onClick={() => {
                  if (confirm("هل أنت متأكد من رفض الطلب؟ سيتم إرجاع الرصيد إلى العميل.")) {
                    executor.mutate({ id: o.id, action: "reject", customMessage: customMessage.trim() || undefined });
                  }
                }}
                variant="destructive"
                className="flex-1 h-9 gap-1.5"
                size="sm"
              >
                <X className="w-4 h-4" /> رفض وإرجاع الرصيد
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowMsg(s => !s)}
                title="إضافة رسالة مخصصة للعميل"
              >
                {showMsg ? "إخفاء" : "رسالة"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
