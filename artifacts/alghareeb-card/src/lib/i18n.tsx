import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import translations, { type LangCode, LANG_META } from "./translations";

const STORAGE_KEY = "alghareeb-lang";
const RTL_LANGS: LangCode[] = ["ar", "fa", "ku"];

function detectBrowserLang(): LangCode {
  const supported = Object.keys(LANG_META) as LangCode[];
  const nav = (navigator.language || "").toLowerCase();
  // exact match first
  if (supported.includes(nav as LangCode)) return nav as LangCode;
  // prefix match (e.g. "ar-SA" → "ar")
  const prefix = nav.split("-")[0];
  if (supported.includes(prefix as LangCode)) return prefix as LangCode;
  return "ar";
}

function getInitialLang(): LangCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANG_META[saved as LangCode]) return saved as LangCode;
  return detectBrowserLang();
}

interface I18nCtx {
  lang: LangCode;
  dir: "rtl" | "ltr";
  setLang: (lang: LangCode) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nCtx>({
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(getInitialLang);

  const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, dir]);

  const setLang = useCallback((newLang: LangCode) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = translations[key];
      if (!entry) return fallback ?? key;
      return entry[lang] ?? entry["ar"] ?? fallback ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export { LANG_META };
export type { LangCode };
