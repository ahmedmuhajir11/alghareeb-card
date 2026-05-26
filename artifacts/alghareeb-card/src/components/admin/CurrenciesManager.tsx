import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, X, Plus, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Currency {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  usdRate: number;
  isActive: boolean;
}

async function adminFetch(path: string, opts?: RequestInit) {
  const token = document.cookie.match(/admin_token=([^;]+)/)?.[1];
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

function CurrencyRow({
  currency, onDelete, onUpdate, onToggle,
}: {
  currency: Currency;
  onDelete: (id: number) => void;
  onUpdate: (id: number, rate: number, nameAr: string, nameEn: string) => void;
  onToggle: (id: number, isActive: boolean) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(String(currency.usdRate));
  const [nameAr, setNameAr] = useState(currency.nameAr);
  const [nameEn, setNameEn] = useState(currency.nameEn);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function save() {
    const r = parseFloat(rate);
    if (isNaN(r) || r <= 0) { toast({ variant: "destructive", title: "سعر الصرف غير صالح" }); return; }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/currencies/${currency.id}`, {
        method: "PATCH",
        body: JSON.stringify({ usdRate: r, nameAr, nameEn }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "خطأ");
      onUpdate(currency.id, r, nameAr, nameEn);
      setEditing(false);
      toast({ title: "تم تحديث العملة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm(`هل تريد حذف عملة "${currency.nameAr}"؟`)) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/currencies/${currency.id}`, { method: "DELETE" });
      onDelete(currency.id);
      toast({ title: "تم حذف العملة" });
    } catch {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    } finally {
      setDeleting(false);
    }
  }

  async function toggle(checked: boolean) {
    setToggling(true);
    try {
      const res = await adminFetch(`/api/admin/currencies/${currency.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: checked }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "خطأ");
      onToggle(currency.id, checked);
      toast({ title: checked ? `✅ تم تفعيل ${currency.code}` : `⏸ تم إيقاف ${currency.code}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setToggling(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/30 rounded-xl">
        <span className="font-mono text-primary font-bold w-14 text-center bg-primary/10 rounded px-2 py-0.5 text-sm">{currency.code}</span>
        <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="الاسم بالعربي" className="bg-background/50 h-8 text-sm w-32" />
        <Input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="الاسم بالإنجليزي" className="bg-background/50 h-8 text-sm w-32" dir="ltr" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">1 USD =</span>
          <Input value={rate} onChange={e => setRate(e.target.value)} type="number" step="any" className="bg-background/50 h-8 text-sm w-28" dir="ltr" />
        </div>
        <div className="flex gap-1 mr-auto">
          <Button size="sm" onClick={save} disabled={saving} className="h-7 px-2 gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}حفظ
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRate(String(currency.usdRate)); setNameAr(currency.nameAr); setNameEn(currency.nameEn); }} className="h-7 px-2">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 border rounded-xl transition-colors ${currency.isActive ? "bg-card/40 border-border/30" : "bg-muted/20 border-border/20 opacity-60"}`}>
      <span className={`font-mono font-bold w-14 text-center rounded px-2 py-0.5 text-sm ${currency.isActive ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted/30"}`}>
        {currency.code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{currency.nameAr}</p>
        <p className="text-xs text-muted-foreground">{currency.nameEn}</p>
      </div>
      <div className="text-sm text-muted-foreground text-left hidden sm:block" dir="ltr">
        1 USD = <span className="text-foreground font-semibold">{currency.usdRate}</span>
      </div>
      <div className="flex items-center gap-2">
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={currency.isActive}
            onCheckedChange={toggle}
            className="data-[state=checked]:bg-green-500"
          />
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7 p-0">
          <Pencil className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={del} disabled={deleting} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

export default function CurrenciesManager() {
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newRate, setNewRate] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/currencies");
      const data = await res.json();
      setCurrencies(Array.isArray(data) ? data : []);
    } catch {
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newCode || !newNameAr || !newNameEn || !newRate) {
      toast({ variant: "destructive", title: "جميع الحقول مطلوبة" });
      return;
    }
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast({ variant: "destructive", title: "سعر الصرف غير صالح" });
      return;
    }
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
      setShowForm(false);
      toast({ title: "✅ تمت إضافة العملة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(id: number) {
    setCurrencies(prev => prev.filter(c => c.id !== id));
  }

  function handleUpdate(id: number, rate: number, nameAr: string, nameEn: string) {
    setCurrencies(prev => prev.map(c => c.id === id ? { ...c, usdRate: rate, nameAr, nameEn } : c));
  }

  function handleToggle(id: number, isActive: boolean) {
    setCurrencies(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
  }

  const activeCount = currencies.filter(c => c.isActive).length;

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-muted-foreground">
        أدخل سعر كل عملة مقابل <span className="text-primary font-bold">1 دولار أمريكي (USD)</span>. مثال: إذا 1 دولار = 32 ليرة تركية، اكتب 32.
        استخدم زر التبديل <span className="text-foreground font-semibold">تشغيل/إيقاف</span> للتحكم في ظهور العملة للمستخدمين عند إنشاء الحساب.
      </div>

      {currencies.length > 0 && (
        <p className="text-xs text-muted-foreground">
          مُفعَّل: <span className="text-green-400 font-semibold">{activeCount}</span> / {currencies.length} عملة
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {currencies.map(c => (
            <CurrencyRow key={c.id} currency={c} onDelete={handleDelete} onUpdate={handleUpdate} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5">
          <p className="text-sm font-semibold">إضافة عملة جديدة</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">رمز العملة (مثال: AED)</label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="AED" className="bg-background/50 h-8 text-sm font-mono" dir="ltr" maxLength={10} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">سعر الصرف (1 USD = ؟)</label>
              <Input value={newRate} onChange={e => setNewRate(e.target.value)} type="number" step="any" placeholder="مثال: 3.67" className="bg-background/50 h-8 text-sm" dir="ltr" />
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
            <Button onClick={handleAdd} disabled={adding} size="sm" className="gap-1">
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              إضافة
            </Button>
            <Button onClick={() => { setShowForm(false); setNewCode(""); setNewNameAr(""); setNewNameEn(""); setNewRate(""); }} variant="ghost" size="sm">إلغاء</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="gap-2 mt-2">
          <Plus className="w-4 h-4" />
          إضافة عملة جديدة
        </Button>
      )}
    </div>
  );
}
