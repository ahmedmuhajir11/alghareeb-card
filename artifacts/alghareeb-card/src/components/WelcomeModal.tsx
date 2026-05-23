import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useGetSettings } from "@workspace/api-client-react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "welcome_modal_shown";

export default function WelcomeModal() {
  const { isSignedIn } = useAuth();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const { data: settings } = useGetSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    const shown = sessionStorage.getItem(STORAGE_KEY);
    if (!shown) {
      setOpen(true);
    }
  }, [isSignedIn]);

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const raw = settings?.welcomeMessage || "";
  const parts = raw.split("||").map(s => s.trim());
  const messageAr = parts[0] || "";
  const messageEn = (settings?.welcomeMessageEn) || parts[1] || "";
  const messageTr = settings?.welcomeMessageTr || "";
  const message = lang === 'ar' ? messageAr
    : lang === 'tr' ? (messageTr || messageEn || messageAr)
    : (messageEn || messageAr);

  if (!open || !message) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0e0e1f] shadow-[0_0_40px_hsl(40_80%_50%/0.15)] p-6" dir={isRtlLang ? "rtl" : "ltr"}>
        <button
          onClick={handleClose}
          className="absolute top-3 start-3 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          aria-label={t('welcome.understood')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-black text-lg text-amber-300 leading-tight">{t('welcome.title')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('welcome.subtitle')}</p>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          {message}
        </p>

        <Button
          onClick={handleClose}
          className="mt-5 w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-base"
        >
          {t('welcome.understood')}
        </Button>
      </div>
    </div>
  );
}
