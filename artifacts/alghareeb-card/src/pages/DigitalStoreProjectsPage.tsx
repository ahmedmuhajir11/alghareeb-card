import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ChevronRight, Rocket } from "lucide-react";
import DigitalStoreProjectsSection from "@/components/DigitalStoreProjectsSection";
import { useI18n } from "@/lib/i18n";
import { useDevLang } from "@/lib/devI18n";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function DigitalStoreProjectsPage() {
  const [, navigate] = useLocation();
  const { lang } = useI18n();
  const { dir, pick } = useDevLang();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const [titles, setTitles] = useState({ ar: "مشاريع شحن رقمية جاهزة", en: "Ready-Made Digital Top-Up Projects", tr: "" });
  const title = isRtlLang ? titles.ar : (lang === 'tr' ? (titles.tr || titles.en || titles.ar) : (titles.en || titles.ar));

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/settings`)
      .then(r => r.json())
      .then(d => setTitles({
        ar: d?.digitalStoreHeroTitle || "مشاريع شحن رقمية جاهزة",
        en: d?.digitalStoreHeroTitleEn || "Ready-Made Digital Top-Up Projects",
        tr: d?.digitalStoreHeroTitleTr || "",
      }))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Helmet>
        <title>مشاريع شحن رقمية جاهزة | الغريب كارد</title>
        <meta name="description" content="متجر إلكتروني جاهز لشحن الألعاب والتطبيقات والخدمات الرقمية، بدون خبرة برمجية وبأسعار جملة تناسب مشروعك." />
        <meta property="og:title" content="مشاريع شحن رقمية جاهزة | الغريب كارد" />
        <meta property="og:description" content="متجر إلكتروني جاهز لشحن الألعاب والتطبيقات والخدمات الرقمية، بدون خبرة برمجية وبأسعار جملة تناسب مشروعك." />
        <meta property="og:url" content="https://alghareebcard.com/digital-store-projects" />
        <link rel="canonical" href="https://alghareebcard.com/digital-store-projects" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الغريب كارد", "item": "https://alghareebcard.com/" },
            { "@type": "ListItem", "position": 2, "name": "مشاريع شحن رقمية جاهزة", "item": "https://alghareebcard.com/digital-store-projects" }
          ]
        })}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <span className="text-primary text-sm font-medium">{title}</span>
        </div>

        <DigitalStoreProjectsSection />

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card/60 hover:bg-card border border-border/40 hover:border-primary/30 text-foreground font-medium transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4" />
          {pick("العودة للرئيسية", "Back to Home", "Ana Sayfaya Dön")}
        </button>
      </div>
    </div>
  );
}
