import { api, json, HttpError } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { positiveInt } from '@/lib/server/validate';

export const dynamic = 'force-dynamic';

export const GET = api(['admin', 'superadmin'], async ({ session, params }) => {
  const id = positiveInt(params.id);
  if (!id) throw new HttpError(404, 'Tiket tidak ditemukan.');
  const { rows } = await query(
    `SELECT id, kode_ticket, alamat, divisi, urgensi, deskripsi,
            status, catatan_admin, created_at, updated_at FROM tickets WHERE id = $1`, [id]);
  const t = rows[0];
  const sd = scopeDivisi(session);
  // Tiket divisi lain dijawab 404 (bukan 403) agar keberadaannya tidak terbongkar
  if (!t || (sd && t.divisi !== sd)) throw new HttpError(404, 'Tiket tidak ditemukan.');
  const logs = await query(
    `SELECT l.id, l.status_lama, l.status_baru, l.catatan, l.created_at, a.nama AS admin_nama
     FROM ticket_logs l LEFT JOIN users a ON a.id = l.admin_id
     WHERE l.ticket_id = $1 ORDER BY l.created_at ASC, l.id ASC`, [id]);
  return json({ ticket: t, logs: logs.rows });
});
