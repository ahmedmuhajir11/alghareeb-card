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
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS welcome_message_en TEXT NOT NULL DEFAULT 'Important: Before sending any amount, always verify the current payment method details on the (Add Balance) page. Payment information may change at any time — never send to old saved details.'`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS ticker_mode TEXT NOT NULL DEFAULT 'notifications'`,
    `ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE`,
    // ─── Dev Services tables (new, independent) ───────────────────────────────
    `CREATE TABLE IF NOT EXISTS dev_service_cards (
      id SERIAL PRIMARY KEY,
      service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('websites','mobile_apps')),
      name_ar VARCHAR(300) NOT NULL,
      name_en VARCHAR(300),
      description_ar TEXT,
      description_en TEXT,
      image_url TEXT,
      icon VARCHAR(100),
      price VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dev_service_cards_type ON dev_service_cards(service_type)`,
    `CREATE INDEX IF NOT EXISTS idx_dev_service_cards_active ON dev_service_cards(is_active)`,
    `CREATE TABLE IF NOT EXISTS dev_form_questions (
      id SERIAL PRIMARY KEY,
      service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('websites','mobile_apps')),
      title_ar VARCHAR(500) NOT NULL,
      title_en VARCHAR(500),
      question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single','multi','text','textarea','link','color','budget')),
      options JSONB NOT NULL DEFAULT '[]',
      is_required BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dev_form_questions_type ON dev_form_questions(service_type)`,
    `CREATE TABLE IF NOT EXISTS dev_settings (
      id INT PRIMARY KEY DEFAULT 1,
      whatsapp_number VARCHAR(50) NOT NULL DEFAULT '',
      websites_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      mobile_apps_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      websites_hero_title VARCHAR(300) DEFAULT 'تطوير وبرمجة المواقع',
      websites_hero_desc TEXT DEFAULT '',
      websites_hero_image TEXT DEFAULT '',
      mobile_apps_hero_title VARCHAR(300) DEFAULT 'تطوير وبرمجة تطبيقات الجوال',
      mobile_apps_hero_desc TEXT DEFAULT '',
      mobile_apps_hero_image TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS dev_project_requests (
      id SERIAL PRIMARY KEY,
      service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('websites','mobile_apps')),
      answers JSONB NOT NULL DEFAULT '{}',
      selected_service_card VARCHAR(300),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dev_requests_type ON dev_project_requests(service_type)`,
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
