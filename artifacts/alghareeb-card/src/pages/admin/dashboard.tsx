import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPushBanner from "@/components/admin/AdminPushBanner";
import SettingsManager from "@/components/admin/SettingsManager";
import SectionsManager from "@/components/admin/SectionsManager";
import SliderManager from "@/components/admin/SliderManager";
import PaymentMethodsManager from "@/components/admin/PaymentMethodsManager";
import NotificationsManager from "@/components/admin/NotificationsManager";
import TickerManager from "@/components/admin/TickerManager";
import DepositsManager from "@/components/admin/DepositsManager";
import OrdersManager from "@/components/admin/OrdersManager";
import UsersManager from "@/components/admin/UsersManager";
import { Layers, CreditCard, Image, Bell, Settings, Megaphone, Wallet, ShoppingBag, Users, BadgeCheck, BarChart2, Package } from "lucide-react";
import IdentitiesManager from "@/components/admin/IdentitiesManager";
import StatsManager from "@/components/admin/StatsManager";
import YazanCardImporter from "@/components/admin/YazanCardImporter";
import DevServicesManager from "@/components/admin/DevServicesManager";
import { Code } from "lucide-react";

const VALID_TABS = ["stats","orders","deposits","users","sections","payments","slider","ticker","notifications","identities","settings","yazancard","devservices"];
const TAB_CLASS = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary hover:bg-primary/10 transition-colors";

function getTabFromUrl(): string {
  const p = new URLSearchParams(window.location.search).get("tab") ?? "";
  return VALID_TABS.includes(p) ? p : "stats";
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(getTabFromUrl);

  useEffect(() => {
    const onPop = () => setActiveTab(getTabFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function handleTabChange(value: string) {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/30 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold neon-text">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة الموقع والمحتوى</p>
      </div>

      <AdminPushBanner />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max min-w-full md:grid md:grid-cols-12 bg-card border border-primary/20 h-auto p-1 gap-1">
            <TabsTrigger value="stats" className={TAB_CLASS}>
              <BarChart2 className="w-4 h-4 flex-shrink-0" />
              الإحصاءات
            </TabsTrigger>
            <TabsTrigger value="orders" className={TAB_CLASS}>
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              طلبات الشحن
            </TabsTrigger>
            <TabsTrigger value="deposits" className={TAB_CLASS}>
              <Wallet className="w-4 h-4 flex-shrink-0" />
              طلبات الإيداع
            </TabsTrigger>
            <TabsTrigger value="users" className={TAB_CLASS}>
              <Users className="w-4 h-4 flex-shrink-0" />
              المستخدمون
            </TabsTrigger>
            <TabsTrigger value="sections" className={TAB_CLASS}>
              <Layers className="w-4 h-4 flex-shrink-0" />
              الأقسام والمنتجات
            </TabsTrigger>
            <TabsTrigger value="payments" className={TAB_CLASS}>
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              طرق الدفع
            </TabsTrigger>
            <TabsTrigger value="slider" className={TAB_CLASS}>
              <Image className="w-4 h-4 flex-shrink-0" />
              الصور المتحركة
            </TabsTrigger>
            <TabsTrigger value="ticker" className={TAB_CLASS}>
              <Megaphone className="w-4 h-4 flex-shrink-0" />
              شريط الإشعارات
            </TabsTrigger>
            <TabsTrigger value="notifications" className={TAB_CLASS}>
              <Bell className="w-4 h-4 flex-shrink-0" />
              إرسال إشعار
            </TabsTrigger>
            <TabsTrigger value="identities" className={TAB_CLASS}>
              <BadgeCheck className="w-4 h-4 flex-shrink-0" />
              التوثيق
            </TabsTrigger>
            <TabsTrigger value="settings" className={TAB_CLASS}>
              <Settings className="w-4 h-4 flex-shrink-0" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="yazancard" className={TAB_CLASS}>
              <Package className="w-4 h-4 flex-shrink-0" />
              استيراد API
            </TabsTrigger>
            <TabsTrigger value="devservices" className={TAB_CLASS}>
              <Code className="w-4 h-4 flex-shrink-0" />
              خدمات التطوير
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stats" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <StatsManager />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <OrdersManager />
          </div>
        </TabsContent>

        <TabsContent value="deposits" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <DepositsManager />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <UsersManager />
          </div>
        </TabsContent>

        <TabsContent value="sections" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <SectionsManager />
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <PaymentMethodsManager />
          </div>
        </TabsContent>

        <TabsContent value="slider" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <SliderManager />
          </div>
        </TabsContent>

        <TabsContent value="ticker" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <TickerManager />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <NotificationsManager />
          </div>
        </TabsContent>

        <TabsContent value="identities" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <IdentitiesManager />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm space-y-8">
            <SettingsManager />
          </div>
        </TabsContent>

        <TabsContent value="yazancard" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <YazanCardImporter />
          </div>
        </TabsContent>

        <TabsContent value="devservices" className="mt-6">
          <div className="bg-card/40 border border-border/40 rounded-2xl p-4 md:p-6 shadow-sm">
            <DevServicesManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
