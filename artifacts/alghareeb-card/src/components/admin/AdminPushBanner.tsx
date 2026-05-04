import { useEffect, useState } from "react";
import { Bell, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "admin_push_banner_dismissed_at";
const DISMISS_DAYS = 3;

export default function AdminPushBanner() {
  const { status, subscribe } = usePushNotifications({ isAdmin: true });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "default") {
      setVisible(false);
      return;
    }
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const expired = !dismissedAt || Date.now() - dismissedAt > DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (!expired) return;
    setVisible(true);
  }, [status]);

  const handleEnable = async () => {
    setLoading(true);
    await subscribe();
    setLoading(false);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="relative rounded-2xl border border-primary/30 bg-card/80 p-4 shadow-md backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">فعّل إشعارات الإدارة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            استلم تنبيهاً فورياً عند وصول طلب إيداع أو طلب شحن جديد على هذا الجهاز
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleEnable} disabled={loading} className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              {loading ? "جاري التفعيل..." : "تفعيل إشعارات الإدارة"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              لاحقاً
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
