import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Filter, RefreshCw, Phone, Copy, ChevronDown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type LeadRow = {
  id: number;
  phone: string;
  status: "new" | "contacted";
  serviceType: string;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

type PagedResponse = {
  data: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const STATUS_TABS = [
  { value: "new", label: "طلبات جديدة", icon: Clock, color: "text-amber-400" },
  { value: "contacted", label: "تم التواصل", icon: CheckCircle2, color: "text-green-400" },
  { value: "all", label: "الكل", icon: Filter, color: "text-purple-400" },
];

const SERVICE_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  digital_store_project: { label: "مشروع شحن رقمي جاهز", badge: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  mobile_app_dev: { label: "تطوير تطبيق جوال", badge: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  website_dev: { label: "تطوير موقع", badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  salary_withdrawal: { label: "سحب راتب", badge: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

const TYPE_FILTERS = [
  { value: "all", label: "كل الأقسام" },
  { value: "digital_store_project", label: "مشاريع شحن رقمية" },
  { value: "mobile_app_dev", label: "تطبيقات الجوال" },
  { value: "website_dev", label: "تطوير المواقع" },
  { value: "salary_withdrawal", label: "سحب الرواتب" },
];

function ServiceTypeBadge({ type }: { type: string }) {
  const meta = SERVICE_TYPE_LABELS[type] ?? { label: type, badge: "bg-muted text-muted-foreground border-border/40" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function MessagePreview({ message }: { message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "إخفاء تفاصيل الطلب" : "عرض تفاصيل الطلب"}
      </button>
      {open && (
        <pre className="mt-2 whitespace-pre-wrap break-words text-xs bg-background/60 border border-border/30 rounded-lg p-3 text-muted-foreground" dir="rtl">
          {message}
        </pre>
      )}
    </div>
  );
}

export default function DigitalStoreProjectsManager() {
  const [tab, setTab] = useState<string>("new");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: paged, isLoading, refetch } = useQuery<PagedResponse>({
    queryKey: ["/api/admin/service-requests", tab, typeFilter, page],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/admin/service-requests?status=${tab}&serviceType=${typeFilter}&page=${page}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json();
    },
  });

  const leads = paged?.data ?? [];
  const totalPages = paged?.totalPages ?? 1;
  const total = paged?.total ?? 0;

  function handleTabChange(val: string) {
    setTab(val);
    setPage(1);
  }
  function handleTypeChange(val: string) {
    setTypeFilter(val);
    setPage(1);
  }

  const markContacted = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/api/admin/service-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "contacted" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "فشل");
      return data;
    },
    onSuccess: () => {
      toast({ title: "تم التحديث ✓", description: "تم وضع علامة \"تم التواصل\" على الطلب" });
      qc.invalidateQueries({ queryKey: ["/api/admin/service-requests"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "خطأ", description: err?.message ?? "فشلت العملية" });
    },
  });

  function copyPhone(phone: string) {
    navigator.clipboard?.writeText(phone).then(() => {
      toast({ title: "تم النسخ", description: phone });
    }).catch(() => {});
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold neon-text">طلبات التواصل الواردة</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Section/type filter */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(t => (
          <button
            key={t.value}
            onClick={() => handleTypeChange(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              typeFilter === t.value
                ? "bg-primary/20 border-primary text-primary"
                : "bg-card border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="grid grid-cols-3 gap-2">
        {STATUS_TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? t.color : ""}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">جارٍ التحميل...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm bg-card/40 rounded-xl border border-border/40">
          لا توجد طلبات في هذا القسم
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div
              key={lead.id}
              className="flex flex-col gap-3 bg-card/50 border border-border/40 rounded-xl p-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ServiceTypeBadge type={lead.serviceType} />
                    </div>
                    <div dir="ltr" className="font-bold text-foreground text-sm flex items-center gap-2">
                      {lead.phone}
                      <button onClick={() => copyPhone(lead.phone)} className="text-muted-foreground hover:text-primary transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(lead.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      lead.status === "contacted"
                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {lead.status === "contacted" ? "تم التواصل" : "جديد"}
                  </span>
                  {lead.status !== "contacted" && (
                    <Button
                      size="sm"
                      onClick={() => markContacted.mutate(lead.id)}
                      disabled={markContacted.isPending}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تم التواصل
                    </Button>
                  )}
                </div>
              </div>

              {lead.message && <MessagePreview message={lead.message} />}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages} ({total} طلب)</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
        </div>
      )}
    </div>
  );
}
