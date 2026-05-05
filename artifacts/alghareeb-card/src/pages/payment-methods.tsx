import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Copy, Check, Download, ZoomIn, ChevronDown, ChevronUp, AlertTriangle, Lock, ShieldCheck, BadgeCheck, Upload, Send, Image as ImageIcon, ArrowDown } from "lucide-react";
import { Link, useLocation } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type AppSettings = {
  usdToTry?: number;
  usdToSyp?: number;
  usdToEur?: number;
  usdToOmr?: number;
  usdToMad?: number;
  usdToDzd?: number;
  usdToIls?: number;
  usdToIqd?: number;
  usdToSar?: number;
};

const CURRENCY_LABEL_AR: Record<string, string> = {
  USD: "دولار أمريكي",
  TRY: "ليرة تركية",
  SYP: "ليرة سورية",
  EUR: "يورو",
  SAR: "ريال سعودي",
  OMR: "ريال عماني",
  MAD: "درهم مغربي",
  DZD: "دينار جزائري",
  ILS: "شيكل",
  IQD: "دينار عراقي",
};

function rateForCurrency(currency: string, settings: AppSettings | undefined): number | null {
  if (!settings) return null;
  const c = currency.toUpperCase();
  if (c === "USD") return 1;
  const map: Record<string, number | undefined> = {
    TRY: settings.usdToTry,
    SYP: settings.usdToSyp,
    EUR: settings.usdToEur,
    OMR: settings.usdToOmr,
    MAD: settings.usdToMad,
    DZD: settings.usdToDzd,
    ILS: settings.usdToIls,
    IQD: settings.usdToIqd,
    SAR: settings.usdToSar,
  };
  const v = map[c];
  return typeof v === "number" && v > 0 ? v : null;
}

function convertAmount(amount: number, from: string, to: string, settings: AppSettings | undefined): number | null {
  if (!isFinite(amount) || amount <= 0) return null;
  if (from.toUpperCase() === to.toUpperCase()) return amount;
  const fromRate = rateForCurrency(from, settings);
  const toRate = rateForCurrency(to, settings);
  if (fromRate === null || toRate === null) return null;
  const usd = amount / fromRate;
  return usd * toRate;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function isShamCashMethod(method: PaymentMethod): boolean {
  const ar = (method.nameAr || "").trim();
  const en = (method.nameEn || "").toLowerCase();
  return ar.includes("شام") || en.includes("sham");
}

function useFetchSettings() {
  return useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings`.replace(/\/\//g, "/").replace(":/", "://"));
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    staleTime: 60_000,
  });
}

type PaymentField = { label: string; value: string; isCopyable: boolean };
type PaymentMethod = {
  id: number;
  nameAr: string;
  nameEn: string;
  flagEmoji: string;
  fields: PaymentField[];
  qrImageUrl: string | null;
  notes: string[];
  requireSenderName: boolean;
  sortOrder: number;
};

function useFetchPaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/payment-methods`.replace(/\/\//g, "/").replace(":/", "://"));
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "تم النسخ!", description: value.length > 30 ? value.slice(0, 30) + "..." : value });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "خطأ في النسخ" });
    }
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 flex-shrink-0 transition-colors ${copied ? "text-green-400 bg-green-400/10" : "text-primary hover:bg-primary/10"}`}
      onClick={handleCopy}
      title="نسخ"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function QRSection({ url, name }: { url: string; name: string }) {
  const [zoomed, setZoomed] = useState(false);
  const handleDownload = async () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${name}.png`;
    a.click();
  };
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-muted-foreground mb-2 text-center">رمز QR للدفع</p>
      <div className="flex flex-col items-center gap-3">
        <div
          className={`cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border-2 border-primary/30 hover:border-primary ${zoomed ? "w-full max-w-xs" : "w-36 h-36"}`}
          onClick={() => setZoomed(!zoomed)}
        >
          <img src={url} alt="QR Code" className="w-full h-full object-contain bg-white p-1" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoomed(!zoomed)} className="gap-1 text-xs">
            <ZoomIn className="w-3 h-3" />
            {zoomed ? "تصغير" : "تكبير"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1 text-xs">
            <Download className="w-3 h-3" />
            تحميل
          </Button>
        </div>
      </div>
      {zoomed && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={url} alt="QR Code" className="w-full object-contain" />
            <div className="flex gap-2 mt-3">
              <Button className="flex-1" onClick={handleDownload} size="sm">
                <Download className="w-4 h-4 ml-2" /> تحميل QR
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setZoomed(false)} size="sm">إغلاق</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DepositForm({ method }: { method: PaymentMethod }) {
  const methodName = method.nameAr;
  const isShamCash = isShamCashMethod(method);
  const { isSignedIn, user, refetch } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const userCurrency = (user?.currency ?? "TRY").toUpperCase();
  const SHAM_CASH_CURRENCIES = ["USD", "TRY", "SYP"];
  const [sentCurrency, setSentCurrency] = useState<string>(() => {
    if (!isShamCash) return userCurrency;
    return SHAM_CASH_CURRENCIES.includes(userCurrency) ? userCurrency : "USD";
  });
  const [amount, setAmount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: settings } = useFetchSettings();

  const convertedToAccount = useMemo(() => {
    if (!isShamCash) return null;
    if (sentCurrency.toUpperCase() === userCurrency) return null;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return null;
    return convertAmount(amt, sentCurrency, userCurrency, settings);
  }, [isShamCash, sentCurrency, userCurrency, amount, settings]);

  if (!isSignedIn) {
    return (
      <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          سجّل دخولك لإرسال طلب إيداع
        </p>
        <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
          <Link href="/sign-in">تسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "أدخل مبلغاً صحيحاً" });
      return;
    }
    if (method.requireSenderName && !senderName.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "أدخل اسم المرسل الكامل" });
      return;
    }
    if (!file) {
      toast({ variant: "destructive", title: "خطأ", description: "أرفق صورة الإيصال" });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("paymentMethodName", methodName);
      fd.append("amount", String(amt));
      fd.append("currency", isShamCash ? sentCurrency : (user?.currency ?? "TRY"));
      if (method.requireSenderName && senderName.trim()) fd.append("senderName", senderName.trim());
      fd.append("receipt", file);
      const res = await fetch(`${API_BASE}/api/deposits`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data?.code === "PENDING_DEPOSIT_EXISTS") {
          toast({
            variant: "destructive",
            title: "لديك طلب قيد المراجعة",
            description: "لا يمكن إرسال طلب إيداع جديد قبل مراجعة الطلب السابق.",
          });
          setTimeout(() => navigate("/"), 1200);
          return;
        }
        throw new Error(data?.error ?? "فشل الإرسال");
      }
      toast({
        title: "تم إرسال الطلب ✓",
        description: "سيتم مراجعة الإيداع وإضافة الرصيد بعد الموافقة",
      });
      setAmount("");
      setFile(null);
      await refetch();
      setTimeout(() => navigate("/"), 900);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err?.message ?? "فشل الإرسال" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Send className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-purple-300">أرسلت لنا حوالة؟ أكمل الإيداع هنا</span>
      </div>

      {isShamCash && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">عملة المبلغ المرسل</Label>
          <Select value={sentCurrency} onValueChange={setSentCurrency}>
            <SelectTrigger className="bg-background/60 h-10 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHAM_CASH_CURRENCIES.map(c => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABEL_AR[c] ?? c} ({c})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            شام كاش يدعم 3 عملات — اختر العملة التي أرسلتها فعلياً
          </p>
        </div>
      )}

      {method.requireSenderName && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">اسم المرسل الكامل *</Label>
          <Input
            type="text"
            placeholder="أدخل الاسم الكامل للمرسل"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            className="bg-background/60 h-10 font-bold"
            dir="rtl"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          المبلغ المرسل ({isShamCash ? sentCurrency : user?.currency})
        </Label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="مثال: 500"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-background/60 h-10 text-center font-bold"
          dir="ltr"
        />
        {isShamCash && convertedToAccount !== null && (
          <div className="mt-2 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ArrowDown className="w-3 h-3 text-primary" />
              <span>سيُضاف لرصيدك</span>
            </div>
            <div className="text-sm font-bold text-primary" dir="ltr">
              {formatNumber(convertedToAccount)} {userCurrency}
            </div>
          </div>
        )}
        {isShamCash && convertedToAccount === null && amount && parseFloat(amount) > 0 && sentCurrency.toUpperCase() !== userCurrency && (
          <p className="text-[11px] text-amber-400">جاري حساب المبلغ المعادل...</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">إيصال الدفع (صورة)</Label>
        <label className="flex items-center justify-center gap-2 cursor-pointer h-20 rounded-lg border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-background/40 transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <ImageIcon className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{file.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              <span>اضغط لاختيار صورة الإيصال</span>
            </div>
          )}
        </label>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
      >
        {submitting ? "جاري الإرسال..." : "إرسال طلب الإيداع"}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        سيتم مراجعة طلبك خلال دقائق وإضافة الرصيد لحسابك بعد الموافقة
      </p>
    </form>
  );
}

function PaymentCard({ method }: { method: PaymentMethod }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={`overflow-hidden transition-all duration-300 ${open ? "neon-border" : "border-border/50 bg-card/30 hover:border-primary/40"}`}>
      <button
        className="w-full p-4 flex items-center justify-between gap-3 text-right"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {method.flagEmoji?.startsWith("http") || method.flagEmoji?.startsWith("/") ? (
            <img src={method.flagEmoji} alt="" className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
          ) : (
            <span className="text-3xl leading-none">{method.flagEmoji}</span>
          )}
          <div className="text-right">
            <h3 className="font-bold text-base">{method.nameAr}</h3>
            <p className="text-xs text-muted-foreground">{method.nameEn}</p>
          </div>
        </div>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${open ? "bg-primary/20 text-primary" : "bg-card text-muted-foreground"}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <CardContent className="pt-0 px-4 pb-4 space-y-4 border-t border-primary/20">
          <div className="space-y-3 pt-4">
            {method.fields.map((field, i) => (
              <div key={i} className="bg-background/50 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold break-all" dir="ltr">{field.value}</p>
                  {field.isCopyable && <CopyButton value={field.value} />}
                </div>
              </div>
            ))}
          </div>

          {method.qrImageUrl && <QRSection url={method.qrImageUrl} name={method.nameEn} />}

          {method.notes.length > 0 && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm font-bold text-yellow-400">تنويه</span>
              </div>
              {method.notes.map((note, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  ({i + 1})- {note}
                </p>
              ))}
            </div>
          )}

          <DepositForm method={method} />
        </CardContent>
      )}
    </Card>
  );
}

export default function PaymentMethodsPage() {
  const { data: methods, isLoading } = useFetchPaymentMethods();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-right">
        <h1 className="text-2xl font-bold neon-text mb-1">طرق الدفع والإيداع</h1>
        <p className="text-muted-foreground text-sm">اختر دولتك لعرض بيانات الإيداع</p>
      </div>

      {/* Security Trust Badge */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-primary/10 bg-primary/5">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary tracking-wide">موقع آمن ومحمي بالكامل</span>
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/30 px-2 py-4">
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-green-400">SSL</p>
              <p className="text-[10px] text-muted-foreground leading-tight">تشفير كامل</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-primary">مؤمّن</p>
              <p className="text-[10px] text-muted-foreground leading-tight">بيانات محمية</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-blue-400">موثوق</p>
              <p className="text-[10px] text-muted-foreground leading-tight">معاملات آمنة</p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            جميع بياناتك مشفرة ومحمية بتقنية SSL 256-bit. لن يتم مشاركة معلوماتك مع أي طرف ثالث.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 bg-card/50 rounded-xl animate-pulse border border-border/30" />
          ))}
        </div>
      ) : !methods?.length ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد طرق دفع متاحة</div>
      ) : (
        <div className="space-y-3">
          {methods.map(method => (
            <PaymentCard key={method.id} method={method} />
          ))}
        </div>
      )}

    </div>
  );
}
