import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ServiceCard } from "@/components/dev/ServiceCard";
import { ChevronRight, Code2, Globe, ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface ServiceCardData {
  id: number;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  imageUrl?: string;
  icon?: string;
  price?: string;
}

interface DevSettings {
  websitesHeroTitle: string;
  websitesHeroDesc: string;
  websitesHeroImage: string;
}

export default function WebsitesServicePage() {
  const [cards, setCards] = useState<ServiceCardData[]>([]);
  const [settings, setSettings] = useState<DevSettings>({ websitesHeroTitle: "تطوير وبرمجة المواقع", websitesHeroDesc: "", websitesHeroImage: "" });
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/dev/service-cards?type=websites`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/api/dev/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([cardsData, settingsData]) => {
      setCards(Array.isArray(cardsData) ? cardsData : []);
      setSettings(prev => ({ ...prev, ...settingsData }));
      setLoading(false);
    });
  }, []);

  const heroImage = settings.websitesHeroImage || "/dev-web-hero.jpg";
  const heroTitle = settings.websitesHeroTitle || "تطوير وبرمجة المواقع";
  const heroDesc = settings.websitesHeroDesc || "نبني مواقع احترافية وأنظمة ويب متكاملة تعكس هوية مشروعك وتحقق أهدافك التجارية بأحدث التقنيات.";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>تطوير وبرمجة المواقع | الغريب كارد</title>
        <meta name="description" content="خدمات تطوير وبرمجة المواقع الاحترافية — متاجر إلكترونية، مواقع شركات، منصات ويب مخصصة." />
      </Helmet>

      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        <img src={heroImage} alt={heroTitle} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />

        <div className="relative z-10 px-4 py-10 flex flex-col justify-end min-h-[420px]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <span className="text-primary text-sm font-medium">خدمات التطوير</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4 leading-tight">{heroTitle}</h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mb-8">{heroDesc}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/dev/websites/request")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-200 shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_32px_rgba(139,92,246,0.6)]"
              >
                <Code2 className="w-4 h-4" />
                ابدأ مشروعك
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card/60 hover:bg-card border border-border/40 hover:border-primary/30 text-foreground font-medium transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-4 py-10 max-w-6xl mx-auto">
        {loading ? (
          <div>
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          </div>
        ) : cards.length > 0 ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">خدماتنا في تطوير المواقع</h2>
              <span className="text-sm text-muted-foreground">{cards.length} خدمة متاحة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map(card => (
                <ServiceCard
                  key={card.id}
                  nameAr={card.nameAr}
                  nameEn={card.nameEn}
                  descriptionAr={card.descriptionAr}
                  imageUrl={card.imageUrl}
                  icon={card.icon}
                  price={card.price}
                  onRequest={() => navigate(`/dev/websites/request?service=${encodeURIComponent(card.nameAr)}`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Globe className="w-10 h-10 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-lg">الخدمات قيد الإعداد</p>
            <p className="text-sm text-muted-foreground">يمكنك تقديم طلبك مباشرة وسنتواصل معك</p>
            <button
              onClick={() => navigate("/dev/websites/request")}
              className="mt-4 flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors"
            >
              ابدأ طلبك
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CTA */}
        {cards.length > 0 && (
          <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <h3 className="text-xl font-bold mb-2">لم تجد ما تبحث عنه؟</h3>
            <p className="text-muted-foreground mb-5 text-sm">نقوم ببناء أي نوع من المواقع والأنظمة حسب متطلباتك</p>
            <button
              onClick={() => navigate("/dev/websites/request")}
              className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              <Code2 className="w-4 h-4" />
              اطلب خدمة مخصصة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
