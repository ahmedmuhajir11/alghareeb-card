import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { cleanPlayerId } from "@/lib/order-utils";
import {
  CheckCircle2, XCircle, Clock, Download, Loader2,
  Hash, Calendar, Wallet, User, Gamepad2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type OrderStatusData = {
  id: number;
  itemName: string;
  itemNameEn?: string | null;
  packageName?: string | null;
  targetId?: string | null;
  providerUsername?: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type L = "ar" | "tr" | "en";
function toL(lang: string): L {
  if (lang === "ar" || lang === "fa" || lang === "ku") return "ar";
  if (lang === "tr") return "tr";
  return "en";
}

function formatDate(d: string, lang: string) {
  try {
    return new Date(d).toLocaleString(lang === "ar" ? "ar-EG" : lang, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export function OrderStatusDialog({
  order,
  open,
  onClose,
}: {
  order: OrderStatusData | null;
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const l = toL(lang);
  const t = (ar: string, tr: string, en: string) => (l === "ar" ? ar : l === "tr" ? tr : en);
  const isRtl = l === "ar";
  const { toast } = useToast();
  const [liveOrder, setLiveOrder] = useState<OrderStatusData | null>(order);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLiveOrder(order);
  }, [order]);

  // If the order was still pending at the moment the modal opened, poll
  // a few times to reflect a fast resolution without the customer having
  // to leave the page. This is a UX nicety only — it never changes what
  // is allowed to happen, that decision always comes from the server.
  useEffect(() => {
    if (!open || !liveOrder || liveOrder.status !== "pending") return;
    let cancelled = false;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_BASE}/api/orders`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.orders ?? []);
          const updated = list.find((o: any) => o.id === liveOrder.id);
          if (updated && !cancelled) {
            setLiveOrder((prev) => (prev ? { ...prev, ...updated } : prev));
            if (updated.status !== "pending") clearInterval(interval);
          }
        }
      } catch {
        /* silent — this is a background nicety, not a critical action */
      }
      if (attempts >= 6) clearInterval(interval);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, liveOrder?.id, liveOrder?.status]);

  // Ask the wrapping Flutter app to show Google Play's in-app star
  // rating prompt after the customer's 3rd distinct successful charge
  // — the moment they're most likely to feel positive about the app.
  // Only ever asked once per device (never again after the first ask).
  useEffect(() => {
    if (!open || !liveOrder || liveOrder.status !== "completed") return;
    try {
      const REVIEWED_KEY = "ag_review_prompted";
      if (localStorage.getItem(REVIEWED_KEY)) return;
      const LAST_COUNTED_KEY = "ag_last_counted_order_id";
      if (localStorage.getItem(LAST_COUNTED_KEY) === String(liveOrder.id)) return;
      localStorage.setItem(LAST_COUNTED_KEY, String(liveOrder.id));
      const COUNT_KEY = "ag_successful_charges";
      const count = parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) + 1;
      localStorage.setItem(COUNT_KEY, String(count));
      if (count >= 3 && (window as any).FlutterRequestReview) {
        (window as any).FlutterRequestReview.postMessage("review");
        localStorage.setItem(REVIEWED_KEY, "1");
      }
    } catch {
      /* localStorage unavailable in this browser context — skip silently */
    }
  }, [open, liveOrder]);

  if (!liveOrder) return null;

  const isSuccess = liveOrder.status === "completed";
  const isPending = liveOrder.status === "pending";

  const displayName = isRtl ? liveOrder.itemName : (liveOrder.itemNameEn || liveOrder.itemName);
  const cleanTargetId = cleanPlayerId(liveOrder.targetId);

  const banner = isSuccess
    ? { icon: CheckCircle2, classes: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300", text: t("تم الشحن بنجاح", "Şarj işlemi başarılı", "Charged successfully") }
    : isPending
    ? { icon: Clock, classes: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300", text: t("الطلب قيد المعالجة", "Sipariş işleniyor", "Order is processing") }
    : { icon: XCircle, classes: "bg-red-500/15 border-red-500/40 text-red-300", text: t("فشلت العملية", "İşlem başarısız oldu", "Order failed") };
  const BannerIcon = banner.icon;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${liveOrder.id}/receipt`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("تعذر تحميل إثبات الدفع", "Ödeme kanıtı indirilemedi", "Could not download proof of payment"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${liveOrder.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("خطأ", "Hata", "Error"),
        description: e?.message ?? t("حدث خطأ ما", "Bir şeyler ters gitti", "Something went wrong"),
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-primary/25 p-5 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {t("حالة الطلب", "Sipariş Durumu", "Order Status")}
          </DialogTitle>
        </DialogHeader>

        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${banner.classes}`}>
          <BannerIcon className="w-6 h-6 shrink-0" />
          <span className="font-bold text-sm">{banner.text}</span>
        </div>

        <div className="bg-background/40 rounded-xl border border-border/40 divide-y divide-border/30">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Gamepad2 className="w-3.5 h-3.5" />{t("المنتج", "Ürün", "Product")}</span>
            <span className="font-bold text-white text-end">{displayName}{liveOrder.packageName ? ` — ${liveOrder.packageName}` : ""}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Hash className="w-3.5 h-3.5" />{t("رقم الطلب", "Sipariş No", "Order ID")}</span>
            <span className="font-mono font-bold text-white">#{liveOrder.id}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet className="w-3.5 h-3.5" />{t("المبلغ", "Tutar", "Amount")}</span>
            <span className="font-black text-primary">{liveOrder.amount.toFixed(2)} {liveOrder.currency}</span>
          </div>
          {cleanTargetId && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Player ID</span>
              <code dir="ltr" className="font-mono text-xs font-bold bg-background/60 px-2 py-0.5 rounded border border-primary/20">{cleanTargetId}</code>
            </div>
          )}
          {liveOrder.providerUsername && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><User className="w-3.5 h-3.5" />{t("اسم الحساب", "Hesap adı", "Account name")}</span>
              <span className="font-bold text-white">{liveOrder.providerUsername}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{t("التاريخ", "Tarih", "Date")}</span>
            <span className="text-muted-foreground">{formatDate(liveOrder.createdAt, lang)}</span>
          </div>
        </div>

        {isSuccess && (
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full h-11 gap-2 font-bold bg-gradient-to-r from-purple-600 to-primary hover:opacity-90 text-white"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t("تحميل إثبات الدفع", "Ödeme kanıtını indir", "Download Proof of Payment")}
          </Button>
        )}

        {isPending && (
          <p className="text-xs text-center text-muted-foreground">
            {t(
              "سيتوفر إثبات الدفع تلقائياً فور اكتمال العملية. يمكنك متابعة حالة الطلب من قسم طلباتي.",
              "Ödeme kanıtı işlem tamamlandığında otomatik olarak kullanılabilir olacaktır. Siparişlerim bölümünden takip edebilirsiniz.",
              "Proof of payment will become available automatically once the charge completes. You can track it from My Orders."
            )}
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={onClose}>
          {t("إغلاق", "Kapat", "Close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
