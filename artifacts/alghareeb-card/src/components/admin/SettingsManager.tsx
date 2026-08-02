import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";

const MAINTENANCE_KEY = "__maintenance_mode__";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function adminFetch(path: string, opts?: RequestInit) {
  const token = document.cookie.match(/admin_token=([^;]+)/)?.[1];
  const ak = typeof window !== "undefined" ? sessionStorage.getItem("_ak") : null;
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ak ? { "x-admin-key": ak } : {}),
      ...(opts?.headers ? (opts.headers as Record<string, string>) : {}),
    },
    credentials: "include",
  });
}

interface Currency { id: number; code: string; nameAr: string; nameEn: string; usdRate: number; depositRate: number | null; isActive: boolean; }

export default function SettingsManager() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [tickerMode, setTickerMode] = useState<"marquee" | "notifications">("notifications");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [formData, setFormData] = useState({
    marqueeText: "", marqueeTextEn: "", marqueeTextTr: "",
    whatsappNumber: "", moneyTransferCurrencies: "",
    welcomeMessage: "", welcomeMessageAr: "", welcomeMessageEn: "", welcomeMessageTr: "",
  });
  const [newCurrency, setNewCurrency] = useState("");

  // Currencies with toggle state
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // New currency form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newRate, setNewRate] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (settings) {
      setMaintenanceMode(!!(settings as any).maintenanceMode);
      setTickerMode(((settings as any).tickerMode || "notifications") as "marquee" | "notifications");
      setFormData({
        marqueeText: settings.marqueeText || "",
        marqueeTextEn: (settings as any).marqueeTextEn || "",
        marqueeTextTr: (settings as any).marqueeTextTr || "",
        whatsappNumber: settings.whatsappNumber || "",
        moneyTransferCurrencies: settings.moneyTransferCurrencies || "دولار,ليرة تركية,يورو,سوري",
        welcomeMessage: settings.welcomeMessage || "",
        welcomeMessageAr: (settings.welcomeMessage || "").split("||")[0]?.trim() || "",
        welcomeMessageEn: (settings as any).welcomeMessageEn || (settings.welcomeMessage || "").split("||")[1]?.trim() || "",
        welcomeMessageTr: (settings as any).welcomeMessageTr || "",
      });
    }
  }, [settings]);

  useEffect(() => {
    adminFetch("/api/admin/currencies")
      .then(r => r.json())
      .then(d => setCurrencies(Array.isArray(d) ? d : []))
      .catch(() => setCurrencies([]))
      .finally(() => setCurrenciesLoading(false));
  }, []);

  const currenciesList = formData.moneyTransferCurrencies.split(",").map(s => s.trim()).filter(Boolean);
  const addMoneyTransferCurrency = () => {
    const v = newCurrency.trim();
    if (!v) return;
    if (currenciesList.includes(v)) { toast({ variant: "destructive", title: "موجودة مسبقاً" }); return; }
    setFormData({ ...formData, moneyTransferCurrencies: [...currenciesList, v].join(",") });
    setNewCurrency("");
  };
  const removeCurrency = (c: string) => {
    setFormData({ ...formData, moneyTransferCurrencies: currenciesList.filter(x => x !== c).join(",") });
  };

  async function toggleCurrency(id: number, isActive: boolean) {
    setTogglingId(id);
    try {
      const res = await adminFetch(`/api/admin/currencies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error();
      setCurrencies(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
      const cur = currencies.find(c => c.id === id);
      toast({ title: isActive ? `✅ تم تفعيل ${cur?.code}` : `⏸ تم إيقاف ${cur?.code}` });
    } catch {
      toast({ variant: "destructive", title: "خطأ في تغيير الحالة" });
    } finally {
      setTogglingId(null);
    }
  }

  async function saveRate(id: number, rate: number, depositRate: number | null, nameAr: string, nameEn: string) {
    const res = await adminFetch(`/api/admin/currencies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ usdRate: rate, depositRate: depositRate ?? null, nameAr, nameEn }),
    });
    if (!res.ok) throw new Error();
    setCurrencies(prev => prev.map(c => c.id === id ? { ...c, usdRate: rate, depositRate } : c));
  }

  async function handleAddCurrency() {
    if (!newCode || !newNameAr || !newNameEn || !newRate) {
      toast({ variant: "destructive", title: "جميع الحقول مطلوبة" }); return;
    }
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) { toast({ variant: "destructive", title: "سعر الصرف غير صالح" }); return; }
    setAdding(true);
    try {
      const res = await adminFetch("/api/admin/currencies", {
        method: "POST",
        body: JSON.stringify({ code: newCode, nameAr: newNameAr, nameEn: newNameEn, usdRate: rate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطأ");
      setCurrencies(prev => [...prev, data]);
      setNewCode(""); setNewNameAr(""); setNewNameEn(""); setNewRate("");
      setShowAddForm(false);
      toast({ title: "✅ تمت إضافة العملة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setAdding(false);
    }
  }

  async function deleteCurrency(id: number, nameAr: string) {
    if (!confirm(`هل تريد حذف عملة "${nameAr}"؟`)) return;
    try {
      await adminFetch(`/api/admin/currencies/${id}`, { method: "DELETE" });
      setCurrencies(prev => prev.filter(c => c.id !== id));
      toast({ title: "تم حذف العملة" });
    } catch {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  }

  const handleSave = () => {
    const arText = formData.welcomeMessageAr.trim();
    const enText = formData.welcomeMessageEn.trim();
    const combined = enText ? `${arText}||${enText}` : arText;
    const dataToSave = { ...formData, welcomeMessage: combined, tickerMode };
    updateSettings.mutate({ data: dataToSave }, {
      onSuccess: () => toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات بنجاح" }),
      onError: (err: any) => toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ أثناء الحفظ" }),
    });
  };

  async function toggleMaintenance() {
    setMaintenanceLoading(true);
    const next = !maintenanceMode;

    // ✅ حفظ فوري في localStorage — يعمل حتى بدون Backend/DB
    localStorage.setItem(MAINTENANCE_KEY, next ? "true" : "false");
    setMaintenanceMode(next);

    // محاولة تحديث قاعدة البيانات أيضاً (اختياري إذا كان السيرفر متصل)
    try {
      const res = await adminFetch("/api/admin/maintenance", {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/settings/maintenance-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/settings/maintenance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      }
    } catch {
      // لا بأس — localStorage يكفي لتفعيل الصيانة محلياً
    } finally {
      setMaintenanceLoading(false);
    }

    toast({
      title: next ? "🔧 تم إيقاف الموقع" : "✅ تم تشغيل الموقع",
      description: next
        ? "الموقع في وضع الصيانة — جميع المستخدمين يرون صفحة الصيانة الآن"
        : "الموقع يعمل بشكل طبيعي الآن",
    });
  }

  if (isLoading) return <Skeleton className="w-full h-64 rounded-xl" />;

  return (
    <div className="space-y-6">

      {/* ─── Maintenance Mode ─── */}
      <Card className={`neon-border ${maintenanceMode ? "border-red-500/60 bg-red-500/5" : "bg-card/50"}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2">
                {maintenanceMode ? "🔴" : "🟢"}
                {maintenanceMode ? "الموقع مُوقَف حالياً (وضع الصيانة)" : "الموقع يعمل بشكل طبيعي"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {maintenanceMode
                  ? "جميع الزوار يرون صفحة الصيانة. لوحة التحكم تعمل بشكل طبيعي."
                  : "عند الإيقاف، تُعرض صفحة صيانة لجميع الزوار ويُرسل إشعار فوري."}
              </p>
            </div>
            <button
              onClick={toggleMaintenance}
              disabled={maintenanceLoading}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                maintenanceMode
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              } disabled:opacity-50`}
            >
              {maintenanceLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {maintenanceMode ? "تشغيل الموقع" : "إيقاف الموقع"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Currency Availability Toggles ─── */}
      <Card className="neon-border bg-card/50">
        <CardHeader>
          <CardTitle>العملات المتاحة وأسعار الصرف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p>فعّل أو أوقف أي عملة باستخدام زر التبديل. العملات المُفعّلة فقط تظهر للمستخدمين عند إنشاء الحساب.</p>
            <p>📦 <span className="text-yellow-400 font-bold">معدل المنتجات</span> — يُستخدم لعرض أسعار المنتجات بعملة المستخدم.</p>
            <p>💰 <span className="text-green-400 font-bold">معدل الإيداع</span> — يُستخدم عند احتساب رصيد الإيداعات. اتركه فارغاً ليطابق معدل المنتجات.</p>
          </div>

          {currenciesLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {currencies.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد عملات بعد. أضف عملة أدناه.</p>
              )}
              {currencies.filter(c => c.code !== "USD").map(c => (
                <CurrencyRateRow
                  key={c.id}
                  currency={c}
                  toggling={togglingId === c.id}
                  onToggle={toggleCurrency}
                  onSaveRate={saveRate}
                  onDelete={deleteCurrency}
                />
              ))}
            </div>
          )}

          {/* Add currency form */}
          {showAddForm ? (
            <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5">
              <p className="text-sm font-semibold">إضافة عملة جديدة</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">رمز العملة (مثال: AED)</label>
                  <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="AED" className="bg-background/50 h-8 text-sm font-mono" dir="ltr" maxLength={10} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">سعر الصرف (1 USD = ؟)</label>
                  <Input value={newRate} onChange={e => setNewRate(e.target.value)} type="number" step="any" placeholder="3.67" className="bg-background/50 h-8 text-sm" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">الاسم بالعربي</label>
                  <Input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} placeholder="درهم إماراتي" className="bg-background/50 h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">الاسم بالإنجليزي</label>
                  <Input value={newNameEn} onChange={e => setNewNameEn(e.target.value)} placeholder="UAE Dirham" className="bg-background/50 h-8 text-sm" dir="ltr" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCurrency} disabled={adding} size="sm" className="gap-1">
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}إضافة
                </Button>
                <Button onClick={() => { setShowAddForm(false); setNewCode(""); setNewNameAr(""); setNewNameEn(""); setNewRate(""); }} variant="ghost" size="sm">إلغاء</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />إضافة عملة جديدة
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── General Settings ─── */}
      <Card className="neon-border bg-card/50">
        <CardHeader>
          <CardTitle>الإعدادات العامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">رقم الواتساب (للطلبات)</label>
            <Input value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} className="bg-background/50 text-left" dir="ltr" placeholder="00905378221375" />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium block">نوع الشريط العلوي</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTickerMode("notifications")}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all text-right ${
                  tickerMode === "notifications"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-primary/20 bg-background/30 text-muted-foreground"
                }`}
              >
                <div className="font-bold">🔔 شريط الإشعارات</div>
                <div className="text-xs opacity-70 mt-1">رسائل تتبدّل كل 4 ثواني</div>
              </button>
              <button
                type="button"
                onClick={() => setTickerMode("marquee")}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all text-right ${
                  tickerMode === "marquee"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-primary/20 bg-background/30 text-muted-foreground"
                }`}
              >
                <div className="font-bold">📢 الشريط الإخباري</div>
                <div className="text-xs opacity-70 mt-1">نص يتحرك من اليسار لليمين</div>
              </button>
            </div>

            {tickerMode === "marquee" && (
              <div className="space-y-2 border border-primary/20 rounded-lg p-3 bg-primary/5">
                <label className="text-sm font-medium">النص — العربية</label>
                <Input value={formData.marqueeText} onChange={e => setFormData({...formData, marqueeText: e.target.value})} className="bg-background/50" />
                <label className="text-sm font-medium block mt-2">Text — English</label>
                <Input value={formData.marqueeTextEn} onChange={e => setFormData({...formData, marqueeTextEn: e.target.value})} className="bg-background/50" dir="ltr" placeholder="English marquee text (optional)" />
                <label className="text-sm font-medium block mt-2">Metin — Türkçe</label>
                <Input value={formData.marqueeTextTr} onChange={e => setFormData({...formData, marqueeTextTr: e.target.value})} className="bg-background/50" dir="ltr" placeholder="Türkçe haber şeridi metni (isteğe bağlı)" />
              </div>
            )}

            {tickerMode === "notifications" && (
              <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                💡 لإدارة رسائل شريط الإشعارات اذهب إلى تبويب <strong>«شريط الإشعارات»</strong> في لوحة التحكم.
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-primary/10 pt-4">
            <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              💡 رسالة الترحيب تظهر في نافذة منبثقة بعد كل تسجيل دخول. اتركها فارغة لإلغاء تفعيلها.
            </p>
            <label className="text-sm font-medium">رسالة الترحيب — العربية</label>
            <Textarea value={formData.welcomeMessageAr} onChange={e => setFormData({...formData, welcomeMessageAr: e.target.value})} className="bg-background/50 min-h-[90px] resize-y" placeholder="مثال: تنبيه هام: تأكد دائماً من بيانات طريقة الدفع قبل إرسال أي مبلغ..." />
            <label className="text-sm font-medium block mt-3">Welcome Message — English</label>
            <Textarea value={formData.welcomeMessageEn} onChange={e => setFormData({...formData, welcomeMessageEn: e.target.value})} className="bg-background/50 min-h-[90px] resize-y" placeholder="Important: Always verify payment method details before sending any amount..." dir="ltr" />
            <label className="text-sm font-medium block mt-3">Hoş Geldiniz Mesajı — Türkçe</label>
            <Textarea value={formData.welcomeMessageTr} onChange={e => setFormData({...formData, welcomeMessageTr: e.target.value})} className="bg-background/50 min-h-[90px] resize-y" placeholder="Önemli: Herhangi bir miktar göndermeden önce ödeme yöntemi bilgilerini doğrulayın..." dir="ltr" />
          </div>

          <div className="space-y-3 border-t border-primary/10 pt-4">
            <div>
              <label className="text-sm font-medium block mb-1">عملات الحوالات المالية</label>
              <p className="text-xs text-muted-foreground">العملات التي يختار منها الزبون عند إرسال طلب حوالة (تظهر في قسم "الحوالات المالية").</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {currenciesList.length === 0 && <span className="text-xs text-muted-foreground">لا توجد عملات. أضف واحدة أدناه.</span>}
              {currenciesList.map(c => (
                <span key={c} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm">
                  {c}
                  <button type="button" onClick={() => removeCurrency(c)} className="text-destructive hover:text-destructive font-bold mr-1" title="حذف">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newCurrency} onChange={e => setNewCurrency(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMoneyTransferCurrency(); } }} placeholder="مثال: درهم إماراتي" className="bg-background/50" />
              <Button type="button" variant="outline" onClick={addMoneyTransferCurrency}>إضافة</Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending} className="w-full md:w-auto">
            {updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inline editable row for each currency ───
function CurrencyRateRow({ currency, toggling, onToggle, onSaveRate, onDelete }: {
  currency: Currency;
  toggling: boolean;
  onToggle: (id: number, active: boolean) => void;
  onSaveRate: (id: number, rate: number, depositRate: number | null, nameAr: string, nameEn: string) => Promise<void>;
  onDelete: (id: number, nameAr: string) => void;
}) {
  const { toast } = useToast();
  const [rate, setRate] = useState(String(currency.usdRate));
  const [depRate, setDepRate] = useState(currency.depositRate != null ? String(currency.depositRate) : "");
  const [saving, setSaving] = useState(false);
  const changed = rate !== String(currency.usdRate) || depRate !== (currency.depositRate != null ? String(currency.depositRate) : "");

  async function saveRate() {
    const r = parseFloat(rate);
    if (isNaN(r) || r <= 0) { toast({ variant: "destructive", title: "سعر المنتجات غير صالح" }); return; }
    const dr = depRate.trim() !== "" ? parseFloat(depRate) : null;
    if (dr !== null && (isNaN(dr) || dr <= 0)) { toast({ variant: "destructive", title: "سعر الإيداع غير صالح" }); return; }
    setSaving(true);
    try {
      await onSaveRate(currency.id, r, dr, currency.nameAr, currency.nameEn);
      toast({ title: `✅ تم حفظ أسعار ${currency.code}` });
    } catch {
      toast({ variant: "destructive", title: "خطأ في الحفظ" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`p-3 border rounded-xl transition-colors ${currency.isActive ? "bg-card/40 border-border/30" : "bg-muted/20 border-border/20 opacity-60"}`}>
      {/* Top row: toggle + code + name + delete */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-shrink-0">
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={currency.isActive}
              onCheckedChange={v => onToggle(currency.id, v)}
              className="data-[state=checked]:bg-green-500 scale-90"
            />
          )}
        </div>
        <span className={`font-mono font-bold w-12 text-center rounded px-1.5 py-0.5 text-xs flex-shrink-0 ${currency.isActive ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted/30"}`}>
          {currency.code}
        </span>
        <span className="text-sm font-medium flex-1">{currency.nameAr}</span>
        <button
          onClick={() => onDelete(currency.id, currency.nameAr)}
          className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0 p-1"
          title="حذف"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Rate inputs */}
      <div className="space-y-1.5 pr-2">
        {/* Product rate */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-yellow-400 whitespace-nowrap w-24">📦 منتجات:</span>
          <Input
            value={rate}
            onChange={e => setRate(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveRate(); }}
            type="number"
            step="any"
            placeholder="سعر المنتجات"
            className="h-8 flex-1 text-sm bg-background/50 px-2"
            dir="ltr"
          />
          <span className="text-xs text-muted-foreground w-8">{currency.code}</span>
        </div>
        {/* Deposit rate */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 whitespace-nowrap w-24">💰 إيداع:</span>
          <Input
            value={depRate}
            onChange={e => setDepRate(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveRate(); }}
            type="number"
            step="any"
            placeholder={`فارغ = ${rate || currency.usdRate}`}
            className="h-8 flex-1 text-sm bg-background/50 px-2"
            dir="ltr"
          />
          <span className="text-xs text-muted-foreground w-8">{currency.code}</span>
        </div>
      </div>
      <div className="mt-2 flex justify-end pr-2">
        <Button
          size="sm"
          onClick={saveRate}
          disabled={saving || !changed}
          className={`h-8 px-3 text-xs transition-all ${changed ? "bg-primary hover:bg-primary/90" : "opacity-40"}`}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
        </Button>
      </div>
    </div>
  );
}
