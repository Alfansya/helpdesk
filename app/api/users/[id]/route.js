import bcrypt from 'bcryptjs';
import { api, json, readJson, HttpError } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { positiveInt } from '@/lib/server/validate';
import { parseUser } from '@/lib/server/userInput';
import { createSession } from '@/lib/server/auth';

export const PUT = api(['superadmin'], async ({ req, session, params }) => {
  const id = positiveInt(params.id);
  if (!id) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  const u = parseUser(await readJson(req), { passwordRequired: false });
  if (id === session.id && u.role !== 'superadmin') {
    throw new HttpError(400, 'Anda tidak dapat menurunkan role akun Anda sendiri.');
  }
  try {
    // Ganti password / role / divisi -> pv naik -> semua sesi lama akun itu otomatis tidak berlaku
    const hash = u.password ? await bcrypt.hash(u.password, 12) : null;
    const { rows } = await query(
      `UPDATE users SET nama=$1, email=$2, role=$3::varchar, divisi=$4::varchar,
         password = COALESCE($5::text, password),
         pv = pv + CASE WHEN $5::text IS NOT NULL OR role <> $3::varchar OR divisi IS DISTINCT FROM $4::varchar THEN 1 ELSE 0 END
       WHERE id=$6 RETURNING id, nama, email, role, divisi, pv, created_at`,
      [u.nama, u.email, u.role, u.divisi, hash, id]);
    if (!rows[0]) throw new HttpError(404, 'Pengguna tidak ditemukan.');
    const { pv, ...user } = rows[0];
    // Ubah akun sendiri (mis. ganti password) menaikkan pv. Terbitkan sesi baru untuk
    // perangkat ini supaya superadmin tidak langsung ter-logout; sesi lain tetap dicabut.
    if (id === session.id) await createSession({ id: user.id, pv });
    return json({ user });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Email sudah terdaftar.');
    throw e;
  }
});

export const DELETE = api(['superadmin'], async ({ session, params }) => {
  const id = positiveInt(params.id);
  if (!id) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (id === session.id) throw new HttpError(400, 'Anda tidak dapat menghapus akun sendiri.');
  const r = await query('DELETE FROM users WHERE id = $1', [id]);
  if (!r.rowCount) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  return json({ ok: true });
});
