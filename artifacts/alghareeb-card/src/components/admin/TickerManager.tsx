import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Pencil, Check, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type TickerMessage = { id: number; text: string; is_active: boolean; sort_order: number };

function getKey(): string { return sessionStorage.getItem("_ak") || ""; }

function useTickerMessages() {
  return useQuery<TickerMessage[]>({
    queryKey: ["ticker-messages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/ticker-messages`);
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json();
    },
  });
}

function splitBilingual(text: string): { ar: string; en: string } {
  const parts = text.split("||");
  return { ar: parts[0]?.trim() ?? text, en: parts[1]?.trim() ?? "" };
}

function joinBilingual(ar: string, en: string): string {
  const a = ar.trim();
  const e = en.trim();
  if (!e) return a;
  return `${a}||${e}`;
}

export default function TickerManager() {
  const { data: messages = [], isLoading } = useTickerMessages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editAr, setEditAr] = useState("");
  const [editEn, setEditEn] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ticker-messages"] });

  const addMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE}/api/admin/ticker-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getKey() },
        body: JSON.stringify({ text, sort_order: messages.length + 1 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { invalidate(); setNewAr(""); setNewEn(""); toast({ title: "✅ تمت الإضافة" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TickerMessage> & { id: number }) => {
      const current = messages.find(m => m.id === id)!;
      const res = await fetch(`${API_BASE}/api/admin/ticker-messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": getKey() },
        body: JSON.stringify({ ...current, ...data }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { invalidate(); setEditId(null); toast({ title: "✅ تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/admin/ticker-messages/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": getKey() },
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => { invalidate(); toast({ title: "🗑️ تم الحذف" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold neon-text mb-1">إدارة شريط الإشعارات</h2>
        <p className="text-sm text-muted-foreground">الرسائل تتناوب تلقائياً كل 4 ثوانٍ في أعلى الموقع</p>
      </div>

      {/* Add new */}
      <div className="space-y-2 p-3 bg-background/30 rounded-xl border border-primary/20">
        <p className="text-xs font-semibold text-muted-foreground">إضافة رسالة جديدة</p>
        <Input
          value={newAr}
          onChange={e => setNewAr(e.target.value)}
          placeholder="🔥 النص العربي — مثال: خصم خاص اليوم فقط"
          className="bg-background/50 border-primary/20 focus-visible:border-primary"
          dir="rtl"
        />
        <Input
          value={newEn}
          onChange={e => setNewEn(e.target.value)}
          placeholder="🔥 English text — e.g. Special discount today only (optional)"
          className="bg-background/50 border-primary/20 focus-visible:border-primary"
          dir="ltr"
          onKeyDown={e => e.key === "Enter" && newAr.trim() && addMutation.mutate(joinBilingual(newAr, newEn))}
        />
        <Button
          onClick={() => newAr.trim() && addMutation.mutate(joinBilingual(newAr, newEn))}
          disabled={!newAr.trim() || addMutation.isPending}
          className="gap-2 w-full"
        >
          <Plus className="w-4 h-4" />
          إضافة
        </Button>
      </div>

      {/* Messages list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-card/50 animate-pulse" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">لا توجد رسائل بعد</div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                msg.is_active
                  ? "bg-card/50 border-primary/20"
                  : "bg-card/20 border-border/30 opacity-60"
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">
                {idx + 1}
              </span>

              {editId === msg.id ? (
                <div className="flex-1 flex flex-col gap-1">
                  <Input
                    value={editAr}
                    onChange={e => setEditAr(e.target.value)}
                    className="h-7 text-sm bg-background border-primary/40"
                    placeholder="النص العربي"
                    dir="rtl"
                    autoFocus
                  />
                  <Input
                    value={editEn}
                    onChange={e => setEditEn(e.target.value)}
                    className="h-7 text-sm bg-background border-primary/40"
                    placeholder="English text (optional)"
                    dir="ltr"
                    onKeyDown={e => {
                      if (e.key === "Enter") updateMutation.mutate({ id: msg.id, text: joinBilingual(editAr, editEn) });
                      if (e.key === "Escape") setEditId(null);
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  {(() => { const s = splitBilingual(msg.text); return (
                    <>
                      <p className="text-sm">{s.ar}</p>
                      {s.en && <p className="text-xs text-muted-foreground" dir="ltr">{s.en}</p>}
                    </>
                  ); })()}
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editId === msg.id ? (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:bg-green-400/10"
                      onClick={() => updateMutation.mutate({ id: msg.id, text: joinBilingual(editAr, editEn) })}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                      onClick={() => setEditId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => { const s = splitBilingual(msg.text); setEditId(msg.id); setEditAr(s.ar); setEditEn(s.en); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      className={`h-7 w-7 ${msg.is_active ? "text-yellow-400 hover:bg-yellow-400/10" : "text-muted-foreground hover:bg-primary/10"}`}
                      onClick={() => updateMutation.mutate({ id: msg.id, is_active: !msg.is_active })}
                      title={msg.is_active ? "إخفاء" : "إظهار"}>
                      {msg.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(msg.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        💡 الرسائل المخفية لن تظهر في الشريط. اضغط على أيقونة العين لإظهار أو إخفاء أي رسالة.
      </p>
    </div>
  );
}
