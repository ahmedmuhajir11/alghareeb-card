import { Router, type Request, type Response } from "express";
import { desc, eq, isNull, and, sql } from "drizzle-orm";
import {
  db,
  ipAddressesTable,
  ipEventsTable,
  ipBansTable,
  ipWhitelistTable,
  usersTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { getClientIp } from "../lib/ipTracking";

const router = Router();

const VALID_SCOPES = ["all", "login", "register", "orders"];

function cleanIp(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const ip = v.trim();
  if (!ip || ip.length > 64) return null;
  return ip;
}

// GET /admin/ip-security/detail?ip=...
router.get(
  "/admin/ip-security/detail",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ip = cleanIp(req.query.ip);
    if (!ip) {
      res.status(400).json({ error: "عنوان IP غير صالح" });
      return;
    }
    try {
      const [profile] = await db
        .select()
        .from(ipAddressesTable)
        .where(eq(ipAddressesTable.ipAddress, ip))
        .limit(1);

      const [whitelist] = await db
        .select()
        .from(ipWhitelistTable)
        .where(eq(ipWhitelistTable.ipAddress, ip))
        .limit(1);

      const bans = await db
        .select()
        .from(ipBansTable)
        .where(eq(ipBansTable.ipAddress, ip))
        .orderBy(desc(ipBansTable.bannedAt))
        .limit(30);

      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          failed: sql<number>`count(*) filter (where ${ipEventsTable.success} = false)::int`,
          firstEventAt: sql<string | null>`min(${ipEventsTable.createdAt})`,
          lastEventAt: sql<string | null>`max(${ipEventsTable.createdAt})`,
        })
        .from(ipEventsTable)
        .where(eq(ipEventsTable.ipAddress, ip));

      const eventsByType = await db
        .select({
          eventType: ipEventsTable.eventType,
          count: sql<number>`count(*)::int`,
        })
        .from(ipEventsTable)
        .where(eq(ipEventsTable.ipAddress, ip))
        .groupBy(ipEventsTable.eventType)
        .orderBy(desc(sql`count(*)`));

      const accounts = await db
        .select({
          userId: ipEventsTable.userId,
          name: usersTable.name,
          email: usersTable.email,
          phone: usersTable.phone,
          accountNumber: usersTable.accountNumber,
          eventCount: sql<number>`count(*)::int`,
          lastSeenAt: sql<string>`max(${ipEventsTable.createdAt})`,
        })
        .from(ipEventsTable)
        .innerJoin(usersTable, eq(ipEventsTable.userId, usersTable.id))
        .where(eq(ipEventsTable.ipAddress, ip))
        .groupBy(
          ipEventsTable.userId,
          usersTable.name,
          usersTable.email,
          usersTable.phone,
          usersTable.accountNumber,
        )
        .orderBy(desc(sql`max(${ipEventsTable.createdAt})`))
        .limit(50);

      const recentEvents = await db
        .select({
          id: ipEventsTable.id,
          eventType: ipEventsTable.eventType,
          success: ipEventsTable.success,
          orderId: ipEventsTable.orderId,
          userAgent: ipEventsTable.userAgent,
          metadata: ipEventsTable.metadata,
          createdAt: ipEventsTable.createdAt,
          userId: ipEventsTable.userId,
          userName: usersTable.name,
          accountNumber: usersTable.accountNumber,
        })
        .from(ipEventsTable)
        .leftJoin(usersTable, eq(ipEventsTable.userId, usersTable.id))
        .where(eq(ipEventsTable.ipAddress, ip))
        .orderBy(desc(ipEventsTable.createdAt))
        .limit(50);

      res.json({
        ipAddress: ip,
        profile: profile ?? null,
        isWhitelisted: !!whitelist,
        whitelist: whitelist ?? null,
        activeBans: bans.filter((b) => !b.unbannedAt),
        banHistory: bans.filter((b) => !!b.unbannedAt),
        stats: {
          total: stats?.total ?? 0,
          failed: stats?.failed ?? 0,
          firstEventAt: stats?.firstEventAt ?? null,
          lastEventAt: stats?.lastEventAt ?? null,
        },
        eventsByType,
        accounts,
        recentEvents,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /admin/ip-security/ban  { ip, scope, reason }
router.post(
  "/admin/ip-security/ban",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ip = cleanIp(req.body?.ip);
    const scope = String(req.body?.scope ?? "all");
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim().slice(0, 500)
        : "";
    if (!ip) {
      res.status(400).json({ error: "عنوان IP غير صالح" });
      return;
    }
    if (!VALID_SCOPES.includes(scope)) {
      res.status(400).json({ error: "نطاق الحظر غير صالح" });
      return;
    }
    if (ip === getClientIp(req)) {
      res.status(400).json({ error: "لا يمكنك حظر عنوان IP الخاص بك" });
      return;
    }
    try {
      const [wl] = await db
        .select()
        .from(ipWhitelistTable)
        .where(eq(ipWhitelistTable.ipAddress, ip))
        .limit(1);
      if (wl) {
        res.status(400).json({
          error: "هذا العنوان موثوق — أزله من القائمة الموثوقة أولاً",
        });
        return;
      }
      const active = await db
        .select()
        .from(ipBansTable)
        .where(and(eq(ipBansTable.ipAddress, ip), isNull(ipBansTable.unbannedAt)));
      if (active.some((b) => b.scope === "all" || b.scope === scope)) {
        res.status(409).json({ error: "هذا العنوان محظور بالفعل بنفس النطاق" });
        return;
      }
      await db.insert(ipBansTable).values({
        ipAddress: ip,
        scope,
        reason: reason || null,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /admin/ip-security/unban  { ip }
router.post(
  "/admin/ip-security/unban",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ip = cleanIp(req.body?.ip);
    if (!ip) {
      res.status(400).json({ error: "عنوان IP غير صالح" });
      return;
    }
    try {
      const updated = await db
        .update(ipBansTable)
        .set({ unbannedAt: new Date(), unbannedBy: "admin" })
        .where(and(eq(ipBansTable.ipAddress, ip), isNull(ipBansTable.unbannedAt)))
        .returning({ id: ipBansTable.id });
      res.json({ success: true, unbanned: updated.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /admin/ip-security/whitelist  { ip, reason }
router.post(
  "/admin/ip-security/whitelist",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ip = cleanIp(req.body?.ip);
    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim().slice(0, 500)
        : "";
    if (!ip) {
      res.status(400).json({ error: "عنوان IP غير صالح" });
      return;
    }
    try {
      await db
        .insert(ipWhitelistTable)
        .values({ ipAddress: ip, reason: reason || null })
        .onConflictDoNothing();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /admin/ip-security/unwhitelist  { ip }
router.post(
  "/admin/ip-security/unwhitelist",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const ip = cleanIp(req.body?.ip);
    if (!ip) {
      res.status(400).json({ error: "عنوان IP غير صالح" });
      return;
    }
    try {
      await db.delete(ipWhitelistTable).where(eq(ipWhitelistTable.ipAddress, ip));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
