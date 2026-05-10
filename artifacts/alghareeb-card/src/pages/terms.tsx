import { useI18n } from "@/lib/i18n";
import { FileText } from "lucide-react";

export default function TermsPage() {
  const { t, lang } = useI18n();
  const isRtl = ['ar', 'fa', 'ku'].includes(lang);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <FileText className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black neon-text">{t('terms.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('terms.lastUpdated')}</p>
      </div>

      <div className="space-y-6" style={{ textAlign: isRtl ? 'right' : 'left' }}>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.acceptance.title')}</h2>
          <p className="text-muted-foreground">{t('terms.acceptance.text')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.services.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('terms.services.item1')}</li>
            <li>{t('terms.services.item2')}</li>
            <li>{t('terms.services.item3')}</li>
            <li>{t('terms.services.item4')}</li>
          </ul>
          <p className="text-muted-foreground text-sm">{t('terms.services.note')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.refund.title')}</h2>
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <p className="text-foreground font-semibold">{t('terms.refund.highlight')}</p>
          </div>
          <p className="text-muted-foreground">{t('terms.refund.text')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.responsibility.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('terms.responsibility.item1')}</li>
            <li>{t('terms.responsibility.item2')}</li>
            <li>{t('terms.responsibility.item3')}</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.account.title')}</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>{t('terms.account.item1')}</li>
            <li>{t('terms.account.item2')}</li>
            <li>{t('terms.account.item3')}</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.changes.title')}</h2>
          <p className="text-muted-foreground">{t('terms.changes.text')}</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">{t('terms.contact.title')}</h2>
          <p className="text-muted-foreground">
            {t('terms.contact.text')}{' '}
            <span className="text-primary font-bold">00905378221375</span>
          </p>
        </section>

      </div>
    </div>
  );
}
