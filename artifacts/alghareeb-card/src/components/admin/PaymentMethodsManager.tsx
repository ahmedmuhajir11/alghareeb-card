import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Upload, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

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
  isActive: boolean;
  sortOrder: number;
  allowedCurrencies: string;
};

const ALL_CURRENCIES: { code: string; label: string }[] = [
  { code: "USD", label: "دولار أمريكي (USD)" },
  { code: "TRY", label: "ليرة تركية (TRY)" },
  { code: "SYP", label: "ليرة سورية (SYP)" },
  { code: "EUR", label: "يورو (EUR)" },
  { code: "SAR", label: "ريال سعودي (SAR)" },
  { code: "EGP", label: "جنيه مصري (EGP)" },
  { code: "JOD", label: "دينار أردني (JOD)" },
  { code: "IQD", label: "دينار عراقي (IQD)" },
  { code: "MAD", label: "درهم مغربي (MAD)" },
  { code: "DZD", label: "دينار جزائري (DZD)" },
  { code: "OMR", label: "ريال عماني (OMR)" },
  { code: "ILS", label: "شيكل (ILS)" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}/api${path}`;

function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods/all"],
    queryFn: async () => {
      const res = await fetch(api("/payment-methods/all"));
      return res.json();
    },
  });
}

function isTurkeyMethod(nameAr: string, nameEn: string): boolean {
  return nameAr.includes("تركي") || nameAr.includes("تركيا") || nameEn.toLowerCase().includes("turk");
}

const emptyForm = () => ({
  nameAr: "", nameEn: "", flagEmoji: "🌍",
  fields: [{ label: "", value: "", isCopyable: true }] as PaymentField[],
  qrImageUrl: "", notes: [""], requireSenderName: false, requireKyc: false, isActive: true, sortOrder: 0,
  allowedCurrencies: "",
});

export default function PaymentMethodsManager() {
  const { data: methods, isLoading } = usePaymentMethods();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payment-methods/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        fields: data.fields.filter(f => f.label && f.value),
        notes: data.notes.filter(n => n.trim()),
        qrImageUrl: data.qrImageUrl || null,
      };
      const url = editTarget ? api(`/payment-methods/${editTarget.id}`) : api("/payment-methods");
      const res = await fetch(url, {
        method: editTarget ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: editTarget ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح" });
      setIsDialogOpen(false);
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "خطأ", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api(`/payment-methods/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { invalidate(); toast({ title: "تم الحذف" }); },
    onError: (err: Error) => toast({ variant: "destructive", title: "خطأ", description: err.message }),
  });

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(api("/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) { setForm(f => ({ ...f, qrImageUrl: data.url })); toast({ title: "تم رفع الصورة" }); }
    } catch { toast({ variant: "destructive", title: "خطأ في الرفع" }); }
    finally { setIsUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(api("/upload"), { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) { setForm(f => ({ ...f, flagEmoji: data.url })); toast({ title: "تم رفع اللوجو" }); }
    } catch { toast({ variant: "destructive", title: "خطأ في الرفع" }); }
    finally { setIsUploadingLogo(false); if (logoFileRef.current) logoFileRef.current.value = ""; }
  };

  const isLogoImage = (val: string) => val.startsWith("http") || val.startsWith("/");

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setIsDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditTarget(m);
    setForm({
      nameAr: m.nameAr, nameEn: m.nameEn, flagEmoji: m.flagEmoji,
      fields: m.fields.length ? m.fields : [{ label: "", value: "", isCopyable: true }],
      qrImageUrl: m.qrImageUrl ?? "",
      notes: m.notes.length ? m.notes : [""],
      requireSenderName: m.requireSenderName ?? false,
      requireKyc: m.requireKyc ?? false,
      isActive: m.isActive, sortOrder: m.sortOrder,
      allowedCurrencies: m.allowedCurrencies ?? "",
    });
    setIsDialogOpen(true);
  };

  const updateField = (i: number, key: keyof PaymentField, val: string | boolean) =>
    setForm(f => ({ ...f, fields: f.fields.map((fd, idx) => idx === i ? { ...fd, [key]: val } : fd) }));
  const addField = () => setForm(f => ({ ...f, fields: [...f.fields, { label: "", value: "", isCopyable: true }] }));
  const removeField = (i: number) => setForm(f => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }));

  const updateNote = (i: number, val: string) =>
    setForm(f => ({ ...f, notes: f.notes.map((n, idx) => idx === i ? val : n) }));
  const addNote = () => setForm(f => ({ ...f, notes: [...f.notes, ""] }));
  const removeNote = (i: number) => setForm(f => ({ ...f, notes: f.notes.filter((_, idx) => idx !== i) }));

  return (
    <Card className="neon-border bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-primary/20 pb-4">
        <CardTitle>طرق الدفع والإيداع</CardTitle>
        <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> إضافة طريقة</Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="space-y-3">
            {methods?.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-4 border border-border/50 rounded-xl bg-card hover:border-primary/30 transition-colors">
                {m.flagEmoji?.startsWith("http") || m.flagEmoji?.startsWith("/") ? (
                  <img src={m.flagEmoji} alt="" className="w-9 h-7 object-cover rounded-sm flex-shrink-0" />
                ) : (
                  <span className="text-2xl flex-shrink-0">{m.flagEmoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{m.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{m.nameEn}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {m.fields.slice(0, 2).map((f, i) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full">{f.label}</span>
                    ))}
                    {m.qrImageUrl && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">QR</span>}
                    {!m.isActive && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">مخفي</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-400 hover:bg-yellow-400/10" onClick={() => openEdit(m)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => confirm("هل أنت متأكد من الحذف؟") && deleteMutation.mutate(m.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!methods?.length && <div className="text-center py-8 text-muted-foreground">لا توجد طرق دفع</div>}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[580px] bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "تعديل طريقة الدفع" : "إضافة طريقة دفع جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>اللوجو (صورة أو إيموجي)</Label>
              <div className="flex gap-2 items-center">
                <div className="w-14 h-14 rounded-lg border border-primary/30 overflow-hidden bg-background/40 flex-shrink-0 flex items-center justify-center">
                  {form.flagEmoji && isLogoImage(form.flagEmoji) ? (
                    <img
                      src={form.flagEmoji}
                      alt="logo"
                      className="w-full h-full object-contain"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <span className="text-3xl leading-none">{form.flagEmoji || "🌍"}</span>
                  )}
                </div>
                <Input
                  value={form.flagEmoji}
                  onChange={e => setForm(f => ({ ...f, flagEmoji: e.target.value }))}
                  className="bg-background/50 text-sm flex-1"
                  dir="ltr"
                  placeholder="رابط الصورة أو إيموجي مثل 🌍"
                />
                <input
                  type="file"
                  ref={logoFileRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUploadLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex-shrink-0 gap-1 px-3"
                  title="رفع لوجو من الهاتف"
                >
                  {isUploadingLogo ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
                {form.flagEmoji && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-9 w-9 flex-shrink-0"
                    onClick={() => setForm(f => ({ ...f, flagEmoji: "" }))}
                    title="إزالة"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">يمكنك رفع لوجو من جهازك، أو لصق رابط صورة، أو ترك إيموجي.</p>
            </div>

            <div className="space-y-1.5">
              <Label>الاسم بالعربية *</Label>
              <Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="bg-background/50" placeholder="مثال: الإيداع من تركيا" />
            </div>
            <div className="space-y-1.5">
              <Label>الاسم بالإنجليزية *</Label>
              <Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="bg-background/50" dir="ltr" placeholder="e.g. Deposit from Turkey" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الحقول (البيانات القابلة للنسخ)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addField} className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" /> إضافة حقل
                </Button>
              </div>
              <div className="space-y-2">
                {form.fields.map((field, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background/30 p-3 rounded-lg border border-border/30">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input value={field.label} onChange={e => updateField(i, "label", e.target.value)} placeholder="التسمية (مثال: IBAN)" className="bg-background/50 text-sm h-9" />
                      <Input value={field.value} onChange={e => updateField(i, "value", e.target.value)} placeholder="القيمة" className="bg-background/50 text-sm h-9" dir="ltr" />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                      <div className="flex items-center gap-1">
                        <Switch checked={field.isCopyable} onCheckedChange={v => updateField(i, "isCopyable", v)} id={`copy-${i}`} />
                        <label htmlFor={`copy-${i}`} className="text-xs text-muted-foreground">نسخ</label>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeField(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>صورة QR (اختياري)</Label>
              <div className="flex gap-2 items-center">
                {form.qrImageUrl && (
                  <div className="w-14 h-14 rounded-lg border border-primary/30 overflow-hidden bg-white flex-shrink-0">
                    <img src={form.qrImageUrl} alt="QR" className="w-full h-full object-contain" />
                  </div>
                )}
                <Input value={form.qrImageUrl} onChange={e => setForm(f => ({ ...f, qrImageUrl: e.target.value }))} className="bg-background/50 text-sm" dir="ltr" placeholder="رابط الصورة أو ارفع من الهاتف" />
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUploadQR} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={isUploading} className="flex-shrink-0 gap-1 px-3">
                  {isUploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
                {form.qrImageUrl && (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9 flex-shrink-0" onClick={() => setForm(f => ({ ...f, qrImageUrl: "" }))}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ملاحظات وتنويهات</Label>
                <Button type="button" size="sm" variant="outline" onClick={addNote} className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" /> إضافة ملاحظة
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">يمكنك كتابة نسخة عربية ونسخة إنجليزية — تُعرض النسخة المناسبة حسب لغة المستخدم.</p>
              <div className="space-y-3">
                {form.notes.map((note, i) => {
                  const parts = note.split("||");
                  const arVal = parts[0]?.trim() ?? note;
                  const enVal = parts[1]?.trim() ?? "";
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground w-6 text-left flex-shrink-0 mt-2">({i + 1})</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <Input
                          value={arVal}
                          onChange={e => updateNote(i, e.target.value.trim() || enVal ? `${e.target.value}||${enVal}` : e.target.value)}
                          className="bg-background/50 text-sm"
                          placeholder="الملاحظة بالعربية..."
                          dir="rtl"
                        />
                        <Input
                          value={enVal}
                          onChange={e => updateNote(i, e.target.value.trim() || arVal ? `${arVal}||${e.target.value}` : arVal)}
                          className="bg-background/50 text-sm"
                          placeholder="Note in English... (optional)"
                          dir="ltr"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0 mt-1" onClick={() => removeNote(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>عملات الإيداع المسموح بها</Label>
              <p className="text-xs text-muted-foreground">
                اختر العملات التي يمكن للمستخدم الإيداع بها. إذا اخترت عملة واحدة فقط، تُقفل تلقائياً ولا يمكن تغييرها. إذا تركتها فارغة، تظهر كل العملات.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-background/30 rounded-lg border border-border/30">
                {ALL_CURRENCIES.map(({ code, label }) => {
                  const selected = form.allowedCurrencies
                    ? form.allowedCurrencies.split(",").map(s => s.trim()).filter(Boolean).includes(code)
                    : false;
                  return (
                    <label
                      key={code}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${selected ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-background/50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={e => {
                          const current = form.allowedCurrencies
                            ? form.allowedCurrencies.split(",").map(s => s.trim()).filter(Boolean)
                            : [];
                          const next = e.target.checked
                            ? [...current, code]
                            : current.filter(c => c !== code);
                          setForm(f => ({ ...f, allowedCurrencies: next.join(",") }));
                        }}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-xs">{label}</span>
                    </label>
                  );
                })}
              </div>
              {form.allowedCurrencies && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                  onClick={() => setForm(f => ({ ...f, allowedCurrencies: "" }))}
                >
                  مسح الاختيار (إظهار كل العملات)
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg border border-blue-500/20">
              <Switch checked={form.requireSenderName} onCheckedChange={v => setForm(f => ({ ...f, requireSenderName: v }))} id="requireSenderName" />
              <div>
                <label htmlFor="requireSenderName" className="text-sm font-medium cursor-pointer">طلب اسم المرسل</label>
                <p className="text-xs text-muted-foreground">عند التفعيل سيُطلب من المستخدم كتابة اسم المرسل قبل رفع الإيصال</p>
              </div>
            </div>

            {isTurkeyMethod(form.nameAr, form.nameEn) && (
              <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg border border-orange-500/30">
                <Switch checked={form.requireKyc} onCheckedChange={v => setForm(f => ({ ...f, requireKyc: v }))} id="requireKyc" />
                <div>
                  <label htmlFor="requireKyc" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    🔒 إلزام التحقق من الهوية
                  </label>
                  <p className="text-xs text-muted-foreground">عند التفعيل لن يرى المستخدم تفاصيل الدفع (الآيبان) حتى يتحقق من هويته</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-background/30 rounded-lg border border-border/30">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="isActive" />
              <label htmlFor="isActive" className="text-sm">مرئي للزوار</label>
              <div className="mr-auto flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">ترتيب العرض</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-16 h-8 bg-background/50 text-sm" dir="ltr" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.nameAr || !form.nameEn}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
