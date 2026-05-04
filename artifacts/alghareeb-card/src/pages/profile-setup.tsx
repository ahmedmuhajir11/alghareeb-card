import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Lock, User, Phone, Globe, Coins } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const CURRENCIES = [
  { value: "USD", label: "دولار أمريكي", symbol: "$" },
  { value: "EUR", label: "يورو", symbol: "€" },
  { value: "TRY", label: "ليرة تركية", symbol: "₺" },
  { value: "SYP", label: "ليرة سورية", symbol: "ل.س" },
  { value: "OMR", label: "ريال عماني", symbol: "ر.ع" },
  { value: "MAD", label: "درهم مغربي", symbol: "د.م" },
  { value: "DZD", label: "دينار جزائري", symbol: "د.ج" },
  { value: "ILS", label: "شيكل", symbol: "₪" },
  { value: "IQD", label: "دينار عراقي", symbol: "ع.د" },
  { value: "SAR", label: "ريال سعودي", symbol: "ر.س" },
];

const COUNTRY_CURRENCY: Record<string, string> = {
  "الولايات المتحدة": "USD",
  "ألمانيا": "EUR",
  "سوريا": "SYP",
  "تركيا": "TRY",
  "عُمان": "OMR",
  "المغرب": "MAD",
  "الجزائر": "DZD",
  "فلسطين": "ILS",
  "العراق": "IQD",
  "السعودية": "SAR",
};

const COUNTRIES = [
  { name: "سوريا", code: "+963", flag: "🇸🇾" },
  { name: "تركيا", code: "+90", flag: "🇹🇷" },
  { name: "السعودية", code: "+966", flag: "🇸🇦" },
  { name: "الإمارات", code: "+971", flag: "🇦🇪" },
  { name: "العراق", code: "+964", flag: "🇮🇶" },
  { name: "مصر", code: "+20", flag: "🇪🇬" },
  { name: "الأردن", code: "+962", flag: "🇯🇴" },
  { name: "الكويت", code: "+965", flag: "🇰🇼" },
  { name: "قطر", code: "+974", flag: "🇶🇦" },
  { name: "البحرين", code: "+973", flag: "🇧🇭" },
  { name: "عُمان", code: "+968", flag: "🇴🇲" },
  { name: "لبنان", code: "+961", flag: "🇱🇧" },
  { name: "اليمن", code: "+967", flag: "🇾🇲" },
  { name: "فلسطين", code: "+970", flag: "🇵🇸" },
  { name: "ليبيا", code: "+218", flag: "🇱🇾" },
  { name: "تونس", code: "+216", flag: "🇹🇳" },
  { name: "الجزائر", code: "+213", flag: "🇩🇿" },
  { name: "المغرب", code: "+212", flag: "🇲🇦" },
  { name: "السودان", code: "+249", flag: "🇸🇩" },
  { name: "موريتانيا", code: "+222", flag: "🇲🇷" },
  { name: "الصومال", code: "+252", flag: "🇸🇴" },
  { name: "ألمانيا", code: "+49", flag: "🇩🇪" },
  { name: "فرنسا", code: "+33", flag: "🇫🇷" },
  { name: "المملكة المتحدة", code: "+44", flag: "🇬🇧" },
  { name: "الولايات المتحدة", code: "+1", flag: "🇺🇸" },
  { name: "كندا", code: "+1", flag: "🇨🇦" },
  { name: "أستراليا", code: "+61", flag: "🇦🇺" },
  { name: "السويد", code: "+46", flag: "🇸🇪" },
  { name: "هولندا", code: "+31", flag: "🇳🇱" },
  { name: "النرويج", code: "+47", flag: "🇳🇴" },
  { name: "الدنمارك", code: "+45", flag: "🇩🇰" },
  { name: "فنلندا", code: "+358", flag: "🇫🇮" },
  { name: "بلجيكا", code: "+32", flag: "🇧🇪" },
  { name: "سويسرا", code: "+41", flag: "🇨🇭" },
  { name: "النمسا", code: "+43", flag: "🇦🇹" },
  { name: "إسبانيا", code: "+34", flag: "🇪🇸" },
  { name: "إيطاليا", code: "+39", flag: "🇮🇹" },
  { name: "البرتغال", code: "+351", flag: "🇵🇹" },
  { name: "اليونان", code: "+30", flag: "🇬🇷" },
  { name: "بولندا", code: "+48", flag: "🇵🇱" },
  { name: "رومانيا", code: "+40", flag: "🇷🇴" },
  { name: "روسيا", code: "+7", flag: "🇷🇺" },
  { name: "أوكرانيا", code: "+380", flag: "🇺🇦" },
  { name: "إيران", code: "+98", flag: "🇮🇷" },
  { name: "باكستان", code: "+92", flag: "🇵🇰" },
  { name: "الهند", code: "+91", flag: "🇮🇳" },
  { name: "الصين", code: "+86", flag: "🇨🇳" },
  { name: "اليابان", code: "+81", flag: "🇯🇵" },
  { name: "كوريا الجنوبية", code: "+82", flag: "🇰🇷" },
  { name: "إندونيسيا", code: "+62", flag: "🇮🇩" },
  { name: "ماليزيا", code: "+60", flag: "🇲🇾" },
  { name: "سنغافورة", code: "+65", flag: "🇸🇬" },
  { name: "تايلاند", code: "+66", flag: "🇹🇭" },
  { name: "البرازيل", code: "+55", flag: "🇧🇷" },
  { name: "الأرجنتين", code: "+54", flag: "🇦🇷" },
  { name: "المكسيك", code: "+52", flag: "🇲🇽" },
  { name: "نيجيريا", code: "+234", flag: "🇳🇬" },
  { name: "جنوب أفريقيا", code: "+27", flag: "🇿🇦" },
  { name: "كينيا", code: "+254", flag: "🇰🇪" },
  { name: "أذربيجان", code: "+994", flag: "🇦🇿" },
  { name: "أوزبكستان", code: "+998", flag: "🇺🇿" },
  { name: "كازاخستان", code: "+7", flag: "🇰🇿" },
];

export default function ProfileSetupPage() {
  const { user, isLoaded, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [currencyLocked, setCurrencyLocked] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setLocation("/sign-in"); return; }
    if (user.country) setCountry(user.country);
    if (user.phone) setPhone(user.phone);
    if (user.currency) setCurrency(user.currency);
    if (user.profileCompleted) setCurrencyLocked(true);
  }, [isLoaded, user]);

  const selectedCountry = COUNTRIES.find(c => c.name === country);
  const phoneCode = selectedCountry?.code ?? "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!country || !phone || !currency) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ country, phone, phoneCode, currency }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "حدث خطأ أثناء الحفظ");
      }
      await refetch();
      toast({ title: "تم الحفظ بنجاح", description: "اكتمل ملفك الشخصي" });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir="rtl">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="الغريب كارد" className="h-12 w-auto object-contain" />
        <span className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          الغريب كارد
        </span>
      </Link>

      <div className="w-full max-w-md bg-card border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-900/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">إكمال الملف الشخصي</h1>
            <p className="text-sm text-muted-foreground">أدخل بياناتك لتفعيل حسابك</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Globe className="w-4 h-4 text-purple-400" /> الدولة
            </Label>
            <Select value={country} onValueChange={(v) => {
              setCountry(v);
              if (!currencyLocked && COUNTRY_CURRENCY[v]) setCurrency(COUNTRY_CURRENCY[v]);
            }} required>
              <SelectTrigger className="w-full bg-[#0f0f1a] border-purple-500/30 text-white h-11">
                <SelectValue placeholder="اختر دولتك" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-purple-500/30 max-h-60">
                {COUNTRIES.map(c => (
                  <SelectItem key={c.name} value={c.name} className="text-white hover:bg-purple-600/20 focus:bg-purple-600/20">
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span><span>{c.name}</span>
                      <span className="text-muted-foreground text-xs">{c.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Phone className="w-4 h-4 text-purple-400" /> رقم الهاتف
            </Label>
            <div className="flex gap-2" dir="ltr">
              <div className="flex items-center justify-center px-3 bg-[#0f0f1a] border border-purple-500/30 rounded-lg text-sm text-muted-foreground min-w-[70px]">
                {phoneCode || "--"}
              </div>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="501234567"
                className="flex-1 bg-[#0f0f1a] border-purple-500/30 text-white placeholder:text-slate-600 h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Coins className="w-4 h-4 text-purple-400" /> العملة المفضلة
              {currencyLocked && <span className="flex items-center gap-1 text-xs text-amber-400 font-normal mr-auto"><Lock className="w-3 h-3" />مقفلة</span>}
            </Label>
            <Select value={currency} onValueChange={currencyLocked ? undefined : setCurrency} disabled={currencyLocked} required>
              <SelectTrigger className={`w-full bg-[#0f0f1a] border-purple-500/30 text-white h-11 ${currencyLocked ? "opacity-60 cursor-not-allowed" : ""}`}>
                <SelectValue placeholder="اختر العملة" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-purple-500/30">
                {CURRENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-white hover:bg-purple-600/20 focus:bg-purple-600/20">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-purple-400">{c.symbol}</span>
                      <span>{c.value}</span>
                      <span className="text-muted-foreground text-xs">— {c.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-400/80 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {currencyLocked ? "العملة مقفلة ولا يمكن تغييرها" : "تنبيه: لا يمكن تغيير العملة بعد الحفظ"}
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base rounded-xl shadow-lg">
            {saving ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />جاري الحفظ...</div> : "حفظ وإكمال"}
          </Button>
        </form>
      </div>
    </div>
  );
}
