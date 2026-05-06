import { useListSliderImages, useCreateSliderImage, useDeleteSliderImage, useUploadImage, getListSliderImagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, ImagePlus, Link, Images, MessageCircle } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function SliderManager() {
  const { data: images, isLoading } = useListSliderImages();
  const createImg = useCreateSliderImage();
  const deleteImg = useDeleteSliderImage();
  const uploadImg = useUploadImage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Regular image form state ---
  const regularFileRef = useRef<HTMLInputElement>(null);
  const [regTitle, setRegTitle] = useState("");
  const [regImageUrl, setRegImageUrl] = useState("");
  const [regUploading, setRegUploading] = useState(false);
  const [regAddingUrl, setRegAddingUrl] = useState(false);

  // --- WhatsApp / clickable image form state ---
  const waFileRef = useRef<HTMLInputElement>(null);
  const [waTitle, setWaTitle] = useState("");
  const [waImageUrl, setWaImageUrl] = useState("");
  const [waLinkUrl, setWaLinkUrl] = useState("https://wa.me/905378221375");
  const [waUploading, setWaUploading] = useState(false);
  const [waAddingUrl, setWaAddingUrl] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSliderImagesQueryKey() });

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;
    try {
      await deleteImg.mutateAsync({ id });
      invalidate();
      toast({ title: "🗑️ تم حذف الصورة بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الحذف" });
    }
  };

  // --- Regular image handlers ---
  const handleRegFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRegUploading(true);
    try {
      const res = await uploadImg.mutateAsync({ data: { file } });
      if (res.url) {
        await createImg.mutateAsync({ data: { imageUrl: res.url, title: regTitle || undefined, sortOrder: (images?.length || 0) + 1 } });
        toast({ title: "✅ تمت إضافة الصورة العادية" });
        setRegTitle("");
        invalidate();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الرفع" });
    } finally {
      setRegUploading(false);
      if (regularFileRef.current) regularFileRef.current.value = "";
    }
  };

  const handleRegAddByUrl = async () => {
    if (!regImageUrl.trim()) { toast({ variant: "destructive", title: "أدخل رابط الصورة" }); return; }
    setRegAddingUrl(true);
    try {
      await createImg.mutateAsync({ data: { imageUrl: regImageUrl.trim(), title: regTitle || undefined, sortOrder: (images?.length || 0) + 1 } });
      toast({ title: "✅ تمت إضافة الصورة العادية" });
      setRegTitle(""); setRegImageUrl("");
      invalidate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الإضافة" });
    } finally { setRegAddingUrl(false); }
  };

  // --- WhatsApp image handlers ---
  const handleWaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!waLinkUrl.trim()) { toast({ variant: "destructive", title: "أدخل رابط الضغط أولاً" }); return; }
    setWaUploading(true);
    try {
      const res = await uploadImg.mutateAsync({ data: { file } });
      if (res.url) {
        await createImg.mutateAsync({ data: { imageUrl: res.url, title: waTitle || undefined, linkUrl: waLinkUrl.trim(), sortOrder: (images?.length || 0) + 1 } });
        toast({ title: "✅ تمت إضافة الصورة القابلة للضغط" });
        setWaTitle("");
        invalidate();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الرفع" });
    } finally {
      setWaUploading(false);
      if (waFileRef.current) waFileRef.current.value = "";
    }
  };

  const handleWaAddByUrl = async () => {
    if (!waImageUrl.trim()) { toast({ variant: "destructive", title: "أدخل رابط الصورة" }); return; }
    if (!waLinkUrl.trim()) { toast({ variant: "destructive", title: "أدخل رابط الضغط" }); return; }
    setWaAddingUrl(true);
    try {
      await createImg.mutateAsync({ data: { imageUrl: waImageUrl.trim(), title: waTitle || undefined, linkUrl: waLinkUrl.trim(), sortOrder: (images?.length || 0) + 1 } });
      toast({ title: "✅ تمت إضافة الصورة القابلة للضغط" });
      setWaTitle(""); setWaImageUrl("");
      invalidate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الإضافة" });
    } finally { setWaAddingUrl(false); }
  };

  const regularImages = images?.filter(img => !img.linkUrl) ?? [];
  const clickableImages = images?.filter(img => !!img.linkUrl) ?? [];

  const ImageCard = ({ img, isClickable }: { img: typeof images[0]; isClickable?: boolean }) => (
    <Card className={`overflow-hidden bg-card/50 ${isClickable ? "border-2 border-green-500/50 shadow-[0_0_14px_rgba(34,197,94,0.15)]" : "border border-border/50"}`}>
      <div className="aspect-[21/9] relative">
        <img src={img.imageUrl} alt={img.title || "صورة"} className="w-full h-full object-cover" />
        {isClickable && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-bold shadow-lg">
              <MessageCircle className="w-3 h-3" /> واتساب
            </span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5 bg-card/80">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate text-muted-foreground">{img.title || "بدون عنوان"}</span>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(img.id)} disabled={deleteImg.isPending} className="flex-shrink-0 gap-1">
            <Trash2 className="w-4 h-4" /> حذف
          </Button>
        </div>
        {img.linkUrl && (
          <div className="flex items-center gap-1 text-xs text-green-400 truncate">
            <Link className="w-3 h-3 flex-shrink-0" />
            <span className="truncate" dir="ltr">{img.linkUrl}</span>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════ */}
      {/* SECTION 1 — Regular Slider Images       */}
      {/* ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-primary" />
          <div>
            <h2 className="text-lg font-black flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              الصور المتحركة العادية
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">صور تعرض بالتناوب في السلايدر — لا يوجد رابط عند الضغط عليها</p>
          </div>
        </div>

        <Card className="neon-border bg-card/50">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
              <ImagePlus className="w-4 h-4" /> إضافة صورة عادية
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان الصورة (اختياري)</label>
              <Input value={regTitle} onChange={e => setRegTitle(e.target.value)} placeholder="مثال: خصومات حصرية..." className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Link className="w-4 h-4 text-primary" /> رابط الصورة
              </label>
              <div className="flex gap-2">
                <Input value={regImageUrl} onChange={e => setRegImageUrl(e.target.value)} placeholder="https://i.imgur.com/xxxxx.jpg" className="bg-background/50 text-left flex-1" dir="ltr" />
                <Button onClick={handleRegAddByUrl} disabled={regAddingUrl || !regImageUrl.trim()} className="flex-shrink-0 gap-2 bg-primary hover:bg-primary/90">
                  {regAddingUrl ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link className="w-4 h-4" />}
                  {regAddingUrl ? "جاري..." : "إضافة"}
                </Button>
              </div>
              {regImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-primary/20 aspect-[21/9] bg-background/30">
                  <img src={regImageUrl} alt="معاينة" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="border-t border-border/30 pt-3">
              <label className="text-sm font-medium block mb-2">أو ارفع من الهاتف</label>
              <input type="file" ref={regularFileRef} className="hidden" accept="image/*" onChange={handleRegFileChange} />
              <Button onClick={() => regularFileRef.current?.click()} disabled={regUploading} variant="outline" className="w-full gap-2">
                {regUploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {regUploading ? "جاري الرفع..." : "رفع صورة من الهاتف"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="aspect-[21/9] rounded-xl bg-card/50 animate-pulse" />)}
          </div>
        ) : regularImages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-card/20 rounded-xl border border-dashed border-primary/20 text-sm">
            لا توجد صور عادية حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularImages.map(img => <ImageCard key={img.id} img={img} />)}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 2 — WhatsApp / Clickable Images  */}
      {/* ════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-green-500" />
          <div>
            <h2 className="text-lg font-black flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300">صورة الواتساب (قابلة للضغط)</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">صور الضغط عليها يفتح رابطاً — مثال: واتساب أو تيليغرام</p>
          </div>
        </div>

        <Card className="border-2 border-green-500/40 bg-card/50 shadow-[0_0_20px_rgba(34,197,94,0.08)]">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-green-400">
              <ImagePlus className="w-4 h-4" /> إضافة صورة قابلة للضغط
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">عنوان الصورة (اختياري)</label>
              <Input value={waTitle} onChange={e => setWaTitle(e.target.value)} placeholder="مثال: أنقر هنا للتواصل معنا..." className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <MessageCircle className="w-4 h-4 text-green-400" />
                رابط الضغط (واتساب أو أي رابط)
              </label>
              <Input
                value={waLinkUrl}
                onChange={e => setWaLinkUrl(e.target.value)}
                placeholder="https://wa.me/905378221375"
                className="bg-background/50 text-left border-green-500/30 focus-visible:ring-green-500/50"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Link className="w-4 h-4 text-green-400" /> رابط الصورة
              </label>
              <div className="flex gap-2">
                <Input value={waImageUrl} onChange={e => setWaImageUrl(e.target.value)} placeholder="https://i.imgur.com/xxxxx.jpg" className="bg-background/50 text-left flex-1" dir="ltr" />
                <Button onClick={handleWaAddByUrl} disabled={waAddingUrl || !waImageUrl.trim() || !waLinkUrl.trim()} className="flex-shrink-0 gap-2 bg-green-600 hover:bg-green-500 text-white">
                  {waAddingUrl ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link className="w-4 h-4" />}
                  {waAddingUrl ? "جاري..." : "إضافة"}
                </Button>
              </div>
              {waImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-green-500/20 aspect-[21/9] bg-background/30">
                  <img src={waImageUrl} alt="معاينة" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="border-t border-green-500/20 pt-3">
              <label className="text-sm font-medium block mb-2">أو ارفع من الهاتف</label>
              <input type="file" ref={waFileRef} className="hidden" accept="image/*" onChange={handleWaFileChange} />
              <Button onClick={() => waFileRef.current?.click()} disabled={waUploading || !waLinkUrl.trim()} variant="outline" className="w-full gap-2 border-green-500/30 hover:bg-green-500/10 hover:text-green-300">
                {waUploading ? <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                {waUploading ? "جاري الرفع..." : "رفع صورة من الهاتف"}
              </Button>
              {!waLinkUrl.trim() && <p className="text-xs text-amber-400 mt-2 text-center">أدخل رابط الضغط أولاً قبل الرفع</p>}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1].map(i => <div key={i} className="aspect-[21/9] rounded-xl bg-card/50 animate-pulse" />)}
          </div>
        ) : clickableImages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-green-500/5 rounded-xl border border-dashed border-green-500/20 text-sm">
            لا توجد صور قابلة للضغط حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clickableImages.map(img => <ImageCard key={img.id} img={img} isClickable />)}
          </div>
        )}
      </div>

    </div>
  );
}
