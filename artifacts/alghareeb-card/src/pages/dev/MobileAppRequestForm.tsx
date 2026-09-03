import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { StepProgress } from "@/components/dev/StepProgress";
import { ColorPicker } from "@/components/dev/ColorPicker";
import { ChevronRight, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const STEPS = ["نوع التطبيق", "فكرة المشروع", "المنصة والتصميم", "الميزات والميزانية", "مراجعة وإرسال"];

const APP_TYPES = ["متجر إلكتروني","تطبيق توصيل","تطبيق حجوزات","تطبيق خدمات","تطبيق سيارات","تطبيق عقارات","تطبيق مطاعم","تواصل اجتماعي","تطبيق تعليمي","تطبيق أعمال","تطبيق مخصص","نوع آخر"];
const PLATFORMS = ["Android","iOS","Android + iOS"];
const FEATURES = ["تسجيل الدخول","تسجيل بـ Google","تسجيل بـ Apple","إشعارات Push","دفع إلكتروني","خرائط","تحديد الموقع","محادثات","تقييمات","نظام طلبات","لوحة تحكم","اشتراكات","كوبونات وخصومات","تعدد اللغات","ميزة مخصصة"];

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
  selectedService?: string;
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 text-right ${selected ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]" : "bg-card/60 border-border/40 text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
      {label}
    </button>
  );
}

export default function MobileAppRequestForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    appType: "", appIdea: "", platform: "", hasDesign: "", hasLogo: "", colors: [], similarApp: "", features: [], budget: "", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/settings`).then(r => r.json()).then(d => setWhatsapp(d.whatsappNumber || "")).catch(() => {});
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
  ].filter(Boolean).join("\n");

  const handleSubmit = async () => {
    setSending(true);
    try {
      await fetch(`${API_BASE}/api/dev/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "mobile_apps", answers: form, selectedServiceCard: form.selectedService }),
      });
    } catch {}
    const num = whatsapp.replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(buildMessage())}`, "_blank");
    setSubmitted(true);
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">تم إرسال طلبك بنجاح!</h2>
          <p className="text-muted-foreground">سيتواصل معك فريقنا لمناقشة مشروعك في أقرب وقت.</p>
          <button onClick={() => navigate("/dev/mobile-apps")} className="w-full py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors">
            العودة لصفحة الخدمات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet><title>طلب تطوير تطبيق جوال | الغريب كارد</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dev/mobile-apps")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
          <ChevronRight className="w-4 h-4" />
          {step > 0 ? "الخطوة السابقة" : "العودة"}
        </button>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-6">

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">ما نوع التطبيق الذي تريد؟</h2>
              <div className="grid grid-cols-2 gap-2">
                {APP_TYPES.map(t => <OptionButton key={t} label={t} selected={form.appType === t} onClick={() => setForm(f => ({ ...f, appType: t }))} />)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">ما فكرة التطبيق؟</h2>
              <textarea
                value={form.appIdea}
                onChange={e => setForm(f => ({ ...f, appIdea: e.target.value }))}
                placeholder="اشرح فكرة تطبيقك بالتفصيل... ما المشكلة التي يحلها؟ من هم المستخدمون؟"
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">المنصة والتصميم</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium block">المنصات المطلوبة <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => <OptionButton key={p} label={p} selected={form.platform === p} onClick={() => setForm(f => ({ ...f, platform: p }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">هل لديك تصميم جاهز؟</label>
                <div className="flex gap-3 flex-wrap">
                  {["نعم، لدي تصميم","لا، أحتاج تصميم"].map(o => <OptionButton key={o} label={o} selected={form.hasDesign === o} onClick={() => setForm(f => ({ ...f, hasDesign: o }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">هل لديك شعار وهوية بصرية؟</label>
                <div className="flex gap-3 flex-wrap">
                  {["نعم، لدي هوية بصرية","لا، أحتاج تصميم هوية"].map(o => <OptionButton key={o} label={o} selected={form.hasLogo === o} onClick={() => setForm(f => ({ ...f, hasLogo: o }))} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">الألوان المطلوبة</label>
                <ColorPicker value={form.colors} onChange={colors => setForm(f => ({ ...f, colors }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">هل لديك تطبيق مشابه؟</label>
                <input value={form.similarApp} onChange={e => setForm(f => ({ ...f, similarApp: e.target.value }))} placeholder="اسم التطبيق أو رابطه..." className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">الميزات والميزانية</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium block">الميزات المطلوبة <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(f => <OptionButton key={f} label={f} selected={form.features.includes(f)} onClick={() => toggleFeature(f)} />)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">الميزانية التقريبية <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {["أقل من 1000$","1000$ - 3000$","3000$ - 5000$","5000$ - 10000$","10000$ - 20000$","أكثر من 20000$"].map(b => (
                    <OptionButton key={b} label={b} selected={form.budget === b} onClick={() => setForm(f => ({ ...f, budget: b }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">ملاحظات إضافية</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي تفاصيل إضافية..." rows={3} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">مراجعة طلبك</h2>
              <div className="space-y-3">
                {[
                  { label: "نوع التطبيق", value: form.appType },
                  { label: "المنصة", value: form.platform },
                  { label: "فكرة التطبيق", value: form.appIdea },
                  { label: "تصميم جاهز", value: form.hasDesign || "—" },
                  { label: "شعار وهوية", value: form.hasLogo || "—" },
                  { label: "الألوان", value: form.colors.length > 0 ? form.colors.join(", ") : "—" },
                  { label: "تطبيق مشابه", value: form.similarApp || "—" },
                  { label: "الميزات", value: form.features.length > 0 ? form.features.join("، ") : "—" },
                  { label: "الميزانية", value: form.budget },
                  { label: "ملاحظات", value: form.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground text-sm shrink-0 w-28">{row.label}</span>
                    <span className="text-foreground text-sm font-medium text-left flex-1 break-words">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
                بعد الإرسال ستفتح محادثة WhatsApp مع فريقنا تحتوي على تفاصيل طلبك.
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
              className="flex-1 py-3.5 rounded-xl bg-primary/80 hover:bg-primary text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              التالي <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={sending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال عبر WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
