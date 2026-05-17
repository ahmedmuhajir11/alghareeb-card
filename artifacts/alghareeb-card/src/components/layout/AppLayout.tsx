import { Link, useLocation } from "wouter";
import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useI18n, LANG_META, type LangCode } from "@/lib/i18n";
import { Wallet, Menu, X, Home, Info, MessageCircle, Send, LogIn, LogOut, User, Shield, ShoppingBag, Trophy, ReceiptText, Phone, Mail, Users, FileText, Globe, ChevronDown } from "lucide-react";
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
  const [langOpen, setLangOpen] = useState(false);

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
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/20 bg-gradient-to-l from-primary/10 to-transparent flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="الغريب كارد" className="h-8 w-auto object-contain drop-shadow-[0_0_8px_hsl(var(--gold)/0.4)]" />
            <span className="font-black text-base text-gradient-gold">{t('site.name')}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info Card */}
        {isSignedIn && user ? (
          <div className="mx-3 mt-2.5 p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-xs truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{t('sidebar.accountNumber')} {user.accountNumber}</p>
              </div>
              {user.isVerified && (
                <div title="موثق" className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Shield className="w-3 h-3 text-green-400" />
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-purple-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">{t('sidebar.balance')}</p>
                <p className="font-black text-primary text-sm">
                  {user.balance.toFixed(2)} <span className="text-[10px] font-semibold text-muted-foreground">{user.currency}</span>
                </p>
              </div>
              <div className="text-start">
                <p className="text-[10px] text-muted-foreground">{t('sidebar.level')}</p>
                <p className="text-xs font-semibold text-purple-300">{user.level}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 mt-2.5 flex-shrink-0">
            <Link href="/sign-in" onClick={onClose} className="flex items-center justify-center gap-2 w-full h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all text-sm">
              <LogIn className="w-4 h-4" />
              {t('sidebar.login')}
            </Link>
            <Link href="/sign-up" onClick={onClose} className="flex items-center justify-center gap-2 w-full h-8 mt-1.5 border border-purple-500/30 hover:bg-purple-600/10 text-purple-300 font-semibold rounded-xl transition-all text-xs">
              {t('sidebar.register')}
            </Link>
          </div>
        )}

        {/* Language Dropdown Button */}
        <div className="px-3 pt-2 pb-1 flex-shrink-0 relative">
          <button
            onClick={() => setLangOpen(o => !o)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground transition-all duration-200"
          >
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="flex-1 text-right text-sm font-semibold">{LANG_META[lang].name}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && (
            <div className="absolute top-full left-3 right-3 z-10 mt-1 rounded-xl border border-primary/20 bg-[#0d0d1a] shadow-xl overflow-hidden">
              {(Object.entries(LANG_META) as [LangCode, typeof LANG_META[LangCode]][]).map(([code, meta]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setLangOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                    lang === code
                      ? "bg-primary/20 text-primary font-bold"
                      : "text-foreground hover:bg-primary/10"
                  }`}
                >
                  <span className="font-semibold">{meta.name}</span>
                  {lang === code && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 pt-1 pb-1 flex flex-col gap-0.5 min-h-0">
          <p className="text-[10px] text-muted-foreground font-semibold px-2 mb-1 tracking-wider">{t('sidebar.mainMenu')}</p>
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <span className={`flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Social / Contact + Logout */}
        <div className="px-3 py-2 border-t border-primary/20 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground font-semibold px-1 mb-1 tracking-wider">{t('sidebar.contactUs')}</p>
          <div className={`grid gap-1.5 ${isSignedIn ? "grid-cols-3" : "grid-cols-2"}`}>
            <a
              href="https://wa.me/905378221375"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-semibold text-xs transition-all duration-200"
            >
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" /> {t('sidebar.whatsapp')}
            </a>
            <a
              href="https://t.me/ahmedmuhajir"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-semibold text-xs transition-all duration-200"
            >
              <Send className="w-3.5 h-3.5 flex-shrink-0" /> {t('sidebar.telegram')}
            </a>
            {isSignedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 px-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" /> {t('sidebar.logout')}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-primary/10 text-center flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">{t('footer.copyright')}</p>
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

      <footer className="border-t border-purple-800/40 bg-[#0a0a0f] py-10 mt-auto">
        <div className="container mx-auto px-4 text-center space-y-6">

          {/* Phone / WhatsApp contact row */}
          {settings?.whatsappNumber && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-600/50 shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] transition-all"
              >
                <Phone className="w-5 h-5 text-purple-400" />
              </a>
              <span className="text-[hsl(var(--gold))] font-bold text-lg tracking-wide" dir="ltr">
                {settings.whatsappNumber}
              </span>
              <span className="text-muted-foreground text-sm">{t('footer.contact').replace(':', '')}</span>
            </div>
          )}

          {/* Social icons row */}
          <div className="flex items-center justify-center gap-4">
            {/* WhatsApp */}
            {settings?.whatsappNumber && (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-600/50 shadow-[0_0_10px_rgba(168,85,247,0.35)] hover:shadow-[0_0_18px_rgba(168,85,247,0.65)] transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            )}

            {/* Telegram */}
            <a
              href="https://t.me/alghareebcard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-600/50 shadow-[0_0_10px_rgba(168,85,247,0.35)] hover:shadow-[0_0_18px_rgba(168,85,247,0.65)] transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#2AABEE]">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:info@alghareebcard.com"
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-600/50 shadow-[0_0_10px_rgba(168,85,247,0.35)] hover:shadow-[0_0_18px_rgba(168,85,247,0.65)] transition-all"
            >
              <Mail className="w-6 h-6 text-purple-400" />
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-purple-800/30 mx-auto max-w-lg" />

          {/* Links row */}
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-muted-foreground" dir="rtl">
            <Link href="/about" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
              <Users className="w-4 h-4 text-purple-500" />
              <span>{t('footer.aboutUs')}</span>
            </Link>
            <span className="text-purple-700">•</span>
            <Link href="/terms" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>{t('terms.title')}</span>
            </Link>
            <span className="text-purple-700">•</span>
            <Link href="/privacy" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
              <Shield className="w-4 h-4 text-purple-500" />
              <span>{t('privacy.title')}</span>
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/60">
            © 2025 {t('site.name')}. {t('footer.copyright')}.
          </p>

        </div>
      </footer>
    </div>
  );
}
