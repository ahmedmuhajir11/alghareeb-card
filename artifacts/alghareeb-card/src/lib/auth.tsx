import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface AuthUser {
  id: number;
  accountNumber: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  balance: number;
  currency: string;
  level: string;
  isVerified: boolean;
  profileCompleted: boolean;
  avatarUrl?: string | null;
  isReseller?: boolean;
  apiToken?: string | null;
  allowedIps?: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
  refetch: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else if (res.status === 401) {
        setUser(null);
      }
    } catch {
      // Keep previous user on network glitch to prevent flicker
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Expose global refresh function
    (window as any).refreshUserData = fetchMe;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchMe();
      }
    };
    const onRefreshEvent = () => {
      fetchMe();
    };

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("app:refresh", onRefreshEvent);

    // Auto-poll every 5 seconds when visible to keep balance up to date instantly
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMe();
      }
    }, 5000);

    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("app:refresh", onRefreshEvent);
      clearInterval(interval);
    };
  }, [fetchMe]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");

    if (oauthToken) {
      params.delete("oauth_token");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);

      fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            setIsLoaded(true);
            return;
          }
          return fetch(`${API_BASE}/api/auth/exchange-token`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: oauthToken }),
          })
            .then((r) => r.json())
            .then((d) => setUser(d?.user ?? null))
            .finally(() => setIsLoaded(true));
        })
        .catch(() => {
          setUser(null);
          setIsLoaded(true);
        });
    } else {
      fetchMe();
    }
  }, [fetchMe]);

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoaded, isSignedIn: !!user, refetch: fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
