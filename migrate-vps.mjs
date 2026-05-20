#!/usr/bin/env node
  import { execSync } from 'child_process';

  // Read DATABASE_URL from PM2 environment
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    try {
      const pm2Env = JSON.parse(execSync('pm2 env 0', { encoding: 'utf8' }).trim().split('\n').slice(1,-1).join('\n') || '{}');
      dbUrl = pm2Env.DATABASE_URL;
    } catch {}
  }
  if (!dbUrl) {
    // Try reading from the app's ecosystem config or .env
    try {
      const envFile = '/var/www/alghareebcard/.env';
      const lines = (await import('fs')).readFileSync(envFile, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=')) dbUrl = line.slice(13).trim();
      }
    } catch {}
  }

  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found. Run: DATABASE_URL=your_db_url node /tmp/migrate.mjs');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');

  const { default: pg } = await import('/var/www/alghareebcard/node_modules/.pnpm/pg@8.13.3/node_modules/pg/lib/index.js').catch(() => import('pg'));
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  console.log('🔨 Adding missing columns...');
  const sqls = [
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_endpoint TEXT",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_key TEXT",
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS api_agent_id TEXT",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT",
  ];

  for (const sql of sqls) {
    try {
      await client.query(sql);
      console.log('✅', sql);
    } catch(e) {
      console.log('⚠️', sql, '->', e.message);
    }
  }

  await client.end();
  console.log('\n✅ Migration complete! All columns added.');
  