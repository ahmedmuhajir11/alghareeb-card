import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty, ensureCriticalSections } from "./seed";
import { recoverDataIfNeeded, ensureItemLogos } from "./recoverData";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run lightweight schema migrations on startup (idempotent)
async function runMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`,
    `ALTER TABLE slider_images ADD COLUMN IF NOT EXISTS link_url TEXT`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS welcome_message TEXT NOT NULL DEFAULT 'تنبيه هام: قبل إرسال أي مبلغ، تأكد دائماً من بيانات طريقة الدفع الحالية في صفحة (إضافة رصيد). معلومات الدفع قد تتغير في أي وقت، لا ترسل لأي بيانات قديمة محفوظة عندك.'`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_omr DOUBLE PRECISION NOT NULL DEFAULT 0.385`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_mad DOUBLE PRECISION NOT NULL DEFAULT 10.0`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_dzd DOUBLE PRECISION NOT NULL DEFAULT 135.0`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_ils DOUBLE PRECISION NOT NULL DEFAULT 3.7`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_iqd DOUBLE PRECISION NOT NULL DEFAULT 1310.0`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS usd_to_sar DOUBLE PRECISION NOT NULL DEFAULT 3.75`,
  ];
  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (e: any) {
      logger.warn({ err: e.message }, "DB migration warning");
    }
  }
  logger.info("DB migrations completed");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  runMigrations().catch((e) => {
    logger.error({ err: e }, "runMigrations failed");
  });

  ensureCriticalSections().catch((e) => {
    logger.error({ err: e }, "ensureCriticalSections failed");
  });

  seedIfEmpty()
    .then(async () => {
      await recoverDataIfNeeded().catch((e) => {
        logger.error({ err: e }, "Data recovery failed");
      });
      await ensureItemLogos().catch((e) => {
        logger.error({ err: e }, "Logo restore failed");
      });
    })
    .catch((e) => {
      logger.error({ err: e }, "Seed failed");
    });
});
