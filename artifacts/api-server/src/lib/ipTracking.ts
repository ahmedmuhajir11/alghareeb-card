import type { Request } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, ipEventsTable, ipAddressesTable, ipBansTable, ipWhitelistTable } from "@workspace/db";

/**
 * Returns the real client IP. Express has `trust proxy` set to 1 (see app.ts),
 * so `req.ip` is already derived safely from X-Forwarded-For's trusted hop —
 * we never read that header ourselves, which is what makes this safe against
 * spoofing by the client.
 */
export function getClientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export type IpEventType =
  | "register"
  | "login"
  | "login_failed"
  | "logout"
  | "order_create"
  | "order_create_failed"
  | "order_complete"
  | "deposit_request";

type LogEventInput = {
  req: Request;
  userId?: number | null;
  eventType: IpEventType;
  success?: boolean;
  orderId?: number | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Records one security-relevant event and keeps the aggregated per-IP profile
 * up to date. Never throws — a logging failure must never break the actual
 * user-facing action (register/login/order/deposit) it's attached to.
 */
export async function logIpEvent(input: LogEventInput): Promise<void> {
  try {
    const ip = getClientIp(input.req);
    const userAgent = (input.req.headers["user-agent"] as string | undefined) ?? null;

    await db.insert(ipEventsTable).values({
      ipAddress: ip,
      userId: input.userId ?? null,
      eventType: input.eventType,
      success: input.success ?? true,
      orderId: input.orderId ?? null,
      userAgent,
      metadata: input.metadata ?? null,
    });

    await db
      .insert(ipAddressesTable)
      .values({ ipAddress: ip })
      .onConflictDoUpdate({
        target: ipAddressesTable.ipAddress,
        set: { lastSeenAt: new Date() },
      });

    // Fire-and-forget: never delays or fails the caller.
    maybeRefreshGeo(ip).catch(() => {});
  } catch (err) {
    console.error("[ipTracking] failed to log event", err);
  }
}

const GEO_REFRESH_DAYS = 30;

async function maybeRefreshGeo(ip: string): Promise<void> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return;
  const rows = await db.select().from(ipAddressesTable).where(eq(ipAddressesTable.ipAddress, ip)).limit(1);
  const existing = rows[0];
  const staleCutoffMs = Date.now() - GEO_REFRESH_DAYS * 24 * 60 * 60 * 1000;
  if (existing?.geoLookedUpAt && new Date(existing.geoLookedUpAt).getTime() > staleCutoffMs) {
    return; // still fresh — don't waste an API call
  }
  const geo = await fetchGeoLocation(ip);
  if (!geo) return;
  await db
    .update(ipAddressesTable)
    .set({
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      isProxyOrVpn: geo.isProxyOrVpn,
      geoLookedUpAt: new Date(),
    })
    .where(eq(ipAddressesTable.ipAddress, ip));
}

type GeoResult = {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  isProxyOrVpn: boolean | null;
};

/**
 * ip-api.com: free, no signup, ~45 req/min for non-commercial use. Results are
 * cached in ip_addresses for GEO_REFRESH_DAYS, so normal traffic stays far
 * under that limit regardless of how many logins/orders happen per day.
 * This is approximate country/city info only — never used to pinpoint a user.
 */
async function fetchGeoLocation(ip: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,proxy,hosting`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.status !== "success") return null;
    return {
      country: data.country ?? null,
      countryCode: data.countryCode ?? null,
      city: data.city ?? null,
      // A hint that the IP is a known proxy/VPN/hosting range — never a verdict on its own.
      isProxyOrVpn: Boolean(data.proxy || data.hosting),
    };
  } catch {
    return null;
  }
}

// --- Bans & whitelist ----------------------------------------------------

export type IpBanScope = "login" | "register" | "orders";

/**
 * Whitelisted IPs are always allowed, regardless of any ban record (an admin
 * can whitelist an IP to override a mistaken ban without deleting history).
 * Otherwise allowed unless there's an active ban ('all' or matching scope).
 * Fails OPEN on internal errors — an outage here must never lock real users out.
 */
export async function isIpAllowed(ip: string, scope: IpBanScope): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const whitelisted = await db.select().from(ipWhitelistTable).where(eq(ipWhitelistTable.ipAddress, ip)).limit(1);
    if (whitelisted.length > 0) return { allowed: true };

    const activeBans = await db
      .select()
      .from(ipBansTable)
      .where(and(eq(ipBansTable.ipAddress, ip), isNull(ipBansTable.unbannedAt)));
    const relevant = activeBans.find(b => b.scope === "all" || b.scope === scope);
    if (relevant) {
      return { allowed: false, reason: relevant.reason || "تم حظر هذا العنوان مؤقتاً" };
    }
    return { allowed: true };
  } catch (err) {
    console.error("[ipTracking] ban check failed — failing open", err);
    return { allowed: true };
  }
}
