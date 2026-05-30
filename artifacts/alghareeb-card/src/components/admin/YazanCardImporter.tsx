import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CheckSquare, Square, RefreshCw, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Package, Plug } from "lucide-react";

interface ProviderProduct {
  id: number;
  name: string;
  price: number;
  category_name: string;
  available: boolean;
  qty_values?: { min: string; max: string };
  product_type?: string;
}

interface Section {
  id: number;
  nameAr: string;
  nameEn?: string;
}

const KNOWN_PROVIDERS = [
  { label: "يزن كارد", baseUrl: "https://api.yazancard.com/client/api", tokenEnv: true },
  { label: "سلام كاش", baseUrl: "https://api.salamcash.com/client/api", tokenEnv: false },
  { label: "مخصص...", baseUrl: "", tokenEnv: false },
];

const CURRENCY_OPTIONS = [
  { value: "TRY", label: "ليرة تركية (TRY)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
  { value: "SYP", label: "ليرة سورية (SYP)" },
  { value: "EUR", label: "يورو (EUR)" },
];

export default function YazanCardImporter() {
  const [products, setProducts] = useState<ProviderProduct[]>([]);
  const [categories, setCategories] = useState<Record<string, ProviderProduct[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [markupPercent, setMarkupPercent] = useState(0);
  const [sectionId, setSectionId] = useState<number | "">("");
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped?: number; errors: string[]; names: string[] } | null>(null);
  const [filterAvail, setFilterAvail] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sourceCurrency, setSourceCurrency] = useState("TRY");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ TRY: 40, SYP: 14000, EUR: 0.93 });
  const [importMode, setImportMode] = useState<"flat" | "grouped">("flat");
  const [fixingToken, setFixingToken] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function syncPrices() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const body: Record<string, unknown> = {
        baseUrl: providerBase,
        markupPercent: Number(markupPercent),
        sourceCurrency,
      };
      if (!useEnvToken && customToken) body.token = customToken;
      const res = await fetch("/api/admin/provider/sync-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text.slice(0, 120);
        try { msg = JSON.parse(text).error ?? msg; } catch { /* keep raw */ }
        setSyncResult(`❌ ${res.status}: ${msg}`);
        return;
      }
      const d = JSON.parse(text);
      setSyncResult(`✅ تم تحديث ${d.updated} سعر من أصل ${d.total} منتج${d.errors?.length ? ` (${d.errors.length} خطأ)` : ""}`);
    } catch (e: any) {
      setSyncResult(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function fixYazanToken() {
    setFixingToken(true);
    setFixResult(null);
    try {
      const res = await fetch("/api/admin/fix-yazancard-token", { method: "POST", credentials: "include" });
      const d = await res.json();
      if (res.ok) {
        setFixResult(`✅ تم التحديث — باقات: ${d.packagesUpdated}، عناصر: ${d.itemsUpdated} (توكن: ${d.tokenPrefix})`);
      } else {
        setFixResult(`❌ ${d.error}`);
      }
    } catch (e: any) {
      setFixResult(`❌ ${e.message}`);
    } finally {
      setFixingToken(false);
    }
  }

  // Provider config
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customToken, setCustomToken] = useState("");

  const providerBase = selectedProvider === KNOWN_PROVIDERS.length - 1
    ? customBaseUrl
    : KNOWN_PROVIDERS[selectedProvider].baseUrl;
  const useEnvToken = KNOWN_PROVIDERS[selectedProvider].tokenEnv;

  useEffect(() => {
    fetchSections();
    fetchExchangeRates();
  }, []);

  async function fetchSections() {
    try {
      const res = await fetch("/api/sections");
      const data = await res.json();
      setSections(data.sections || data || []);
    } catch { setSections([]); }
  }

  async function fetchExchangeRates() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const rates: Record<string, number> = {};
      if (data.usdToTry) rates.TRY = data.usdToTry;
      if (data.usdToSyp) rates.SYP = data.usdToSyp;
      if (data.usdToEur) rates.EUR = data.usdToEur;
      if (Object.keys(rates).length > 0) setExchangeRates(prev => ({ ...prev, ...rates }));
    } catch { /* use defaults */ }
  }

  function getExchangeRate(): number {
    if (sourceCurrency === "USD") return 1;
    return exchangeRates[sourceCurrency] ?? 1;
  }

  async function fetchProducts() {
    setLoading(true);
    setError("");
    setImportResult(null);
    setProducts([]);
    setCategories({});
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      params.set("baseUrl", providerBase);
      if (!useEnvToken && customToken) params.set("token", customToken);
      const res = await fetch(`/api/admin/provider/products?${params}`, { credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "فشل جلب المنتجات");
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || {});
      if (Object.keys(data.categories || {}).length > 0) {
        setExpandedCats(new Set([Object.keys(data.categories)[0]]));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleCat(cat: string) {
    setExpandedCats(prev => {
      const s = new Set(prev);
      s.has(cat) ? s.delete(cat) : s.add(cat);
      return s;
    });
  }

  function toggleProduct(id: number) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleCatAll(cat: string) {
    const catProds = (categories[cat] || []).filter(p => !filterAvail || p.available);
    const allSel = catProds.every(p => selected.has(p.id));
    setSelected(prev => {
      const s = new Set(prev);
      catProds.forEach(p => allSel ? s.delete(p.id) : s.add(p.id));
      return s;
    });
  }

  function selectAll() {
    setSelected(new Set(products.filter(p => !filterAvail || p.available).map(p => p.id)));
  }

  function clearAll() { setSelected(new Set()); }

  function previewPrice(rawPrice: number) {
    const rate = getExchangeRate();
    return ((rawPrice / rate) * (1 + markupPercent / 100)).toFixed(6);
  }

  async function doImport() {
    if (!sectionId || selected.size === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const selectedProducts = products.filter(p => selected.has(p.id));
      const body: Record<string, unknown> = {
        products: selectedProducts,
        sectionId: Number(sectionId),
        markupPercent: Number(markupPercent),
        sourceCurrency,
        skipDuplicates,
        importMode,
        baseUrl: providerBase,
      };
      if (!useEnvToken && customToken) body.token = customToken;
      const res = await fetch("/api/admin/provider/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setImportResult(data);
      if (data.imported > 0) setSelected(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  const catNames = Object.keys(categories).sort();
  const totalAvailable = products.filter(p => !filterAvail || p.available).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            استيراد منتجات من مزود API
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            يدعم يزن كارد، سلام كاش، وأي مزود يستخدم نفس الصيغة
          </p>
        </div>
      </div>

      {/* Fix token banner */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-400">إصلاح توكن YazanCard</p>
          <p className="text-muted-foreground text-xs mt-0.5">اضغط إذا كان الشحن التلقائي يعطي "error Token" — سيحدّث التوكن في كل الباقات</p>
          {fixResult && <p className="mt-1 text-xs font-mono">{fixResult}</p>}
        </div>
        <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 shrink-0" onClick={fixYazanToken} disabled={fixingToken}>
          {fixingToken ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />جاري...</> : "إصلاح التوكن"}
        </Button>
      </div>

      {/* Sync prices banner */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 text-sm">
          <p className="font-semibold text-blue-400 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            تحديث أسعار المنتجات من المزود
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            يجلب أحدث الأسعار من المزود المختار ويُحدّث الباقات الموجودة في قاعدة البيانات — استخدم هذا يومياً للحفاظ على الأسعار محدّثة
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            سيُطبَّق نفس الـ Markup ({markupPercent}%) والعملة ({sourceCurrency}) المضبوطين أدناه
          </p>
          {syncResult && <p className="mt-1.5 text-xs font-mono">{syncResult}</p>}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 shrink-0 gap-1.5"
          onClick={syncPrices}
          disabled={syncing}
        >
          {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التحديث...</> : <><RefreshCw className="w-4 h-4" />تحديث الأسعار الآن</>}
        </Button>
      </div>

      {/* Provider selector */}
      <div className="p-4 bg-card/60 border border-primary/20 rounded-xl space-y-4">
        <div>
          <Label className="text-sm mb-2 block font-semibold">اختر المزود</Label>
          <div className="flex flex-wrap gap-2">
            {KNOWN_PROVIDERS.map((p, i) => (
              <button
                key={i}
                onClick={() => { setSelectedProvider(i); setProducts([]); setCategories({}); setError(""); setSelected(new Set()); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedProvider === i ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 hover:border-primary/50"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedProvider === KNOWN_PROVIDERS.length - 1 ? (
            <div>
              <Label className="text-sm mb-1.5 block">Base URL</Label>
              <Input
                placeholder="https://api.example.com/client/api"
                value={customBaseUrl}
                onChange={e => setCustomBaseUrl(e.target.value)}
                dir="ltr"
                className="text-sm"
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm mb-1.5 block">Base URL</Label>
              <Input value={KNOWN_PROVIDERS[selectedProvider].baseUrl} readOnly dir="ltr" className="text-sm bg-muted/40" />
            </div>
          )}

          <div>
            <Label className="text-sm mb-1.5 block">
              التوكن (Api-Token)
              {useEnvToken && <span className="text-xs text-green-400 mr-2">✓ محمّل من السيرفر تلقائياً</span>}
            </Label>
            <Input
              placeholder={useEnvToken ? "محمّل تلقائياً من YAZANCARD_TOKEN" : "أدخل التوكن هنا..."}
              value={customToken}
              onChange={e => setCustomToken(e.target.value)}
              dir="ltr"
              className="text-sm font-mono"
              type="password"
            />
          </div>
        </div>

        <Button
          onClick={fetchProducts}
          disabled={loading || (!providerBase) || (!useEnvToken && !customToken)}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {products.length > 0 ? "تحديث المنتجات" : "جلب المنتجات"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {importResult && (
        <div className={`flex flex-col gap-1 border rounded-lg p-3 text-sm ${importResult.imported > 0 ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            تم استيراد {importResult.imported} منتج بنجاح
            {(importResult.skipped ?? 0) > 0 && (
              <span className="text-yellow-400 font-normal text-xs">— تجاهل {importResult.skipped} مكرر</span>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className="text-yellow-400 text-xs mt-1">
              أخطاء: {importResult.errors.slice(0, 3).join(" | ")}
              {importResult.errors.length > 3 && ` + ${importResult.errors.length - 3} أخرى`}
            </div>
          )}
        </div>
      )}

      {products.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card/60 border border-border/40 rounded-xl">
            <div>
              <Label className="text-sm mb-1.5 block">القسم المستهدف *</Label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                value={sectionId}
                onChange={e => setSectionId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- اختر القسم --</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">عملة المورد</Label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                value={sourceCurrency}
                onChange={e => setSourceCurrency(e.target.value)}
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {sourceCurrency !== "USD"
                  ? `سعر الصرف المستخدم: 1 USD = ${exchangeRates[sourceCurrency] ?? "?"} ${sourceCurrency}`
                  : "لا تحويل — الأسعار بالدولار مباشرة"}
              </p>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">نسبة الربح %</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={200} value={markupPercent} onChange={e => setMarkupPercent(Number(e.target.value))} />
                <span className="text-muted-foreground text-sm whitespace-nowrap">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {markupPercent === 0 ? "بدون ربح — سعر التكلفة مباشرة" : `شراء 10 → بيع ${(10 * (1 + markupPercent / 100)).toFixed(2)}`}
              </p>
            </div>
            <div className="flex flex-col justify-between">
              <Label className="text-sm mb-1.5 block">طريقة الاستيراد</Label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setImportMode("flat")}
                  className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors ${importMode === "flat" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  منتج واحد لكل عنصر
                </button>
                <button
                  onClick={() => setImportMode("grouped")}
                  className={`flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors ${importMode === "grouped" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  فئة = عنصر + باقات
                </button>
              </div>
              {importMode === "grouped" && (
                <p className="text-xs text-yellow-400 mb-2">
                  كل فئة (مثل 8 Ball Pool) ستصبح عنصراً واحداً وباقاتها بداخله
                </p>
              )}
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="skipDup" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} className="accent-primary" />
                <Label htmlFor="skipDup" className="text-sm cursor-pointer">تجاهل المكرر (موصى به)</Label>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="filterAvail" checked={filterAvail} onChange={e => setFilterAvail(e.target.checked)} className="accent-primary" />
                <Label htmlFor="filterAvail" className="text-sm cursor-pointer">المتاح فقط</Label>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                  <CheckSquare className="w-3 h-3 ml-1" /> تحديد الكل ({totalAvailable})
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
                  <Square className="w-3 h-3 ml-1" /> إلغاء الكل
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              {catNames.length} فئة — {totalAvailable} منتج — <span className="text-primary font-semibold">{selected.size} محدد</span>
            </p>
            <Button onClick={doImport} disabled={importing || selected.size === 0 || !sectionId} className="gap-2 bg-primary hover:bg-primary/80">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              استيراد {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>

          <div className="space-y-2">
            {catNames.map(cat => {
              const catProds = (categories[cat] || []).filter(p => !filterAvail || p.available);
              if (catProds.length === 0) return null;
              const isOpen = expandedCats.has(cat);
              const allSel = catProds.every(p => selected.has(p.id));
              const someSel = catProds.some(p => selected.has(p.id));

              return (
                <div key={cat} className="border border-border/40 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-card/60 cursor-pointer hover:bg-card/80 transition-colors" onClick={() => toggleCat(cat)}>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); toggleCatAll(cat); }} className="text-muted-foreground hover:text-primary transition-colors">
                        {allSel ? <CheckSquare className="w-4 h-4 text-primary" /> : someSel ? <CheckSquare className="w-4 h-4 text-primary/50" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className="font-semibold text-sm">{cat}</span>
                      <Badge variant="secondary" className="text-xs">{catProds.length}</Badge>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  {isOpen && (
                    <div className="divide-y divide-border/30">
                      {catProds.map(p => (
                        <div key={p.id} onClick={() => toggleProduct(p.id)} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm ${selected.has(p.id) ? "bg-primary/10" : "hover:bg-card/60"}`}>
                          <div className="flex-shrink-0">
                            {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            {p.qty_values && (
                              <p className="text-xs text-muted-foreground">
                                الحد الأدنى: {p.qty_values.min} — الأقصى: {p.qty_values.max}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">{p.price.toFixed(4)} {sourceCurrency}</p>
                            <p className="text-sm font-bold text-primary">{previewPrice(p.price)} USD</p>
                          </div>
                          {!p.available && <Badge variant="destructive" className="text-xs">غير متاح</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && products.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">اختر المزود وأدخل التوكن ثم اضغط "جلب المنتجات"</p>
          <p className="text-xs mt-1 opacity-60">يعمل مع يزن كارد، سلام كاش، وأي API بنفس الصيغة</p>
        </div>
      )}
    </div>
  );
}
