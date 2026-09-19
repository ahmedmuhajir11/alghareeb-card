import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useGetItem, useGetSettings } from "@workspace/api-client-react";
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
import { OrderStatusDialog, type OrderStatusData } from "@/components/OrderStatusDialog";
import { OrderWaitingDialog } from "@/components/OrderWaitingDialog";

export default function ItemPage({ id }: { id: number }) {
  const { data: item, isLoading: itemLoading } = useGetItem(id);
  const { data: settings } = useGetSettings();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const itemName = item ? (isRtlLang ? item.nameAr : (item.nameEn || item.nameAr)) : "";
  const { isSignedIn, isLoaded, user, refetch: refetchAuth } = useAuth();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [statusOrder, setStatusOrder] = useState<OrderStatusData | null>(null);
  const [checkingOrder, setCheckingOrder] = useState(false);

  const toStatusData = (o: any): OrderStatusData => ({
    id: o.id,
    itemName: o.itemName,
    itemNameEn: o.itemNameEn,
    packageName: o.packageName,
    targetId: o.targetId,
    providerUsername: o.providerUsername,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    createdAt: o.createdAt,
  });

  // Waits for the order to leave "pending" (success or failure) before
  // the caller shows anything to the customer, so the status dialog
  // always reflects the real outcome — including the account username
  // when the provider only returns it once the check fully resolves —
  // instead of opening on a placeholder "processing" state.
  const waitForOrderResolution = async (orderId: number, fallback: OrderStatusData): Promise<OrderStatusData> => {
    const maxAttempts = 20; // ~60s total, matches the background sync's typical resolution window
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`${API_BASE}/api/orders`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.orders ?? []);
          const found = list.find((o: any) => o.id === orderId);
          if (found && found.status !== "pending") {
            return toStatusData(found);
          }
        }
      } catch {
        /* transient network hiccup — keep trying until maxAttempts */
      }
    }
    return fallback; // still pending after the max wait — show it anyway rather than leaving the customer with no feedback at all
  };

  const pricingType = item?.sectionPricingType;
  const isPerQuantity = pricingType === "per_quantity";
  const isHybrid = pricingType === "hybrid";
  // In a "hybrid" section, each item decides for itself which mode(s) it actually
  // supports — NOT the section as a whole. A product imported as fixed packages
  // (e.g. via the YazanCard packages import) never gets a manual price-per-unit,
  // so it must never show a manual-quantity option just because its section is
  // hybrid; likewise an item with no packages must never show "choose a package".
  const itemHasQuantityPrice = item?.pricePerUnit != null && item.pricePerUnit > 0;
  const itemHasPackages = !!item?.packages && item.packages.length > 0;
  // Whether the manual-quantity UI/logic should be available for THIS item.
  const hasQuantityOption = isPerQuantity || (isHybrid && itemHasQuantityPrice);
  // Whether the fixed-packages UI/logic should be available for THIS item.
  const hasPackagesOption = pricingType === "packages" || (isHybrid && itemHasPackages);
  // Only a hybrid item that genuinely has BOTH gets the switcher; otherwise it
  // silently behaves like a plain single-mode item (packages-only or quantity-only).
  const showModeSwitch = isHybrid && hasQuantityOption && hasPackagesOption;
  const minQuantity = item?.minQuantity ?? 1;
  const maxQuantity = item?.maxQuantity ?? null;

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [customPricePerUnit, setCustomPricePerUnit] = useState<number | null>(null);
  // For hybrid items that support BOTH modes: which one the customer is using.
  const [orderMode, setOrderMode] = useState<"package" | "quantity">("package");

  // Default the mode to whichever option this item actually has, preferring packages.
  useEffect(() => {
    if (!isHybrid || !item) return;
    setOrderMode(hasPackagesOption ? "package" : "quantity");
  }, [isHybrid, item, hasPackagesOption]);

  // Whether the quantity/packages UI is the one currently in effect for this order.
  // Outside the switcher case, whichever single mode the item supports just wins.
  const quantityModeActive = isPerQuantity || (isHybrid && hasQuantityOption && (orderMode === "quantity" || !hasPackagesOption));
  const packageModeActive = !quantityModeActive && (pricingType === "packages" || (isHybrid && hasPackagesOption));

  useEffect(() => {
    if (!isSignedIn || !hasQuantityOption || !id) return;
    fetch(`${API_BASE}/api/user-item-prices/item/${id}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.customPricePerUnit != null) setCustomPricePerUnit(data.customPricePerUnit); })
      .catch(() => {});
  }, [isSignedIn, hasQuantityOption, id]);

  const effectivePricePerUnit = customPricePerUnit ?? item?.pricePerUnit ?? null;

  const parsedQty = parseFloat(quantity);
  const isBelowMin = quantityModeActive && quantity !== "" && parsedQty > 0 && parsedQty < minQuantity;
  const calculatedPrice = quantityModeActive && effectivePricePerUnit && parsedQty > 0 && !isBelowMin
    ? parsedQty * effectivePricePerUnit
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
      // Do NOT auto-navigate to "My Orders" — show the result directly
      // in an in-page status dialog instead, per current product flow.
      if (data?.order) {
        const initial = toStatusData(data.order);
        if (initial.status === "pending") {
          // Don't show the dialog yet — wait until the charge actually
          // resolves so the customer sees the real outcome (and the
          // account username, if the provider supplies one) instead of
          // a transient "processing" placeholder.
          setCheckingOrder(true);
          const resolved = await waitForOrderResolution(initial.id, initial);
          setCheckingOrder(false);
          setStatusOrder(resolved);
        } else {
          setStatusOrder(initial);
        }
      }
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

    if (quantityModeActive) {
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
        <title>{item.nameEn
          ? `شحن ${item.nameAr} - ${item.nameEn} Top Up | الغريب كارد`
          : `شحن ${item.nameAr} | الغريب كارد`}
        </title>
        <meta name="description" content={
          item.nameEn
            ? `اشحن ${item.nameAr} بأفضل الأسعار وأسرع خدمة. Top up ${item.nameEn} at the best prices – choose your package and order via WhatsApp instantly. AlGhareeb Card.`
            : `اشحن ${item.nameAr} بأفضل الأسعار وأسرع خدمة. اختر الباقة المناسبة وأرسل طلبك عبر واتساب مباشرة.`
        } />
        <meta name="keywords" content={
          item.nameEn
            ? `${item.nameAr}, ${item.nameEn}, شحن ${item.nameAr}, ${item.nameEn} top up, ${item.nameEn} recharge, الغريب كارد, alghareeb card`
            : `${item.nameAr}, شحن ${item.nameAr}, الغريب كارد`
        } />
        <meta property="og:title" content={item.nameEn
          ? `شحن ${item.nameAr} - ${item.nameEn} Top Up | الغريب كارد`
          : `شحن ${item.nameAr} | الغريب كارد`}
        />
        <meta property="og:description" content={
          item.nameEn
            ? `Top up ${item.nameEn} at the best prices via AlGhareeb Card | اشحن ${item.nameAr} بأفضل الأسعار عبر الغريب كارد`
            : `اشحن ${item.nameAr} بأفضل الأسعار عبر الغريب كارد`
        } />
        <meta property="og:url" content={`https://alghareebcard.com/item/${id}`} />
        <link rel="canonical" href={`https://alghareebcard.com/item/${id}`} />
        <link rel="alternate" hrefLang="ar" href={`https://alghareebcard.com/item/${id}`} />
        <link rel="alternate" hrefLang="en" href={`https://alghareebcard.com/item/${id}`} />
        <link rel="alternate" hrefLang="x-default" href={`https://alghareebcard.com/item/${id}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": item.nameEn || item.nameAr,
          "alternateName": item.nameEn ? item.nameAr : undefined,
          "description": item.nameEn
            ? `Top up ${item.nameEn} at the best prices via WhatsApp. شحن ${item.nameAr} بأفضل الأسعار.`
            : `شحن ${item.nameAr} بأفضل الأسعار عبر واتساب.`,
          "image": item.logoUrl || "https://alghareebcard.com/logo.png",
          "url": `https://alghareebcard.com/item/${id}`,
          "brand": { "@type": "Brand", "name": "AlGhareeb Card | الغريب كارد" },
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "AlGhareeb Card" }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "الغريب كارد", "item": "https://alghareebcard.com/" },
              { "@type": "ListItem", "position": 2, "name": ((item as any)?.sectionNameAr || (item as any)?.sectionNameEn || "الأقسام"), "item": item?.sectionId ? `https://alghareebcard.com/section/${item.sectionId}` : "https://alghareebcard.com/" },
              { "@type": "ListItem", "position": 3, "name": item.nameEn ? `${item.nameAr} - ${item.nameEn}` : (item.nameAr || `منتج ${id}`), "item": `https://alghareebcard.com/item/${id}` }
            ]
          }
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
            {item.description || (quantityModeActive ? `${t('item.enterQty')} ${unitLabel}` : t('item.choosePackage'))}
          </p>
          {quantityModeActive && effectivePricePerUnit && (
            <p className="text-sm text-primary/80">
              {t('item.pricePerUnit')} {unitLabel}: {formatPrice(effectivePricePerUnit)}
              {customPricePerUnit != null && (
                <span className="mr-1 text-xs text-yellow-400/90 font-semibold">⭐ سعر خاص</span>
              )}
            </p>
          )}
        </div>
      </div>

      {isUnavailable && (
        <div className="flex items-center gap-3 bg-red-950/60 border border-red-500/50 rounded-2xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <span className="text-2xl">🚫</span>
          <div>
            <p className="font-bold text-red-400 text-base">{t('item.unavailableMsg')}</p>
            <p className="text-sm text-red-300/70">{t('item.unavailableContact')}</p>
          </div>
        </div>
      )}

      {showModeSwitch && (
        <div className="flex gap-2 p-1 bg-card/30 rounded-2xl border border-primary/20">
          <button
            type="button"
            onClick={() => setOrderMode("package")}
            className={`flex-1 text-sm font-bold py-2 rounded-xl transition-colors ${
              orderMode === "package" ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('item.choosePackageTitle')}
          </button>
          <button
            type="button"
            onClick={() => setOrderMode("quantity")}
            className={`flex-1 text-sm font-bold py-2 rounded-xl transition-colors ${
              orderMode === "quantity" ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary)]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('item.enterQty')}
          </button>
        </div>
      )}

      {quantityModeActive ? (
        <div className="space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
            {t('item.enterQty')}
          </h2>
          <div className="bg-card/30 rounded-2xl border border-primary/20 p-3 space-y-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('item.quantityOf')} {unitLabel}</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={`${minQuantity > 1 ? minQuantity : 1000} ${unitLabel}`}
                className={`h-10 text-base bg-background/50 focus-visible:border-primary text-center ${isBelowMin ? "border-red-500" : "border-primary/20"}`}
                value={quantity}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setQuantity(val);
                }}
                dir="ltr"
              />
              {(minQuantity > 1 || maxQuantity) && !isBelowMin && (
                <p className="text-xs text-muted-foreground text-center">
                  {minQuantity > 1 && <span>{t('item.minQty')} {minQuantity} </span>}
                  {minQuantity > 1 && maxQuantity && <span>— </span>}
                  {maxQuantity && <span>الحد الأقصى: {maxQuantity} </span>}
                  {unitLabel}
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
                          {t('section.unavailable')}
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

      <div className="space-y-2 bg-card/30 p-3 rounded-2xl border border-primary/20">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <span className="w-2 h-6 bg-primary rounded-full inline-block"></span>
          {t('item.shippingData')}
        </h2>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            {item.sectionId === 5 ? t('item.phoneLabel') : t('item.idLabel')}
          </label>
          <Input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
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
          disabled={submitting || checkingOrder || isUnavailable}
        >
          <Send className="w-5 h-5" />
          {submitting ? t('item.sending') : isUnavailable ? t('item.unavailableBtn') : t('item.sendOrder')}
        </Button>
        <OrderWaitingDialog open={checkingOrder} />
        {user && (
          <p className="text-xs text-center text-muted-foreground mt-1">
            {t('item.currentBalance')} <span className="text-primary font-bold">{user.balance.toFixed(2)} {user.currency}</span>
          </p>
        )}
      </div>
      {(item as any).fulfillmentType && (item as any).fulfillmentType !== "none" && (
        <div className="border-r-4 border-green-500 pr-3 py-2 text-sm text-green-400 bg-green-500/10 rounded-xl px-4">
          {(item as any).fulfillmentType === "auto"
            ? t('item.fulfillAuto')
            : t('item.fulfillManual')}
        </div>
      )}
      <OrderStatusDialog
        order={statusOrder}
        open={!!statusOrder}
        onClose={() => setStatusOrder(null)}
      />
    </div>
  );
}
