import { useState, useEffect } from "react";
import { useGetSection, useListItems } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LogIn } from "lucide-react";
import WithdrawalForm from "@/components/WithdrawalForm";
import MoneyTransferForm from "@/components/MoneyTransferForm";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function SectionPage({ id }: { id: number }) {
  const { data: section, isLoading: sectionLoading } = useGetSection(id);
  const { data: items, isLoading: itemsLoading } = useListItems(id);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  const isWithdrawalSection = section?.nameAr?.includes("سحب رواتب");
  const isPaymentSection = section?.nameAr?.includes("طرق الدفع") || section?.nameEn === "Payment Methods";
  const isMoneyTransferSection = section?.nameAr?.includes("الحوالات المالية") || section?.nameEn === "Money Transfers";

  useEffect(() => {
    if (!sectionLoading && isPaymentSection) {
      navigate("/payment-methods", { replace: true });
    }
  }, [sectionLoading, isPaymentSection, navigate]);

  const isPublicSection = isWithdrawalSection || isMoneyTransferSection;

  // Auth guard — only for non-public sections
  if (!isPublicSection && isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-5" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          <LogIn className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white mb-2">يجب تسجيل الدخول</h2>
          <p className="text-muted-foreground text-sm">سجّل دخولك للوصول إلى هذا القسم</p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
            <Link href={`/sign-in?returnUrl=/section/${id}`}>تسجيل الدخول</Link>
          </Button>
          <Button asChild variant="outline" className="border-purple-500/30 text-purple-300 rounded-xl px-6">
            <Link href="/sign-up">إنشاء حساب</Link>
          </Button>
        </div>
      </div>
    );
  }

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
            <img src={section.logoUrl} alt={section.nameAr} className="w-12 h-12 object-contain" />
          )}
          <h1 className="text-3xl font-bold neon-text">{section?.nameAr}</h1>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="ابحث عن لعبة أو تطبيق..." 
          className="pl-4 pr-10 bg-card border-primary/20 focus-visible:border-primary neon-border"
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
          لا توجد عناصر مطابقة للبحث
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <Link key={item.id} href={`/item/${item.id}`}>
              <Card className="neon-border cursor-pointer bg-card/50 hover:bg-card transition-all duration-300 h-full overflow-hidden group">
                <CardContent className="p-0 flex flex-col items-center text-center h-full relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center justify-center w-full h-20 pt-3 relative z-10">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt="" className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-2xl font-bold text-primary">{item.nameAr.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 pb-3 relative z-10">
                    <h3 className="font-bold text-sm leading-tight">{item.nameAr}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.nameEn}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
