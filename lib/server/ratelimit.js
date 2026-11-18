import crypto from 'node:crypto';
import { query } from './db';
import { HttpError } from './http';

export const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);

// Pembatas laju berbasis database (instance serverless tidak berbagi memori).
export async function rateLimit(key, limit, windowSec) {
  const { rows } = await query(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::int)
                    THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::int)
                           THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSec]);
  if (rows[0].count > limit) {
    throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  }
  // Bersih-bersih sesekali agar tabel tidak membengkak
  if (Math.random() < 0.01) {
    query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`).catch(() => {});
  }
}

export const resetRateLimit = (key) => query('DELETE FROM rate_limits WHERE key = $1', [key]);
