import { Link, useLocation } from "wouter";
import { useAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Settings, Image as ImageIcon, Box, Layers } from "lucide-react";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: me, isLoading, error } = useAdminMe({
    query: {
      retry: false,
    }
  });
  
  const logout = useAdminLogout();

  useEffect(() => {
    if (!isLoading && (!me || !me.isAdmin || error)) {
      setLocation("/admin/login");
    }
  }, [me, isLoading, error, setLocation]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!me?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">لوحة التحكم</span>
          </Link>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل خروج
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row container mx-auto">
        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
