import { api, json, readJson, HttpError } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { tx } from '@/lib/server/db';
import { oneOf, positiveInt, text } from '@/lib/server/validate';
import { STATUS } from '@/lib/constants';

// Belum Diproses -> Diproses -> Selesai (hanya maju satu langkah)
export const PATCH = api(['admin', 'superadmin'], async ({ req, session, params }) => {
  const id = positiveInt(params.id);
  if (!id) throw new HttpError(404, 'Tiket tidak ditemukan.');
  const body = await readJson(req);
  const status = oneOf(body.status, STATUS, 'Status');
  const catatan = text(body.catatan, { label: 'Catatan', max: 1000, optional: true });
  const sd = scopeDivisi(session);

  const ticket = await tx(async (c) => {
    const cur = await c.query('SELECT * FROM tickets WHERE id = $1 FOR UPDATE', [id]);
    const t = cur.rows[0];
    if (!t || (sd && t.divisi !== sd)) throw new HttpError(404, 'Tiket tidak ditemukan.');

    const idx = STATUS.indexOf(t.status);
    if (STATUS.indexOf(status) !== idx + 1) {
      throw new HttpError(400, STATUS[idx + 1]
        ? `Status harus berurutan. Setelah "${t.status}" hanya dapat diubah ke "${STATUS[idx + 1]}".`
        : 'Tiket sudah selesai.');
    }
    const upd = await c.query(
      `UPDATE tickets SET status = $1, catatan_admin = COALESCE($2, catatan_admin), updated_at = now()
       WHERE id = $3 RETURNING *`, [status, catatan, id]);
    await c.query(
      `INSERT INTO ticket_logs (ticket_id, admin_id, status_lama, status_baru, catatan)
       VALUES ($1,$2,$3,$4,$5)`, [id, session.id, t.status, status, catatan]);
    return upd.rows[0];
  });
  return json({ ticket });
});
