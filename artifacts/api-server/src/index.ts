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
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`);
    logger.info("DB migration: avatar_url column ensured");
  } catch (e: any) {
    logger.warn({ err: e.message }, "DB migration warning");
  }
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
