import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { StepProgress } from "@/components/dev/StepProgress";
import { ColorPicker } from "@/components/dev/ColorPicker";
import { ChevronRight, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevLang } from "@/lib/devI18n";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STEPS_AR = ["نوع التطبيق", "فكرة المشروع", "المنصة والتصميم", "الميزات والميزانية", "مراجعة وإرسال"];
const STEPS_EN = ["App Type", "Project Idea", "Platform & Design", "Features & Budget", "Review & Submit"];
const STEPS_TR = ["Uygulama Türü", "Proje Fikri", "Platform ve Tasarım", "Özellikler ve Bütçe", "İnceleme ve Gönderim"];

type Opt = { ar: string; en: string; tr: string };

const APP_TYPES: Opt[] = [
  { ar: "متجر إلكتروني", en: "Online Store", tr: "E-Ticaret Mağazası" },
  { ar: "تطبيق توصيل", en: "Delivery App", tr: "Teslimat Uygulaması" },
  { ar: "تطبيق حجوزات", en: "Booking App", tr: "Rezervasyon Uygulaması" },
  { ar: "تطبيق خدمات", en: "Services App", tr: "Hizmet Uygulaması" },
  { ar: "تطبيق سيارات", en: "Ride/Car App", tr: "Araç Uygulaması" },
  { ar: "تطبيق عقارات", en: "Real Estate App", tr: "Emlak Uygulaması" },
  { ar: "تطبيق مطاعم", en: "Restaurant App", tr: "Restoran Uygulaması" },
  { ar: "تواصل اجتماعي", en: "Social App", tr: "Sosyal Uygulama" },
  { ar: "تطبيق تعليمي", en: "Educational App", tr: "Eğitim Uygulaması" },
  { ar: "تطبيق أعمال", en: "Business App", tr: "İş Uygulaması" },
  { ar: "تطبيق مخصص", en: "Custom App", tr: "Özel Uygulama" },
  { ar: "نوع آخر", en: "Other Type", tr: "Başka Bir Tür" },
];

const PLATFORMS: Opt[] = [
  { ar: "Android", en: "Android", tr: "Android" },
  { ar: "iOS", en: "iOS", tr: "iOS" },
  { ar: "Android + iOS", en: "Android + iOS", tr: "Android + iOS" },
];

const FEATURES: Opt[] = [
  { ar: "تسجيل الدخول", en: "Login", tr: "Giriş" },
  { ar: "تسجيل بـ Google", en: "Sign in with Google", tr: "Google ile Giriş" },
  { ar: "تسجيل بـ Apple", en: "Sign in with Apple", tr: "Apple ile Giriş" },
  { ar: "إشعارات Push", en: "Push Notifications", tr: "Push Bildirimleri" },
  { ar: "دفع إلكتروني", en: "Online Payment", tr: "Online Ödeme" },
  { ar: "خرائط", en: "Maps", tr: "Haritalar" },
  { ar: "تحديد الموقع", en: "Location Tracking", tr: "Konum Belirleme" },
  { ar: "محادثات", en: "Chat", tr: "Sohbet" },
  { ar: "تقييمات", en: "Ratings & Reviews", tr: "Değerlendirmeler" },
  { ar: "نظام طلبات", en: "Order System", tr: "Sipariş Sistemi" },
  { ar: "لوحة تحكم", en: "Admin Dashboard", tr: "Yönetim Paneli" },
  { ar: "اشتراكات", en: "Subscriptions", tr: "Abonelikler" },
  { ar: "كوبونات وخصومات", en: "Coupons & Discounts", tr: "Kuponlar ve İndirimler" },
  { ar: "تعدد اللغات", en: "Multi-language", tr: "Çok Dilli" },
  { ar: "ميزة مخصصة", en: "Custom Feature", tr: "Özel Özellik" },
];

const DESIGN_OPTIONS: Opt[] = [
  { ar: "نعم، لدي تصميم", en: "Yes, I have a design", tr: "Evet, tasarımım var" },
  { ar: "لا، أحتاج تصميم", en: "No, I need a design", tr: "Hayır, tasarıma ihtiyacım var" },
];

const IDENTITY_OPTIONS: Opt[] = [
  { ar: "نعم، لدي هوية بصرية", en: "Yes, I have a brand identity", tr: "Evet, marka kimliğim var" },
  { ar: "لا، أحتاج تصميم هوية", en: "No, I need an identity designed", tr: "Hayır, kimlik tasarımına ihtiyacım var" },
];

const BUDGETS: Opt[] = [
  { ar: "أقل من 1000$", en: "Under $1000", tr: "1000$'dan az" },
  { ar: "1000$ - 3000$", en: "$1000 - $3000", tr: "1000$ - 3000$" },
  { ar: "3000$ - 5000$", en: "$3000 - $5000", tr: "3000$ - 5000$" },
  { ar: "5000$ - 10000$", en: "$5000 - $10000", tr: "5000$ - 10000$" },
  { ar: "10000$ - 20000$", en: "$10000 - $20000", tr: "10000$ - 20000$" },
  { ar: "أكثر من 20000$", en: "Over $20000", tr: "20000$'dan fazla" },
];

interface FormData {
  appType: string;
  appIdea: string;
  platform: string;
  hasDesign: string;
  hasLogo: string;
  colors: string[];
  similarApp: string;
  features: string[];
  budget: string;
  notes: string;
  phone: string;
  selectedService?: string;
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 text-center ${selected ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]" : "bg-card/60 border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
      {label}
    </button>
  );
}

export default function MobileAppRequestForm() {
  const { dir, pick, isRtlLang, lang } = useDevLang();
  const STEPS = isRtlLang ? STEPS_AR : lang === "tr" ? STEPS_TR : STEPS_EN;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    appType: "", appIdea: "", platform: "", hasDesign: "", hasLogo: "", colors: [], similarApp: "", features: [], budget: "", notes: "", phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("service")) setForm(f => ({ ...f, selectedService: sp.get("service") || "" }));
  }, []);

  const canNext = () => {
    if (step === 0) return !!form.appType;
    if (step === 1) return !!form.appIdea;
    if (step === 2) return !!form.platform;
    if (step === 3) return form.features.length > 0 && !!form.budget;
    return true;
  };

  const toggleFeature = (f: string) => {
    setForm(prev => ({ ...prev, features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f] }));
  };

  const buildMessage = () => [
    "📱 *طلب تطوير تطبيق جوال*",
    "الخدمة: تطوير وبرمجة تطبيقات الجوال",
    form.selectedService ? `الخدمة المختارة: ${form.selectedService}` : "",
    `نوع التطبيق: ${form.appType}`,
    `المنصة: ${form.platform}`,
    `فكرة التطبيق: ${form.appIdea}`,
    `تصميم جاهز: ${form.hasDesign || "—"}`,
    `شعار وهوية: ${form.hasLogo || "—"}`,
    form.colors.length > 0 ? `الألوان: ${form.colors.join(", ")}` : "",
    form.similarApp ? `تطبيق مشابه: ${form.similarApp}` : "",
    form.features.length > 0 ? `الميزات:\n${form.features.map(f => `• ${f}`).join("\n")}` : "",
    `الميزانية: ${form.budget}`,
    form.notes ? `ملاحظات: ${form.notes}` : "",
    `رقم الهاتف للتواصل: ${form.phone}`,
  ].filter(Boolean).join("\n");

  const handleSubmit = async () => {
    if (!form.phone.trim()) {
      toast({ variant: "destructive", title: pick("خطأ", "Error", "Hata"), description: pick("الرجاء إدخال رقم هاتفك مع مفتاح الدولة ليتم التواصل معك", "Please enter your phone number with the country code so we can contact you", "Sizinle iletişime geçebilmemiz için lütfen ülke koduyla telefon numaranızı girin") });
      setStep(4);
      return;
    }
    setSending(true);
    try {
      await fetch(`${API_BASE}/api/dev/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "mobile_apps", answers: form, selectedServiceCard: form.selectedService }),
      });
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "mobile_app_dev", phone: form.phone.trim(), message: buildMessage() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || pick("تعذر إرسال الطلب", "Couldn't send the request", "Talep gönderilemedi"));
      setSubmitted(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: pick("خطأ", "Error", "Hata"), description: err.message ?? pick("تعذر إرسال الطلب، حاول مرة أخرى", "Couldn't send the request, please try again", "Talep gönderilemedi, lütfen tekrar deneyin") });
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir={dir}>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{pick("تم إرسال طلبك بنجاح!", "Your request has been sent!", "Talebiniz başarıyla gönderildi!")}</h2>
          <p className="text-muted-foreground">{pick("سيتواصل معك فريقنا لمناقشة مشروعك في أقرب وقت.", "Our team will contact you to discuss your project soon.", "Ekibimiz projenizi görüşmek için en kısa sürede sizinle iletişime geçecek.")}</p>
          <button onClick={() => navigate("/dev/mobile-apps")} className="w-full py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors">
            {pick("العودة لصفحة الخدمات", "Back to Services", "Hizmetler Sayfasına Dön")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Helmet><title>{pick("طلب تطوير تطبيق جوال", "Mobile App Development Request", "Mobil Uygulama Geliştirme Talebi")} | {pick("الغريب كارد", "AlGhareeb Card", "AlGhareeb Card")}</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dev/mobile-apps")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
          <ChevronRight className="w-4 h-4" />
          {step > 0 ? pick("الخطوة السابقة", "Previous Step", "Önceki Adım") : pick("العودة", "Back", "Geri")}
        </button>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-6">

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{pick("ما نوع التطبيق الذي تريد؟", "What type of app do you want?", "Ne tür bir uygulama istiyorsunuz?")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {APP_TYPES.map(t => <OptionButton key={t.ar} label={pick(t.ar, t.en, t.tr)} selected={form.appType === t.ar} onClick={() => setForm(f => ({ ...f, appType: t.ar }))} />)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{pick("ما فكرة التطبيق؟", "What's the app idea?", "Uygulama fikri nedir?")}</h2>
              <textarea
                value={form.appIdea}
                onChange={e => setForm(f => ({ ...f, appIdea: e.target.value }))}
                placeholder={pick("اشرح فكرة تطبيقك بالتفصيل... ما المشكلة التي يحلها؟ من هم المستخدمون؟", "Explain your app idea in detail... What problem does it solve? Who are the users?", "Uygulama fikrinizi detaylıca açıklayın... Hangi sorunu çözüyor? Kullanıcılar kimler?")}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">{pick("المنصة والتصميم", "Platform & Design", "Platform ve Tasarım")}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("المنصات المطلوبة", "Required Platforms", "Gerekli Platformlar")} <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => <OptionButton key={p.ar} label={pick(p.ar, p.en, p.tr)} selected={form.platform === p.ar} onClick={() => setForm(f => ({ ...f, platform: p.ar }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("هل لديك تصميم جاهز؟", "Do you have a ready design?", "Hazır bir tasarımınız var mı?")}</label>
                <div className="flex gap-3 flex-wrap">
                  {DESIGN_OPTIONS.map(o => <OptionButton key={o.ar} label={pick(o.ar, o.en, o.tr)} selected={form.hasDesign === o.ar} onClick={() => setForm(f => ({ ...f, hasDesign: o.ar }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("هل لديك شعار وهوية بصرية؟", "Do you have a logo and brand identity?", "Logonuz ve marka kimliğiniz var mı?")}</label>
                <div className="flex gap-3 flex-wrap">
                  {IDENTITY_OPTIONS.map(o => <OptionButton key={o.ar} label={pick(o.ar, o.en, o.tr)} selected={form.hasLogo === o.ar} onClick={() => setForm(f => ({ ...f, hasLogo: o.ar }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("الألوان المطلوبة", "Preferred Colors", "Tercih Edilen Renkler")}</label>
                <ColorPicker value={form.colors} onChange={colors => setForm(f => ({ ...f, colors }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("هل لديك تطبيق مشابه؟", "Do you have a similar app in mind?", "Aklınızda benzer bir uygulama var mı?")}</label>
                <input value={form.similarApp} onChange={e => setForm(f => ({ ...f, similarApp: e.target.value }))} placeholder={pick("اسم التطبيق أو رابطه...", "App name or link...", "Uygulama adı veya bağlantısı...")} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">{pick("الميزات والميزانية", "Features & Budget", "Özellikler ve Bütçe")}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("الميزات المطلوبة", "Required Features", "Gerekli Özellikler")} <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(f => <OptionButton key={f.ar} label={pick(f.ar, f.en, f.tr)} selected={form.features.includes(f.ar)} onClick={() => toggleFeature(f.ar)} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("الميزانية التقريبية", "Approximate Budget", "Yaklaşık Bütçe")} <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGETS.map(b => (
                    <OptionButton key={b.ar} label={pick(b.ar, b.en, b.tr)} selected={form.budget === b.ar} onClick={() => setForm(f => ({ ...f, budget: b.ar }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">{pick("ملاحظات إضافية", "Additional Notes", "Ek Notlar")}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={pick("أي تفاصيل إضافية...", "Any additional details...", "Ek detaylar...")} rows={3} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{pick("مراجعة طلبك", "Review Your Request", "Talebinizi İnceleyin")}</h2>
              <div className="space-y-3">
                {[
                  { label: pick("نوع التطبيق", "App Type", "Uygulama Türü"), value: pick(form.appType, APP_TYPES.find(t => t.ar === form.appType)?.en || form.appType, APP_TYPES.find(t => t.ar === form.appType)?.tr || form.appType) },
                  { label: pick("المنصة", "Platform", "Platform"), value: form.platform },
                  { label: pick("فكرة التطبيق", "App Idea", "Uygulama Fikri"), value: form.appIdea },
                  { label: pick("تصميم جاهز", "Ready Design", "Hazır Tasarım"), value: form.hasDesign ? pick(form.hasDesign, DESIGN_OPTIONS.find(o => o.ar === form.hasDesign)?.en || form.hasDesign, DESIGN_OPTIONS.find(o => o.ar === form.hasDesign)?.tr || form.hasDesign) : "—" },
                  { label: pick("شعار وهوية", "Logo & Identity", "Logo ve Kimlik"), value: form.hasLogo ? pick(form.hasLogo, IDENTITY_OPTIONS.find(o => o.ar === form.hasLogo)?.en || form.hasLogo, IDENTITY_OPTIONS.find(o => o.ar === form.hasLogo)?.tr || form.hasLogo) : "—" },
                  { label: pick("الألوان", "Colors", "Renkler"), value: form.colors.length > 0 ? form.colors.join(", ") : "—" },
                  { label: pick("تطبيق مشابه", "Similar App", "Benzer Uygulama"), value: form.similarApp || "—" },
                  { label: pick("الميزات", "Features", "Özellikler"), value: form.features.length > 0 ? form.features.map(fa => pick(fa, FEATURES.find(f => f.ar === fa)?.en || fa, FEATURES.find(f => f.ar === fa)?.tr || fa)).join(pick("، ", ", ", ", ")) : "—" },
                  { label: pick("الميزانية", "Budget", "Bütçe"), value: pick(form.budget, BUDGETS.find(b => b.ar === form.budget)?.en || form.budget, BUDGETS.find(b => b.ar === form.budget)?.tr || form.budget) },
                  { label: pick("ملاحظات", "Notes", "Notlar"), value: form.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground text-sm shrink-0 w-28">{row.label}</span>
                    <span className="text-foreground text-sm font-medium text-left flex-1 break-words">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium block">{pick("رقم هاتفك للتواصل (مع مفتاح الدولة)", "Your phone number (with country code)", "Telefon numaranız (ülke koduyla)")} <span className="text-destructive">*</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+963 9xx xxx xxx"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm"
                />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
                {pick("سيتواصل معك فريقنا على رقم هاتفك لمناقشة تفاصيل طلبك.", "Our team will contact you at your phone number to discuss your request details.", "Ekibimiz talep detaylarını görüşmek için telefon numaranızdan sizinle iletişime geçecek.")}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 py-3.5 rounded-xl bg-primary/80 hover:bg-primary text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              {pick("التالي", "Next", "İleri")} <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={sending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {pick("إرسال الطلب", "Send Request", "Talebi Gönder")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
