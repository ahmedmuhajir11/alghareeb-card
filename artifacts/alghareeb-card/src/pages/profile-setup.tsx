import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
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
  { name: "سوريا", nameEn: "Syria", code: "+963", flag: "🇸🇾" },
  { name: "تركيا", nameEn: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "السعودية", nameEn: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "الإمارات", nameEn: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "العراق", nameEn: "Iraq", code: "+964", flag: "🇮🇶" },
  { name: "مصر", nameEn: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "الأردن", nameEn: "Jordan", code: "+962", flag: "🇯🇴" },
  { name: "الكويت", nameEn: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "قطر", nameEn: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "البحرين", nameEn: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "عُمان", nameEn: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "لبنان", nameEn: "Lebanon", code: "+961", flag: "🇱🇧" },
  { name: "اليمن", nameEn: "Yemen", code: "+967", flag: "🇾🇲" },
  { name: "فلسطين", nameEn: "Palestine", code: "+970", flag: "🇵🇸" },
  { name: "ليبيا", nameEn: "Libya", code: "+218", flag: "🇱🇾" },
  { name: "تونس", nameEn: "Tunisia", code: "+216", flag: "🇹🇳" },
  { name: "الجزائر", nameEn: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "المغرب", nameEn: "Morocco", code: "+212", flag: "🇲🇦" },
  { name: "السودان", nameEn: "Sudan", code: "+249", flag: "🇸🇩" },
  { name: "موريتانيا", nameEn: "Mauritania", code: "+222", flag: "🇲🇷" },
  { name: "الصومال", nameEn: "Somalia", code: "+252", flag: "🇸🇴" },
  { name: "ألمانيا", nameEn: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "فرنسا", nameEn: "France", code: "+33", flag: "🇫🇷" },
  { name: "المملكة المتحدة", nameEn: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "الولايات المتحدة", nameEn: "United States", code: "+1", flag: "🇺🇸" },
  { name: "كندا", nameEn: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "أستراليا", nameEn: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "السويد", nameEn: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "هولندا", nameEn: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "النرويج", nameEn: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "الدنمارك", nameEn: "Denmark", code: "+45", flag: "🇩🇰" },
  { name: "فنلندا", nameEn: "Finland", code: "+358", flag: "🇫🇮" },
  { name: "بلجيكا", nameEn: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "سويسرا", nameEn: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "النمسا", nameEn: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "إسبانيا", nameEn: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "إيطاليا", nameEn: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "البرتغال", nameEn: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "اليونان", nameEn: "Greece", code: "+30", flag: "🇬🇷" },
  { name: "بولندا", nameEn: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "رومانيا", nameEn: "Romania", code: "+40", flag: "🇷🇴" },
  { name: "روسيا", nameEn: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "أوكرانيا", nameEn: "Ukraine", code: "+380", flag: "🇺🇦" },
  { name: "إيران", nameEn: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "باكستان", nameEn: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "الهند", nameEn: "India", code: "+91", flag: "🇮🇳" },
  { name: "الصين", nameEn: "China", code: "+86", flag: "🇨🇳" },
  { name: "اليابان", nameEn: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "كوريا الجنوبية", nameEn: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "إندونيسيا", nameEn: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "ماليزيا", nameEn: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "سنغافورة", nameEn: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "تايلاند", nameEn: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "البرازيل", nameEn: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "الأرجنتين", nameEn: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "المكسيك", nameEn: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "نيجيريا", nameEn: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "جنوب أفريقيا", nameEn: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "كينيا", nameEn: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "أذربيجان", nameEn: "Azerbaijan", code: "+994", flag: "🇦🇿" },
  { name: "أوزبكستان", nameEn: "Uzbekistan", code: "+998", flag: "🇺🇿" },
  { name: "كازاخستان", nameEn: "Kazakhstan", code: "+7", flag: "🇰🇿" },
];

export default function ProfileSetupPage() {
  const { user, isLoaded, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, dir, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);

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
      toast({ title: t('signIn.error'), description: t('profile.fillAll'), variant: "destructive" });
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
      toast({ title: t('profile.saved'), description: t('profile.complete') });
      setLocation("/");
    } catch (err: any) {
      toast({ title: t('signIn.error'), description: err?.message ?? "حدث خطأ", variant: "destructive" });
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir={dir}>
      <Link href="/" className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="الغريب كارد" className="h-12 w-auto object-contain" />
        <span className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          {t('site.name')}
        </span>
      </Link>

      <div className="w-full max-w-md bg-card border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-900/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{t('profile.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Globe className="w-4 h-4 text-purple-400" /> {t('profile.country')}
            </Label>
            <Select value={country} onValueChange={(v) => {
              setCountry(v);
              if (!currencyLocked && COUNTRY_CURRENCY[v]) setCurrency(COUNTRY_CURRENCY[v]);
            }} required>
              <SelectTrigger className="w-full bg-[#0f0f1a] border-purple-500/30 text-white h-11">
                <SelectValue placeholder={t('profile.selectCountry')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-purple-500/30 max-h-60">
                {COUNTRIES.map(c => (
                  <SelectItem key={c.name} value={c.name} className="text-white hover:bg-purple-600/20 focus:bg-purple-600/20">
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span><span>{isRtlLang ? c.name : c.nameEn}</span>
                      <span className="text-muted-foreground text-xs">{c.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Phone className="w-4 h-4 text-purple-400" /> {t('profile.phone')}
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
              <Coins className="w-4 h-4 text-purple-400" /> {t('profile.currency')}
              {currencyLocked && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-normal ms-auto">
                  <Lock className="w-3 h-3" />{t('profile.locked')}
                </span>
              )}
            </Label>
            <Select value={currency} onValueChange={currencyLocked ? undefined : setCurrency} disabled={currencyLocked} required>
              <SelectTrigger className={`w-full bg-[#0f0f1a] border-purple-500/30 text-white h-11 ${currencyLocked ? "opacity-60 cursor-not-allowed" : ""}`}>
                <SelectValue placeholder={t('profile.selectCurrency')} />
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
              {currencyLocked ? t('profile.currencyLocked') : t('profile.currencyWarning')}
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base rounded-xl shadow-lg">
            {saving
              ? <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('profile.saving')}
                </div>
              : t('profile.save')}
          </Button>
        </form>
      </div>
    </div>
  );
}
