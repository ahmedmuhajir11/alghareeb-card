import { useI18n } from "@/lib/i18n";
import { FileText } from "lucide-react";

export default function TermsPage() {
  const { lang } = useI18n();
  const isRtl = ['ar', 'fa', 'ku'].includes(lang);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <FileText className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black neon-text">شروط الاستخدام</h1>
        <p className="text-muted-foreground text-sm">آخر تحديث: مايو 2026</p>
      </div>

      <div className="space-y-6 text-right leading-relaxed">

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">القبول</h2>
          <p className="text-muted-foreground">
            باستخدامك لموقع الغريب كارد فأنت توافق على هذه الشروط والأحكام كاملةً. إذا لم توافق على أي بند، يُرجى التوقف عن استخدام الموقع.
          </p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">الخدمات المقدمة</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>شحن الألعاب الإلكترونية (PUBG، فري فاير، وغيرها)</li>
            <li>شحن تطبيقات الجوال</li>
            <li>خدمات التحويل المالي</li>
            <li>إعادة شحن الرصيد الهاتفي</li>
          </ul>
          <p className="text-muted-foreground text-sm">الأسعار قابلة للتغيير دون إشعار مسبق.</p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">سياسة الاسترداد</h2>
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <p className="text-foreground font-semibold">
              لا يوجد استرداد للأموال إلا في حالة وجود خطأ تقني من طرفنا.
            </p>
          </div>
          <p className="text-muted-foreground">
            الطلبات المنفَّذة بشكل صحيح غير قابلة للإلغاء أو الاسترداد. في حال وجود خطأ تقني من جانبنا يُرجى التواصل معنا فوراً عبر واتساب لمعالجة الأمر.
          </p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">مسؤولية المستخدم</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>أنت مسؤول عن صحة المعلومات التي تُدخلها عند الطلب (المعرّف، رقم الحساب، وغيرها)</li>
            <li>لسنا مسؤولين عن أي خسارة ناتجة عن معلومات خاطئة أدخلتها</li>
            <li>يجب أن يكون عمرك 13 عاماً أو أكثر لاستخدام الموقع</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">قواعد الحساب</h2>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>ممنوع إنشاء أكثر من حساب واحد لكل مستخدم</li>
            <li>ممنوع استخدام الموقع لأي نشاط غير قانوني</li>
            <li>نحتفظ بحق تعليق أو حذف أي حساب يخالف هذه الشروط دون إشعار مسبق</li>
          </ul>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">تغييرات الشروط</h2>
          <p className="text-muted-foreground">
            نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية عبر الموقع. استمرارك في استخدام الموقع بعد التغييرات يعني موافقتك عليها.
          </p>
        </section>

        <section className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-primary">تواصل معنا</h2>
          <p className="text-muted-foreground">
            لأي استفسار يتعلق بشروط الاستخدام تواصل معنا عبر واتساب:{' '}
            <span className="text-primary font-bold">00905378221375</span>
          </p>
        </section>

      </div>
    </div>
  );
}
