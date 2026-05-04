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
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");

    if (oauthToken) {
      // Remove token from URL without reload
      params.delete("oauth_token");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);

      // Same-domain deployment: the session cookie set during OAuth callback
      // should already authenticate this request. Try the session first.
      fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            setIsLoaded(true);
            return;
          }
          // Fallback: exchange JWT token for a session (cross-domain case)
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
