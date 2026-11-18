import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query } from './db';

const IS_PROD = process.env.NODE_ENV === 'production';
// Awalan __Host- memaksa cookie hanya untuk domain ini, wajib Secure, dan path "/"
const COOKIE = IS_PROD ? '__Host-sid' : 'sid';
const MAX_AGE = 8 * 60 * 60; // 8 jam

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET wajib diisi minimal 32 karakter');
  return new TextEncoder().encode(s);
}

const cookieOpts = { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/' };

export async function createSession(user) {
  const token = await new SignJWT({ pv: user.pv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, { ...cookieOpts, maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).set(COOKIE, '', { ...cookieOpts, maxAge: 0 });
}

// Role & divisi SELALU dibaca ulang dari database, bukan dari token,
// sehingga perubahan role/divisi atau penghapusan akun langsung berlaku.
export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const id = Number.parseInt(payload.sub, 10);
    if (!Number.isInteger(id)) return null;
    const { rows } = await query(
      'SELECT id, nama, email, role, divisi, pv FROM users WHERE id = $1', [id]);
    const u = rows[0];
    if (!u || u.pv !== payload.pv) return null; // password diganti -> sesi lama dicabut
    return { id: u.id, nama: u.nama, email: u.email, role: u.role, divisi: u.divisi };
  } catch {
    return null;
  }
}

// Superadmin melihat semua divisi (null); admin dibatasi ke divisinya sendiri.
export const scopeDivisi = (session) => (session.role === 'superadmin' ? null : session.divisi);
