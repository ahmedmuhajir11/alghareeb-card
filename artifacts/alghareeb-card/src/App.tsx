import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingScreen from "@/components/LoadingScreen";
import MaintenancePage from "@/pages/maintenance";
import { useState } from "react";
import NotFound from "@/pages/not-found";

const MAINTENANCE_KEY = "__maintenance_mode__";

import Home from "@/pages/home";
import SectionPage from "@/pages/section";
import ItemPage from "@/pages/item";
import PaymentMethodsPage from "@/pages/payment-methods";
import AboutPage from "@/pages/about";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import OrdersPage from "@/pages/orders";
import WalletPage from "@/pages/wallet";
import MyDepositsPage from "@/pages/my-deposits";
import LevelPage from "@/pages/level";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ProfileSetupPage from "@/pages/profile-setup";
import KycPage from "@/pages/kyc";
import ResellerApiPage from "@/pages/reseller-api";
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/layout/AdminLayout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <AdminLayout><AdminDashboard /></AdminLayout>} />

      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/profile-setup" component={ProfileSetupPage} />

      <Route path="/">
        <AppLayout><Home /></AppLayout>
      </Route>
      <Route path="/payment-methods">
        <AppLayout><PaymentMethodsPage /></AppLayout>
      </Route>
      <Route path="/about">
        <AppLayout><AboutPage /></AppLayout>
      </Route>
      <Route path="/privacy">
        <AppLayout><PrivacyPage /></AppLayout>
      </Route>
      <Route path="/terms">
        <AppLayout><TermsPage /></AppLayout>
      </Route>
      <Route path="/my-deposits">
        <AppLayout><MyDepositsPage /></AppLayout>
      </Route>
      <Route path="/orders">
        <AppLayout><OrdersPage /></AppLayout>
      </Route>
      <Route path="/wallet">
        <AppLayout><WalletPage /></AppLayout>
      </Route>
      <Route path="/level">
        <AppLayout><LevelPage /></AppLayout>
      </Route>
      <Route path="/reseller-api">
        <AppLayout><ResellerApiPage /></AppLayout>
      </Route>
      <Route path="/kyc">
        <KycPage />
      </Route>

      <Route path="/section/:id">
        {params => (
          <AppLayout><SectionPage id={parseInt(params.id)} /></AppLayout>
        )}
      </Route>
      <Route path="/item/:id">
        {params => (
          <AppLayout><ItemPage id={parseInt(params.id)} /></AppLayout>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}


function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isAdminPath = location.startsWith("/admin");

  // Read initial value from localStorage immediately (no loading flicker)
  const [localMaintenance, setLocalMaintenance] = React.useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem(MAINTENANCE_KEY) === "true"
  );

  // Also poll the API to stay in sync (and for other devices)
  const { data: settings } = useQuery({
    queryKey: ["/api/settings/maintenance-status"],
    queryFn: async () => {
      const r = await fetch("/api/settings/maintenance-status", { cache: "no-store" });
      if (!r.ok) return { maintenanceMode: localMaintenance };
      return r.json();
    },
    refetchInterval: 3000,
    staleTime: 0,
    gcTime: 0,
  });

  // Listen for localStorage changes (from admin panel in same browser)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAINTENANCE_KEY) {
        setLocalMaintenance(e.newValue === "true");
      }
    };
    // Also poll localStorage in case the event doesn't fire (same tab)
    const interval = setInterval(() => {
      const val = localStorage.getItem(MAINTENANCE_KEY) === "true";
      setLocalMaintenance(val);
    }, 1000);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  // Sync API response with state & localStorage so maintenance turns OFF cleanly
  React.useEffect(() => {
    if (settings && typeof settings.maintenanceMode === "boolean") {
      setLocalMaintenance(settings.maintenanceMode);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(MAINTENANCE_KEY, settings.maintenanceMode ? "true" : "false");
      }
    }
  }, [settings]);

  // API response is authoritative when available; fallback to local state
  const isMaintenance = typeof settings?.maintenanceMode === "boolean"
    ? settings.maintenanceMode
    : localMaintenance;

  if (!isAdminPath && isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}


function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <CurrencyProvider>
              {loading && <LoadingScreen onDone={() => setLoading(false)} />}
              <div style={{ opacity: loading ? 0 : 1, transition: "opacity 0.4s ease 0.1s" }}>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <ScrollToTop />
                  <MaintenanceGuard>
                    <Router />
                  </MaintenanceGuard>
                  <PushPermissionBanner />
                </WouterRouter>
                <Toaster />
              </div>
            </CurrencyProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
