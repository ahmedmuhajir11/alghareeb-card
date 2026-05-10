import { useI18n } from "@/lib/i18n";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const { lang } = useI18n();
  const isRtl = ['ar', 'fa', 'ku'].includes(lang);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black neon-text">سياسة الخصوصية</h1>
        <p className="text-muted-foreground text-sm">آخر تحديث: مايو 2026</p>
      </div>

      <div className="space-y-6 text-right leading-relaxed">

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">البيانات التي نجمعها</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>الاسم والبريد الإلكتروني ورقم الهاتف عند التسجيل</li>
            <li>الدولة والعملة المفضلة</li>
            <li>سجل الطلبات والمعاملات المالية</li>
            <li>صور إيصالات الإيداع المرفوعة</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">كيف نستخدم بياناتك</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>لإنشاء حسابك وإدارته</li>
            <li>لمعالجة طلباتك وإشعارك بحالتها</li>
            <li>لتقديم خدمة عملاء أفضل</li>
            <li>لا نبيع بياناتك أو نشاركها مع أي طرف ثالث</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">الأمان</h2>
          <p className="text-muted-foreground">
            كلمات المرور مشفرة ولا يمكن لأحد الاطلاع عليها. نستخدم اتصالاً آمناً (HTTPS) في جميع أنحاء الموقع لحماية بياناتك أثناء النقل.
          </p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">ملفات الارتباط (Cookies)</h2>
          <p className="text-muted-foreground">
            نستخدم ملفات الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول. لا نستخدم ملفات تتبع لأغراض إعلانية.
          </p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">حقوقك</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>يحق لك طلب حذف حسابك وبياناتك في أي وقت</li>
            <li>يمكنك تصحيح بياناتك من خلال صفحة الملف الشخصي</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">تواصل معنا</h2>
          <p className="text-muted-foreground">
            لأي استفسار يتعلق بخصوصيتك تواصل معنا عبر واتساب:{' '}
            <span className="text-primary font-bold">00905378221375</span>
          </p>
        </section>

      </div>
    </div>
  );
}
