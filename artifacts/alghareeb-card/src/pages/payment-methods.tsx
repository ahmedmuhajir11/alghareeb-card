import { Helmet } from "react-helmet-async";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Copy, Check, Download, ZoomIn, ChevronDown, AlertTriangle, Lock, ShieldCheck, BadgeCheck, Upload, Send, Image as ImageIcon, ArrowDown } from "lucide-react";
import { Link, useLocation } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const FIELD_LABEL_TRANSLATIONS: Record<string, Record<string, string>> = {
  "عنوان المحفظة": { en:"Wallet Address", tr:"Cüzdan Adresi", fr:"Adresse du portefeuille", es:"Dirección de billetera", pt:"Endereço da carteira", fa:"آدرس کیف پول", ru:"Адрес кошелька", de:"Wallet-Adresse", id:"Alamat Dompet", ku:"ناونیشانی جزدان" },
  "الاسم":          { en:"Name",           tr:"Ad",            fr:"Nom",                   es:"Nombre",              pt:"Nome",               fa:"نام",             ru:"Имя",           de:"Name",           id:"Nama",          ku:"ناو" },
  "رقم الحساب":     { en:"Account Number", tr:"Hesap Numarası",fr:"Numéro de compte",      es:"Número de cuenta",    pt:"Número de conta",    fa:"شماره حساب",      ru:"Номер счёта",   de:"Kontonummer",    id:"Nomor Akun",    ku:"ژمارەی ئەکاونت" },
  "رقم الهاتف":     { en:"Phone Number",   tr:"Telefon Numarası",fr:"Numéro de téléphone", es:"Número de teléfono",  pt:"Número de telefone", fa:"شماره تلفن",      ru:"Номер телефона",de:"Telefonnummer",  id:"Nomor Telepon", ku:"ژمارەی تەلەفۆن" },
  "رقم الآيبان":    { en:"IBAN",           tr:"IBAN",          fr:"IBAN",                  es:"IBAN",                pt:"IBAN",               fa:"IBAN",            ru:"IBAN",          de:"IBAN",           id:"IBAN",          ku:"IBAN" },
  "IBAN":           { en:"IBAN",           tr:"IBAN",          fr:"IBAN",                  es:"IBAN",                pt:"IBAN",               fa:"IBAN",            ru:"IBAN",          de:"IBAN",           id:"IBAN",          ku:"IBAN" },
  "البنك":          { en:"Bank",           tr:"Banka",         fr:"Banque",                es:"Banco",               pt:"Banco",              fa:"بانک",            ru:"Банк",          de:"Bank",           id:"Bank",          ku:"بانک" },
  "اسم البنك":      { en:"Bank Name",      tr:"Banka Adı",     fr:"Nom de la banque",      es:"Nombre del banco",    pt:"Nome do banco",      fa:"نام بانک",        ru:"Название банка",de:"Bankname",       id:"Nama Bank",     ku:"ناوی بانک" },
  "الشبكة":         { en:"Network",        tr:"Ağ",            fr:"Réseau",                es:"Red",                 pt:"Rede",               fa:"شبکه",            ru:"Сеть",          de:"Netzwerk",       id:"Jaringan",      ku:"تۆڕ" },
  "العملة":         { en:"Currency",       tr:"Para Birimi",   fr:"Devise",                es:"Divisa",              pt:"Moeda",              fa:"ارز",             ru:"Валюта",        de:"Währung",        id:"Mata Uang",     ku:"دراو" },
  "الكود":          { en:"Code",           tr:"Kod",           fr:"Code",                  es:"Código",              pt:"Código",             fa:"کد",              ru:"Код",           de:"Code",           id:"Kode",          ku:"کۆد" },
  "رقم الكود":          { en:"Code",                 tr:"Kod",                 fr:"Code",                      es:"Código",                   pt:"Código",                  fa:"کد",               ru:"Код",               de:"Code",               id:"Kode",               ku:"کۆد" },
  "رمز المحفظة":        { en:"Wallet Number",        tr:"Cüzdan Numarası",     fr:"Numéro de portefeuille",    es:"Número de billetera",      pt:"Número da carteira",      fa:"شماره کیف پول",    ru:"Номер кошелька",    de:"Wallet-Nummer",      id:"Nomor Dompet",       ku:"ژمارەی جزدان" },
  "رقم المحفظة":        { en:"Wallet Number",        tr:"Cüzdan Numarası",     fr:"Numéro de portefeuille",    es:"Número de billetera",      pt:"Número da carteira",      fa:"شماره کیف پول",    ru:"Номер кошелька",    de:"Wallet-Nummer",      id:"Nomor Dompet",       ku:"ژمارەی جزدان" },
  "اسم صاحب الحساب":   { en:"Account Owner Name",   tr:"Hesap Sahibi Adı",    fr:"Nom du titulaire",          es:"Nombre del titular",       pt:"Nome do titular",         fa:"نام صاحب حساب",    ru:"Имя владельца",     de:"Kontoinhaber",       id:"Nama Pemilik Akun",  ku:"ناوی خاوەن ئەکاونت" },
  "اسم الخدمة":         { en:"Service Name",         tr:"Hizmet Adı",          fr:"Nom du service",            es:"Nombre del servicio",      pt:"Nome do serviço",         fa:"نام سرویس",        ru:"Название сервиса",  de:"Servicename",        id:"Nama Layanan",       ku:"ناوی خزمەتگوزاری" },
  "فودافون كاش":        { en:"Vodafone Cash",        tr:"Vodafone Cash",       fr:"Vodafone Cash",             es:"Vodafone Cash",            pt:"Vodafone Cash",           fa:"Vodafone Cash",    ru:"Vodafone Cash",     de:"Vodafone Cash",      id:"Vodafone Cash",      ku:"Vodafone Cash" },
  "رقم الويش":          { en:"Whish Number",         tr:"Whish Numarası",      fr:"Numéro Whish",              es:"Número Whish",             pt:"Número Whish",            fa:"شماره Whish",      ru:"Номер Whish",       de:"Whish-Nummer",       id:"Nomor Whish",        ku:"ژمارەی Whish" },
  "رقم التحويل":        { en:"Transfer Number",      tr:"Transfer Numarası",   fr:"Numéro de transfert",       es:"Número de transferencia",  pt:"Número de transferência", fa:"شماره انتقال",     ru:"Номер перевода",    de:"Überweisungsnummer", id:"Nomor Transfer",     ku:"ژمارەی گواستنەوە" },
  "عنوان الإيميل":      { en:"Email Address",        tr:"E-posta Adresi",      fr:"Adresse e-mail",            es:"Correo electrónico",       pt:"Endereço de e-mail",      fa:"آدرس ایمیل",       ru:"Адрес эл. почты",   de:"E-Mail-Adresse",     id:"Alamat Email",       ku:"ناونیشانی ئیمەیڵ" },
  "معرف المستخدم":           { en:"User ID",                    tr:"Kullanıcı Kimliği",       fr:"Identifiant utilisateur",        es:"ID de usuario",                 pt:"ID do usuário",                fa:"شناسه کاربری",        ru:"ID пользователя",        de:"Benutzer-ID",             id:"ID Pengguna",             ku:"ناسنامەی بەکارهێنەر" },
  "الاسم المستعار":          { en:"Username / Alias",           tr:"Kullanıcı Adı",           fr:"Nom d'utilisateur",              es:"Nombre de usuario",             pt:"Nome de usuário",              fa:"نام مستعار",          ru:"Псевдоним",              de:"Benutzername",            id:"Nama Pengguna",           ku:"ناوی بەکارهێنەر" },
  "نوع الشبكة":              { en:"Network Type",               tr:"Ağ Türü",                 fr:"Type de réseau",                 es:"Tipo de red",                   pt:"Tipo de rede",                 fa:"نوع شبکه",            ru:"Тип сети",               de:"Netzwerktyp",             id:"Jenis Jaringan",          ku:"جۆری تۆڕ" },
  "اسم المستفيد":            { en:"Beneficiary Name",           tr:"Alıcı Adı",               fr:"Nom du bénéficiaire",            es:"Nombre del beneficiario",       pt:"Nome do beneficiário",         fa:"نام ذینفع",           ru:"Имя получателя",         de:"Name des Begünstigten",   id:"Nama Penerima",           ku:"ناوی سوودمەند" },
  "اسم المكتب":              { en:"Office Name",                tr:"Ofis Adı",                fr:"Nom du bureau",                  es:"Nombre de la oficina",          pt:"Nome do escritório",           fa:"نام دفتر",            ru:"Название офиса",         de:"Büroname",                id:"Nama Kantor",             ku:"ناوی ئۆفیس" },
  "العنوان":                 { en:"Address",                    tr:"Adres",                   fr:"Adresse",                        es:"Dirección",                     pt:"Endereço",                     fa:"آدرس",                ru:"Адрес",                  de:"Adresse",                 id:"Alamat",                  ku:"ناونیشان" },
  "العنوان بالتركي":         { en:"Address in Turkish",         tr:"Türkçe Adres",            fr:"Adresse en turc",                es:"Dirección en turco",            pt:"Endereço em turco",            fa:"آدرس به ترکی",        ru:"Адрес на турецком",      de:"Adresse auf Türkisch",    id:"Alamat dalam Bahasa Turki", ku:"ناونیشان بە تورکی" },
  "عملات الاستلام":          { en:"Accepted Currencies",        tr:"Kabul Edilen Para Birimleri", fr:"Devises acceptées",          es:"Monedas aceptadas",             pt:"Moedas aceitas",               fa:"ارزهای قابل قبول",    ru:"Принимаемые валюты",     de:"Akzeptierte Währungen",   id:"Mata Uang Diterima",      ku:"دراوە پەسەندکراوەکان" },
  "زين كاش":                 { en:"Zain Cash",                  tr:"Zain Cash",               fr:"Zain Cash",                      es:"Zain Cash",                     pt:"Zain Cash",                    fa:"Zain Cash",           ru:"Zain Cash",              de:"Zain Cash",               id:"Zain Cash",               ku:"Zain Cash" },
  "تعليمات التحويل":         { en:"Transfer Instructions",      tr:"Transfer Talimatları",    fr:"Instructions de transfert",      es:"Instrucciones de transferencia", pt:"Instruções de transferência", fa:"دستورالعمل انتقال",   ru:"Инструкции по переводу", de:"Überweisungsanweisungen", id:"Instruksi Transfer",      ku:"ڕێنماییەکانی گواستنەوە" },
  "ضع هذا النص في الملاحظة":{ en:"Put this in the note field", tr:"Bu metni nota ekleyin",   fr:"Mettez ce texte dans la note",   es:"Pon este texto en la nota",     pt:"Coloque este texto na nota",   fa:"این متن را در یادداشت بگذارید", ru:"Поместите в примечание", de:"In Notizfeld einfügen",   id:"Masukkan di kolom catatan", ku:"لە خانەی تێبینیدا دابنێ" },
  "رابط الدفع":              { en:"Payment Link",               tr:"Ödeme Bağlantısı",        fr:"Lien de paiement",               es:"Enlace de pago",                pt:"Link de pagamento",            fa:"لینک پرداخت",         ru:"Ссылка для оплаты",      de:"Zahlungslink",            id:"Tautan Pembayaran",       ku:"بەستەری پارەدان" },
  "البريد الالكتروني":       { en:"Email",                      tr:"E-posta",                 fr:"E-mail",                         es:"Correo electrónico",            pt:"E-mail",                       fa:"ایمیل",               ru:"Эл. почта",              de:"E-Mail",                  id:"Email",                   ku:"ئیمەیڵ" },
};

function translateFieldLabel(label: string, lang: string): string {
  if (['ar', 'fa', 'ku'].includes(lang)) return label;
  const parts = label.split('||');
  if (parts.length >= 2) return parts[1].trim();
  const translation = FIELD_LABEL_TRANSLATIONS[label.trim()];
  if (translation && translation[lang]) return translation[lang];
  if (translation && translation['en']) return translation['en'];
  return label;
}

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
  usdToEgp?: number;
  usdToJod?: number;
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
  EGP: "جنيه مصري",
  JOD: "دينار أردني",
};

const CURRENCY_LABEL_EN: Record<string, string> = {
  USD: "US Dollar",
  TRY: "Turkish Lira",
  SYP: "Syrian Pound",
  EUR: "Euro",
  SAR: "Saudi Riyal",
  OMR: "Omani Rial",
  MAD: "Moroccan Dirham",
  DZD: "Algerian Dinar",
  ILS: "Israeli Shekel",
  IQD: "Iraqi Dinar",
  EGP: "Egyptian Pound",
  JOD: "Jordanian Dinar",
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
    EGP: settings.usdToEgp,
    JOD: settings.usdToJod,
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

// Returns the locked currency for a payment method, or null if the user can freely choose.
function getLockedCurrency(method: PaymentMethod): string | null {
  const ar = method.nameAr || "";
  const en = (method.nameEn || "").toLowerCase();
  if (ar.includes("سعود") || en.includes("saudi")) return "SAR";
  if (ar.includes("تركي") || ar.includes("تركيا") || en.includes("turk")) return "TRY";
  if (ar.includes("مصر") || en.includes("egypt")) return "EGP";
  if (ar.includes("لبنان") || ar.includes("لبناني") || en.includes("lebanon")) return "USD";
  if (ar.includes("أردن") || ar.includes("اردن") || en.includes("jordan")) return "JOD";
  if (ar.includes("مغرب") || en.includes("morocco")) return "MAD";
  if (ar.includes("جزائر") || en.includes("algeria")) return "DZD";
  if (ar.includes("أوروب") || ar.includes("اوروب") || en.includes("europ")) return "EUR";
  if (ar.includes("عراق") || en.includes("iraq")) return "IQD";
  if (ar.includes("بايبال") || ar.includes("باي بال") || en.includes("paypal")) return "USD";
  if (ar.toLowerCase().includes("usdt") || en.includes("usdt") || ar.includes("عالمي") || en.includes("global")) return "USD";
  return null;
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
  requireKyc: boolean;
  sortOrder: number;
  allowedCurrencies?: string;
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
  const { t } = useI18n();
  const handleDownload = async () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${name}.png`;
    a.click();
  };
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-muted-foreground mb-2 text-center">{t('payment.qrTitle')}</p>
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
            {zoomed ? t('payment.qrZoomOut') : t('payment.qrZoomIn')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1 text-xs">
            <Download className="w-3 h-3" />
            {t('payment.qrDownload')}
          </Button>
        </div>
      </div>
      {zoomed && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <img src={url} alt="QR Code" className="w-full object-contain" />
            <div className="flex gap-2 mt-3">
              <Button className="flex-1" onClick={handleDownload} size="sm">
                <Download className="w-4 h-4 ml-2" /> {t('payment.qrDownloadFull')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setZoomed(false)} size="sm">{t('payment.qrClose')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DepositForm({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  const { lang, t } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const methodName = isRtlLang ? method.nameAr : (method.nameEn || method.nameAr);
  const { isSignedIn, user, refetch } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const userCurrency = (user?.currency ?? "TRY").toUpperCase();
  const ALL_CURRENCIES = Object.keys(CURRENCY_LABEL_AR);
  // DB-driven allowed currencies take priority over hardcoded logic
  const dbAllowed: string[] = method.allowedCurrencies
    ? method.allowedCurrencies.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const lockedCurrency = dbAllowed.length === 1
    ? dbAllowed[0]
    : dbAllowed.length === 0
      ? getLockedCurrency(method)
      : null;
  const displayCurrencies = dbAllowed.length >= 2 ? dbAllowed : (dbAllowed.length === 0 && !lockedCurrency ? Object.keys(CURRENCY_LABEL_AR) : []);
  const defaultFree = dbAllowed.length >= 2
    ? (dbAllowed.includes(userCurrency) ? userCurrency : dbAllowed[0])
    : userCurrency;
  const [freeCurrency, setFreeCurrency] = useState<string>(defaultFree);
  const sentCurrency = lockedCurrency ?? freeCurrency;
  const [amount, setAmount] = useState("");
  const [senderName, setSenderName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: settings } = useFetchSettings();

  const convertedToAccount = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return null;
    if (sentCurrency.toUpperCase() === userCurrency) return amt;
    return convertAmount(amt, sentCurrency, userCurrency, settings);
  }, [sentCurrency, userCurrency, amount, settings]);

  if (!isSignedIn) {
    return (
      <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('payment.loginToDeposit')}
        </p>
        <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
          <Link href="/sign-in">{t('payment.loginBtn')}</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ variant: "destructive", title: t('payment.errorLabel'), description: t('payment.errorAmount') });
      return;
    }
    if (method.requireSenderName && !senderName.trim()) {
      toast({ variant: "destructive", title: t('payment.errorLabel'), description: t('payment.errorSender') });
      return;
    }
    if (!file) {
      toast({ variant: "destructive", title: t('payment.errorLabel'), description: t('payment.errorReceipt') });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("paymentMethodName", methodName);
      fd.append("amount", String(amt));
      fd.append("currency", sentCurrency);
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
            title: t('payment.pendingDeposit'),
            description: t('payment.pendingDesc'),
          });
          setTimeout(() => navigate("/"), 1200);
          return;
        }
        throw new Error(data?.error ?? t('payment.errorFailed'));
      }
      toast({
        title: t('payment.depositSent'),
        description: t('payment.depositSentDesc'),
      });
      setAmount("");
      setFile(null);
      await refetch();
      setTimeout(() => navigate("/"), 900);
    } catch (err: any) {
      toast({ variant: "destructive", title: t('payment.errorLabel'), description: err?.message ?? t('payment.errorFailed') });
    } finally {
      setSubmitting(false);
    }
  }

  const inp = compact ? "h-8" : "h-10";

  return (
    <form onSubmit={handleSubmit} className={`bg-purple-500/5 border border-purple-500/30 rounded-xl ${compact ? "p-3 space-y-2" : "p-4 space-y-3"}`}>
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-purple-300">{t('payment.depositFormTitle')}</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('payment.sentCurrency')}</Label>
        {lockedCurrency ? (
          <div className={`bg-background/60 ${inp} rounded-md border border-input flex items-center px-3 gap-2`}>
            <Lock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="font-bold text-sm flex-1">
              {(isRtlLang ? CURRENCY_LABEL_AR[lockedCurrency] : CURRENCY_LABEL_EN[lockedCurrency]) ?? lockedCurrency} ({lockedCurrency})
            </span>
          </div>
        ) : (
          <Select value={freeCurrency} onValueChange={setFreeCurrency}>
            <SelectTrigger className={`bg-background/60 ${inp} font-bold`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(displayCurrencies.length > 0 ? displayCurrencies : Object.keys(CURRENCY_LABEL_AR)).map(c => (
                <SelectItem key={c} value={c}>
                  {(isRtlLang ? CURRENCY_LABEL_AR[c] : CURRENCY_LABEL_EN[c]) ?? c} ({c})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {method.requireSenderName && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('payment.senderName')}</Label>
          <Input
            type="text"
            placeholder={t('payment.senderPh')}
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            className={`bg-background/60 ${inp} font-bold`}
            dir="rtl"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {t('payment.amountLabel')} ({sentCurrency})
        </Label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder={t('payment.amountPh')}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className={`bg-background/60 ${inp} text-center font-bold`}
          dir="ltr"
        />
        {convertedToAccount !== null && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ArrowDown className="w-3 h-3 text-primary" />
              <span>{t('payment.addedToBalance')}</span>
            </div>
            <div className="text-sm font-bold text-primary" dir="ltr">
              {formatNumber(convertedToAccount)} {userCurrency}
            </div>
          </div>
        )}
        {convertedToAccount === null && amount && parseFloat(amount) > 0 && sentCurrency.toUpperCase() !== userCurrency && (
          <p className="text-[11px] text-amber-400">{t('payment.calculating')}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('payment.receiptLabel')}</Label>
        <label className={`flex items-center justify-center gap-2 cursor-pointer ${compact ? "h-14" : "h-20"} rounded-lg border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-background/40 transition-colors`}>
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
              <span>{t('payment.chooseReceipt')}</span>
            </div>
          )}
        </label>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
      >
        {submitting ? t('payment.sending') : t('payment.sendDeposit')}
      </Button>

      {!compact && (
        <p className="text-[11px] text-muted-foreground text-center">
          {t('payment.depositNote')}
        </p>
      )}
    </form>
  );
}

function PaymentCard({ method, onSelect }: { method: PaymentMethod; onSelect: () => void }) {
  const { lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const displayName = isRtlLang ? method.nameAr : (method.nameEn || method.nameAr);
  const subName = isRtlLang ? method.nameEn : method.nameAr;
  return (
    <button
      onClick={onSelect}
      className="w-full text-right flex items-center gap-3 p-4 border border-border/50 bg-card/30 hover:border-primary/40 hover:bg-card/60 rounded-2xl transition-colors"
    >
      {method.flagEmoji?.startsWith("http") || method.flagEmoji?.startsWith("/") ? (
        <img src={method.flagEmoji} alt="" className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
      ) : (
        <span className="text-3xl leading-none flex-shrink-0">{method.flagEmoji}</span>
      )}
      <div className="flex-1 text-right min-w-0">
        <h3 className="font-bold text-base">{displayName}</h3>
        <p className="text-xs text-muted-foreground">{subName}</p>
      </div>
      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 -rotate-90" />
    </button>
  );
}

function MethodDetailView({ method, onBack }: { method: PaymentMethod; onBack: () => void }) {
  const { lang, t } = useI18n();
  const { user, isSignedIn } = useAuth();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const displayName = isRtlLang ? method.nameAr : (method.nameEn || method.nameAr);
  const subName = isRtlLang ? method.nameEn : method.nameAr;

  const kycBlocked = method.requireKyc && isSignedIn && !user?.isVerified;

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-primary/20 -mx-4 px-4 mb-4">
        <div className="max-w-2xl mx-auto py-2.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-primary/40 hover:bg-primary/10 transition-colors flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {method.flagEmoji?.startsWith("http") || method.flagEmoji?.startsWith("/") ? (
              <img src={method.flagEmoji} alt="" className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
            ) : (
              <span className="text-2xl leading-none flex-shrink-0">{method.flagEmoji}</span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{subName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Lock Block */}
      {kycBlocked && (
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-orange-500/40 bg-orange-500/5 p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-orange-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-orange-300">التحقق من الهوية مطلوب</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لا يمكنك رؤية تفاصيل الدفع (الآيبان وبيانات الحساب) إلا بعد التحقق من هويتك.
              </p>
            </div>
            <Link href="/kyc">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2 w-full max-w-xs">
                <ShieldCheck className="w-4 h-4" />
                توثيق الحساب الآن
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Compact content — hidden when KYC blocked */}
      {!kycBlocked && <div className="max-w-2xl mx-auto space-y-3">
        {/* Fields */}
        {method.fields.length > 0 && (
          <div className="space-y-2">
            {method.fields.map((field, i) => (
              <div key={i} className="bg-background/50 rounded-xl p-2.5 border border-border/50">
                <p className="text-[11px] text-muted-foreground mb-0.5">{translateFieldLabel(field.label, lang)}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold break-all" dir="ltr">{field.value}</p>
                  {field.isCopyable && <CopyButton value={field.value} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR */}
        {method.qrImageUrl && <QRSection url={method.qrImageUrl} name={method.nameEn} />}

        {/* Notes */}
        {method.notes.length > 0 && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-xs font-bold text-yellow-400">{t('payment.notice')}</span>
            </div>
            {method.notes.map((note, i) => {
              const parts = note.split('||');
              const displayNote = parts.length >= 2 ? (isRtlLang ? parts[0].trim() : parts[1].trim()) : note;
              return <p key={i} className="text-xs text-muted-foreground">({i + 1})- {displayNote}</p>;
            })}
          </div>
        )}

        {/* Deposit form — compact */}
        <DepositForm method={method} compact />
      </div>}
    </div>
  );
}


export default function PaymentMethodsPage() {
  const { data: methods, isLoading } = useFetchPaymentMethods();
  const { t } = useI18n();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  if (selectedMethod) {
    return <MethodDetailView method={selectedMethod} onBack={() => setSelectedMethod(null)} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Helmet>
        <title>طرق الدفع وإضافة الرصيد | الغريب كارد</title>
        <meta name="description" content="أضف رصيداً لحسابك في الغريب كارد عبر طرق دفع متعددة. ادفع بالدولار أو الليرة التركية أو السورية." />
        <meta property="og:title" content="طرق الدفع | الغريب كارد" />
        <meta property="og:url" content="https://alghareebcard.com/payment-methods" />
        <link rel="canonical" href="https://alghareebcard.com/payment-methods" />
      </Helmet>
      <div className="text-right">
        <h1 className="text-2xl font-bold neon-text mb-1">{t('payment.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('payment.subtitle')}</p>
      </div>

      {/* Security Trust Badge */}
      <div className="rounded-2xl overflow-hidden border border-primary/20 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-primary/10 bg-primary/5">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary tracking-wide">{t('payment.secureTitle')}</span>
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/30 px-2 py-4">
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-green-400">SSL</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t('payment.sslLabel')}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-primary">{t('payment.securedLabel')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t('payment.securedDesc')}</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 px-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-blue-400">{t('payment.trustedLabel')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{t('payment.trustedDesc')}</p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 text-center">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t('payment.secureNote')}
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
        <div className="text-center py-12 text-muted-foreground">{t('payment.noMethods')}</div>
      ) : (
        <div className="space-y-3">
          {methods.map(method => (
            <PaymentCard key={method.id} method={method} onSelect={() => setSelectedMethod(method)} />
          ))}
        </div>
      )}


    </div>
  );
}
