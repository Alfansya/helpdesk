import { NextResponse } from 'next/server';
import { getSession, destroySession } from './auth';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const NO_STORE = { 'Cache-Control': 'no-store' };
export const json = (data, status = 200) => NextResponse.json(data, { status, headers: NO_STORE });

export function clientIp(req) {
  // Vercel menimpa x-forwarded-for dengan IP klien yang sebenarnya
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// Perlindungan CSRF berlapis: cookie SameSite=Lax + cek Origin + wajib JSON
function assertSameOrigin(req) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  let ok = false;
  try { ok = !!origin && new URL(origin).host === host; } catch { ok = false; }
  if (!ok) throw new HttpError(403, 'Permintaan ditolak.');
}

export async function readJson(req, maxBytes = 20_000) {
  if (!(req.headers.get('content-type') || '').includes('application/json')) {
    throw new HttpError(415, 'Format data tidak didukung.');
  }
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'Data terlalu besar.');
  const text = await req.text().catch(() => '');
  if (text.length > maxBytes) throw new HttpError(413, 'Data terlalu besar.');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'Data tidak valid.');
  }
}

/**
 * Pembungkus semua route API.
 * roles = null  -> publik
 * roles = [...] -> wajib login dengan salah satu role tersebut
 */
export function api(roles, handler) {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) assertSameOrigin(req);
      let session = null;
      if (roles) {
        session = await getSession();
        if (!session) {
          await destroySession();
          throw new HttpError(401, 'Silakan login terlebih dahulu.');
        }
        if (!roles.includes(session.role)) throw new HttpError(403, 'Anda tidak memiliki akses.');
      }
      const params = ctx?.params ? await ctx.params : {};
      return await handler({ req, session, params });
    } catch (e) {
      if (e instanceof HttpError) return json({ message: e.message }, e.status);
      console.error(e); // detail error hanya ke log server, tidak ke klien
      return json({ message: 'Terjadi kesalahan pada server.' }, 500);
    }
  };
}
