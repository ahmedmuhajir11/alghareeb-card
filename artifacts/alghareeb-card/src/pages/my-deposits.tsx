import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Image as ImageIcon, LogIn, ReceiptText } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type MyDeposit = {
  id: number;
  paymentMethodName: string;
  amount: number;
  currency: string;
  receiptUrl: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
};

function ReceiptImage({ url, t }: { url: string; t: (k: string) => string }) {
  const [zoomed, setZoomed] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <ImageIcon className="w-3.5 h-3.5" /> {t('deposits.receipt')}
      </p>
      <div
        className="rounded-lg overflow-hidden border border-border/50 cursor-pointer max-w-xs"
        onClick={() => setZoomed(true)}
      >
        <img
          src={fullUrl}
          alt={t('deposits.receipt')}
          className="w-full object-contain max-h-48 bg-black/20"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <div className="flex gap-2 mt-2">
        <a href={fullUrl} download className="text-xs text-muted-foreground hover:text-primary underline" onClick={e => e.stopPropagation()}>
          {t('deposits.download')}
        </a>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary underline">
          {t('deposits.open')}
        </a>
      </div>

      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={fullUrl} alt={t('deposits.receipt')} className="w-full rounded-xl object-contain max-h-[80vh]" />
            <button className="absolute top-2 start-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full" onClick={() => setZoomed(false)}>
              {t('deposits.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyDepositsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t, lang } = useI18n();
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<MyDeposit[]>({
    queryKey: ["/api/deposits"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/deposits`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل التحميل");
      return res.json();
    },
    enabled: isSignedIn,
    staleTime: 30_000,
  });

  const statusConfig = {
    pending:  { label: t('deposits.pending'),  bg: "bg-amber-500",  text: "text-white", icon: <Clock className="w-3.5 h-3.5" /> },
    approved: { label: t('deposits.approved'), bg: "bg-green-600",  text: "text-white", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    rejected: { label: t('deposits.rejected'), bg: "bg-red-600",    text: "text-white", icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-card/40 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ReceiptText className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">{t('deposits.loginPrompt')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('deposits.loginSub')}</p>
        <Link href="/sign-in">
          <Button className="w-full gap-2">
            <LogIn className="w-4 h-4" /> {t('deposits.loginBtn')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black neon-text">{t('deposits.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('deposits.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-card/40 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="text-center py-14 bg-card/20 border border-border/30 rounded-2xl">
          <ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t('deposits.none')}</p>
          <Link href="/payment-methods">
            <Button size="sm" className="mt-4">{t('deposits.addBalance')}</Button>
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map(d => {
            const cfg = statusConfig[d.status];
            const isOpen = openId === d.id;
            const date = new Date(d.createdAt).toLocaleString(lang === "ar" ? "ar" : lang, { dateStyle: "short", timeStyle: "short" });
            return (
              <div key={d.id} className="rounded-xl overflow-hidden border border-border/40 shadow-sm">
                <button
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 ${cfg.bg} ${cfg.text} transition-opacity hover:opacity-90`}
                  onClick={() => setOpenId(isOpen ? null : d.id)}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className="truncate max-w-[180px]">{d.paymentMethodName} — {d.amount.toFixed(2)} {d.currency}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-card/70 px-4 py-4 text-sm">
                    <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                      <span className="text-muted-foreground">{t('deposits.opNum')} :</span>
                      <span className="font-bold font-mono">{d.id}</span>
                      <span className="text-muted-foreground">{t('deposits.total')} :</span>
                      <span className="font-bold">{d.amount.toFixed(0)} {d.currency}</span>
                      <span className="text-muted-foreground">{t('deposits.amount')} :</span>
                      <span className="font-bold">{d.amount.toFixed(2)} {d.currency}</span>
                      <span className="text-muted-foreground">{t('deposits.date')} :</span>
                      <span className="font-mono text-xs">{date}</span>
                      {d.adminNote && (
                        <>
                          <span className="text-muted-foreground">{t('deposits.note')} :</span>
                          <span className="text-amber-300">{d.adminNote}</span>
                        </>
                      )}
                    </div>
                    {d.receiptUrl && <ReceiptImage url={d.receiptUrl} t={t} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
