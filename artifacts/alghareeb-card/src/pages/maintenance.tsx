import { useState } from "react";
import { Link } from "wouter";
import { Loader2, ChevronDown } from "lucide-react";

export default function MaintenancePage() {
  const [showAdminLink, setShowAdminLink] = useState(false);
  const isApp = typeof navigator !== "undefined" && navigator.userAgent.includes("AlGhareebApp");

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative"
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 100%)" }}
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-sm">
        <img
          src="/logo.png"
          alt="الغريب كارد"
          className="w-28 h-28 rounded-2xl shadow-2xl"
          style={{ filter: "drop-shadow(0 0 24px #7c3aed88)" }}
        />

        <div className="space-y-3">
          <h1
            className="text-2xl font-black text-white"
            style={{ textShadow: "0 0 20px #7c3aed" }}
          >
            الموقع قيد الصيانة
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            سنعود إليكم قريبًا ✨
          </p>
        </div>

        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">جاري التحميل...</span>
        </div>
      </div>

      {isApp && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
          {!showAdminLink ? (
            <button
              onClick={() => setShowAdminLink(true)}
              className="text-xs text-muted-foreground/30 hover:text-muted-foreground/60 flex items-center gap-1 transition-all duration-200"
            >
              عرض المزيد <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <Link
              href="/admin/login"
              className="text-xs text-primary/80 hover:text-primary underline font-medium transition-all duration-200"
            >
              تسجيل دخول الإدارة
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

