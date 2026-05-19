import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useGetItem } from "@workspace/api-client-react";
import type { Package } from "@workspace/api-client-react";
import { useCurrency } from "@/lib/currency";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ItemPage({ id }: { id: number }) {
  const { data: item, isLoading: itemLoading } = useGetItem(id);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const itemName = item ? (isRtlLang ? item.nameAr : (item.nameEn || item.nameAr)) : "";
  const { isSignedIn, isLoaded, user, refetch: refetchAuth } = useAuth();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const isPerQuantity = item?.sectionPricingType === "per_quantity";
  const minQuantity = (item as any)?.minQuantity ?? 1;

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const parsedQty = parseFloat(quantity);
  const isBelowMin = isPerQuantity && quantity !== "" && parsedQty > 0 && parsedQty < minQuantity;
  const calculatedPrice = isPerQuantity && item?.pricePerUnit && parsedQty > 0 && !isBelowMin
    ? parsedQty * item.pricePerUnit
    : null;

  const submitOrder = async (params: {
    packageId?: number;
    quantity?: number;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item?.id,
          packageId: params.packageId,
          quantity: params.quantity,
          targetId: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data?.code === "INSUFFICIENT_BALANCE") {
          toast({
            variant: "destructive",
            title: t('item.insufficientBalance'),
            description: t('item.insufficientDesc'),
          });
          setTimeout(() => navigate("/payment-methods"), 1200);
          return;
        }
        throw new Error(data?.error || t('item.failed'));
      }

      await refetchAuth();
      const charged = data?.order?.amount ?? 0;
      const chargedCur = data?.order?.currency ?? user?.currency ?? "USD";
      toast({
        title: t('item.orderSent'),
        description: `${t('item.orderSentDesc')} (${charged.toFixed(2)} ${chargedCur})`,
      });
      setTimeout(() => navigate("/orders"), 900);
    } catch (e: any) {
      toast({ variant: "destructive", title: t('item.error'), description: e?.message ?? t('item.failed') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrder = () => {
    if (!isSignedIn) {
      navigate(`/sign-in?returnUrl=/item/${id}`);
      return;
    }
    if (!userId.trim()) {
      toast({ variant: "destructive", title: t('item.error'), description: item?.sectionId === 5 ? t('item.errorMissingId') : t('item.errorMissingId') });
      return;
    }

    if (isPerQuantity) {
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0) {
        toast({ variant: "destructive", title: t('item.error'), description: t('item.errorMissingQty') });
        return;
      }
      if (qty < minQuantity) {
        toast({ variant: "destructive", title: t('item.belowMin'), description: `${t('item.minQty')} ${minQuantity} ${unitLabel}` });
        return;
      }
      if (!calculatedPrice) return;
      submitOrder({ quantity: qty });
    } else {
      if (!selectedPackageId) {
        toast({ variant: "destructive", title: t('item.error'), description: t('item.errorMissingPkg') });
        return;
      }
      const selectedPackage = item?.packages?.find((p: Package) => p.id === selectedPackageId);
      if (!selectedPackage || !item) return;
      submitOrder({ packageId: selectedPackage.id });
    }
  };

  if (itemLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!item) return <div className="text-center py-12">{t('item.notFound')}</div>;

  const isUnavailable = (item as any).isAvailable === false;

  const rawUnit = item.currencyUnit || "وحدة";
  const unitKey = `unit.${rawUnit}` as Parameters<typeof t>[0];
  const unitLabelFull = t(unitKey) !== unitKey ? t(unitKey) : rawUnit;
  const unitLabel = item.sectionId === 2 ? "" : unitLabelFull;

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <Helmet>
        <title>{itemName ? `شحن ${itemName} | الغريب كارد` : 'الغريب كارد'}</title>
        <meta name="description" content={itemName ? `اشحن ${itemName} بأفضل الأسعار وأسرع خدمة. اختر الباقة المناسبة وأرسل طلبك عبر واتساب مباشرة.` : ''} />
        <meta property="og:title" content={itemName ? `شحن ${itemName} | الغريب كارد` : 'الغريب كارد'} />
        <meta property="og:description" content={itemName ? `اشحن ${itemName} بأفضل الأسعار عبر الغريب كارد` : ''} />
        <meta property="og:url" content={`https://alghareebcard.com/item/${id}`} />
        <link rel="canonical" href={`https://alghareebcard.com/item/${id}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://alghareebcard.com/" },
            { "@type": "ListItem", "position": 2, "name": (item as any)?.sectionNameAr ?? "الأقسام", "item": `https://alghareebcard.com/section/${item?.sectionId ?? ''}` },
            { "@type": "ListItem", "position": 3, "name": item?.nameAr ?? "", "item": `https://alghareebcard.com/item/${id}` }
          ]
        })}</script>
      </Helmet>
      <div className={`flex flex-row items-center gap-3 p-3 rounded-2xl neon-border ${isUnavailable ? "bg-card/20 opacity-70" : "bg-card/30"}`}>
        {item.logoUrl ? (
          <img src={item.logoUrl} alt={item.nameAr} className={`w-14 h-14 object-cover rounded-xl drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] flex-shrink-0 ${isUnavailable ? "grayscale" : ""}`} />
        ) : (
          <div className={`w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 ${isUnavailable ? "grayscale" : ""}`}>
            <span className="text-2xl font-bold text-primary">{item.nameAr.charAt(0)}</span>
          </div>
        )}
        <div className="text-start flex-1">
          <h1 className="text-2xl font-bold neon-text leading-tight">{itemName}</h1>
          <p className="text-muted-foreground text-sm">
            {item.description || (isPerQuantity ? `${t('item.enterQty')} ${unitLabel}` : t('item.choosePackage'))}
          </p>
          {isPerQuantity && item.pricePerUnit && (
            <p className="text-sm text-primary/80">
              {t('item.pricePerUnit')} {unitLabel}: {formatPrice(item.pricePerUnit)}
            </p>
          )}
        </div>
      </div>

      {isUnavailable && (
        <div className="flex items-center gap-3 bg-red-950/60 border border-red-500/50 rounded-2xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <span className="text-2xl">🚫</span>
          <div>
            <p className="font-bold text-red-400 text-base">المنتج غير متاح بالوقت الحالي</p>
            <p className="text-sm text-red-300/70">يرجى التواصل معنا أو المحاولة لاحقاً</p>
          </div>
        </div>
      )}

      {isPerQuantity ? (
        <div className="space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
            {t('item.enterQty')}
          </h2>
          <div className="bg-card/30 rounded-2xl neon-border p-3 space-y-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('item.quantityOf')} {unitLabel}</label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder={`${minQuantity > 1 ? minQuantity : 1000} ${unitLabel}`}
                className={`h-10 text-base bg-background/50 focus-visible:border-primary text-center ${isBelowMin ? "border-red-500" : "border-primary/20"}`}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                dir="ltr"
              />
              {minQuantity > 1 && !isBelowMin && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('item.minQty')} {minQuantity} {unitLabel}
                </p>
              )}
              {isBelowMin && (
                <p className="text-sm text-red-500 font-bold text-center" data-testid="min-quantity-error">
                  ⚠ {t('item.belowMin')} {minQuantity} {unitLabel}
                </p>
              )}
            </div>
            {calculatedPrice !== null && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-2 text-center">
                <p className="text-sm text-muted-foreground">{t('item.totalPrice')} {quantity} {unitLabel}</p>
                <p className="text-2xl font-black text-primary neon-text">{formatPrice(calculatedPrice)}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
            {t('item.choosePackageTitle')}
          </h2>
          {!item.packages || item.packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card/50 rounded-xl border border-border/50">
              {t('item.noPackages')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...item.packages].sort((a: Package, b: Package) => a.priceUsd - b.priceUsd).map((pkg: Package) => {
                const pkgUnavailable = (pkg as any).isAvailable === false;
                return (
                  <Card
                    key={pkg.id}
                    className={`transition-all duration-200 overflow-hidden relative ${
                      pkgUnavailable
                        ? "border-red-500/20 bg-card/20 opacity-50 cursor-not-allowed"
                        : selectedPackageId === pkg.id
                          ? "border-primary shadow-[0_0_20px_var(--color-primary)] bg-primary/10 cursor-pointer"
                          : "border-border/50 bg-card/50 hover:border-primary/50 cursor-pointer"
                    }`}
                    onClick={() => !pkgUnavailable && setSelectedPackageId(pkg.id)}
                  >
                    {pkgUnavailable && (
                      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                        <span className="bg-red-600/90 text-white text-xs font-black px-3 py-1 rounded-lg shadow-lg tracking-wide border border-red-400/30">
                          غير متاح
                        </span>
                      </div>
                    )}
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className={`font-bold text-lg ${pkgUnavailable ? "line-through text-muted-foreground" : ""}`}>{pkg.label}</div>
                        <div className="text-sm text-primary/80 font-medium">{t('item.pkgQty')} {pkg.quantity}</div>
                      </div>
                      <div className={`font-black text-xl drop-shadow-sm ${pkgUnavailable ? "text-muted-foreground line-through" : "text-primary"}`}>
                        {formatPrice(pkg.priceUsd)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 bg-card/30 p-3 rounded-2xl neon-border">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
          {t('item.shippingData')}
        </h2>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {item.sectionId === 5 ? t('item.phoneLabel') : t('item.idLabel')}
          </label>
          <Input
            placeholder={item.sectionId === 5 ? t('item.phonePh') : t('item.idPh')}
            className="h-10 text-base bg-background/50 border-primary/20 focus-visible:border-primary text-center"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            dir="ltr"
          />
        </div>
        <Button
          className="w-full h-11 text-lg font-bold mt-2 shadow-[0_0_15px_var(--color-primary)] hover:shadow-[0_0_25px_var(--color-primary)] transition-all gap-2 bg-purple-600 hover:bg-purple-700 text-white border-none disabled:opacity-60"
          onClick={handleOrder}
          disabled={submitting || isUnavailable}
        >
          <Send className="w-5 h-5" />
          {submitting ? t('item.sending') : isUnavailable ? "المنتج غير متاح" : t('item.sendOrder')}
        </Button>
        {user && (
          <p className="text-xs text-center text-muted-foreground mt-1">
            {t('item.currentBalance')} <span className="text-primary font-bold">{user.balance.toFixed(2)} {user.currency}</span>
          </p>
        )}
      </div>
    </div>
  );
}
