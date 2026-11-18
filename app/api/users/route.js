import bcrypt from 'bcryptjs';
import { api, json, readJson, HttpError } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { parseUser } from '@/lib/server/userInput';

export const dynamic = 'force-dynamic';

// Hanya SUPERADMIN yang boleh mengelola akun admin
export const GET = api(['superadmin'], async () => {
  const { rows } = await query(
    'SELECT id, nama, email, role, divisi, created_at FROM users ORDER BY role DESC, divisi NULLS FIRST, nama');
  return json({ data: rows });
});

export const POST = api(['superadmin'], async ({ req }) => {
  const u = parseUser(await readJson(req), { passwordRequired: true });
  const hash = await bcrypt.hash(u.password, 12);
  try {
    const { rows } = await query(
      `INSERT INTO users (nama, email, password, role, divisi) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nama, email, role, divisi, created_at`,
      [u.nama, u.email, hash, u.role, u.divisi]);
    return json({ user: rows[0] }, 201);
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Email sudah terdaftar.');
    throw e;
  }
});
