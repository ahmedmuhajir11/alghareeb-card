import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "push_banner_dismissed_at";
const DISMISS_DAYS = 7;

export default function PushPermissionBanner() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  if (isAdminRoute) return null;
  return <PushPermissionBannerInner />;
}

function PushPermissionBannerInner() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const { status, subscribe } = usePushNotifications({ userId: user?.id ?? null });
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setVisible(false); return; }
    if (status !== "default") { setVisible(false); return; }
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const expired = !dismissedAt || Date.now() - dismissedAt > DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (!expired) return;
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, [status, isLoaded, isSignedIn]);

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
    <div className="fixed bottom-4 start-4 end-4 z-50 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md md:start-auto md:end-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{t('notif.enableTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('notif.enableDesc')}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleEnable} disabled={loading} className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              {loading ? t('notif.enabling') : t('notif.enableBtn')}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>{t('notif.later')}</Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label={t('notif.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
