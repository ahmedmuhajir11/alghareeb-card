import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

type L = "ar" | "tr" | "en";
function toL(lang: string): L {
  if (lang === "ar" || lang === "fa" || lang === "ku") return "ar";
  if (lang === "tr") return "tr";
  return "en";
}

/**
 * Shown while we wait for the charge to actually resolve (success or
 * failure) before opening the real status dialog. Progress is a visual
 * approximation only — we don't have a real progress signal from the
 * provider — capped short of 100% until the outcome is known, so the
 * customer never sees a false "done" state.
 */
export function OrderWaitingDialog({ open }: { open: boolean }) {
  const { lang } = useI18n();
  const l = toL(lang);
  const t = (ar: string, tr: string, en: string) => (l === "ar" ? ar : l === "tr" ? tr : en);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    const estimatedMs = 20000; // visual pacing only, not tied to the real timeout
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(92, Math.round((elapsed / estimatedMs) * 92));
      setProgress(pct);
    }, 250);
    return () => clearInterval(interval);
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-xs bg-card border-primary/25 p-6 flex flex-col items-center gap-4 text-center [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div>
          <p className="font-black text-white text-base">
            {t("جاري الانتظار...", "Lütfen bekleyin...", "Please wait...")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "نتحقق من نتيجة الشحن، هذا قد يأخذ بضع ثوانٍ.",
              "Şarj sonucu doğrulanıyor, bu birkaç saniye sürebilir.",
              "Verifying your charge result, this may take a few seconds."
            )}
          </p>
        </div>
        <div className="w-full">
          <div className="h-2.5 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-primary to-yellow-400 transition-all duration-300 ease-out shadow-[0_0_10px_var(--color-primary)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-bold text-primary mt-1.5">{progress}%</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
