import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function SignInPage() {
  const { refetch } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ في تسجيل الدخول");
      await refetch();
      if (!data.user?.profileCompleted) {
        setLocation("/profile-setup");
      } else {
        const params = new URLSearchParams(window.location.search);
        setLocation(params.get("returnUrl") || "/");
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const GOOGLE_URL = `${API_BASE}/api/auth/google`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir="rtl">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="الغريب كارد" className="h-12 w-auto object-contain" />
        <span className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
          الغريب كارد
        </span>
      </Link>

      <div className="w-full max-w-sm bg-card border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-900/20 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground mt-1">أهلاً بعودتك</p>
        </div>

        {/* Google Sign In */}
        <a
          href={GOOGLE_URL}
          className="flex items-center justify-center gap-3 w-full h-11 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl transition-all duration-200 shadow"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          تسجيل الدخول بجوجل
        </a>

        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm">أو</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              className="pr-10 bg-[#0f0f1a] border-purple-500/30 text-white placeholder:text-slate-600 h-11"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="pr-10 pl-10 bg-[#0f0f1a] border-purple-500/30 text-white placeholder:text-slate-600 h-11"
              required
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "دخول"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/sign-up" className="text-primary hover:underline font-semibold">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
