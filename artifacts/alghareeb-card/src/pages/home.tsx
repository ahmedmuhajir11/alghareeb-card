import { Link } from "wouter";
import { useListSections, useListSliderImages } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Zap, Headphones, BadgeCheck, ChevronLeft } from "lucide-react";

function Slider() {
  const { data: images, isLoading } = useListSliderImages();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' });

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      scrollNext();
    }, 3000);
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
    <div className="relative mb-12 rounded-xl overflow-hidden neon-border group" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {slides.map((img) => {
          const inner = (
            <div className="flex-[0_0_100%] min-w-0 relative aspect-[21/9] md:aspect-[3/1]">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
              <img
                src={img.imageUrl}
                alt={img.title || 'Slide'}
                className="w-full h-full object-cover"
              />
              {img.title && (
                <div className="absolute bottom-0 right-0 p-6 z-20">
                  <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg neon-text">
                    {img.title}
                  </h2>
                </div>
              )}
            </div>
          );
          return img.linkUrl ? (
            <a
              key={img.id}
              href={img.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[0_0_100%] min-w-0 cursor-pointer block"
            >
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

export default function Home() {
  const { data: sections, isLoading } = useListSections();

  return (
    <div>
      <Slider />

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-2 h-8 bg-gradient-to-b from-[hsl(var(--gold-light))] to-[hsl(var(--gold-dark))] rounded-full inline-block shadow-[0_0_12px_hsl(var(--gold)/0.6)]"></span>
          <span className="text-gradient-purple-gold">الأقسام</span>
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : sections?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-xl border border-border/50">
            لا توجد أقسام حالياً
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
                        <h3 className="font-black text-white text-base leading-tight drop-shadow-lg">{section.nameAr}</h3>
                      </div>
                    </div>
                    <div dir="ltr" className="px-3 py-2 bg-gradient-to-l from-[hsl(var(--gold-dark)/0.2)] via-[hsl(var(--gold)/0.15)] to-transparent border-t border-[hsl(var(--gold)/0.3)] flex items-center justify-start text-xs font-bold text-gradient-gold">
                      <span className="flex items-center gap-1">
                        <span>تسوّق الآن</span>
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

      {/* Trust badges row */}
      <div className="mb-8 mt-12 rounded-2xl bg-gradient-to-l from-[hsl(260_35%_8%)] via-[hsl(260_30%_10%)] to-[hsl(260_35%_8%)] border border-[hsl(var(--gold)/0.25)] p-4 md:p-5 shadow-[0_0_30px_hsl(var(--gold)/0.08)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" dir="rtl">
          {[
            { icon: <ShieldCheck className="w-6 h-6" />, title: "آمن وموثوق", subtitle: "حماية بياناتك" },
            { icon: <Zap className="w-6 h-6" />, title: "تسليم فوري", subtitle: "في ثوانٍ معدودة" },
            { icon: <Headphones className="w-6 h-6" />, title: "دعم على مدار الساعة", subtitle: "خدمتنا دائماً معك" },
            { icon: <BadgeCheck className="w-6 h-6" />, title: "أفضل الأسعار", subtitle: "عروض حصرية" },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 p-2 rounded-xl"
            >
              <div className="shrink-0 w-11 h-11 rounded-full bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold)/0.4)] flex items-center justify-center text-[hsl(var(--gold))] gold-glow">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating WhatsApp Button */}
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
          box-shadow: 0 0 10px rgba(138,43,226,0.4), 0 0 25px rgba(138,43,226,0.2), inset 0 0 10px rgba(255,255,255,0.05);
          z-index: 9999;
          transition: all 0.3s ease;
          animation: neonPulse 3s infinite;
        }
        .whatsapp-float:hover {
          transform: scale(1.12);
          box-shadow: 0 0 20px rgba(138,43,226,0.8), 0 0 40px rgba(138,43,226,0.4), inset 0 0 12px rgba(255,255,255,0.08);
        }
        .whatsapp-float:active { transform: scale(0.95); }
        .whatsapp-float svg {
          filter: drop-shadow(0 0 6px rgba(0,255,150,0.5)) brightness(1.1);
        }
      `}</style>
      <a
        href="https://wa.me/905378221375"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        aria-label="تواصل معنا على واتساب"
      >
        <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.856L.057 23.625a.75.75 0 0 0 .918.918l5.769-1.476A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.927 0-3.733-.5-5.306-1.373l-.38-.217-3.942 1.009 1.009-3.942-.217-.38A9.952 9.952 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>
    </div>
  );
}
