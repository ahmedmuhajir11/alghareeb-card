import { useI18n } from "@/lib/i18n";

/**
 * Small helper for the standalone "dev services" pages/forms
 * (Websites dev, Mobile apps dev, Digital store projects) which are not
 * wired into the main translations.ts dictionary. Mirrors the exact
 * ar / en / tr fallback logic already used in home.tsx (isRtlLang + tr
 * falling back to en) so behavior is consistent across the site.
 */
export function useDevLang() {
  const { lang, dir } = useI18n();
  const isRtlLang = ["ar", "fa", "ku"].includes(lang);
  // Pick between an Arabic string and an English string (with optional
  // Turkish override) based on the current language.
  const pick = (ar: string, en: string, tr?: string): string =>
    isRtlLang ? ar : lang === "tr" ? (tr || en) : en;
  return { lang, dir, isRtlLang, pick };
}
