import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, ShieldCheck, Wallet, ShoppingBag, ArrowDownCircle,
  Loader2, Mail, Hash, KeyRound, Pencil, X, Trash2, AlertTriangle, Code2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

type AdminUser = {
  id: number;
  accountNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneCode: string | null;
  balance: number;
  currency: string;
  level: string;
  isVerified: boolean;
  isReseller: boolean;
  apiToken: string | null;
  totalPurchases: number;
  totalDeposits: number;
  createdAt: string;
};

type Stats = {
  totalUsers: number;
  verifiedUsers: number;
  totalBalance: number;
  totalPurchases: number;
  totalDeposits: number;
};

function fmt(n: number) {
  return n.toFixed(2);
}

const CURRENCY_AR: Record<string, string> = {
  USD: "دولار أمريكي",
  EUR: "يورو",
  TRY: "ليرة تركية",
  SYP: "ليرة سورية",
  OMR: "ريال عماني",
  MAD: "درهم مغربي",
  DZD: "دينار جزائري",
  ILS: "شيكل",
  IQD: "دينار عراقي",
  SAR: "ريال سعودي",
};

function currencyLabel(code: string): string {
  return CURRENCY_AR[code] ? `${CURRENCY_AR[code]} (${code})` : code;
}

function StatBox({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br ${tone}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function PasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل التحديث");
      return data;
    },
    onSuccess: () => {
      toast({ title: "✅ تم", description: "تم تحديث كلمة المرور بنجاح" });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            تغيير كلمة مرور المستخدم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">الاسم: </span><span className="font-bold">{user.name}</span></p>
            {user.email && <p className="text-xs text-muted-foreground break-all">{user.email}</p>}
            <p className="text-xs text-muted-foreground">رقم الحساب: {user.accountNumber}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              ستحل محل كلمة المرور القديمة. أرسلها للمستخدم بأمان.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mut.mutate()} disabled={password.length < 6 || mut.isPending}>
            {mut.isPending ? "جاري الحفظ..." : "تحديث كلمة المرور"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "✅ تم الحذف", description: data.message || "تم حذف المستخدم نهائياً" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-users-stats"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const canDelete = confirmText.trim() === "حذف";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            حذف المستخدم نهائياً
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 text-sm space-y-2">
            <p className="font-bold text-rose-300">⚠️ تحذير: هذه عملية لا يمكن التراجع عنها</p>
            <p className="text-rose-200 text-xs leading-relaxed">
              سيتم حذف هذا المستخدم وكل بياناته بشكل نهائي:
            </p>
            <ul className="text-xs text-rose-200/90 list-disc pr-4 space-y-0.5">
              <li>الحساب والرصيد ({fmt(user.balance)} {user.currency})</li>
              <li>سجل المحفظة والمعاملات</li>
              <li>طلبات الإيداع والشحن</li>
              <li>طلبات التوثيق</li>
              <li>الإشعارات المسجّلة</li>
            </ul>
            <p className="text-xs text-emerald-200 mt-2">
              ✓ سيتمكن المستخدم بعدها من إنشاء حساب جديد بنفس البريد.
            </p>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">الاسم: </span><span className="font-bold">{user.name}</span></p>
            {user.email && <p className="text-xs text-muted-foreground break-all">{user.email}</p>}
            <p className="text-xs text-muted-foreground">رقم الحساب: {user.accountNumber}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              للتأكيد، اكتب كلمة <span className="font-bold text-rose-400">حذف</span> في الحقل أدناه:
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="حذف"
              dir="rtl"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!canDelete || mut.isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {mut.isPending ? "جاري الحذف..." : "حذف نهائي"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BalanceDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [mode, setMode] = useState<"add" | "deduct" | "set">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const num = parseFloat(amount);
  const valid = Number.isFinite(num) && num >= 0;
  const newBalance = !valid ? user.balance
    : mode === "add" ? user.balance + num
    : mode === "deduct" ? user.balance - num
    : num;

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/balance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode, amount: num, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل التحديث");
      return data;
    },
    onSuccess: () => {
      toast({ title: "✅ تم", description: "تم تحديث الرصيد بنجاح" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-users-stats"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const modeBtn = (m: typeof mode, label: string, color: string) => (
    <button
      onClick={() => setMode(m)}
      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${
        mode === m ? color : "border-border/40 text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            تعديل رصيد المستخدم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">الاسم: </span><span className="font-bold">{user.name}</span></p>
            <p className="text-xs text-muted-foreground">رقم الحساب: {user.accountNumber}</p>
            <p className="mt-1">
              <span className="text-muted-foreground">العملة: </span>
              <span className="font-bold text-amber-300">{currencyLabel(user.currency)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">الرصيد الحالي: </span>
              <span className="font-bold text-primary">{fmt(user.balance)} {user.currency}</span>
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            ⚠️ ستتم العملية بعملة المستخدم: <span className="font-bold">{currencyLabel(user.currency)}</span>
          </div>

          <div className="flex gap-2">
            {modeBtn("add", "إضافة", "border-emerald-500/50 bg-emerald-500/10 text-emerald-300")}
            {modeBtn("deduct", "خصم", "border-rose-500/50 bg-rose-500/10 text-rose-300")}
            {modeBtn("set", "ضبط الرصيد", "border-purple-500/50 bg-purple-500/10 text-purple-300")}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {mode === "add" ? "المبلغ المراد إضافته" : mode === "deduct" ? "المبلغ المراد خصمه" : "الرصيد الجديد"}
              <span className="text-muted-foreground"> ({user.currency})</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                dir="ltr"
                className="text-left pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary pointer-events-none">
                {user.currency}
              </span>
            </div>
            {valid && (
              <p className="text-xs text-muted-foreground">
                الرصيد بعد العملية:{" "}
                <span className={`font-bold ${newBalance < 0 ? "text-rose-400" : "text-primary"}`}>
                  {fmt(newBalance)} {user.currency}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ملاحظة (اختياري)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تعويض عن طلب فاشل"
              dir="rtl"
              maxLength={120}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!valid || (mode !== "set" && num === 0) || newBalance < 0 || mut.isPending}
          >
            {mut.isPending ? "جاري الحفظ..." : "حفظ التغيير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersManager() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [balUser, setBalUser] = useState<AdminUser | null>(null);
  const [delUser, setDelUser] = useState<AdminUser | null>(null);
  const [togglingReseller, setTogglingReseller] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usersQuery = useQuery<AdminUser[]>({
    queryKey: ["admin-users", query],
    queryFn: async () => {
      const url = query.trim()
        ? `${API_BASE}/admin/users?q=${encodeURIComponent(query.trim())}`
        : `${API_BASE}/admin/users`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل المستخدمين");
      return res.json();
    },
  });

  const statsQuery = useQuery<Stats>({
    queryKey: ["admin-users-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل الإحصائيات");
      return res.json();
    },
  });

  const showStats = useMemo(() => {
    if (selected) {
      return [
        { label: "الرصيد الحالي", value: `${fmt(selected.balance)} ${selected.currency}`, icon: <Wallet className="w-4 h-4" />, tone: "from-purple-600/15 to-purple-500/5 border-purple-500/30 text-purple-300" },
        { label: "إجمالي المشتريات", value: `${fmt(selected.totalPurchases)} ${selected.currency}`, icon: <ShoppingBag className="w-4 h-4" />, tone: "from-sky-600/15 to-sky-500/5 border-sky-500/30 text-sky-300" },
        { label: "إجمالي الوارد", value: `${fmt(selected.totalDeposits)} ${selected.currency}`, icon: <ArrowDownCircle className="w-4 h-4" />, tone: "from-emerald-600/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300" },
        { label: "الحالة", value: selected.isVerified ? "موثق" : "غير موثق", icon: <ShieldCheck className="w-4 h-4" />, tone: "from-amber-600/15 to-amber-500/5 border-amber-500/30 text-amber-300" },
      ];
    }
    const s = statsQuery.data;
    if (!s) return [];
    return [
      { label: "إجمالي المستخدمين", value: String(s.totalUsers), icon: <Users className="w-4 h-4" />, tone: "from-purple-600/15 to-purple-500/5 border-purple-500/30 text-purple-300" },
      { label: "الموثقون", value: String(s.verifiedUsers), icon: <ShieldCheck className="w-4 h-4" />, tone: "from-amber-600/15 to-amber-500/5 border-amber-500/30 text-amber-300" },
      { label: "إجمالي الأرصدة", value: fmt(s.totalBalance), icon: <Wallet className="w-4 h-4" />, tone: "from-fuchsia-600/15 to-fuchsia-500/5 border-fuchsia-500/30 text-fuchsia-300" },
      { label: "إجمالي المشتريات", value: fmt(s.totalPurchases), icon: <ShoppingBag className="w-4 h-4" />, tone: "from-sky-600/15 to-sky-500/5 border-sky-500/30 text-sky-300" },
      { label: "إجمالي الإيداعات", value: fmt(s.totalDeposits), icon: <ArrowDownCircle className="w-4 h-4" />, tone: "from-emerald-600/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300" },
    ];
  }, [selected, statsQuery.data]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">المستخدمون</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          dir="rtl"
          placeholder="ابحث بالبريد الإلكتروني أو رقم الحساب أو الاسم"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          className="pr-10"
        />
      </div>

      {/* Stats */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
          {selected ? `إحصائيات: ${selected.name}` : "إحصائيات عامة"}
          {selected && (
            <button onClick={() => setSelected(null)} className="text-primary hover:underline inline-flex items-center gap-1">
              <X className="w-3 h-3" /> الكل
            </button>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {showStats.map((s) => (
            <StatBox key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      </div>

      {/* Selected user actions */}
      {selected && (
        <div className="bg-card border border-primary/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-bold">{selected.name}</p>
            <p className="text-xs text-muted-foreground break-all">
              {selected.email || "بدون بريد"} • #{selected.accountNumber}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBalUser(selected)}>
              <Pencil className="w-3.5 h-3.5" /> تعديل الرصيد
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPwUser(selected)}>
              <KeyRound className="w-3.5 h-3.5" /> كلمة مرور جديدة
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={togglingReseller === selected.id}
              className={`gap-1.5 ${selected.isReseller ? "border-green-500/40 text-green-300 hover:bg-green-500/10" : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"}`}
              onClick={async () => {
                setTogglingReseller(selected.id);
                try {
                  const res = await fetch(`${API_BASE}/admin/users/${selected.id}/reseller`, { method: "PATCH", credentials: "include" });
                  if (!res.ok) throw new Error("فشل");
                  await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                  setSelected(null);
                  toast({ title: selected.isReseller ? "تم إلغاء تفعيل API" : "تم تفعيل API للريسيلر" });
                } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
                setTogglingReseller(null);
              }}
            >
              <Code2 className="w-3.5 h-3.5" /> {selected.isReseller ? "إلغاء API" : "تفعيل API"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
              onClick={() => setDelUser(selected)}
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف الحساب
            </Button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <p className="text-sm font-bold">قائمة المستخدمين {usersQuery.data ? `(${usersQuery.data.length})` : ""}</p>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : usersQuery.error ? (
          <p className="text-center text-rose-400 py-8 text-sm">{(usersQuery.error as Error).message}</p>
        ) : !usersQuery.data || usersQuery.data.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">لا يوجد نتائج</p>
        ) : (
          <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
            {usersQuery.data.map((u) => {
              const isActive = selected?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => setSelected(isActive ? null : u)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? "bg-primary/10" : "hover:bg-primary/5"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
                    {u.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">{u.name}</p>
                      {u.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      {u.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{u.email}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 shrink-0">
                        <Hash className="w-3 h-3" />
                        {u.accountNumber}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1 shrink-0 text-purple-300/80" dir="ltr">
                          📞 {u.phoneCode ?? ""}{u.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">الرصيد</p>
                    <p className="text-sm font-bold text-primary">
                      {fmt(u.balance)} <span className="text-[10px] text-muted-foreground">{u.currency}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setBalUser(u)}
                      title="تعديل الرصيد"
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPwUser(u)}
                      title="كلمة مرور جديدة"
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDelUser(u)}
                      title="حذف الحساب"
                      className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      title={u.isReseller ? "مفعّل API" : "تفعيل API"}
                      disabled={togglingReseller === u.id}
                      onClick={async () => {
                        setTogglingReseller(u.id);
                        try {
                          const res = await fetch(`${API_BASE}/admin/users/${u.id}/reseller`, { method: "PATCH", credentials: "include" });
                          if (!res.ok) throw new Error();
                          await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                          toast({ title: u.isReseller ? "تم إلغاء تفعيل API" : "تم تفعيل API" });
                        } catch { toast({ title: "حدث خطأ", variant: "destructive" }); }
                        setTogglingReseller(null);
                      }}
                      className={`p-2 rounded-lg transition-colors ${u.isReseller ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                    >
                      <Code2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pwUser && <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />}
      {balUser && <BalanceDialog user={balUser} onClose={() => setBalUser(null)} />}
      {delUser && <DeleteUserDialog user={delUser} onClose={() => { setDelUser(null); setSelected(null); }} />}
    </div>
  );
}
