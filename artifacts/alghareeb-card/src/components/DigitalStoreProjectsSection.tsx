import { useState, useEffect } from "react";
import { ShoppingCart, Wallet, Cpu, Rocket, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const FEATURES = [
  {
    icon: ShoppingCart,
    title: "متجر إلكتروني جاهز",
    desc: "متجر احترافي وسريع ومنظم لشحن الألعاب والتطبيقات والخدمات الرقمية، بتجربة مشابهة لمنصة الغريب كارد.",
  },
  {
    icon: Wallet,
    title: "أسعار جملة وفرصة لتحقيق الأرباح",
    desc: "يمكنك الاستفادة من أسعار الجملة وتحديد أسعار البيع الخاصة بك بما يناسب مشروعك.",
  },
  {
    icon: Cpu,
    title: "بدون خبرة برمجية",
    desc: "لا تحتاج إلى معرفة بالبرمجة أو التعامل مع الأكواد. نحن نتولى الجانب التقني وتجهيز المشروع لك.",
  },
];

export default function DigitalStoreProjectsSection() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState("مشاريع شحن رقمية جاهزة");
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/settings`)
      .then(r => r.json())
      .then(d => setTitle(d?.digitalStoreHeroTitle || "مشاريع شحن رقمية جاهزة"))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = phone.trim();
    if (!value) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الهاتف مع مفتاح الدولة", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/digital-store-projects/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر إرسال الطلب");
      setSent(true);
      setPhone("");
      toast({ title: "✅ تم إرسال طلبك", description: "سيتواصل معك فريقنا في أقرب وقت." });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message ?? "تعذر إرسال الطلب، حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden mb-8 mt-4 rounded-2xl border border-[hsl(var(--gold)/0.25)] shadow-[0_0_40px_hsl(var(--gold)/0.08)]"
      style={{ background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 60%, hsl(var(--card)) 100%)" }}
    >
      {/* Subtle tech / e-commerce inspired background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dsp-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="hsl(var(--gold))" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dsp-grid)" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[hsl(var(--primary)/0.18)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--gold)/0.15)] blur-3xl" />

      <div className="relative z-10 p-5 md:p-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold)/0.4)] text-[hsl(var(--gold))] text-xs font-bold mb-4">
            <Rocket className="w-3.5 h-3.5" />
            {title}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gradient-gold mb-3 leading-tight">
            هل تريد دخول عالم التجارة الإلكترونية والاستفادة من سوق شحن الألعاب والتطبيقات؟
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            نحن نختصر عليك الطريق بالكامل. لا تحتاج إلى خبرة برمجية، ولا تحتاج إلى البحث عن الموردين أو بناء المشروع من الصفر.
            نحضّر لك متجرًا إلكترونيًا متكاملًا وجاهزًا للعمل، لتبدأ مشروعك الخاص في مجال شحن الألعاب والتطبيقات والخدمات الرقمية.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="neon-border rounded-xl bg-card/60 p-5 flex flex-col items-center text-center gap-3 hover:border-[hsl(var(--gold)/0.6)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold)/0.4)] flex items-center justify-center text-[hsl(var(--gold))] gold-glow">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground text-base">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div className="max-w-md mx-auto">
          <div className="neon-border rounded-2xl bg-card/70 p-5 md:p-7 text-center">
            <h3 className="text-lg md:text-xl font-black text-foreground mb-2">ابدأ مشروعك الآن</h3>
            <p className="text-muted-foreground text-xs md:text-sm mb-5 leading-relaxed">
              اترك رقم هاتفك مع مفتاح الدولة، وسيتواصل معك فريقنا لشرح التفاصيل والإجابة عن استفساراتك.
            </p>

            {sent ? (
              <div className="flex flex-col items-center gap-2 py-4 text-[hsl(var(--gold))]">
                <CheckCircle2 className="w-10 h-10" />
                <p className="font-bold text-foreground">تم استلام طلبك بنجاح</p>
                <p className="text-muted-foreground text-xs">سيتواصل معك فريقنا قريبًا.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3" dir="ltr">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+963 9xx xxx xxx"
                  className="text-center bg-background/60 border-[hsl(var(--gold)/0.3)] focus-visible:ring-[hsl(var(--gold))]"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, hsl(var(--gold-dark)), hsl(var(--gold)))" }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال الطلب
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
