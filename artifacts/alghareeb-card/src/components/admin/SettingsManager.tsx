import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsManager() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    usdToTry: 0,
    usdToSyp: 0,
    usdToEur: 0,
    usdToOmr: 0,
    usdToMad: 0,
    usdToDzd: 0,
    usdToIls: 0,
    usdToIqd: 0,
    usdToSar: 0,
    marqueeText: "",
    whatsappNumber: "",
    moneyTransferCurrencies: "",
  });
  const [newCurrency, setNewCurrency] = useState("");

  useEffect(() => {
    if (settings) {
      setFormData({
        usdToTry: settings.usdToTry || 0,
        usdToSyp: settings.usdToSyp || 0,
        usdToEur: settings.usdToEur || 0,
        usdToOmr: settings.usdToOmr || 0,
        usdToMad: settings.usdToMad || 0,
        usdToDzd: settings.usdToDzd || 0,
        usdToIls: settings.usdToIls || 0,
        usdToIqd: settings.usdToIqd || 0,
        usdToSar: settings.usdToSar || 0,
        marqueeText: settings.marqueeText || "",
        whatsappNumber: settings.whatsappNumber || "",
        moneyTransferCurrencies: settings.moneyTransferCurrencies || "دولار,ليرة تركية,يورو,سوري",
      });
    }
  }, [settings]);

  const currenciesList = formData.moneyTransferCurrencies.split(",").map(s => s.trim()).filter(Boolean);
  const addCurrency = () => {
    const v = newCurrency.trim();
    if (!v) return;
    if (currenciesList.includes(v)) {
      toast({ variant: "destructive", title: "موجودة مسبقاً" });
      return;
    }
    setFormData({ ...formData, moneyTransferCurrencies: [...currenciesList, v].join(",") });
    setNewCurrency("");
  };
  const removeCurrency = (c: string) => {
    setFormData({ ...formData, moneyTransferCurrencies: currenciesList.filter(x => x !== c).join(",") });
  };

  const RATE_FIELDS: { key: keyof typeof formData; label: string; placeholder: string }[] = [
    { key: "usdToTry", label: "سعر صرف الليرة التركية (TRY)", placeholder: "مثال: 32" },
    { key: "usdToSyp", label: "سعر صرف الليرة السورية (SYP)", placeholder: "مثال: 13000" },
    { key: "usdToEur", label: "سعر صرف اليورو (EUR)", placeholder: "مثال: 0.92" },
    { key: "usdToOmr", label: "سعر صرف الريال العماني (OMR)", placeholder: "مثال: 0.385" },
    { key: "usdToMad", label: "سعر صرف الدرهم المغربي (MAD)", placeholder: "مثال: 10" },
    { key: "usdToDzd", label: "سعر صرف الدينار الجزائري (DZD)", placeholder: "مثال: 135" },
    { key: "usdToIls", label: "سعر صرف الشيكل الإسرائيلي (ILS)", placeholder: "مثال: 3.7" },
    { key: "usdToIqd", label: "سعر صرف الدينار العراقي (IQD)", placeholder: "مثال: 1310" },
    { key: "usdToSar", label: "سعر صرف الريال السعودي (SAR)", placeholder: "مثال: 3.75" },
  ];

  const handleSave = () => {
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast({
          title: "تم الحفظ",
          description: "تم تحديث الإعدادات بنجاح",
        });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: err.message || "حدث خطأ أثناء الحفظ",
        });
      }
    });
  };

  if (isLoading) return <Skeleton className="w-full h-64 rounded-xl" />;

  return (
    <Card className="neon-border bg-card/50">
      <CardHeader>
        <CardTitle>الإعدادات العامة وأسعار الصرف</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs text-muted-foreground">
          أدخل سعر صرف كل عملة مقابل <span className="text-primary font-bold">1 دولار أمريكي (USD)</span>. مثال: إذا كان 1 دولار = 32 ليرة تركية، اكتب 32.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {RATE_FIELDS.map(f => (
            <div className="space-y-2" key={f.key}>
              <label className="text-sm font-medium">{f.label}</label>
              <Input
                type="number"
                step="any"
                value={formData[f.key] as number}
                onChange={e => setFormData({ ...formData, [f.key]: parseFloat(e.target.value) || 0 })}
                placeholder={f.placeholder}
                className="bg-background/50"
                dir="ltr"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">رقم الواتساب (للطلبات)</label>
          <Input 
            value={formData.whatsappNumber} 
            onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
            className="bg-background/50 text-left"
            dir="ltr"
            placeholder="00905378221375"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">الشريط الإخباري (Marquee)</label>
          <Input 
            value={formData.marqueeText} 
            onChange={e => setFormData({...formData, marqueeText: e.target.value})}
            className="bg-background/50"
          />
        </div>

        <div className="space-y-3 border-t border-primary/10 pt-4">
          <div>
            <label className="text-sm font-medium block mb-1">عملات الحوالات المالية</label>
            <p className="text-xs text-muted-foreground">العملات التي يختار منها الزبون عند إرسال طلب حوالة (تظهر في قسم "الحوالات المالية").</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currenciesList.length === 0 && (
              <span className="text-xs text-muted-foreground">لا توجد عملات. أضف واحدة أدناه.</span>
            )}
            {currenciesList.map(c => (
              <span key={c} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm">
                {c}
                <button
                  type="button"
                  onClick={() => removeCurrency(c)}
                  className="text-destructive hover:text-destructive font-bold mr-1"
                  title="حذف"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCurrency}
              onChange={e => setNewCurrency(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCurrency(); } }}
              placeholder="مثال: درهم إماراتي"
              className="bg-background/50"
            />
            <Button type="button" variant="outline" onClick={addCurrency}>إضافة</Button>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="w-full md:w-auto"
        >
          {updateSettings.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </CardContent>
    </Card>
  );
}
