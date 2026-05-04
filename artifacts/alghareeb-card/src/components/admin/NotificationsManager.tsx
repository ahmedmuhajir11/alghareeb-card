import { useState } from "react";
import { Bell, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export default function NotificationsManager() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast({ title: "خطأ", description: "العنوان والنص مطلوبان", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/push/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body, url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `فشل الإرسال (${res.status})`);
      toast({
        title: "✅ تم الإرسال",
        description: `وصل الإشعار لـ ${data.sent} مشترك`,
      });
      setTitle("");
      setBody("");
      setUrl("/");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">إرسال إشعار للمشتركين</h2>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Users className="w-4 h-4" />
          <span>سيصل الإشعار لجميع المشتركين فور الضغط على إرسال</span>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">عنوان الإشعار *</label>
          <Input
            placeholder="مثال: عرض خاص اليوم فقط! 🔥"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground text-left">{title.length}/60</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">نص الإشعار *</label>
          <Textarea
            placeholder="مثال: خصم 20% على جميع بطاقات PlayStation اليوم فقط"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={120}
            rows={3}
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground text-left">{body.length}/120</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">رابط عند الضغط (اختياري)</label>
          <Input
            placeholder="/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">اتركه / للصفحة الرئيسية، أو /section/1 لقسم معين</p>
        </div>

        {title && body && (
          <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-1">
            <p className="text-xs text-muted-foreground">معاينة الإشعار:</p>
            <div className="flex items-start gap-3">
              <img src="/logo.png" alt="logo" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-muted-foreground">{body}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={loading || !title.trim() || !body.trim()}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "جاري الإرسال..." : "إرسال للجميع"}
        </Button>
      </div>
    </div>
  );
}
