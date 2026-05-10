import { useState, useEffect } from "react";
import { useGetSection, useListItems } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import WithdrawalForm from "@/components/WithdrawalForm";
import MoneyTransferForm from "@/components/MoneyTransferForm";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SectionPage({ id }: { id: number }) {
  const { data: section, isLoading: sectionLoading } = useGetSection(id);
  const { data: items, isLoading: itemsLoading } = useListItems(id);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const displayName = (nameAr: string, nameEn: string) =>
    isRtlLang ? nameAr : (nameEn || nameAr);

  const isWithdrawalSection = section?.nameAr?.includes("سحب رواتب");
  const isPaymentSection = section?.nameAr?.includes("طرق الدفع") || section?.nameEn === "Payment Methods";
  const isMoneyTransferSection = section?.nameAr?.includes("الحوالات المالية") || section?.nameEn === "Money Transfers";

  useEffect(() => {
    if (!sectionLoading && isPaymentSection) {
      navigate("/payment-methods", { replace: true });
    }
  }, [sectionLoading, isPaymentSection, navigate]);

  const filteredItems = items?.filter(item =>
    item.nameAr.toLowerCase().includes(search.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (!sectionLoading && isWithdrawalSection) {
    return <WithdrawalForm />;
  }

  if (!sectionLoading && isMoneyTransferSection) {
    return <MoneyTransferForm />;
  }

  if (!sectionLoading && isPaymentSection) {
    return null;
  }

  return (
    <div className="space-y-6">
      {sectionLoading ? (
        <Skeleton className="h-10 w-48 mb-6" />
      ) : (
        <div className="flex items-center gap-4 mb-6">
          {section?.logoUrl && (
            <img src={section.logoUrl} alt={section.nameAr} className="w-12 h-12 object-cover rounded-2xl" />
          )}
          <h1 className="text-3xl font-bold neon-text">{section ? displayName(section.nameAr, section.nameEn) : ""}</h1>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={t('section.searchPh')}
          className="ps-4 pe-10 bg-card border-primary/20 focus-visible:border-primary neon-border"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {itemsLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-xl border border-border/50">
          {t('section.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const unavailable = (item as any).isAvailable === false;
            return (
              <Link key={item.id} href={`/item/${item.id}`}>
                <Card className={`neon-border cursor-pointer transition-all duration-300 h-full overflow-hidden group ${unavailable ? "bg-card/20 opacity-60 grayscale" : "bg-card/50 hover:bg-card"}`}>
                  <CardContent className="p-0 flex flex-col items-center text-center h-full relative">
                    {!unavailable && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                    {unavailable && (
                      <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-20 pointer-events-none">
                        <div className="absolute -top-1 -right-6 w-28 rotate-45 bg-red-600 text-white text-[9px] font-bold text-center py-0.5 shadow-md">
                          غير متاح
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-center w-full h-20 pt-3 relative z-10">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt="" className={`w-14 h-14 object-cover rounded-2xl drop-shadow-md ${!unavailable ? "group-hover:scale-110 transition-transform" : ""}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center ${!unavailable ? "group-hover:scale-110 transition-transform" : ""}`}>
                          <span className="text-2xl font-bold text-primary">{item.nameAr.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-2 pb-3 relative z-10">
                      <h3 className="font-bold text-sm leading-tight">{displayName(item.nameAr, item.nameEn)}</h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
