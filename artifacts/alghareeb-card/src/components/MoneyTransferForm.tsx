import { useState } from "react";
import { useGetSettings } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CURRENCIES = ["دولار", "ليرة تركية", "يورو", "سوري"];

export default function MoneyTransferForm() {
  const { data: settings } = useGetSettings();
  const parsedCurrencies = (settings?.moneyTransferCurrencies ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const CURRENCIES = parsedCurrencies.length > 0 ? parsedCurrencies : DEFAULT_CURRENCIES;
  const { toast } = useToast();

  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [cityVillage, setCityVillage] = useState("");
  const [currency, setCurrency] = useState("");

  const handleSubmit = () => {
    if (!recipientName.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال اسم المستلم" });
      return;
    }
    if (!amount.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال المبلغ" });
      return;
    }
    if (!country.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال الدولة" });
      return;
    }
    if (!province.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال المحافظة" });
      return;
    }
    if (!cityVillage.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال المدينة/القرية" });
      return;
    }
    if (!currency) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار العملة" });
      return;
    }

    const rawNumber = settings?.whatsappNumber || "00905378221375";
    const whatsappNumber = rawNumber.replace(/^\+/, "").replace(/^00/, "");

    const message = `لدي حوالة مالية:
اسم المستلم: ${recipientName}
المبلغ: ${amount}
الدولة: ${country}
المحافظة: ${province}
المدينة/القرية: ${cityVillage}
العملة: ${currency}`;

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col items-center gap-4 bg-card/30 p-6 rounded-2xl neon-border text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Banknote className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold neon-text mb-2">الحوالات المالية</h1>
          <p className="text-muted-foreground">أدخل بيانات المستلم وسيتم إرسال طلبك مباشرة عبر واتساب</p>
        </div>
      </div>

      <div className="bg-card/30 p-6 rounded-2xl neon-border space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
          ادخل بيانات المستلم
        </h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">اسم المستلم</label>
          <Input
            placeholder="أدخل اسم المستلم كاملاً"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">المبلغ</label>
          <Input
            placeholder="أدخل المبلغ"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">العملة</label>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="w-full h-12 px-4 rounded-md border border-primary/20 bg-background/50 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="" disabled>اختر العملة</option>
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الدولة</label>
          <Input
            placeholder="أدخل اسم الدولة"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">المحافظة</label>
          <Input
            placeholder="أدخل اسم المحافظة"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={province}
            onChange={e => setProvince(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">المدينة / القرية</label>
          <Input
            placeholder="أدخل اسم المدينة أو القرية"
            className="h-12 text-base bg-background/50 border-primary/20 focus-visible:border-primary"
            value={cityVillage}
            onChange={e => setCityVillage(e.target.value)}
          />
        </div>

        <Button
          className="w-full h-14 text-lg font-bold mt-2 shadow-[0_0_15px_var(--color-primary)] hover:shadow-[0_0_25px_var(--color-primary)] transition-all gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
          onClick={handleSubmit}
        >
          <MessageCircle className="w-6 h-6" />
          إرسال الطلب
        </Button>
      </div>
    </div>
  );
}
