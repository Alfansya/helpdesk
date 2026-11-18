import bcrypt from 'bcryptjs';
import { api, json, readJson, clientIp, HttpError } from '@/lib/server/http';
import { createSession } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { rateLimit, resetRateLimit, hash } from '@/lib/server/ratelimit';

// Hash palsu agar waktu respons sama baik email ada maupun tidak (cegah user enumeration)
const DUMMY_HASH = bcrypt.hashSync('tidak-dipakai', 12);

export const POST = api(null, async ({ req }) => {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 150);
  const password = String(body.password || '').slice(0, 200);
  if (!email || !password) throw new HttpError(400, 'Email dan password wajib diisi.');

  const emailKey = `login-email:${hash(email)}`;
  await rateLimit(`login-ip:${clientIp(req)}`, 30, 900); // 30 percobaan / 15 menit / IP
  await rateLimit(emailKey, 8, 900);                      // 8 percobaan / 15 menit / akun

  const { rows } = await query(
    'SELECT id, nama, email, role, divisi, pv, password FROM users WHERE lower(email) = $1', [email]);
  const u = rows[0];
  const ok = await bcrypt.compare(password, u ? u.password : DUMMY_HASH);
  if (!u || !ok) throw new HttpError(401, 'Email atau password salah.');

  await createSession(u);
  await resetRateLimit(emailKey);
  return json({ user: { id: u.id, nama: u.nama, email: u.email, role: u.role, divisi: u.divisi } });
});
