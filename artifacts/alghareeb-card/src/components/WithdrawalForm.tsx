import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const WITHDRAWAL_METHODS = [
  "تحويل بنكي",
  "باي بال (PayPal)",
  "USDT (تيثر)",
  "وايز (Wise)",
  "فودافون كاش",
  "إنستاباي",
  "غير ذلك",
];

export default function WithdrawalForm() {
  const { toast } = useToast();

  const [appName, setAppName] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [withdrawalType, setWithdrawalType] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState("");
  const [estimatedSalary, setEstimatedSalary] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectClass = "w-full h-12 px-4 rounded-md border border-primary/20 bg-background/50 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none cursor-pointer";

  const handleSubmit = async () => {
    if (!appName.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال اسم التطبيق" });
      return;
    }
    if (!username.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال اسم المستخدم داخل التطبيق" });
      return;
    }
    if (!userId.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال المعرف / ID" });
      return;
    }
    if (!withdrawalType) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار نوع السحب" });
      return;
    }
    if (!withdrawalMethod) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار طريقة السحب داخل التطبيق" });
      return;
    }
    if (!estimatedSalary || parseFloat(estimatedSalary) <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال الراتب التقديري بالدولار" });
      return;
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم هاتفك مع مفتاح الدولة ليتم التواصل معك" });
      return;
    }

    const message = `طلب سحب جديد\n\nاسم التطبيق: ${appName}\nاسم المستخدم: ${username}\nالمعرف (ID): ${userId}\nنوع السحب: ${withdrawalType}\nطريقة السحب داخل التطبيق: ${withdrawalMethod}\nالراتب التقديري: $${estimatedSalary}`;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: "salary_withdrawal", phone: phone.trim(), message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "تعذر إرسال الطلب");
      setSubmitted(true);
      toast({ title: "✅ تم إرسال طلبك", description: "سيتواصل معك فريقنا لإتمام عملية السحب." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message ?? "تعذر إرسال الطلب، حاول مرة أخرى" });
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center gap-4 bg-card/30 p-8 rounded-2xl neon-border text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح!</h2>
        <p className="text-muted-foreground text-sm">سيتواصل معك فريقنا على رقم هاتفك لإتمام عملية السحب في أقرب وقت.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col items-center gap-4 bg-card/30 p-6 rounded-2xl neon-border text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
          <DollarSign className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold neon-text mb-2">سحب رواتب المضيفين</h1>
          <p className="text-muted-foreground">أدخل بياناتك وسيتواصل معك فريقنا لإتمام عملية السحب</p>
        </div>
      </div>

      <div className="bg-card/30 p-6 rounded-2xl neon-border space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
          بيانات الطلب
        </h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">اسم التطبيق</label>
          <Input
            placeholder="أدخل اسم التطبيق"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={appName}
            onChange={e => setAppName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المستخدم داخل التطبيق</label>
          <Input
            placeholder="أدخل اسمك كما هو في التطبيق"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">المعرف / ID</label>
          <Input
            placeholder="أدخل الـ ID الخاص بك"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">نوع السحب</label>
          <select
            value={withdrawalType}
            onChange={e => setWithdrawalType(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>اختر نوع السحب</option>
            <option value="كوينز">كوينز</option>
            <option value="ماسات">ماسات</option>
            <option value="غير ذلك">غير ذلك</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">طرق السحب داخل التطبيق</label>
          <select
            value={withdrawalMethod}
            onChange={e => setWithdrawalMethod(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>اذكر طرق السحب المتاحة في التطبيق مثل USDT الخ</option>
            {WITHDRAWAL_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الراتب التقديري بالدولار</label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="أدخل راتبك التقريبي بالدولار ($)"
              className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary pl-10"
              value={estimatedSalary}
              onChange={e => setEstimatedSalary(e.target.value)}
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">$</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">رقم هاتفك للتواصل (مع مفتاح الدولة)</label>
          <Input
            type="tel"
            placeholder="+963 9xx xxx xxx"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            dir="ltr"
          />
        </div>

        <Button
          className="w-full h-14 text-lg font-bold mt-2 shadow-[0_0_15px_var(--color-primary)] hover:shadow-[0_0_25px_var(--color-primary)] transition-all gap-2"
          onClick={handleSubmit}
          disabled={sending}
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          إرسال الطلب
        </Button>
      </div>
    </div>
  );
}
