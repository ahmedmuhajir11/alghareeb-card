import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Rocket, Shield, Globe, CreditCard, Headphones, Gamepad2, Banknote, Target, Phone, Mail, MapPin, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="max-w-3xl mx-auto space-y-10 text-right">
      <Helmet>
        <title>من نحن | الغريب كارد</title>
        <meta name="description" content="تعرف على الغريب كارد، منصة شحن الألعاب والتطبيقات وتحويل الأموال. تأسست على يد أحمد مهاجري لتقديم خدمات شحن موثوقة وسريعة." />
        <meta property="og:title" content="من نحن | الغريب كارد" />
        <meta property="og:description" content="تعرف على الغريب كارد، منصة شحن الألعاب والتطبيقات وتحويل الأموال." />
        <meta property="og:url" content="https://alghareebcard.com/about" />
        <link rel="canonical" href="https://alghareebcard.com/about" />
      </Helmet>

      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-4xl font-black neon-text">{t('about.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('about.subtitle')}</p>
      </div>

      {/* Intro */}
      <div className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-4 leading-relaxed">
        <p className="text-lg font-semibold text-primary">{t('about.intro1')}</p>
        <p className="text-muted-foreground">{t('about.intro2')}</p>
        <p className="text-base font-bold text-foreground">{t('about.intro3')}</p>
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            🏢 {t('about.licenseText')}
          </p>
        </div>
      </div>

      {/* Why us */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Rocket className="w-6 h-6 text-primary" />
          {t('about.whyUs')}
        </h2>
        <p className="text-muted-foreground">{t('about.whyUsSub')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <Rocket className="w-5 h-5 text-orange-400" />, key: 'about.feature1' },
            { icon: <Shield className="w-5 h-5 text-green-400" />, key: 'about.feature2' },
            { icon: <Globe className="w-5 h-5 text-blue-400" />, key: 'about.feature3' },
            { icon: <CreditCard className="w-5 h-5 text-purple-400" />, key: 'about.feature4' },
            { icon: <Headphones className="w-5 h-5 text-yellow-400" />, key: 'about.feature5' },
            { icon: <Gamepad2 className="w-5 h-5 text-pink-400" />, key: 'about.feature6' },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors">
              <div className="flex-shrink-0">{item.icon}</div>
              <p className="text-sm font-medium">{t(item.key)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Money transfers */}
      <div className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" />
          {t('about.transferTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {t('about.transferDesc')}
        </p>
      </div>

      {/* Vision */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-900/20 border border-primary/30 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          {t('about.visionTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {t('about.visionText')}
        </p>
      </div>

      {/* Founder */}
      <div className="bg-gradient-to-br from-purple-900/30 to-card/50 border border-primary/30 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {t('about.founderTitle')}
        </h2>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/logo.png" alt="AlGhareeb Card" className="w-14 h-14 object-contain" />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-xl font-black text-foreground">{t('about.founderName')}</p>
            <p className="text-sm text-primary font-semibold">{t('about.founderRole')}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{t('about.founderLocation')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <span dir="ltr">ahmed.muhajir11@gmail.com</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">
              {t('about.founderBio')}
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />
          {t('about.contactTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('about.contactSub')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="mailto:alghareebcard+support@gmail.com"
            className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors"
          >
            <Mail className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('about.emailLabel')}</p>
              <p className="text-sm font-medium" dir="ltr">alghareebcard+support@gmail.com</p>
            </div>
          </a>
          <a
            href="https://wa.me/905378221375"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-card/50 border border-green-500/30 rounded-xl p-4 hover:border-green-500/60 transition-colors"
          >
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-xs text-muted-foreground">{t('about.whatsappLabel')}</p>
              <p className="text-sm font-medium" dir="ltr">+90 537 822 1375</p>
            </div>
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-br from-primary/20 to-purple-900/30 border border-primary/30 rounded-2xl p-8 space-y-4">
        <p className="text-2xl font-black neon-text">{t('about.ctaTitle')}</p>
        <p className="text-muted-foreground">{t('about.ctaSub')}</p>
        <Link
          href="/"
          className="inline-block mt-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          {t('about.ctaBtn')}
        </Link>
      </div>

    </div>
  );
}
