import { api, json, clientIp, HttpError } from '@/lib/server/http';
import { query } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { KODE_RE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// PUBLIK: cek status tiket dengan kode acak. Tidak menampilkan nama/kontak pelapor maupun nama admin.
export const GET = api(null, async ({ req }) => {
  await rateLimit(`track:${clientIp(req)}`, 30, 600); // cegah tebak-tebakan kode
  const kode = (new URL(req.url).searchParams.get('kode') || '').trim().toUpperCase();
  // Cek panjang dulu agar regex tidak pernah menerima input panjang.
  if (kode.length < 12 || kode.length > 20 || !KODE_RE.test(kode)) {
    throw new HttpError(400, 'Format kode tiket tidak valid. Contoh: TKT01-191126');
  }

  const { rows } = await query(
    `SELECT id, kode_ticket, alamat, divisi, urgensi, deskripsi, status, catatan_admin, created_at, updated_at
     FROM tickets WHERE kode_ticket = $1`, [kode]);
  const t = rows[0];
  if (!t) throw new HttpError(404, 'Tiket tidak ditemukan. Periksa kembali kodenya.');

  const logs = await query(
    `SELECT status_lama, status_baru, catatan, created_at FROM ticket_logs
     WHERE ticket_id = $1 ORDER BY created_at ASC, id ASC`, [t.id]);
  const { id, ...ticket } = t; // eslint-disable-line no-unused-vars
  return json({ ticket, logs: logs.rows });
});
