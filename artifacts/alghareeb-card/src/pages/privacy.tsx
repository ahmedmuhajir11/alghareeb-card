import { useI18n } from "@/lib/i18n";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const { t, lang } = useI18n();
  const isRtl = ['ar', 'fa', 'ku'].includes(lang);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black neon-text">{t('privacy.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('privacy.lastUpdated')}</p>
      </div>

      <div className="space-y-6" style={{ textAlign: isRtl ? 'right' : 'left' }}>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.dataCollected.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('privacy.dataCollected.item1')}</li>
            <li>{t('privacy.dataCollected.item2')}</li>
            <li>{t('privacy.dataCollected.item3')}</li>
            <li>{t('privacy.dataCollected.item4')}</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.howWeUse.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('privacy.howWeUse.item1')}</li>
            <li>{t('privacy.howWeUse.item2')}</li>
            <li>{t('privacy.howWeUse.item3')}</li>
            <li>{t('privacy.howWeUse.item4')}</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.security.title')}</h2>
          <p className="text-muted-foreground">{t('privacy.security.text')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.cookies.title')}</h2>
          <p className="text-muted-foreground">{t('privacy.cookies.text')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.rights.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('privacy.rights.item1')}</li>
            <li>{t('privacy.rights.item2')}</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('privacy.contact.title')}</h2>
          <p className="text-muted-foreground">
            {t('privacy.contact.text')}{' '}
            <span className="text-primary font-bold">00905378221375</span>
          </p>
        </section>

      </div>
    </div>
  );
}
