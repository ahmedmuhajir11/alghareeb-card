import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ExternalLink, Clock, CheckCircle2, XCircle, Filter, RefreshCw, Download, ZoomIn, ZoomOut } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type DepositRow = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAccount: string | null;
  userCurrency: string | null;
  creditedAmount: number | null;
  paymentMethodName: string;
  amount: number;
  currency: string;
  receiptUrl: string | null;
  senderName: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
};

const STATUS_TABS = [
  { value: "pending", label: "بانتظار المراجعة", icon: Clock, color: "text-amber-400" },
  { value: "approved", label: "مقبولة", icon: CheckCircle2, color: "text-green-400" },
  { value: "rejected", label: "مرفوضة", icon: XCircle, color: "text-red-400" },
  { value: "all", label: "الكل", icon: Filter, color: "text-purple-400" },
];

export default function DepositsManager() {
  const [tab, setTab] = useState<string>("pending");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<DepositRow[]>({
    queryKey: ["/api/admin/deposits", tab],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/deposits?status=${tab}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json();
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action, adminNote }: { id: number; action: "approve" | "reject"; adminNote?: string }) => {
      const res = await fetch(`${API_BASE}/api/admin/deposits/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote, customMessage: adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "فشل");
      return data;
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "approve" ? "تمت الموافقة ✓" : "تم الرفض",
        description: (vars.action === "approve" ? "تم إضافة الرصيد إلى حساب المستخدم" : "تم رفض طلب الإيداع") + " · أُرسل إشعار للعميل",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ", description: err?.message ?? "فشلت العملية" });
    },
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold neon-text">طلبات الإيداع</h2>
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
          {data.map(d => <DepositCard key={d.id} d={d} executor={action} />)}
        </div>
      )}
    </div>
  );
}

function ReceiptViewer({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(url, { credentials: "include" });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "receipt" + (blob.type.includes("png") ? ".png" : ".jpg");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        صورة الإيصال
      </div>
      <div className={`relative border border-border/40 rounded-xl overflow-hidden bg-background/50 transition-all ${expanded ? "max-h-none" : "max-h-48"}`}>
        <img
          src={url}
          alt="إيصال"
          className={`w-full object-contain transition-all ${expanded ? "" : "max-h-48"}`}
          style={{ display: "block" }}
        />
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/90 to-transparent" />
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs flex-1"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          {expanded ? "تصغير" : "عرض كامل"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs flex-1"
          onClick={handleDownload}
        >
          <Download className="w-3.5 h-3.5" /> تحميل
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> فتح
          </Button>
        </a>
      </div>
    </div>
  );
}

function DepositCard({ d, executor }: { d: DepositRow; executor: any }) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const statusBadge = {
    pending: { label: "بانتظار المراجعة", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    approved: { label: "مقبولة ✓", cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    rejected: { label: "مرفوضة", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  }[d.status];

  return (
    <Card className="border-border/50 bg-card/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{d.userName || "بدون اسم"}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge.cls}`}>{statusBadge.label}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {d.userEmail} · رقم الحساب: <span className="font-mono">{d.userAccount}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              طريقة الدفع: <span className="text-foreground font-semibold">{d.paymentMethodName}</span>
            </div>
            {d.senderName && (
              <div className="text-xs text-muted-foreground">
                اسم المرسل: <span className="text-blue-300 font-semibold">{d.senderName}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              التاريخ: {new Date(d.createdAt).toLocaleString("ar")}
            </div>
          </div>
          <div className="text-left min-w-[120px] space-y-1.5">
            {d.creditedAmount != null && d.userCurrency && d.userCurrency !== d.currency ? (
              <>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">الإجمالي</div>
                  <div className="text-xl font-black text-green-400 leading-none">
                    {d.creditedAmount.toFixed(0)} <span className="text-sm font-semibold">{d.userCurrency}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">القيمة المرسلة</div>
                  <div className="text-sm font-bold text-foreground">
                    {d.amount.toFixed(2)} <span className="text-xs text-muted-foreground">{d.currency}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-muted-foreground mb-0.5">القيمة المرسلة</div>
                <div className="text-2xl font-black text-primary leading-none">
                  {d.amount.toFixed(2)} <span className="text-sm font-semibold text-muted-foreground">{d.currency}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {d.receiptUrl && (
          <ReceiptViewer url={d.receiptUrl} />
        )}

        {d.adminNote && (
          <div className="text-xs bg-background/40 border border-border/30 rounded p-2">
            <span className="text-muted-foreground">ملاحظة الإدارة:</span> {d.adminNote}
          </div>
        )}

        {d.status === "pending" && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            {showNote && (
              <Input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="bg-background/50 h-9 text-sm"
              />
            )}
            <div className="flex gap-2">
              <Button
                disabled={executor.isPending}
                onClick={() => executor.mutate({ id: d.id, action: "approve", adminNote: note || undefined })}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 gap-1.5"
                size="sm"
              >
                <Check className="w-4 h-4" /> موافقة وإضافة الرصيد
              </Button>
              <Button
                disabled={executor.isPending}
                onClick={() => executor.mutate({ id: d.id, action: "reject", adminNote: note || undefined })}
                variant="destructive"
                className="flex-1 h-9 gap-1.5"
                size="sm"
              >
                <X className="w-4 h-4" /> رفض
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowNote(s => !s)}
              >
                {showNote ? "إخفاء" : "ملاحظة"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
