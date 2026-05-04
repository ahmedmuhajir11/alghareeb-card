import { useCallback, useEffect, useState } from "react";

const VAPID_PUBLIC = "BKUnjuU6KRBrRoyRoRNZr1IWmssQfO3lwMUuBcTcnk_gYvhK4zNCSiJzSajeylYA6V9pFThEwUXV-oqFIcrrU5U";
const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerSubscription(sub: PushSubscription, isAdmin: boolean) {
  try {
    const payload = isAdmin ? { ...sub.toJSON(), isAdmin: true } : sub.toJSON();
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) localStorage.setItem("push_registered", "1");
    return res.ok;
  } catch {
    return false;
  }
}

export type PushStatus = "unsupported" | "default" | "granted" | "denied";

export interface UsePushOptions {
  isAdmin?: boolean;
}

export function usePushNotifications(options: UsePushOptions = {}) {
  const isAdmin = !!options.isAdmin;
  const [status, setStatus] = useState<PushStatus>("default");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushStatus);

    const base = import.meta.env.BASE_URL ?? "/";
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .then(async (reg) => {
        setRegistration(reg);
        const existing = await reg.pushManager.getSubscription();
        // Always re-register on mount so the server can attach the current
        // logged-in user_id (and admin flag when applicable).
        if (existing) {
          await registerSubscription(existing, isAdmin);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const subscribe = useCallback(async (): Promise<PushStatus> => {
    if (status === "unsupported") return "unsupported";
    if (!registration) return status;
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== "granted") return permission as PushStatus;

      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }
      await registerSubscription(sub, isAdmin);
      return "granted";
    } catch {
      return status;
    }
  }, [registration, status, isAdmin]);

  return { status, subscribe };
}
