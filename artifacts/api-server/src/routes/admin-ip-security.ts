import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

// GET /api/admin/ip-security/overview
router.get("/admin/ip-security/overview", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalIps, topActive, topMultiAccount, failedLogins24h, banned] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM ip_addresses`),
      pool.query(`
        SELECT ip_address, COUNT(*) AS event_count
        FROM ip_events
        GROUP BY ip_address
        ORDER BY event_count DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT ip_address, COUNT(DISTINCT user_id) AS account_count
        FROM ip_events
        WHERE user_id IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(DISTINCT user_id) > 1
        ORDER BY account_count DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT COUNT(*) FROM ip_events
        WHERE event_type = 'login_failed' AND created_at > NOW() - INTERVAL '24 hours'
      `),
      pool.query(`SELECT COUNT(*) FROM ip_bans WHERE unbanned_at IS NULL`),
    ]);

    res.json({
      totalActiveIps: parseInt(totalIps.rows[0].count, 10),
      failedLogins24h: parseInt(failedLogins24h.rows[0].count, 10),
      bannedIpsCount: parseInt(banned.rows[0].count, 10),
      topActiveIps: topActive.rows.map(r => ({ ipAddress: r.ip_address, eventCount: parseInt(r.event_count, 10) })),
      topMultiAccountIps: topMultiAccount.rows.map(r => ({ ipAddress: r.ip_address, accountCount: parseInt(r.account_count, 10) })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/ip-security/ips?search=&page=
// `search` matches either an IP address directly, or a user's email/account
// number/name — in the latter case we return the IPs that user has used.
router.get("/admin/ip-security/ips", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || "").trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let matchingIps: string[] | null = null;
    if (search) {
      // If the search term isn't a plausible IP fragment, treat it as a user search.
      const looksLikeIp = /^[0-9a-fA-F:.]+$/.test(search) && (search.includes(".") || search.includes(":"));
      if (!looksLikeIp) {
        const userMatch = await pool.query(
          `SELECT DISTINCT ie.ip_address FROM ip_events ie
           JOIN users u ON u.id = ie.user_id
           WHERE LOWER(u.email) LIKE $1 OR u.account_number LIKE $1 OR LOWER(u.name) LIKE $1`,
          [`%${search.toLowerCase()}%`]
        );
        matchingIps = userMatch.rows.map(r => r.ip_address);
      }
    }

    const where: string[] = [];
    const params: any[] = [];
    if (matchingIps) {
      params.push(matchingIps);
      const arrIdx = params.length;
      if (/^[0-9a-fA-F]+$/.test(search)) {
        // A short numeric/hex term can be an account number or an IP fragment — match both.
        params.push(`%${search}%`);
        where.push(`(a.ip_address = ANY($${arrIdx}) OR a.ip_address ILIKE $${params.length})`);
      } else {
        where.push(`a.ip_address = ANY($${arrIdx})`);
      }
    } else if (search) {
      params.push(`%${search}%`);
      where.push(`a.ip_address ILIKE $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await pool.query(`SELECT COUNT(*) FROM ip_addresses a ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const dataParams = [...params, pageSize, offset];
    const rows = await pool.query(
      `SELECT
         a.ip_address, a.country, a.country_code, a.city, a.is_proxy_or_vpn,
         a.first_seen_at, a.last_seen_at,
         (SELECT COUNT(*) FROM ip_events e WHERE e.ip_address = a.ip_address) AS event_count,
         (SELECT COUNT(DISTINCT e.user_id) FROM ip_events e WHERE e.ip_address = a.ip_address AND e.user_id IS NOT NULL) AS account_count,
         EXISTS(SELECT 1 FROM ip_bans b WHERE b.ip_address = a.ip_address AND b.unbanned_at IS NULL) AS is_banned,
         EXISTS(SELECT 1 FROM ip_whitelist w WHERE w.ip_address = a.ip_address) AS is_whitelisted
       FROM ip_addresses a
       ${whereSql}
       ORDER BY a.last_seen_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: rows.rows.map(r => ({
        ipAddress: r.ip_address,
        country: r.country,
        countryCode: r.country_code,
        city: r.city,
        isProxyOrVpn: r.is_proxy_or_vpn,
        firstSeenAt: r.first_seen_at,
        lastSeenAt: r.last_seen_at,
        eventCount: parseInt(r.event_count, 10),
        accountCount: parseInt(r.account_count, 10),
        isBanned: r.is_banned,
        isWhitelisted: r.is_whitelisted,
      })),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
