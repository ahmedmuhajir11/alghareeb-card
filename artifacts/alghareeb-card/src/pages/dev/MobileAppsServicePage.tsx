import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ServiceCard } from "@/components/dev/ServiceCard";
import { ChevronRight, Smartphone, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevLang } from "@/lib/devI18n";

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
  mobileAppsHeroTitle: string;
  mobileAppsHeroTitleEn?: string;
  mobileAppsHeroTitleTr?: string;
  mobileAppsHeroDesc: string;
  mobileAppsHeroImage: string;
}

export default function MobileAppsServicePage() {
  const { dir, pick } = useDevLang();
  const [cards, setCards] = useState<ServiceCardData[]>([]);
  const [settings, setSettings] = useState<DevSettings>({ mobileAppsHeroTitle: "تطوير وبرمجة تطبيقات الجوال", mobileAppsHeroTitleEn: "Mobile Apps Development", mobileAppsHeroTitleTr: "", mobileAppsHeroDesc: "", mobileAppsHeroImage: "" });
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/dev/service-cards?type=mobile_apps`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE}/api/dev/settings`).then(r => r.json()).catch(() => ({})),
    ]).then(([cardsData, settingsData]) => {
      setCards(Array.isArray(cardsData) ? cardsData : []);
      setSettings(prev => ({ ...prev, ...settingsData }));
      setLoading(false);
    });
  }, []);

  const heroImage = settings.mobileAppsHeroImage || "/dev-mobile-hero.jpg";
  const heroTitle = pick(
    settings.mobileAppsHeroTitle || "تطوير وبرمجة تطبيقات الجوال",
    settings.mobileAppsHeroTitleEn || "Mobile Apps Development",
    settings.mobileAppsHeroTitleTr
  );
  const heroDesc = settings.mobileAppsHeroDesc || pick(
    "نطور تطبيقات iOS و Android عصرية وسريعة بأعلى معايير الجودة وتجربة مستخدم استثنائية.",
    "We develop modern, fast iOS and Android apps with the highest quality standards and an exceptional user experience.",
    "En yüksek kalite standartlarında ve olağanüstü kullanıcı deneyimiyle modern, hızlı iOS ve Android uygulamaları geliştiriyoruz."
  );

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Helmet>
        <title>تطوير وبرمجة تطبيقات الجوال | الغريب كارد</title>
        <meta name="description" content="خدمات تصميم وبرمجة وتطوير تطبيقات الهواتف الذكية iOS و Android باحترافية." />
        <meta property="og:title" content="تطوير وبرمجة تطبيقات الجوال | الغريب كارد" />
        <meta property="og:description" content="خدمات تصميم وبرمجة وتطوير تطبيقات الهواتف الذكية iOS و Android باحترافية." />
        <meta property="og:url" content="https://alghareebcard.com/dev/mobile-apps" />
        <link rel="canonical" href="https://alghareebcard.com/dev/mobile-apps" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الغريب كارد", "item": "https://alghareebcard.com/" },
            { "@type": "ListItem", "position": 2, "name": "تطوير وبرمجة تطبيقات الجوال", "item": "https://alghareebcard.com/dev/mobile-apps" }
          ]
        })}</script>
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
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <span className="text-primary text-sm font-medium">{pick("خدمات التطوير", "Development Services", "Geliştirme Hizmetleri")}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4 leading-tight">{heroTitle}</h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mb-8">{heroDesc}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/dev/mobile-apps/request")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all duration-200 shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_32px_rgba(139,92,246,0.6)]"
              >
                <Smartphone className="w-4 h-4" />
                {pick("ابدأ مشروع تطبيقك", "Start Your App Project", "Uygulama Projenize Başlayın")}
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card/60 hover:bg-card border border-border/40 hover:border-primary/30 text-foreground font-medium transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
                {pick("العودة للرئيسية", "Back to Home", "Ana Sayfaya Dön")}
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
              <h2 className="text-xl font-bold text-foreground">{pick("خدماتنا في تطبيقات الجوال", "Our Mobile App Development Services", "Mobil Uygulama Geliştirme Hizmetlerimiz")}</h2>
              <span className="text-sm text-muted-foreground">{cards.length} {pick("خدمة متاحة", "services available", "hizmet mevcut")}</span>
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
                  onRequest={() => navigate(`/dev/mobile-apps/request?service=${encodeURIComponent(card.nameAr)}`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-lg">{pick("الخدمات قيد الإعداد", "Services are being prepared", "Hizmetler hazırlanıyor")}</p>
            <p className="text-sm text-muted-foreground">{pick("يمكنك تقديم فكرة تطبيقك مباشرة وسنتواصل معك", "You can submit your app idea directly and we'll contact you", "Uygulama fikrinizi doğrudan gönderebilirsiniz, sizinle iletişime geçeceğiz")}</p>
            <button
              onClick={() => navigate("/dev/mobile-apps/request")}
              className="mt-4 flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors"
            >
              {pick("ابدأ طلب تطبيقك", "Start Your App Request", "Uygulama Talebinizi Başlatın")}
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CTA */}
        {cards.length > 0 && (
          <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <h3 className="text-xl font-bold mb-2">{pick("فكرة تطبيق مخصصة أو فريدة؟", "A custom or unique app idea?", "Özel veya benzersiz bir uygulama fikri mi?")}</h3>
            <p className="text-muted-foreground mb-5 text-sm">{pick("نحن جاهزون لتحويل أي فكرة إلى تطبيق متكامل ومميز على المتاجر", "We're ready to turn any idea into a complete, standout app on the stores", "Her fikri mağazalarda öne çıkan, eksiksiz bir uygulamaya dönüştürmeye hazırız")}</p>
            <button
              onClick={() => navigate("/dev/mobile-apps/request")}
              className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              <Smartphone className="w-4 h-4" />
              {pick("اطلب تطبيق مخصص", "Request a Custom App", "Özel Uygulama İste")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
