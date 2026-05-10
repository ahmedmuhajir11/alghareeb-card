import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/lib/currency";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import ScrollToTop from "@/components/ScrollToTop";
import LoadingScreen from "@/components/LoadingScreen";
import { useState } from "react";
import NotFound from "@/pages/not-found";

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
                  <Router />
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
