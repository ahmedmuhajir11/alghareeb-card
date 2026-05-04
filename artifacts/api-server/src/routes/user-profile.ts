import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function mapRow(row: any) {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    phone: row.phone,
    phoneCode: row.phone_code,
    country: row.country,
    currency: row.currency,
    profileCompleted: row.profile_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/user-profile", async (req, res): Promise<void> => {
  const clerkUserId = req.headers["x-clerk-user-id"] as string | undefined;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await pool.query(
      "SELECT * FROM user_profiles WHERE clerk_user_id = $1 LIMIT 1",
      [clerkUserId]
    );
    if (result.rows.length === 0) {
      res.json({ profileCompleted: false, currency: null, country: null, phone: null, phoneCode: null });
      return;
    }
    res.json(mapRow(result.rows[0]));
  } catch (err: any) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Failed to get user profile" });
  }
});

router.post("/user-profile", async (req, res): Promise<void> => {
  const clerkUserId = req.headers["x-clerk-user-id"] as string | undefined;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { country, phone, phoneCode, currency } = req.body as {
    country?: string;
    phone?: string;
    phoneCode?: string;
    currency?: string;
  };

  if (!country || !phone || !currency) {
    res.status(400).json({ error: "country, phone and currency are required" });
    return;
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM user_profiles WHERE clerk_user_id = $1 LIMIT 1",
      [clerkUserId]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.profile_completed && row.currency && row.currency !== currency) {
        res.status(400).json({ error: "Currency is locked and cannot be changed after first save" });
        return;
      }

      const updated = await pool.query(
        `UPDATE user_profiles
         SET country=$1, phone=$2, phone_code=$3, currency=$4, profile_completed=true, updated_at=NOW()
         WHERE clerk_user_id=$5 RETURNING *`,
        [country, phone, phoneCode ?? null, currency, clerkUserId]
      );
      res.json(mapRow(updated.rows[0]));
    } else {
      const inserted = await pool.query(
        `INSERT INTO user_profiles (clerk_user_id, country, phone, phone_code, currency, profile_completed)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [clerkUserId, country, phone, phoneCode ?? null, currency]
      );
      res.json(mapRow(inserted.rows[0]));
    }
  } catch (err: any) {
    req.log.error({ err }, "Failed to save user profile");
    res.status(500).json({ error: "Failed to save user profile" });
  }
});

export default router;
