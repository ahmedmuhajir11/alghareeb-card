import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, ChevronDown, ChevronUp, Loader2, Download } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type IdentityStatus = "pending" | "approved" | "rejected";
type FilterStatus = "all" | IdentityStatus;

interface Identity {
  id: number;
  userId: number;
  accountNumber: string;
  userEmail: string;
  fullName: string;
  idNumber: string;
  country?: string;
  province?: string;
  extraInfo?: string;
  idPhotoFrontUrl?: string;
  idPhotoBackUrl?: string;
  selfieUrl?: string;
  status: IdentityStatus;
  adminNote?: string;
  createdAt: string;
}

async function adminFetch(path: string, opts?: RequestInit) {
  const token = document.cookie.match(/admin_token=([^;]+)/)?.[1];
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...((opts?.headers) ?? {}),
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

const STATUS_LABEL: Record<IdentityStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
};
const STATUS_VARIANT: Record<IdentityStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function PhotoViewer({ url, label }: { url?: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!url) return null;

  function handleDownload() {
    const a = document.createElement("a");
    a.href = url!;
    a.download = `${label}.jpg`;
    a.click();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Eye className="w-3 h-3" />{label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white text-sm font-bold mb-2 text-center">{label}</p>
            <img
              src={url}
              alt={label}
              className="w-full rounded-xl object-contain max-h-[70vh] bg-white"
            />
            <div className="flex gap-2 mt-3 justify-center">
              <Button size="sm" variant="secondary" onClick={handleDownload} className="gap-1">
                <Download className="w-4 h-4" /> تحميل
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IdentityRow({ identity, onUpdate }: { identity: Identity; onUpdate: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(identity.adminNote ?? "");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/identities/${identity.id}/${action}`, {
        method: "PUT",
        body: JSON.stringify({ adminNote: note || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطأ");
      toast({ title: action === "approve" ? "✅ تمت الموافقة" : "❌ تم الرفض" });
      onUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card/60 border border-border/40 rounded-xl overflow-hidden">
      <div
        className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={STATUS_VARIANT[identity.status]}>{STATUS_LABEL[identity.status]}</Badge>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{identity.fullName}</p>
            <p className="text-xs text-muted-foreground">{identity.userEmail} · #{identity.accountNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Date(identity.createdAt).toLocaleDateString("ar")}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">رقم الهوية:</span> <span className="font-mono">{identity.idNumber}</span></div>
            {identity.country && <div><span className="text-muted-foreground">الدولة:</span> {identity.country}</div>}
            {identity.province && <div><span className="text-muted-foreground">المحافظة:</span> {identity.province}</div>}
            {identity.extraInfo && <div className="col-span-2 sm:col-span-3"><span className="text-muted-foreground">ملاحظات:</span> {identity.extraInfo}</div>}
          </div>

          <div className="flex flex-wrap gap-3">
            <PhotoViewer url={identity.idPhotoFrontUrl} label="الوجه الأمامي" />
            <PhotoViewer url={identity.idPhotoBackUrl} label="الوجه الخلفي" />
            <PhotoViewer url={identity.selfieUrl} label="صورة مع الهوية" />
          </div>

          {identity.status === "pending" && (
            <div className="space-y-3 border-t border-border/40 pt-3">
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ملاحظة للمستخدم (اختياري عند الموافقة، مفيدة عند الرفض)"
                className="bg-background/50 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction("approve")}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction("reject")}
                  disabled={loading}
                  className="gap-1"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  رفض
                </Button>
              </div>
            </div>
          )}

          {identity.status !== "pending" && identity.adminNote && (
            <p className="text-sm text-muted-foreground border-t border-border/40 pt-3">
              ملاحظة الإدارة: {identity.adminNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IdentitiesManager() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/identities?status=${filter}`);
      const data = await res.json();
      setIdentities(Array.isArray(data) ? data : []);
    } catch {
      setIdentities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: "pending", label: "قيد المراجعة" },
    { value: "approved", label: "موافق عليها" },
    { value: "rejected", label: "مرفوضة" },
    { value: "all", label: "الكل" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold">طلبات توثيق الهوية</h2>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
              className="text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : identities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد طلبات</div>
      ) : (
        <div className="space-y-3">
          {identities.map(id => (
            <IdentityRow key={id.id} identity={id} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
