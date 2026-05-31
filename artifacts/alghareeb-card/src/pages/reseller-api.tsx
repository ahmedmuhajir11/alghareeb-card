import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Copy, Check, RefreshCw, Code2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/reseller/products",
    desc: "جلب جميع الأقسام والمنتجات والباقات مع الأسعار والأيقونات",
    headers: [{ key: "Api-Token", value: "YOUR_TOKEN_HERE" }],
    response: `{
  "sections": [
    {
      "id": 1,
      "nameAr": "الألعاب",
      "nameEn": "Games",
      "logoUrl": "https://...",
      "items": [
        {
          "id": 10,
          "nameAr": "ببجي موبايل",
          "nameEn": "PUBG Mobile",
          "iconUrl": "https://...",
          "packages": [
            { "id": 1, "label": "60 UC", "amount": 60, "priceUsd": 0.99 }
          ]
        }
      ]
    }
  ]
}`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default function ResellerApiPage() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);

  if (!user?.isReseller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Lock className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">غير مفعّل</h2>
        <p className="text-muted-foreground text-sm">هذه الصفحة متاحة فقط لحسابات الـ Reseller المفعّلة.<br />تواصل معنا عبر واتساب لتفعيل الوصول.</p>
      </div>
    );
  }

  async function regenerateToken() {
    setRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/reseller/regenerate-token`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل");
      await refetch();
      toast({ title: "تم تجديد التوكن بنجاح" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      <div className="flex items-center gap-3">
        <Code2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">API الريسيلر</h1>
          <p className="text-sm text-muted-foreground">استخدم هذا التوكن لربط موقعك بمنتجاتنا</p>
        </div>
      </div>

      {/* Token box */}
      <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API TOKEN</p>
        <div className="flex items-center gap-2 bg-background/60 border border-border rounded-lg px-3 py-2">
          <code className="flex-1 text-xs text-green-400 break-all font-mono select-all">{user.apiToken}</code>
          <CopyButton text={user.apiToken ?? ""} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">ضع هذا التوكن في هيدر كل طلب: <code className="text-primary">Api-Token: YOUR_TOKEN</code></p>
          <Button size="sm" variant="outline" disabled={regenerating} onClick={regenerateToken} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
            تجديد
          </Button>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base URL</p>
        <div className="flex items-center gap-2 bg-background/60 border border-border rounded-lg px-3 py-2">
          <code className="flex-1 text-xs text-blue-300 font-mono">{window.location.origin}/api</code>
          <CopyButton text={`${window.location.origin}/api`} />
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <p className="text-sm font-bold">نقاط النهاية المتاحة</p>
        {ENDPOINTS.map((ep) => (
          <div key={ep.path} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <span className="text-xs font-black bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{ep.method}</span>
              <code className="text-sm text-primary font-mono">{ep.path}</code>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-sm text-muted-foreground">{ep.desc}</p>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">الهيدرز المطلوبة:</p>
                {ep.headers.map(h => (
                  <div key={h.key} className="flex items-center gap-2 bg-background/60 border border-border rounded-lg px-3 py-1.5 text-xs font-mono">
                    <span className="text-amber-300">{h.key}:</span>
                    <span className="text-muted-foreground flex-1">{h.key === "Api-Token" ? user.apiToken : h.value}</span>
                    <CopyButton text={h.key === "Api-Token" ? `${h.key}: ${user.apiToken}` : `${h.key}: ${h.value}`} />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">مثال الاستجابة:</p>
                <div className="relative">
                  <pre className="bg-background/60 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">{ep.response}</pre>
                  <div className="absolute top-2 left-2"><CopyButton text={ep.response} /></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
