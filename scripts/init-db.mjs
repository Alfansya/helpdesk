// npm run db:init  -> menjalankan schema.sql
import fs from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL belum diisi di .env.local'); process.exit(1); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  console.log('Skema database berhasil dibuat.');
} catch (e) {
  console.error('Gagal membuat skema:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
