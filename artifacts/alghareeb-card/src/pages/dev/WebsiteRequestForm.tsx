import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { StepProgress } from "@/components/dev/StepProgress";
import { ColorPicker } from "@/components/dev/ColorPicker";
import { ChevronRight, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevLang } from "@/lib/devI18n";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STEPS_AR = ["نوع المشروع", "فكرة المشروع", "التصميم والهوية", "الميزات والميزانية", "مراجعة وإرسال"];
const STEPS_EN = ["Project Type", "Project Idea", "Design & Identity", "Features & Budget", "Review & Submit"];
const STEPS_TR = ["Proje Türü", "Proje Fikri", "Tasarım ve Kimlik", "Özellikler ve Bütçe", "İnceleme ve Gönderim"];

// Each option keeps a canonical Arabic value (stored in form state / sent to
// staff via WhatsApp) alongside its translated label shown to the visitor.
type Opt = { ar: string; en: string; tr: string };

const SITE_TYPES: Opt[] = [
  { ar: "متجر إلكتروني", en: "Online Store", tr: "E-Ticaret Mağazası" },
  { ar: "موقع شركة", en: "Company Website", tr: "Şirket Sitesi" },
  { ar: "موقع مطعم", en: "Restaurant Website", tr: "Restoran Sitesi" },
  { ar: "موقع عقارات", en: "Real Estate Website", tr: "Emlak Sitesi" },
  { ar: "منصة حجز", en: "Booking Platform", tr: "Rezervasyon Platformu" },
  { ar: "موقع خدمات", en: "Services Website", tr: "Hizmet Sitesi" },
  { ar: "موقع مدونة", en: "Blog", tr: "Blog" },
  { ar: "موقع شخصي", en: "Personal Website", tr: "Kişisel Site" },
  { ar: "منصة إلكترونية", en: "Digital Platform", tr: "Dijital Platform" },
  { ar: "نوع مخصص", en: "Custom Type", tr: "Özel Tür" },
];

const GOALS: Opt[] = [
  { ar: "بيع المنتجات", en: "Sell Products", tr: "Ürün Satmak" },
  { ar: "عرض الخدمات", en: "Showcase Services", tr: "Hizmetleri Sergilemek" },
  { ar: "استقبال الطلبات", en: "Receive Orders", tr: "Sipariş Almak" },
  { ar: "حجز المواعيد", en: "Book Appointments", tr: "Randevu Almak" },
  { ar: "بناء علامة تجارية", en: "Build a Brand", tr: "Marka Oluşturmak" },
  { ar: "عرض المنتجات", en: "Showcase Products", tr: "Ürünleri Sergilemek" },
  { ar: "منصة رقمية", en: "Digital Platform", tr: "Dijital Platform" },
  { ar: "هدف آخر", en: "Other Goal", tr: "Başka Bir Hedef" },
];

const FEATURES: Opt[] = [
  { ar: "تسجيل دخول", en: "Login", tr: "Giriş" },
  { ar: "لوحة تحكم", en: "Admin Dashboard", tr: "Yönetim Paneli" },
  { ar: "دفع إلكتروني", en: "Online Payment", tr: "Online Ödeme" },
  { ar: "إشعارات", en: "Notifications", tr: "Bildirimler" },
  { ar: "دردشة مباشرة", en: "Live Chat", tr: "Canlı Sohbet" },
  { ar: "خرائط", en: "Maps", tr: "Haritalar" },
  { ar: "نظام حجز", en: "Booking System", tr: "Rezervasyon Sistemi" },
  { ar: "نظام طلبات", en: "Order System", tr: "Sipariş Sistemi" },
  { ar: "تعدد اللغات", en: "Multi-language", tr: "Çok Dilli" },
  { ar: "تعدد العملات", en: "Multi-currency", tr: "Çok Para Birimli" },
  { ar: "قاعدة بيانات", en: "Database", tr: "Veritabanı" },
  { ar: "ميزة مخصصة", en: "Custom Feature", tr: "Özel Özellik" },
];

const HAS_LOGO_OPTIONS: Opt[] = [
  { ar: "نعم، لدي شعار", en: "Yes, I have a logo", tr: "Evet, logom var" },
  { ar: "لا، أحتاج تصميم شعار", en: "No, I need a logo designed", tr: "Hayır, logo tasarımına ihtiyacım var" },
];

const BUDGETS: Opt[] = [
  { ar: "أقل من 500$", en: "Under $500", tr: "500$'dan az" },
  { ar: "500$ - 1000$", en: "$500 - $1000", tr: "500$ - 1000$" },
  { ar: "1000$ - 3000$", en: "$1000 - $3000", tr: "1000$ - 3000$" },
  { ar: "3000$ - 5000$", en: "$3000 - $5000", tr: "3000$ - 5000$" },
  { ar: "5000$ - 10000$", en: "$5000 - $10000", tr: "5000$ - 10000$" },
  { ar: "أكثر من 10000$", en: "Over $10000", tr: "10000$'dan fazla" },
];

interface FormData {
  siteType: string;
  goal: string;
  projectName: string;
  hasLogo: string;
  colors: string[];
  inspirationUrl: string;
  features: string[];
  budget: string;
  notes: string;
  phone: string;
  selectedService?: string;
}

interface DynamicQuestion {
  id: number;
  titleAr: string;
  questionType: string;
  options: string[];
  isRequired: boolean;
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 text-center ${
        selected
          ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]"
          : "bg-card/60 border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {label}
    </button>
  );
}

export default function WebsiteRequestForm() {
  const { dir, pick, isRtlLang, lang } = useDevLang();
  const STEPS = isRtlLang ? STEPS_AR : lang === "tr" ? STEPS_TR : STEPS_EN;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    siteType: "", goal: "", projectName: "", hasLogo: "", colors: [], inspirationUrl: "", features: [], budget: "", notes: "", phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/form-questions?type=websites`).then(r => r.json()).then(d => setDynamicQuestions(Array.isArray(d) ? d : [])).catch(() => {});
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("service")) setForm(f => ({ ...f, selectedService: sp.get("service") || "" }));
  }, []);

  const canNext = () => {
    if (step === 0) return !!form.siteType;
    if (step === 1) return !!form.goal;
    if (step === 2) return true;
    if (step === 3) return form.features.length > 0 && !!form.budget;
    return true;
  };

  const toggleFeature = (f: string) => {
    setForm(prev => ({ ...prev, features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f] }));
  };

  const buildWhatsAppMessage = () => {
    const lines = [
      "🌐 *طلب مشروع جديد*",
      "الخدمة: تطوير وبرمجة المواقع",
      form.selectedService ? `الخدمة المختارة: ${form.selectedService}` : "",
      `نوع الموقع: ${form.siteType}`,
      `الهدف: ${form.goal}`,
      form.projectName ? `اسم المشروع: ${form.projectName}` : "",
      `الشعار: ${form.hasLogo || "لم يحدد"}`,
      form.colors.length > 0 ? `الألوان: ${form.colors.join(", ")}` : "",
      form.inspirationUrl ? `موقع مشابه: ${form.inspirationUrl}` : "",
      form.features.length > 0 ? `الميزات: ${form.features.join("، ")}` : "",
      `الميزانية: ${form.budget}`,
      form.notes ? `ملاحظات: ${form.notes}` : "",
      `رقم الهاتف للتواصل: ${form.phone}`,
    ].filter(Boolean).join("\n");
    return lines;
  };

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
        body: JSON.stringify({ serviceType: "websites", answers: form, selectedServiceCard: form.selectedService }),
      });
    } catch {}
    try {
      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "website_dev", phone: form.phone.trim(), message: buildWhatsAppMessage() }),
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
          <h2 className="text-2xl font-bold text-foreground">{pick("تم إرسال طلبك بنجاح!", "Your request has been sent!", "Talebiniz başarıyla gönderildi!")}</h2>
          <p className="text-muted-foreground">{pick("سيتواصل معك فريقنا في أقرب وقت ممكن لمناقشة تفاصيل مشروعك.", "Our team will contact you as soon as possible to discuss your project details.", "Ekibimiz proje detaylarınızı görüşmek için en kısa sürede sizinle iletişime geçecek.")}</p>
          <button onClick={() => navigate("/dev/websites")} className="w-full py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors">
            {pick("العودة لصفحة الخدمات", "Back to Services", "Hizmetler Sayfasına Dön")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Helmet><title>{pick("طلب تطوير موقع", "Website Development Request", "Web Sitesi Geliştirme Talebi")} | {pick("الغريب كارد", "AlGhareeb Card", "AlGhareeb Card")}</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dev/websites")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
          <ChevronRight className="w-4 h-4" />
          {step > 0 ? pick("الخطوة السابقة", "Previous Step", "Önceki Adım") : pick("العودة", "Back", "Geri")}
        </button>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-6">

          {/* STEP 0 — Site Type */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">{pick("ما نوع الموقع الذي تريد؟", "What type of website do you want?", "Ne tür bir web sitesi istiyorsunuz?")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {SITE_TYPES.map(t => (
                  <OptionButton key={t.ar} label={pick(t.ar, t.en, t.tr)} selected={form.siteType === t.ar} onClick={() => setForm(f => ({ ...f, siteType: t.ar }))} />
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Project Idea */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">{pick("ما الهدف من الموقع؟", "What's the goal of the website?", "Web sitesinin amacı nedir?")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(g => (
                  <OptionButton key={g.ar} label={pick(g.ar, g.en, g.tr)} selected={form.goal === g.ar} onClick={() => setForm(f => ({ ...f, goal: g.ar }))} />
                ))}
              </div>
              <div className="space-y-3 mt-4">
                <label className="text-sm font-medium text-foreground block">{pick("اسم المشروع (اختياري)", "Project Name (optional)", "Proje Adı (isteğe bağlı)")}</label>
                <input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder={pick("اكتب اسم مشروعك...", "Type your project name...", "Proje adınızı yazın...")} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" />
              </div>
            </div>
          )}

          {/* STEP 2 — Design & Identity */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">{pick("التصميم والهوية البصرية", "Design & Visual Identity", "Tasarım ve Görsel Kimlik")}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("هل لديك شعار؟", "Do you have a logo?", "Logonuz var mı?")}</label>
                <div className="flex gap-3">
                  {HAS_LOGO_OPTIONS.map(opt => (
                    <OptionButton key={opt.ar} label={pick(opt.ar, opt.en, opt.tr)} selected={form.hasLogo === opt.ar} onClick={() => setForm(f => ({ ...f, hasLogo: opt.ar }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("ما الألوان التي تفضلها؟", "Which colors do you prefer?", "Hangi renkleri tercih edersiniz?")}</label>
                <ColorPicker value={form.colors} onChange={colors => setForm(f => ({ ...f, colors }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("هل لديك موقع يعجبك؟ (اختياري)", "Do you have a website you like? (optional)", "Beğendiğiniz bir web sitesi var mı? (isteğe bağlı)")}</label>
                <input value={form.inspirationUrl} onChange={e => setForm(f => ({ ...f, inspirationUrl: e.target.value }))} placeholder="https://example.com" className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" dir="ltr" />
              </div>
            </div>
          )}

          {/* STEP 3 — Features & Budget */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">{pick("الميزات والميزانية", "Features & Budget", "Özellikler ve Bütçe")}</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("ما الميزات التي تحتاجها؟", "Which features do you need?", "Hangi özelliklere ihtiyacınız var?")} <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(f => (
                    <OptionButton key={f.ar} label={pick(f.ar, f.en, f.tr)} selected={form.features.includes(f.ar)} onClick={() => toggleFeature(f.ar)} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("الميزانية التقريبية", "Approximate Budget", "Yaklaşık Bütçe")} <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {BUDGETS.map(b => (
                    <OptionButton key={b.ar} label={pick(b.ar, b.en, b.tr)} selected={form.budget === b.ar} onClick={() => setForm(f => ({ ...f, budget: b.ar }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">{pick("ملاحظات إضافية (اختياري)", "Additional Notes (optional)", "Ek Notlar (isteğe bağlı)")}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={pick("أي تفاصيل إضافية تريد إضافتها...", "Any additional details you'd like to add...", "Eklemek istediğiniz ek detaylar...")} rows={4} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none" />
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">{pick("مراجعة طلبك", "Review Your Request", "Talebinizi İnceleyin")}</h2>
              <div className="space-y-3">
                {[
                  { label: pick("نوع الموقع", "Website Type", "Web Sitesi Türü"), value: pick(form.siteType, SITE_TYPES.find(t => t.ar === form.siteType)?.en || form.siteType, SITE_TYPES.find(t => t.ar === form.siteType)?.tr || form.siteType) },
                  { label: pick("الهدف", "Goal", "Amaç"), value: pick(form.goal, GOALS.find(g => g.ar === form.goal)?.en || form.goal, GOALS.find(g => g.ar === form.goal)?.tr || form.goal) },
                  { label: pick("اسم المشروع", "Project Name", "Proje Adı"), value: form.projectName || "—" },
                  { label: pick("الشعار", "Logo", "Logo"), value: form.hasLogo ? pick(form.hasLogo, HAS_LOGO_OPTIONS.find(o => o.ar === form.hasLogo)?.en || form.hasLogo, HAS_LOGO_OPTIONS.find(o => o.ar === form.hasLogo)?.tr || form.hasLogo) : "—" },
                  { label: pick("الألوان", "Colors", "Renkler"), value: form.colors.length > 0 ? form.colors.join(", ") : "—" },
                  { label: pick("موقع مشابه", "Similar Website", "Benzer Web Sitesi"), value: form.inspirationUrl || "—" },
                  { label: pick("الميزات", "Features", "Özellikler"), value: form.features.length > 0 ? form.features.map(fa => pick(fa, FEATURES.find(f => f.ar === fa)?.en || fa, FEATURES.find(f => f.ar === fa)?.tr || fa)).join(pick("، ", ", ", ", ")) : "—" },
                  { label: pick("الميزانية", "Budget", "Bütçe"), value: pick(form.budget, BUDGETS.find(b => b.ar === form.budget)?.en || form.budget, BUDGETS.find(b => b.ar === form.budget)?.tr || form.budget) },
                  { label: pick("ملاحظات", "Notes", "Notlar"), value: form.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground text-sm shrink-0 w-28">{row.label}</span>
                    <span className="text-foreground text-sm font-medium text-left flex-1">{row.value}</span>
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

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext() && setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 py-3.5 rounded-xl bg-primary/80 hover:bg-primary text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              {pick("التالي", "Next", "İleri")}
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {pick("إرسال الطلب", "Send Request", "Talebi Gönder")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
