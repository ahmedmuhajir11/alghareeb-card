import { Link, useLocation } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useI18n, LANG_META, type LangCode } from "@/lib/i18n";
import { Wallet, Menu, X, Home, Info, MessageCircle, Send, LogIn, LogOut, User, Shield, ShoppingBag, Trophy, ReceiptText } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import WelcomeModal from "@/components/WelcomeModal";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

type TickerMessage = { id: number; text: string; is_active: boolean };

function useTickerMessages() {
  return useQuery<TickerMessage[]>({
    queryKey: ["ticker-messages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/ticker-messages`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}

function SidebarMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { user, isSignedIn, logout } = useAuth();
  const { t, lang, setLang } = useI18n();

  const navLinks = [
    { href: "/", label: t('sidebar.home'), icon: <Home className="w-5 h-5" /> },
    { href: "/payment-methods", label: t('sidebar.addBalance'), icon: <Wallet className="w-5 h-5" /> },
    ...(isSignedIn
      ? [
          { href: "/my-deposits", label: t('sidebar.myDeposits'), icon: <ReceiptText className="w-5 h-5" /> },
          { href: "/wallet", label: t('sidebar.myWallet'), icon: <Wallet className="w-5 h-5" /> },
          { href: "/level", label: t('sidebar.myLevel'), icon: <Trophy className="w-5 h-5" /> },
          { href: "/orders", label: t('sidebar.myOrders'), icon: <ShoppingBag className="w-5 h-5" /> },
        ]
      : []),
    { href: "/about", label: t('sidebar.aboutUs'), icon: <Info className="w-5 h-5" /> },
  ];

  async function handleLogout() {
    await logout();
    onClose();
    window.location.href = "/";
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-[75%] max-w-sm z-50 flex flex-col bg-[#0d0d1a] border-l border-primary/20 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-gradient-to-l from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="الغريب كارد" className="h-10 w-auto object-contain drop-shadow-[0_0_8px_hsl(var(--gold)/0.4)]" />
            <span className="font-black text-lg text-gradient-gold">{t('site.name')}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        {isSignedIn && user ? (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-purple-600/10 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">{t('sidebar.accountNumber')} {user.accountNumber}</p>
              </div>
              {user.isVerified && (
                <div title="موثق" className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('sidebar.balance')}</p>
                <p className="font-black text-primary text-base">
                  {user.balance.toFixed(2)} <span className="text-xs font-semibold text-muted-foreground">{user.currency}</span>
                </p>
              </div>
              <div className="text-start">
                <p className="text-xs text-muted-foreground">{t('sidebar.level')}</p>
                <p className="text-sm font-semibold text-purple-300">{user.level}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4">
            <Link href="/sign-in" onClick={onClose} className="flex items-center justify-center gap-2 w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all">
              <LogIn className="w-4 h-4" />
              {t('sidebar.login')}
            </Link>
            <Link href="/sign-up" onClick={onClose} className="flex items-center justify-center gap-2 w-full h-10 mt-2 border border-purple-500/30 hover:bg-purple-600/10 text-purple-300 font-semibold rounded-xl transition-all text-sm">
              {t('sidebar.register')}
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-semibold px-3 mb-3 tracking-wider">{t('sidebar.mainMenu')}</p>
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <span className={isActive ? "text-primary" : "text-muted-foreground"}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

          {/* Language Switcher — inside scroll so always reachable */}
          <div className="mt-4 pt-4 border-t border-primary/10">
            <p className="text-[11px] text-muted-foreground font-semibold px-2 mb-2 tracking-wider">{t('sidebar.language')}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.entries(LANG_META) as [LangCode, typeof LANG_META[LangCode]][]).map(([code, meta]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  title={meta.name}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs transition-all ${
                    lang === code
                      ? "bg-primary/20 border border-primary/40 text-primary font-bold"
                      : "hover:bg-muted/40 text-muted-foreground border border-transparent"
                  }`}
                >
                  <span className="text-lg leading-none">{meta.flag}</span>
                  <span className="text-[10px] font-medium uppercase">{code}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Social / Contact Links */}
        <div className="px-4 py-3 border-t border-primary/20 space-y-2">
          <p className="text-[11px] text-muted-foreground font-semibold px-2 mb-1.5 tracking-wider">{t('sidebar.contactUs')}</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/905378221375"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-semibold text-sm transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4" /> {t('sidebar.whatsapp')}
            </a>
            <a
              href="https://t.me/ahmedmuhajir"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-semibold text-sm transition-all duration-200"
            >
              <Send className="w-4 h-4" /> {t('sidebar.telegram')}
            </a>
          </div>

          {isSignedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-sm transition-all duration-200"
            >
              <LogOut className="w-4 h-4" /> {t('sidebar.logout')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary/10 text-center">
          <p className="text-xs text-muted-foreground">{t('footer.copyright')}</p>
        </div>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetSettings();
  const { user, isSignedIn } = useAuth();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);
  const { data: allMessages = [] } = useTickerMessages();
  const messages = allMessages.filter(m => m.is_active);
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { method: "GET", cache: "no-store" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const rawMsg = messages.length > 0 ? messages[msgIndex % messages.length]?.text : null;
  const currentMsg = rawMsg
    ? rawMsg.includes('||')
      ? (isRtlLang
          ? rawMsg.split('||')[0].trim()
          : rawMsg.split('||')[1].trim() || rawMsg.split('||')[0].trim())
      : rawMsg
    : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <WelcomeModal />
      <SidebarMenu isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {currentMsg && (
        <div className="bg-gradient-neon text-white py-2 overflow-hidden relative border-b border-primary/20">
          <div
            className="text-center font-bold tracking-wider text-sm md:text-base neon-text"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
          >
            {currentMsg}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-primary/20 hover:border-primary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
              aria-label={t('sidebar.menu')}
            >
              <Menu className="w-5 h-5" />
            </button>

            {isSignedIn && user ? (
              user.balance > 0 ? (
                <Link
                  href="/payment-methods"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-purple-600/15 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-600/25 transition-colors"
                >
                  <Wallet className="w-4 h-4 text-purple-300" />
                  <span className="text-sm font-bold text-purple-200">
                    {user.balance.toFixed(2)} <span className="text-[11px] text-purple-300/80">{user.currency}</span>
                  </span>
                </Link>
              ) : (
                <Link
                  href="/payment-methods"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-l from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-900/30 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-bold whitespace-nowrap">{t('header.addBalance')}</span>
                </Link>
              )
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-l from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-900/30 transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-bold whitespace-nowrap">{t('header.addBalance')}</span>
              </Link>
            )}

            <Link href="/">
              <span className="font-black text-xl text-gradient-gold gold-glow whitespace-nowrap">{t('site.name')}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <img src="/logo.png" alt="الغريب كارد" className="h-16 w-auto object-contain drop-shadow-[0_0_12px_hsl(var(--gold)/0.4)]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <div className="border-t border-border/30 bg-card/20 py-4">
        <div className="container mx-auto px-3">
          <p className="text-center text-xs font-semibold text-muted-foreground mb-3">{t('footer.paymentMethods')}</p>
          <div className="grid grid-cols-7 gap-1.5 w-full" dir="ltr">
            {[
              { src: "/pay-troy.svg", alt: "Troy" },
              { src: "/pay-gpay.png", alt: "Google Pay" },
              { src: "/pay-stcpay.svg", alt: "STC Pay" },
              { src: "/pay-applepay.svg", alt: "Apple Pay" },
              { src: "/pay-mada.svg", alt: "Mada" },
              { src: "/pay-mastercard.png", alt: "MasterCard" },
              { src: "/pay-visa.svg", alt: "Visa" },
            ].map((method) => (
              <div key={method.alt} className="flex items-center justify-center bg-white rounded-lg py-1.5 h-9 shadow-sm hover:scale-105 transition-transform duration-200 cursor-default">
                <img src={method.src} alt={method.alt} className="h-7 w-full object-contain px-0.5" draggable={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-[hsl(var(--gold)/0.2)] bg-card/30 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="font-black text-xl mb-2 text-gradient-gold gold-glow">{t('site.name')}</p>
          <p className="text-sm">{t('footer.tagline')}</p>
          {settings?.whatsappNumber && (
            <p className="text-sm mt-4 text-[hsl(var(--gold))]">{t('footer.contact')}: {settings.whatsappNumber}</p>
          )}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <Link href="/about" className="hover:text-[hsl(var(--gold))] transition-colors">{t('footer.aboutUs')}</Link>
            <Link href="/payment-methods" className="hover:text-[hsl(var(--gold))] transition-colors">{t('footer.paymentMethods')}</Link>
            <Link href="/privacy" className="hover:text-[hsl(var(--gold))] transition-colors">سياسة الخصوصية</Link>
            <Link href="/terms" className="hover:text-[hsl(var(--gold))] transition-colors">شروط الاستخدام</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
