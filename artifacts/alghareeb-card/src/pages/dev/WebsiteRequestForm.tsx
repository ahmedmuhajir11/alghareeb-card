import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { StepProgress } from "@/components/dev/StepProgress";
import { ColorPicker } from "@/components/dev/ColorPicker";
import { ChevronRight, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const STEPS = ["نوع المشروع", "فكرة المشروع", "التصميم والهوية", "الميزات والميزانية", "مراجعة وإرسال"];

const SITE_TYPES = ["متجر إلكتروني","موقع شركة","موقع مطعم","موقع عقارات","منصة حجز","موقع خدمات","موقع مدونة","موقع شخصي","منصة إلكترونية","نوع مخصص"];
const GOALS = ["بيع المنتجات","عرض الخدمات","استقبال الطلبات","حجز المواعيد","بناء علامة تجارية","عرض المنتجات","منصة رقمية","هدف آخر"];
const FEATURES = ["تسجيل دخول","لوحة تحكم","دفع إلكتروني","إشعارات","دردشة مباشرة","خرائط","نظام حجز","نظام طلبات","تعدد اللغات","تعدد العملات","قاعدة بيانات","ميزة مخصصة"];

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
      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 text-right ${
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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    siteType: "", goal: "", projectName: "", hasLogo: "", colors: [], inspirationUrl: "", features: [], budget: "", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/settings`).then(r => r.json()).then(d => setWhatsapp(d.whatsappNumber || "")).catch(() => {});
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
    ].filter(Boolean).join("\n");
    return lines;
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      await fetch(`${API_BASE}/api/dev/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "websites", answers: form, selectedServiceCard: form.selectedService }),
      });
    } catch {}
    const msg = buildWhatsAppMessage();
    const num = whatsapp.replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
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
          <h2 className="text-2xl font-bold text-foreground">تم إرسال طلبك بنجاح!</h2>
          <p className="text-muted-foreground">سيتواصل معك فريقنا في أقرب وقت ممكن لمناقشة تفاصيل مشروعك.</p>
          <button onClick={() => navigate("/dev/websites")} className="w-full py-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-colors">
            العودة لصفحة الخدمات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet><title>طلب تطوير موقع | الغريب كارد</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dev/websites")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
          <ChevronRight className="w-4 h-4" />
          {step > 0 ? "الخطوة السابقة" : "العودة"}
        </button>

        <StepProgress steps={STEPS} currentStep={step} />

        <div className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-6">

          {/* STEP 0 — Site Type */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">ما نوع الموقع الذي تريد؟</h2>
              <div className="grid grid-cols-2 gap-2">
                {SITE_TYPES.map(t => (
                  <OptionButton key={t} label={t} selected={form.siteType === t} onClick={() => setForm(f => ({ ...f, siteType: t }))} />
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Project Idea */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">ما الهدف من الموقع؟</h2>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map(g => (
                  <OptionButton key={g} label={g} selected={form.goal === g} onClick={() => setForm(f => ({ ...f, goal: g }))} />
                ))}
              </div>
              <div className="space-y-3 mt-4">
                <label className="text-sm font-medium text-foreground block">اسم المشروع (اختياري)</label>
                <input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} placeholder="اكتب اسم مشروعك..." className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" />
              </div>
            </div>
          )}

          {/* STEP 2 — Design & Identity */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">التصميم والهوية البصرية</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">هل لديك شعار؟</label>
                <div className="flex gap-3">
                  {["نعم، لدي شعار","لا، أحتاج تصميم شعار"].map(opt => (
                    <OptionButton key={opt} label={opt} selected={form.hasLogo === opt} onClick={() => setForm(f => ({ ...f, hasLogo: opt }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">ما الألوان التي تفضلها؟</label>
                <ColorPicker value={form.colors} onChange={colors => setForm(f => ({ ...f, colors }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">هل لديك موقع يعجبك؟ (اختياري)</label>
                <input value={form.inspirationUrl} onChange={e => setForm(f => ({ ...f, inspirationUrl: e.target.value }))} placeholder="https://example.com" className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm" dir="ltr" />
              </div>
            </div>
          )}

          {/* STEP 3 — Features & Budget */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">الميزات والميزانية</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">ما الميزات التي تحتاجها؟ <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(f => (
                    <OptionButton key={f} label={f} selected={form.features.includes(f)} onClick={() => toggleFeature(f)} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">الميزانية التقريبية <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {["أقل من 500$","500$ - 1000$","1000$ - 3000$","3000$ - 5000$","5000$ - 10000$","أكثر من 10000$"].map(b => (
                    <OptionButton key={b} label={b} selected={form.budget === b} onClick={() => setForm(f => ({ ...f, budget: b }))} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">ملاحظات إضافية (اختياري)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي تفاصيل إضافية تريد إضافتها..." rows={4} className="w-full px-4 py-3 rounded-xl bg-card/60 border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm resize-none" />
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">مراجعة طلبك</h2>
              <div className="space-y-3">
                {[
                  { label: "نوع الموقع", value: form.siteType },
                  { label: "الهدف", value: form.goal },
                  { label: "اسم المشروع", value: form.projectName || "—" },
                  { label: "الشعار", value: form.hasLogo || "—" },
                  { label: "الألوان", value: form.colors.length > 0 ? form.colors.join(", ") : "—" },
                  { label: "موقع مشابه", value: form.inspirationUrl || "—" },
                  { label: "الميزات", value: form.features.length > 0 ? form.features.join("، ") : "—" },
                  { label: "الميزانية", value: form.budget },
                  { label: "ملاحظات", value: form.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground text-sm shrink-0 w-28">{row.label}</span>
                    <span className="text-foreground text-sm font-medium text-left flex-1">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
                بعد الإرسال ستفتح محادثة WhatsApp مع فريقنا تحتوي على تفاصيل طلبك.
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
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-l from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال عبر WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
