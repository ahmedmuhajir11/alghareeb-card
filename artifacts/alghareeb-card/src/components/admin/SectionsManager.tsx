import { useState, useRef } from "react";
import { 
  useListSections, useCreateSection, useUpdateSection, useDeleteSection,
  useListItems, useCreateItem, useUpdateItem, useDeleteItem,
  useListPackages, useCreatePackage, useUpdatePackage, useDeletePackage,
  useUploadImage 
} from "@workspace/api-client-react";
import type { Section, Item, Package } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Upload, Image as ImageIcon, ChevronLeft, ArrowRight, Package as PackageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SectionsManager() {
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  return (
    <div className="space-y-6">
      {selectedItem ? (
        <PackagesView 
          item={selectedItem}
          onBack={() => setSelectedItem(null)} 
        />
      ) : selectedSection ? (
        <ItemsView 
          section={selectedSection}
          onBack={() => setSelectedSection(null)} 
          onSelect={setSelectedItem}
        />
      ) : (
        <SectionsView onSelect={setSelectedSection} />
      )}
    </div>
  );
}

function ImageUploadField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const uploadImg = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadImg.mutateAsync({ data: { file } });
      if (result.url) {
        onChange(result.url);
        toast({ title: "تم رفع الصورة بنجاح" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في رفع الصورة", description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {value && (
          <div className="w-12 h-12 rounded-lg border border-primary/20 flex-shrink-0 overflow-hidden">
            <img src={value} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 flex gap-2">
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="رابط الصورة أو ارفعها من المعرض"
            className="bg-background/50 text-left text-sm"
            dir="ltr"
          />
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex-shrink-0 gap-1 px-3"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Upload className="w-4 h-4" /> <span className="hidden sm:inline text-xs">معرض</span></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionsView({ onSelect }: { onSelect: (s: Section) => void }) {
  const { data: sections, isLoading } = useListSections();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emptyForm = { nameAr: "", nameEn: "", logoUrl: "", pricingType: "per_quantity", sortOrder: 0 };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (section: Section) => {
    setEditTarget(section);
    setFormData({
      nameAr: section.nameAr,
      nameEn: section.nameEn,
      logoUrl: section.logoUrl ?? "",
      pricingType: section.pricingType,
      sortOrder: section.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nameAr || !formData.nameEn) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال اسم القسم بالعربية والإنجليزية" });
      return;
    }
    try {
      if (editTarget) {
        await updateSection.mutateAsync({ id: editTarget.id, data: formData });
        toast({ title: "تم التعديل بنجاح" });
      } else {
        await createSection.mutateAsync({ data: formData });
        toast({ title: "تم الإضافة بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات والباقات التابعة له.")) return;
    try {
      await deleteSection.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      toast({ title: "تم الحذف بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const isSaving = createSection.isPending || updateSection.isPending;

  return (
    <Card className="neon-border bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-primary/20 pb-4">
        <CardTitle>الأقسام (التصنيفات الرئيسية)</CardTitle>
        <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> إضافة قسم</Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections?.map(section => (
              <div key={section.id} className="p-3 border border-border/50 rounded-xl bg-card hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  {section.logoUrl ? (
                    <img src={section.logoUrl} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-sm leading-tight">{section.nameAr}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{section.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${section.pricingType === 'packages' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {section.pricingType === 'packages' ? 'باقات' : 'كميات'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onSelect(section)} className="text-primary hover:bg-primary/10 h-7 w-7">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(section)} className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 h-7 w-7">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle>{editTarget ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>الاسم بالعربية *</Label>
              <Input value={formData.nameAr} onChange={e => setFormData({ ...formData, nameAr: e.target.value })} className="bg-background/50" placeholder="مثال: شحن الألعاب" />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية *</Label>
              <Input value={formData.nameEn} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} className="bg-background/50 text-left" dir="ltr" placeholder="e.g. Game Top-Up" />
            </div>
            <ImageUploadField
              label="صورة القسم (من الهاتف أو رابط)"
              value={formData.logoUrl}
              onChange={url => setFormData({ ...formData, logoUrl: url })}
            />
            <div className="space-y-2">
              <Label>نوع التسعير</Label>
              <Select value={formData.pricingType} onValueChange={v => setFormData({ ...formData, pricingType: v })}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packages">باقات محددة (مثال: الألعاب وشحن الرصيد)</SelectItem>
                  <SelectItem value="per_quantity">كميات يدوية (الزبون يدخل الكمية)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ترتيب العرض</Label>
              <Input type="number" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} className="bg-background/50" dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const CURRENCY_UNITS = [
  "ماسات",
  "شدات",
  "جواهر",
  "توكنز",
  "نقاط",
  "رصيد",
  "ذهب",
  "كاش داخلي",
  "ليرة",
  "فاصولياء",
  "أخرى",
];

type BulkItemRow = { nameAr: string; nameEn: string; pricePerUnit: number };
const emptyItemRow = (): BulkItemRow => ({ nameAr: "", nameEn: "", pricePerUnit: 0 });

function ItemsView({ section, onBack, onSelect }: { section: Section; onBack: () => void; onSelect: (item: Item) => void }) {
  const { data: items, isLoading } = useListItems(section.id);
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isPerQuantity = section.pricingType === "per_quantity";
  const isAppCharging = section.id === 2 || section.nameEn === "Instant App Top-Up" || section.nameAr === "شحن التطبيقات الفوري";
  const isMoneyTransfer = section.id === 3 || section.nameEn === "Money Transfers" || section.nameAr === "الحوالات المالية";

  const emptyForm = { nameAr: "", nameEn: "", logoUrl: "", currencyUnit: isAppCharging ? "ماسات" : "ماسات", customCurrencyUnit: "", pricePerUnit: 0, minQuantity: 1, description: "", sortOrder: 0, isActive: true };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [bulkItemRows, setBulkItemRows] = useState<BulkItemRow[]>([emptyItemRow()]);
  const [isBulkItemSaving, setIsBulkItemSaving] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setFormData(emptyForm);
    setBulkItemRows([emptyItemRow()]);
    setIsDialogOpen(true);
  };

  const updateItemRow = (index: number, field: keyof BulkItemRow, value: string | number) => {
    setBulkItemRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };
  const addItemRow = () => setBulkItemRows(prev => [...prev, emptyItemRow()]);
  const removeItemRow = (index: number) => setBulkItemRows(prev => prev.filter((_, i) => i !== index));

  const handleBulkItemSave = async () => {
    const valid = bulkItemRows.filter(r => r.nameAr.trim() && r.pricePerUnit > 0);
    if (valid.length === 0) {
      toast({ variant: "destructive", title: "خطأ", description: "أدخل اسماً وسعراً لعنصر واحد على الأقل" });
      return;
    }
    setIsBulkItemSaving(true);
    try {
      for (let i = 0; i < valid.length; i++) {
        await createItem.mutateAsync({
          sectionId: section.id,
          data: {
            nameAr: valid[i].nameAr,
            nameEn: valid[i].nameEn || valid[i].nameAr,
            pricePerUnit: valid[i].pricePerUnit,
            currencyUnit: "رصيد",
            sortOrder: i,
            isActive: true,
          }
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${section.id}/items`] });
      toast({ title: `تم إضافة ${valid.length} عنصر بنجاح` });
      setIsDialogOpen(false);
      setBulkItemRows([emptyItemRow()]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setIsBulkItemSaving(false);
    }
  };

  const openEdit = (item: Item) => {
    setEditTarget(item);
    const knownUnit = CURRENCY_UNITS.includes(item.currencyUnit ?? "") ? (item.currencyUnit ?? "ماسات") : "أخرى";
    setFormData({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      logoUrl: item.logoUrl ?? "",
      currencyUnit: knownUnit,
      customCurrencyUnit: knownUnit === "أخرى" ? (item.currencyUnit ?? "") : "",
      pricePerUnit: item.pricePerUnit ?? 0,
      minQuantity: (item as any).minQuantity ?? 1,
      description: item.description ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nameAr || !formData.nameEn) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال الاسم بالعربية والإنجليزية" });
      return;
    }
    if (isPerQuantity && formData.pricePerUnit <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال سعر لكل وحدة" });
      return;
    }
    const finalCurrencyUnit = formData.currencyUnit === "أخرى" ? formData.customCurrencyUnit : formData.currencyUnit;
    const payload: any = {
      nameAr: formData.nameAr,
      nameEn: formData.nameEn,
      logoUrl: formData.logoUrl || undefined,
      currencyUnit: isPerQuantity ? finalCurrencyUnit : undefined,
      pricePerUnit: isPerQuantity ? formData.pricePerUnit : undefined,
      description: isAppCharging ? undefined : (formData.description || undefined),
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    };
    if (isAppCharging) {
      payload.minQuantity = formData.minQuantity > 0 ? formData.minQuantity : 1;
    }
    try {
      if (editTarget) {
        await updateItem.mutateAsync({ id: editTarget.id, data: payload });
        toast({ title: "تم التعديل بنجاح" });
      } else {
        await createItem.mutateAsync({ sectionId: section.id, data: payload });
        toast({ title: "تم الإضافة بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${section.id}/items`] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await deleteItem.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: [`/api/sections/${section.id}/items`] });
      toast({ title: "تم الحذف بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <Card className="neon-border bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-primary/20 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}><ArrowRight className="w-4 h-4" /></Button>
          <div>
            <CardTitle className="text-lg">{section.nameAr}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {isPerQuantity ? "نظام الكميات اليدوية" : "نظام الباقات"}
            </p>
          </div>
        </div>
        {!isMoneyTransfer && (
          <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> إضافة</Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {isMoneyTransfer ? (
          <div className="space-y-5">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-5 bg-primary rounded-full inline-block"></span>
                نموذج خاص بالحوالات المالية
              </h3>
              <p className="text-sm text-muted-foreground leading-6">
                هذا القسم لا يحتاج إلى إضافة منتجات أو باقات. الزبون يرى نموذجاً مدمجاً يدخل فيه بياناته
                ويتم إرسال الطلب مباشرة عبر <span className="text-primary font-bold">واتساب</span>.
              </p>
            </div>

            <div className="bg-card/40 border border-border/50 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-sm">الحقول التي يراها الزبون:</h4>
              <ul className="space-y-2 text-sm">
                {[
                  "اسم المستلم",
                  "المبلغ",
                  "العملة (قائمة منسدلة قابلة للتعديل من الإعدادات)",
                  "الدولة",
                  "المحافظة",
                  "المدينة / القرية",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block"></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-sm text-yellow-600 dark:text-yellow-400">للتعديل:</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground leading-6">
                <li>• <span className="text-foreground font-semibold">قائمة العملات</span>: من تبويب "الإعدادات" → "عملات الحوالات المالية".</li>
                <li>• <span className="text-foreground font-semibold">رقم الواتساب</span>: من تبويب "الإعدادات" → "رقم الواتساب".</li>
              </ul>
            </div>

            {items && items.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-destructive">عناصر قديمة (يمكن حذفها):</h4>
                <p className="text-xs text-muted-foreground">هذه العناصر لا تظهر للزبون لأن القسم يستخدم نموذجاً خاصاً.</p>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-card">
                      <div>
                        <p className="font-semibold text-sm">{item.nameAr}</p>
                        <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items?.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-card hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.logoUrl ? (
                    <img src={item.logoUrl} alt="" className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{item.nameAr}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>
                    {isPerQuantity && item.pricePerUnit && (
                      <p className="text-xs text-primary/80">${item.pricePerUnit} / {item.currencyUnit || "وحدة"}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                  {!isPerQuantity && (
                    <Button variant="ghost" size="icon" onClick={() => onSelect(item)} className="text-primary hover:bg-primary/10 h-8 w-8" title="الباقات">
                      <PackageIcon className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items?.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">لا توجد منتجات. أضف منتجاً جديداً.</div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "تعديل المنتج" : (isPerQuantity ? "إضافة عناصر" : "إضافة منتج جديد")}</DialogTitle>
          </DialogHeader>

          {/* وضع الإضافة المتعددة لقسم تعبئة الرصيد (يُستثنى منه قسم شحن التطبيقات) */}
          {isPerQuantity && !editTarget && !isAppCharging ? (
            <div className="py-4 space-y-3">
              <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>الاسم (عربي)</span>
                <span>الاسم (إنجليزي)</span>
                <span className="text-center">السعر $</span>
                <span></span>
              </div>
              {bulkItemRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 items-center">
                  <Input
                    value={row.nameAr}
                    onChange={e => updateItemRow(index, "nameAr", e.target.value)}
                    className="bg-background/50 h-9 text-sm"
                    placeholder="مثال: 1000 ليرة"
                  />
                  <Input
                    value={row.nameEn}
                    onChange={e => updateItemRow(index, "nameEn", e.target.value)}
                    className="bg-background/50 h-9 text-sm"
                    dir="ltr"
                    placeholder="1000 Lira"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={row.pricePerUnit || ""}
                    onChange={e => updateItemRow(index, "pricePerUnit", parseFloat(e.target.value) || 0)}
                    className="bg-background/50 h-9 text-sm text-center"
                    dir="ltr"
                    placeholder="0.00"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItemRow(index)}
                    disabled={bulkItemRows.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/10" onClick={addItemRow}>
                <Plus className="w-4 h-4" /> إضافة حقل
              </Button>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleBulkItemSave} disabled={isBulkItemSaving}>
                  {isBulkItemSaving ? "جاري الحفظ..." : `حفظ ${bulkItemRows.filter(r => r.nameAr && r.pricePerUnit > 0).length || ""} عنصر`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربية *</Label>
                  <Input value={formData.nameAr} onChange={e => setFormData({ ...formData, nameAr: e.target.value })} className="bg-background/50" placeholder="مثال: ببجي موبايل" />
                </div>
                <div className="space-y-2">
                  <Label>الاسم بالإنجليزية *</Label>
                  <Input value={formData.nameEn} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} className="bg-background/50 text-left" dir="ltr" placeholder="e.g. PUBG Mobile" />
                </div>
              </div>
              <ImageUploadField
                label="صورة اللوجو (من الهاتف أو رابط)"
                value={formData.logoUrl}
                onChange={url => setFormData({ ...formData, logoUrl: url })}
              />
              {isPerQuantity && !isAppCharging && (
                <>
                  <div className="space-y-2">
                    <Label>نوع العملة داخل التطبيق</Label>
                    <Select value={formData.currencyUnit} onValueChange={v => setFormData({ ...formData, currencyUnit: v })}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر نوع العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.currencyUnit === "أخرى" && (
                    <div className="space-y-2">
                      <Label>اكتب نوع العملة</Label>
                      <Input value={formData.customCurrencyUnit} onChange={e => setFormData({ ...formData, customCurrencyUnit: e.target.value })} className="bg-background/50" placeholder="مثال: جوهرة" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>سعر الوحدة الواحدة بالدولار (USD)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={formData.pricePerUnit === 0 ? "" : formData.pricePerUnit}
                        onChange={e => setFormData({ ...formData, pricePerUnit: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="bg-background/50 pr-28"
                        dir="ltr"
                        placeholder="0.0001"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        $ / {formData.currencyUnit === "أخرى" ? formData.customCurrencyUnit || "وحدة" : formData.currencyUnit}
                      </span>
                    </div>
                    {formData.pricePerUnit > 0 && (
                      <p className="text-xs text-primary/80">
                        مثال: 1000 {formData.currencyUnit === "أخرى" ? formData.customCurrencyUnit : formData.currencyUnit} = ${(formData.pricePerUnit * 1000).toFixed(2)}
                      </p>
                    )}
                  </div>
                </>
              )}
              {isAppCharging && (
                <>
                  <div className="space-y-2">
                    <Label>سعر الوحدة الواحدة بالدولار (USD)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={formData.pricePerUnit === 0 ? "" : formData.pricePerUnit}
                        onChange={e => setFormData({ ...formData, pricePerUnit: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                        className="bg-background/50 pr-28"
                        dir="ltr"
                        placeholder="0.0001"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        $ / {formData.currencyUnit === "أخرى" ? formData.customCurrencyUnit || "وحدة" : formData.currencyUnit}
                      </span>
                    </div>
                    {formData.pricePerUnit > 0 && (
                      <p className="text-xs text-primary/80">
                        مثال: 1000 {formData.currencyUnit === "أخرى" ? formData.customCurrencyUnit || "وحدة" : formData.currencyUnit} = ${(formData.pricePerUnit * 1000).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>التسعير (نوع العملة داخل التطبيق)</Label>
                    <Select value={formData.currencyUnit} onValueChange={v => setFormData({ ...formData, currencyUnit: v })}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="اختر نوع العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.currencyUnit === "أخرى" && (
                    <div className="space-y-2">
                      <Label>اكتب نوع العملة</Label>
                      <Input value={formData.customCurrencyUnit} onChange={e => setFormData({ ...formData, customCurrencyUnit: e.target.value })} className="bg-background/50" placeholder="مثال: جوهرة" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>الحد الأدنى لعدد {formData.currencyUnit === "أخرى" ? (formData.customCurrencyUnit || "الوحدات") : formData.currencyUnit}</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.minQuantity === 0 ? "" : formData.minQuantity}
                      onChange={e => setFormData({ ...formData, minQuantity: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                      className="bg-background/50"
                      dir="ltr"
                      placeholder="مثال: 1000"
                    />
                    <p className="text-xs text-muted-foreground">
                      المستخدم لن يستطيع طلب كمية أقل من هذا الرقم.
                    </p>
                  </div>
                </>
              )}
              {!isAppCharging && (
                <div className="space-y-2">
                  <Label>وصف (اختياري)</Label>
                  <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-background/50" placeholder="وصف مختصر..." />
                </div>
              )}
              <div className="space-y-2">
                <Label>ترتيب العرض</Label>
                <Input type="number" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} className="bg-background/50" dir="ltr" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type BulkRow = { label: string; quantity: number; priceUsd: number };
const emptyRow = (): BulkRow => ({ label: "", quantity: 0, priceUsd: 0 });

function PackagesView({ item, onBack }: { item: Item; onBack: () => void }) {
  const { data: packages, isLoading } = useListPackages(item.id);
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emptyForm = { label: "", quantity: 0, priceUsd: 0, sortOrder: 0 };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Package | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow()]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setBulkRows([emptyRow()]);
    setIsDialogOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditTarget(pkg);
    setFormData({ label: pkg.label, quantity: pkg.quantity, priceUsd: pkg.priceUsd, sortOrder: pkg.sortOrder });
    setIsDialogOpen(true);
  };

  const updateRow = (index: number, field: keyof BulkRow, value: string | number) => {
    setBulkRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addRow = () => setBulkRows(prev => [...prev, emptyRow()]);
  const removeRow = (index: number) => setBulkRows(prev => prev.filter((_, i) => i !== index));

  const handleBulkSave = async () => {
    const valid = bulkRows.filter(r => r.label.trim() && r.priceUsd > 0);
    if (valid.length === 0) {
      toast({ variant: "destructive", title: "خطأ", description: "أدخل تسمية وسعراً لباقة واحدة على الأقل" });
      return;
    }
    setIsBulkSaving(true);
    try {
      for (let i = 0; i < valid.length; i++) {
        await createPackage.mutateAsync({ itemId: item.id, data: { ...valid[i], sortOrder: i } });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/packages`] });
      toast({ title: `تم إضافة ${valid.length} باقة بنجاح` });
      setIsDialogOpen(false);
      setBulkRows([emptyRow()]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!formData.label || formData.priceUsd <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال التسمية والسعر" });
      return;
    }
    try {
      await updatePackage.mutateAsync({ id: editTarget!.id, data: formData });
      toast({ title: "تم التعديل بنجاح" });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/packages`] });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    try {
      await deletePackage.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/packages`] });
      toast({ title: "تم الحذف بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    }
  };

  return (
    <Card className="neon-border bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-primary/20 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}><ArrowRight className="w-4 h-4" /></Button>
          <div>
            <CardTitle className="text-lg">باقات {item.nameAr}</CardTitle>
            <p className="text-xs text-muted-foreground">إدارة الباقات والأسعار</p>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> إضافة باقة</Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages?.map(pkg => (
              <div key={pkg.id} className="flex flex-col p-4 border border-border/50 rounded-xl bg-card hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base">{pkg.label}</h3>
                    <p className="text-xs text-primary/70">الكمية: {pkg.quantity}</p>
                  </div>
                  <div className="font-black text-lg text-primary">${pkg.priceUsd.toFixed(2)}</div>
                </div>
                <div className="flex justify-end gap-2 mt-auto pt-3 border-t border-border/30">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)} className="text-yellow-400 hover:text-yellow-400 hover:bg-yellow-400/10 h-7 px-2 gap-1">
                    <Edit className="w-3 h-3" /> تعديل
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 gap-1">
                    <Trash2 className="w-3 h-3" /> حذف
                  </Button>
                </div>
              </div>
            ))}
            {packages?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">لا توجد باقات. أضف باقة جديدة.</div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-primary/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "تعديل الباقة" : "إضافة باقات"}</DialogTitle>
          </DialogHeader>

          {editTarget ? (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>تسمية الباقة</Label>
                <Input value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="bg-background/50" placeholder="مثال: 600 UC" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الكمية</Label>
                  <Input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} className="bg-background/50" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>السعر (USD)</Label>
                  <Input type="number" step="0.01" value={formData.priceUsd} onChange={e => setFormData({ ...formData, priceUsd: parseFloat(e.target.value) || 0 })} className="bg-background/50" dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ترتيب العرض</Label>
                <Input type="number" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} className="bg-background/50" dir="ltr" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleEditSave} disabled={updatePackage.isPending}>
                  {updatePackage.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-4 space-y-3">
              <div className="grid grid-cols-[1fr_80px_90px_32px] gap-2 text-xs text-muted-foreground px-1">
                <span>التسمية</span>
                <span className="text-center">الكمية</span>
                <span className="text-center">السعر $</span>
                <span></span>
              </div>
              {bulkRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                  <Input
                    value={row.label}
                    onChange={e => updateRow(index, "label", e.target.value)}
                    className="bg-background/50 h-9 text-sm"
                    placeholder="مثال: 600 UC"
                  />
                  <Input
                    type="number"
                    value={row.quantity || ""}
                    onChange={e => updateRow(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="bg-background/50 h-9 text-sm text-center"
                    dir="ltr"
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={row.priceUsd || ""}
                    onChange={e => updateRow(index, "priceUsd", parseFloat(e.target.value) || 0)}
                    className="bg-background/50 h-9 text-sm text-center"
                    dir="ltr"
                    placeholder="0.00"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(index)}
                    disabled={bulkRows.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/10" onClick={addRow}>
                <Plus className="w-4 h-4" /> إضافة حقل
              </Button>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleBulkSave} disabled={isBulkSaving}>
                  {isBulkSaving ? "جاري الحفظ..." : `حفظ ${bulkRows.filter(r => r.label && r.priceUsd > 0).length || ""} باقة`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
