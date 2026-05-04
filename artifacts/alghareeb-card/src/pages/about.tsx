import { Link } from "wouter";
import { Rocket, Shield, Globe, CreditCard, Headphones, Gamepad2, Banknote, Target, Phone, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 text-right" dir="rtl">

      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-4xl font-black neon-text">من نحن</h1>
        <p className="text-muted-foreground text-sm">تعرّف على منصة الغريب كارد</p>
      </div>

      {/* Intro */}
      <div className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-4 leading-relaxed">
        <p className="text-lg font-semibold text-primary">
          في عالم السرعة الرقمية، لا مكان للبطء أو عدم الموثوقية… وهنا يأتي دورنا.
        </p>
        <p className="text-muted-foreground">
          نحن منصة متخصصة في شحن الألعاب والتطبيقات وتنفيذ الحوالات المالية الدولية، نوفّر لك تجربة سلسة، سريعة، وآمنة — لأننا نؤمن أن وقتك وأموالك لا تحتمل المجازفة.
        </p>
        <p className="text-base font-bold text-foreground">
          نحن لسنا مجرد موقع… نحن شريكك الرقمي الموثوق.
        </p>
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            🏢 منصة مرخصة ومسجلة رسميًا في <span className="text-foreground font-semibold">تركيا</span> تحت السجل التجاري رقم{" "}
            <span className="font-mono text-primary font-bold">9431357857</span> — يمنحك ذلك راحة البال في كل عملية تقوم بها معنا، من أول نقرة وحتى إتمام الخدمة.
          </p>
        </div>
      </div>

      {/* Why us */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Rocket className="w-6 h-6 text-primary" />
          لماذا يختارنا الآلاف؟
        </h2>
        <p className="text-muted-foreground">لأننا لا نقدّم خدمة عادية… بل تجربة متكاملة:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <Rocket className="w-5 h-5 text-orange-400" />, text: "تنفيذ فوري وسريع — بدون انتظار" },
            { icon: <Shield className="w-5 h-5 text-green-400" />, text: "أمان عالٍ وموثوقية كاملة في جميع المعاملات" },
            { icon: <Globe className="w-5 h-5 text-blue-400" />, text: "خدمات عالمية تغطي مختلف الدول" },
            { icon: <CreditCard className="w-5 h-5 text-purple-400" />, text: "خيارات دفع مرنة ومتعددة تناسب الجميع" },
            { icon: <Headphones className="w-5 h-5 text-yellow-400" />, text: "دعم فني حقيقي متواجد لخدمتك في أي وقت" },
            { icon: <Gamepad2 className="w-5 h-5 text-pink-400" />, text: "خبرة واسعة في عالم الألعاب والخدمات الرقمية" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors">
              <div className="flex-shrink-0">{item.icon}</div>
              <p className="text-sm font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Money transfers */}
      <div className="bg-card/50 border border-primary/20 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" />
          حوالات مالية بدون تعقيد
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          نقدّم لك حلول تحويل أموال إلى جميع أنحاء العالم بطريقة سهلة وآمنة، مع متابعة دقيقة لكل عملية لضمان وصولها بسرعة وثقة.
        </p>
      </div>

      {/* Vision */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-900/20 border border-primary/30 rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          رؤيتنا
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          أن نصبح الاسم الأول في العالم العربي في مجال الخدمات الرقمية، وأن ننافس كبرى المنصات العالمية من خلال الجودة، الثقة، والتجربة الاستثنائية.
        </p>
      </div>

      {/* Contact */}
      <div className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />
          تواصل معنا
        </h2>
        <p className="text-muted-foreground text-sm">فريقنا جاهز دائمًا لخدمتك</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="mailto:alghareebcard+support@gmail.com"
            className="flex items-center gap-3 bg-card/50 border border-border/50 rounded-xl p-4 hover:border-primary/40 transition-colors"
          >
            <Mail className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
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
              <p className="text-xs text-muted-foreground">واتساب</p>
              <p className="text-sm font-medium" dir="ltr">+90 537 822 1375</p>
            </div>
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-br from-primary/20 to-purple-900/30 border border-primary/30 rounded-2xl p-8 space-y-4">
        <p className="text-2xl font-black neon-text">ابدأ الآن… وجرّب الفرق بنفسك.</p>
        <p className="text-muted-foreground">خدمة أسرع، أمان أعلى، وتجربة تستحق الثقة.</p>
        <Link
          href="/"
          className="inline-block mt-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          تصفّح خدماتنا
        </Link>
      </div>

    </div>
  );
}
