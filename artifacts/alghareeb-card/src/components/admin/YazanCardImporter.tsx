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

export default function YazanCardImporter() {
  const [products, setProducts] = useState<ProviderProduct[]>([]);
  const [categories, setCategories] = useState<Record<string, ProviderProduct[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [markupPercent, setMarkupPercent] = useState(15);
  const [sectionId, setSectionId] = useState<number | "">("");
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[]; names: string[] } | null>(null);
  const [filterAvail, setFilterAvail] = useState(true);

  // Provider config
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customToken, setCustomToken] = useState("");

  const providerBase = selectedProvider === KNOWN_PROVIDERS.length - 1
    ? customBaseUrl
    : KNOWN_PROVIDERS[selectedProvider].baseUrl;
  const useEnvToken = KNOWN_PROVIDERS[selectedProvider].tokenEnv;

  useEffect(() => { fetchSections(); }, []);

  async function fetchSections() {
    try {
      const res = await fetch("/api/sections");
      const data = await res.json();
      setSections(data.sections || data || []);
    } catch { setSections([]); }
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
    return (rawPrice * (1 + markupPercent / 100)).toFixed(4);
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
              <Label className="text-sm mb-1.5 block">نسبة الربح %</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={200} value={markupPercent} onChange={e => setMarkupPercent(Number(e.target.value))} />
                <span className="text-muted-foreground text-sm whitespace-nowrap">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                شراء 10 → بيع {(10 * (1 + markupPercent / 100)).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col justify-between">
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
                            <p className="text-xs text-muted-foreground line-through">{p.price.toFixed(4)}</p>
                            <p className="text-sm font-bold text-primary">{previewPrice(p.price)}</p>
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
