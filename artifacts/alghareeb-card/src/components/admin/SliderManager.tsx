import { useListSliderImages, useCreateSliderImage, useDeleteSliderImage, useUploadImage, getListSliderImagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, ImagePlus, Link } from "lucide-react";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function SliderManager() {
  const { data: images, isLoading } = useListSliderImages();
  const createImg = useCreateSliderImage();
  const deleteImg = useDeleteSliderImage();
  const uploadImg = useUploadImage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const invalidateSlider = () => {
    queryClient.invalidateQueries({ queryKey: getListSliderImagesQueryKey() });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadImg.mutateAsync({ data: { file } });
      if (uploadRes.url) {
        await createImg.mutateAsync({
          data: {
            imageUrl: uploadRes.url,
            title: newTitle || undefined,
            linkUrl: newLinkUrl.trim() || undefined,
            sortOrder: (images?.length || 0) + 1,
          },
        });
        toast({ title: "✅ تمت إضافة الصورة بنجاح" });
        setNewTitle("");
        setNewLinkUrl("");
        invalidateSlider();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل رفع الصورة" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddByUrl = async () => {
    if (!imageUrl.trim()) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رابط الصورة" });
      return;
    }
    setIsAddingUrl(true);
    try {
      await createImg.mutateAsync({
        data: {
          imageUrl: imageUrl.trim(),
          title: newTitle || undefined,
          linkUrl: newLinkUrl.trim() || undefined,
          sortOrder: (images?.length || 0) + 1,
        },
      });
      toast({ title: "✅ تمت إضافة الصورة بنجاح" });
      setNewTitle("");
      setNewLinkUrl("");
      setImageUrl("");
      invalidateSlider();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل إضافة الصورة" });
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;
    try {
      await deleteImg.mutateAsync({ id });
      invalidateSlider();
      toast({ title: "🗑️ تم حذف الصورة بنجاح" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل الحذف" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="neon-border bg-card/50">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            إضافة صورة جديدة
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">عنوان الصورة (اختياري)</label>
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="مثال: خصومات حصرية..."
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Link className="w-4 h-4 text-green-400" />
              رابط الضغط على الصورة (اختياري — مثال: رابط واتساب)
            </label>
            <Input
              value={newLinkUrl}
              onChange={e => setNewLinkUrl(e.target.value)}
              placeholder="https://wa.me/905378221375"
              className="bg-background/50 text-left"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">إذا أدخلت رابطاً، فالضغط على الصورة سيفتح هذا الرابط في نافذة جديدة.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Link className="w-4 h-4 text-primary" />
              رابط الصورة
            </label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://i.imgur.com/xxxxx.jpg"
                className="bg-background/50 text-left flex-1"
                dir="ltr"
              />
              <Button
                onClick={handleAddByUrl}
                disabled={isAddingUrl || !imageUrl.trim()}
                className="flex-shrink-0 gap-2 bg-primary hover:bg-primary/90"
              >
                {isAddingUrl ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                {isAddingUrl ? "جاري..." : "إضافة"}
              </Button>
            </div>
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-primary/20 aspect-[21/9] bg-background/30">
                <img src={imageUrl} alt="معاينة" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="border-t border-border/30 pt-4">
            <label className="text-sm font-medium block mb-2">أو ارفع من الهاتف</label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="w-full gap-2"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? "جاري الرفع..." : "رفع صورة من الهاتف"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-bold mb-4">
          الصور الحالية ({images?.length || 0})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[21/9] rounded-xl bg-card/50 animate-pulse" />
            ))}
          </div>
        ) : !images?.length ? (
          <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-xl border border-dashed border-primary/20">
            لا توجد صور في السلايدر حالياً. أضف صورة من الأعلى.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map(img => (
              <Card key={img.id} className="overflow-hidden border-border/50 bg-card/50">
                <div className="aspect-[21/9] relative">
                  <img
                    src={img.imageUrl}
                    alt={img.title || "صورة سلايدر"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-2 bg-card/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate text-muted-foreground">
                      {img.title || "بدون عنوان"}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(img.id)}
                      disabled={deleteImg.isPending}
                      className="flex-shrink-0 gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
