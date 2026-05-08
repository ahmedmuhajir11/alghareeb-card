import { Link, useLocation } from "wouter";
import { useListSections, useListSliderImages } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Zap, Headphones, BadgeCheck, ChevronLeft, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface SearchResult {
  id: number;
  nameAr: string;
  nameEn: string;
  logoUrl: string | null;
  sectionId: number;
  sectionNameAr: string | null;
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.items || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (id: number) => {
    setQuery(""); setResults([]); setOpen(false);
    navigate(`/item/${id}`);
  };

  return (
    <div ref={wrapperRef} className="relative w-full mb-8">
      <div className="relative">
        <Search className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('home.searchPlaceholder')}
          className="h-13 pe-12 ps-10 text-base bg-card/60 border-primary/30 focus-visible:border-primary rounded-xl neon-border shadow-[0_0_15px_rgba(139,92,246,0.1)]"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 w-full bg-card border border-primary/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {t('home.noResults')} "{query}"
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-border/30">
              {results.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => go(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-start"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {item.logoUrl
                        ? <img src={item.logoUrl} alt="" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                        : <span className="text-lg font-bold text-primary">{item.nameAr.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.nameAr}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.sectionNameAr || item.nameEn}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-primary/50 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Slider() {
  const { data: images, isLoading } = useListSliderImages();
  const { dir } = useI18n();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: dir === "rtl" ? "rtl" : "ltr" });

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => { scrollNext(); }, 3000);
    return () => clearInterval(interval);
  }, [emblaApi, scrollNext]);

  if (isLoading) {
    return <Skeleton className="w-full aspect-[21/9] md:aspect-[3/1] rounded-xl mb-8" />;
  }

  const slides = Array.isArray(images) && images.length > 0 ? images : [
    { id: 1, imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80', title: 'Placeholder 1', linkUrl: null },
    { id: 2, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80', title: 'Placeholder 2', linkUrl: null },
  ];

  return (
    <div className="relative mb-8 rounded-xl overflow-hidden neon-border group" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {slides.map((img) => {
          const inner = (
            <div className="flex-[0_0_100%] min-w-0 relative aspect-[21/9] md:aspect-[3/1]">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
              <img src={img.imageUrl} alt={img.title || 'Slide'} className="w-full h-full object-cover" />
              {img.title && (
                <div className="absolute bottom-0 end-0 p-6 z-20">
                  <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg neon-text">{img.title}</h2>
                </div>
              )}
            </div>
          );
          return img.linkUrl ? (
            <a key={img.id} href={img.linkUrl} target="_blank" rel="noopener noreferrer" className="flex-[0_0_100%] min-w-0 cursor-pointer block">
              {inner}
            </a>
          ) : (
            <div key={img.id} className="flex-[0_0_100%] min-w-0">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

function getSectionLabel(nameAr: string, t: (k: string) => string): string {
  if (nameAr.includes("حوالة") || nameAr.includes("حوالات")) return t('home.sendTransfer');
  if (nameAr.includes("راتب") || nameAr.includes("رواتب")) return t('home.requestSalary');
  if (nameAr.includes("إيداع") || nameAr.includes("ايداع") || nameAr.includes("الدفع")) return t('home.chargeBalance');
  return t('home.shopNow');
}

export default function Home() {
  const { data: sections, isLoading } = useListSections();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const sectionName = (s: { nameAr: string; nameEn: string }) =>
    isRtlLang ? s.nameAr : (s.nameEn || s.nameAr);

  return (
    <div>
      <Slider />
      <GlobalSearch />

      <div className="mb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : sections?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-xl border border-border/50">
            {t('home.noSections')}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sections?.map(section => (
              <Link key={section.id} href={`/section/${section.id}`}>
                <Card className="neon-border cursor-pointer bg-card/50 hover:border-[hsl(var(--gold)/0.6)] transition-all duration-300 h-full overflow-hidden group">
                  <CardContent className="p-0 h-44 md:h-52 relative flex flex-col">
                    <div className="relative flex-1 overflow-hidden">
                      {section.logoUrl ? (
                        <img
                          src={section.logoUrl}
                          alt={section.nameAr}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary group-hover:scale-110 transition-transform duration-300 inline-block">{section.nameAr.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                      <div className="absolute bottom-0 inset-x-0 p-2 text-center">
                        <h3 className="font-black text-white text-base leading-tight drop-shadow-lg">{sectionName(section)}</h3>
                      </div>
                    </div>
                    <div dir="ltr" className="px-3 py-2 bg-gradient-to-l from-[hsl(var(--gold-dark)/0.2)] via-[hsl(var(--gold)/0.15)] to-transparent border-t border-[hsl(var(--gold)/0.3)] flex items-center justify-start text-xs font-bold text-gradient-gold">
                      <span className="flex items-center gap-1">
                        <span>{getSectionLabel(section.nameAr, t)}</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="mb-8 mt-4 rounded-2xl bg-gradient-to-l from-[hsl(260_35%_8%)] via-[hsl(260_30%_10%)] to-[hsl(260_35%_8%)] border border-[hsl(var(--gold)/0.25)] p-4 md:p-5 shadow-[0_0_30px_hsl(var(--gold)/0.08)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: <ShieldCheck className="w-6 h-6" />, titleKey: 'home.trust1Title', subKey: 'home.trust1Sub' },
            { icon: <Zap className="w-6 h-6" />, titleKey: 'home.trust2Title', subKey: 'home.trust2Sub' },
            { icon: <Headphones className="w-6 h-6" />, titleKey: 'home.trust3Title', subKey: 'home.trust3Sub' },
            { icon: <BadgeCheck className="w-6 h-6" />, titleKey: 'home.trust4Title', subKey: 'home.trust4Sub' },
          ].map((item) => (
            <div key={item.titleKey} className="flex items-center gap-3 p-2 rounded-xl">
              <div className="shrink-0 w-11 h-11 rounded-full bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold)/0.4)] flex items-center justify-center text-[hsl(var(--gold))] gold-glow">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">{t(item.titleKey)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t(item.subKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp */}
      <style>{`
        @keyframes neonPulse {
          0%   { box-shadow: 0 0 10px rgba(138,43,226,0.4), 0 0 25px rgba(138,43,226,0.2), inset 0 0 10px rgba(255,255,255,0.05); }
          50%  { box-shadow: 0 0 25px rgba(138,43,226,0.9), 0 0 50px rgba(138,43,226,0.5), inset 0 0 10px rgba(255,255,255,0.05); }
          100% { box-shadow: 0 0 10px rgba(138,43,226,0.4), 0 0 25px rgba(138,43,226,0.2), inset 0 0 10px rgba(255,255,255,0.05); }
        }
        .whatsapp-float {
          position: fixed; bottom: 20px; right: 20px;
          width: 62px; height: 62px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(20,20,35,0.6);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(138,43,226,0.3);
          z-index: 9999; transition: all 0.3s ease; animation: neonPulse 3s infinite;
        }
        .whatsapp-float:hover { transform: scale(1.12); }
        .whatsapp-float:active { transform: scale(0.95); }
        .whatsapp-float svg { filter: drop-shadow(0 0 6px rgba(0,255,150,0.5)) brightness(1.1); }
      `}</style>
      <a href="https://wa.me/905378221375" target="_blank" rel="noopener noreferrer" className="whatsapp-float" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.856L.057 23.625a.75.75 0 0 0 .918.918l5.769-1.476A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.927 0-3.733-.5-5.306-1.373l-.38-.217-3.942 1.009 1.009-3.942-.217-.38A9.952 9.952 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>
    </div>
  );
}
