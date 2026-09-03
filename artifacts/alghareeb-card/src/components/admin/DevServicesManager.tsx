import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Globe, Smartphone, HelpCircle, Settings, Upload, MessageSquare, Loader2, Eye, EyeOff } from "lucide-react";

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

interface ServiceCardItem {
  id: number;
  serviceType: "websites" | "mobile_apps";
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  icon?: string;
  price?: string;
  isActive: boolean;
  sortOrder: number;
}

interface QuestionItem {
  id: number;
  serviceType: "websites" | "mobile_apps";
  titleAr: string;
  titleEn?: string;
  questionType: string;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface DevSettings {
  whatsappNumber: string;
  websitesEnabled: boolean;
  mobileAppsEnabled: boolean;
  websitesHeroTitle: string;
  websitesHeroDesc: string;
  websitesHeroImage: string;
  mobileAppsHeroTitle: string;
  mobileAppsHeroDesc: string;
  mobileAppsHeroImage: string;
}

interface DevRequest {
  id: number;
  serviceType: string;
  answers: any;
  selectedServiceCard?: string;
  submittedAt: string;
}

export default function DevServicesManager() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState("websites");
  const [webCards, setWebCards] = useState<ServiceCardItem[]>([]);
  const [mobileCards, setMobileCards] = useState<ServiceCardItem[]>([]);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<ServiceCardItem> | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionItem> | null>(null);
  const [newOption, setNewOption] = useState("");
  const [settings, setSettings] = useState<DevSettings>({
    whatsappNumber: "", websitesEnabled: true, mobileAppsEnabled: true,
    websitesHeroTitle: "تطوير وبرمجة المواقع", websitesHeroDesc: "", websitesHeroImage: "",
    mobileAppsHeroTitle: "تطوير وبرمجة تطبيقات الجوال", mobileAppsHeroDesc: "", mobileAppsHeroImage: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [requests, setRequests] = useState<DevRequest[]>([]);
  const [viewingRequest, setViewingRequest] = useState<DevRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"card" | "webHero" | "mobileHero">("card");

  const loadAll = async () => {
    try {
      const [wcRes, mcRes, qRes, sRes, reqRes] = await Promise.all([
        adminFetch("/api/admin/dev/service-cards?type=websites"),
        adminFetch("/api/admin/dev/service-cards?type=mobile_apps"),
        adminFetch("/api/admin/dev/form-questions"),
        adminFetch("/api/dev/settings"),
        adminFetch("/api/admin/dev/requests"),
      ]);
      if (wcRes.ok) setWebCards(await wcRes.json());
      if (mcRes.ok) setMobileCards(await mcRes.json());
      if (qRes.ok) setQuestions(await qRes.json());
      if (sRes.ok) setSettings(await sRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في تحميل البيانات", description: e.message });
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = document.cookie.match(/admin_token=([^;]+)/)?.[1];
      const ak = typeof window !== "undefined" ? sessionStorage.getItem("_ak") : null;
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(ak ? { "x-admin-key": ak } : {}),
        },
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        if (uploadTarget === "card" && editingCard) {
          setEditingCard(prev => ({ ...prev, imageUrl: data.url }));
        } else if (uploadTarget === "webHero") {
          setSettings(prev => ({ ...prev, websitesHeroImage: data.url }));
        } else if (uploadTarget === "mobileHero") {
          setSettings(prev => ({ ...prev, mobileAppsHeroImage: data.url }));
        }
        toast({ title: "تم رفع الصورة بنجاح" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ أثناء الرفع", description: err.message });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveCard = async () => {
    if (!editingCard?.nameAr || !editingCard.serviceType) {
      toast({ variant: "destructive", title: "اسم الخدمة ونوعها مطلوبان" });
      return;
    }
    try {
      if (editingCard.id) {
        await adminFetch(`/api/admin/dev/service-cards/${editingCard.id}`, {
          method: "PUT",
          body: JSON.stringify(editingCard),
        });
        toast({ title: "تم تحديث بطاقة الخدمة" });
      } else {
        await adminFetch("/api/admin/dev/service-cards", {
          method: "POST",
          body: JSON.stringify(editingCard),
        });
        toast({ title: "تمت إضافة بطاقة الخدمة" });
      }
      setCardDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في الحفظ", description: e.message });
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    try {
      await adminFetch(`/api/admin/dev/service-cards/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف الخدمة" });
      loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في الحذف", description: e.message });
    }
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion?.titleAr || !editingQuestion.serviceType || !editingQuestion.questionType) {
      toast({ variant: "destructive", title: "عنوان السؤال ونوعه مطلوبان" });
      return;
    }
    try {
      if (editingQuestion.id) {
        await adminFetch(`/api/admin/dev/form-questions/${editingQuestion.id}`, {
          method: "PUT",
          body: JSON.stringify(editingQuestion),
        });
        toast({ title: "تم تحديث السؤال" });
      } else {
        await adminFetch("/api/admin/dev/form-questions", {
          method: "POST",
          body: JSON.stringify(editingQuestion),
        });
        toast({ title: "تمت إضافة السؤال" });
      }
      setQuestionDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في الحفظ", description: e.message });
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;
    try {
      await adminFetch(`/api/admin/dev/form-questions/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف السؤال" });
      loadAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في الحذف", description: e.message });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await adminFetch("/api/admin/dev/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "تم حفظ الإعدادات بنجاح" });
      } else {
        throw new Error("Failed");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ في حفظ الإعدادات", description: e.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const renderCardList = (type: "websites" | "mobile_apps", cardsList: ServiceCardItem[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {type === "websites" ? "بطاقات خدمات تطوير المواقع" : "بطاقات خدمات تطبيقات الجوال"} ({cardsList.length})
        </h3>
        <Button
          onClick={() => {
            setEditingCard({ serviceType: type, nameAr: "", descriptionAr: "", price: "", isActive: true, sortOrder: cardsList.length + 1 });
            setCardDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة خدمة جديدة
        </Button>
      </div>

      {cardsList.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
          لا توجد خدمات مضافة حتى الآن في هذا القسم
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsList.map(c => (
            <Card key={c.id} className={`overflow-hidden border transition-all ${c.isActive ? "border-border/60" : "opacity-60 border-destructive/30"}`}>
              {c.imageUrl && (
                <div className="h-36 overflow-hidden relative">
                  <img src={c.imageUrl} alt={c.nameAr} className="w-full h-full object-cover" />
                  {c.price && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-white text-xs font-bold">
                      {c.price}
                    </span>
                  )}
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base">{c.nameAr}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    ترتيب: {c.sortOrder}
                  </span>
                </div>
                {c.descriptionAr && <p className="text-xs text-muted-foreground line-clamp-2">{c.descriptionAr}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs flex items-center gap-1 text-muted-foreground">
                    {c.isActive ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    {c.isActive ? "مفعّل" : "معطّل"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingCard(c); setCardDialogOpen(true); }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCard(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div>
        <h2 className="text-2xl font-bold">إدارة خدمات التطوير والبرمجة</h2>
        <p className="text-muted-foreground text-sm">تحكم كامل ومستقل ببطاقات وأسئلة ونماذج تطوير المواقع وتطبيقات الجوال</p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-5 w-full bg-card border border-primary/20 h-auto p-1 gap-1">
          <TabsTrigger value="websites" className="gap-2 py-2 text-xs md:text-sm">
            <Globe className="w-4 h-4" />
            تطوير المواقع
          </TabsTrigger>
          <TabsTrigger value="mobile_apps" className="gap-2 py-2 text-xs md:text-sm">
            <Smartphone className="w-4 h-4" />
            تطبيقات الجوال
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2 py-2 text-xs md:text-sm">
            <HelpCircle className="w-4 h-4" />
            إدارة الأسئلة
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 py-2 text-xs md:text-sm">
            <Settings className="w-4 h-4" />
            إعدادات واتساب
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 py-2 text-xs md:text-sm">
            <MessageSquare className="w-4 h-4" />
            الطلبات ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="websites" className="mt-6">
          {renderCardList("websites", webCards)}
        </TabsContent>

        <TabsContent value="mobile_apps" className="mt-6">
          {renderCardList("mobile_apps", mobileCards)}
        </TabsContent>

        <TabsContent value="questions" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">أسئلة نماذج التطوير ({questions.length})</h3>
            <Button
              onClick={() => {
                setEditingQuestion({
                  serviceType: "websites",
                  titleAr: "",
                  questionType: "single",
                  options: [],
                  isRequired: false,
                  sortOrder: questions.length + 1,
                  isActive: true,
                });
                setQuestionDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة سؤال جديد
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map(q => (
              <div key={q.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{q.titleAr}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${q.serviceType === "websites" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                      {q.serviceType === "websites" ? "مواقع" : "تطبيقات"}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground">
                      {q.questionType}
                    </span>
                    {q.isRequired && <span className="text-xs text-destructive font-bold">* إجباري</span>}
                  </div>
                  {q.options && q.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      الخيارات: {q.options.join(" | ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingQuestion(q); setQuestionDialogOpen(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>إعدادات WhatsApp والاستقبال</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>رقم WhatsApp المعتمد لاستلام الطلبات</Label>
                <Input
                  value={settings.whatsappNumber}
                  onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                  placeholder="مثال: 905378221375"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">أدخل الرقم بالصيغة الدولية بدون مسافات أو علامة +</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <span>استقبال طلبات المواقع</span>
                  <Switch
                    checked={settings.websitesEnabled}
                    onCheckedChange={v => setSettings(s => ({ ...s, websitesEnabled: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <span>استقبال طلبات التطبيقات</span>
                  <Switch
                    checked={settings.mobileAppsEnabled}
                    onCheckedChange={v => setSettings(s => ({ ...s, mobileAppsEnabled: v }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>تخصيص Hero صفحة المواقع (/dev/websites)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>العنوان الرئيسي</Label>
                <Input
                  value={settings.websitesHeroTitle}
                  onChange={e => setSettings(s => ({ ...s, websitesHeroTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={settings.websitesHeroDesc}
                  onChange={e => setSettings(s => ({ ...s, websitesHeroDesc: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>صورة Hero للمواقع</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.websitesHeroImage}
                    onChange={e => setSettings(s => ({ ...s, websitesHeroImage: e.target.value }))}
                    placeholder="/dev-web-hero.jpg أو رابط صورة"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setUploadTarget("webHero"); fileInputRef.current?.click(); }}
                    disabled={uploadingImage}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>تخصيص Hero صفحة التطبيقات (/dev/mobile-apps)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>العنوان الرئيسي</Label>
                <Input
                  value={settings.mobileAppsHeroTitle}
                  onChange={e => setSettings(s => ({ ...s, mobileAppsHeroTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={settings.mobileAppsHeroDesc}
                  onChange={e => setSettings(s => ({ ...s, mobileAppsHeroDesc: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>صورة Hero للتطبيقات</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.mobileAppsHeroImage}
                    onChange={e => setSettings(s => ({ ...s, mobileAppsHeroImage: e.target.value }))}
                    placeholder="/dev-mobile-hero.jpg أو رابط صورة"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setUploadTarget("mobileHero"); fileInputRef.current?.click(); }}
                    disabled={uploadingImage}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ إعدادات التطوير
          </Button>
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-4">
          <h3 className="text-lg font-bold">سجل طلبات المشاريع المستلمة ({requests.length})</h3>
          {requests.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
              لا توجد طلبات مشاريع مسجلة بعد
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="p-4 border rounded-xl bg-card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">طلب #{r.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.serviceType === "websites" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                        {r.serviceType === "websites" ? "مواقع" : "تطبيقات"}
                      </span>
                      {r.selectedServiceCard && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {r.selectedServiceCard}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.submittedAt).toLocaleString("ar-SA")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setViewingRequest(r)}>
                    عرض التفاصيل
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCard?.id ? "تعديل بطاقة الخدمة" : "إضافة بطاقة خدمة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>القسم التابع له</Label>
              <select
                value={editingCard?.serviceType || "websites"}
                onChange={e => setEditingCard(c => ({ ...c, serviceType: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-sm"
              >
                <option value="websites">تطوير وبرمجة المواقع</option>
                <option value="mobile_apps">تطوير تطبيقات الجوال</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>اسم الخدمة (عربي) *</Label>
              <Input
                value={editingCard?.nameAr || ""}
                onChange={e => setEditingCard(c => ({ ...c, nameAr: e.target.value }))}
                placeholder="مثال: تصميم المتاجر الإلكترونية"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الخدمة (إنجليزي)</Label>
              <Input
                value={editingCard?.nameEn || ""}
                onChange={e => setEditingCard(c => ({ ...c, nameEn: e.target.value }))}
                placeholder="E-commerce Store Development"
              />
            </div>
            <div className="space-y-2">
              <Label>وصف الخدمة</Label>
              <Textarea
                value={editingCard?.descriptionAr || ""}
                onChange={e => setEditingCard(c => ({ ...c, descriptionAr: e.target.value }))}
                placeholder="وصف مختصر للخدمة وما تشمله..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>صورة البطاقة</Label>
              <div className="flex gap-2">
                <Input
                  value={editingCard?.imageUrl || ""}
                  onChange={e => setEditingCard(c => ({ ...c, imageUrl: e.target.value }))}
                  placeholder="رابط الصورة أو ارفع من جهازك"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setUploadTarget("card"); fileInputRef.current?.click(); }}
                  disabled={uploadingImage}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>السعر (اختياري)</Label>
                <Input
                  value={editingCard?.price || ""}
                  onChange={e => setEditingCard(c => ({ ...c, price: e.target.value }))}
                  placeholder="يبدأ من 500$"
                />
              </div>
              <div className="space-y-2">
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={editingCard?.sortOrder || 0}
                  onChange={e => setEditingCard(c => ({ ...c, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-xl">
              <span>حالة الظهور (تفعيل/تعطيل)</span>
              <Switch
                checked={editingCard?.isActive !== false}
                onCheckedChange={v => setEditingCard(c => ({ ...c, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveCard}>حفظ الخدمة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingQuestion?.id ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>تابع لقسم</Label>
              <select
                value={editingQuestion?.serviceType || "websites"}
                onChange={e => setEditingQuestion(q => ({ ...q, serviceType: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-sm"
              >
                <option value="websites">تطوير المواقع</option>
                <option value="mobile_apps">تطبيقات الجوال</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>نص السؤال *</Label>
              <Input
                value={editingQuestion?.titleAr || ""}
                onChange={e => setEditingQuestion(q => ({ ...q, titleAr: e.target.value }))}
                placeholder="اكتب السؤال هنا..."
              />
            </div>
            <div className="space-y-2">
              <Label>نوع السؤال</Label>
              <select
                value={editingQuestion?.questionType || "single"}
                onChange={e => setEditingQuestion(q => ({ ...q, questionType: e.target.value }))}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-sm"
              >
                <option value="single">اختيار واحد (Single Choice)</option>
                <option value="multi">اختيار متعدد (Multiple Choice)</option>
                <option value="text">نص قصير (Short Text)</option>
                <option value="textarea">نص طويل (Long Text)</option>
                <option value="link">رابط (URL Link)</option>
                <option value="color">اختيار ألوان (Color)</option>
                <option value="budget">ميزانية (Budget)</option>
              </select>
            </div>
            {["single", "multi"].includes(editingQuestion?.questionType || "") && (
              <div className="space-y-2">
                <Label>الخيارات</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={e => setNewOption(e.target.value)}
                    placeholder="اكتب خياراً واضغط إضافة"
                    onKeyDown={e => {
                      if (e.key === "Enter" && newOption.trim()) {
                        e.preventDefault();
                        setEditingQuestion(q => ({ ...q, options: [...(q?.options || []), newOption.trim()] }));
                        setNewOption("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newOption.trim()) {
                        setEditingQuestion(q => ({ ...q, options: [...(q?.options || []), newOption.trim()] }));
                        setNewOption("");
                      }
                    }}
                  >
                    إضافة
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editingQuestion?.options?.map((opt, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs text-foreground">
                      {opt}
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q => ({ ...q, options: q?.options?.filter((_, idx) => idx !== i) }))}
                        className="text-destructive font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-3 border rounded-xl">
              <span>سؤال إجباري؟</span>
              <Switch
                checked={editingQuestion?.isRequired || false}
                onCheckedChange={v => setEditingQuestion(q => ({ ...q, isRequired: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveQuestion}>حفظ السؤال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingRequest} onOpenChange={open => !open && setViewingRequest(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{viewingRequest?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            {viewingRequest && Object.entries(viewingRequest.answers || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between items-start py-1.5 border-b text-sm">
                <span className="text-muted-foreground w-36 shrink-0">{k}:</span>
                <span className="font-medium text-left flex-1 break-words">
                  {Array.isArray(v) ? v.join(", ") : String(v || "—")}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingRequest(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
