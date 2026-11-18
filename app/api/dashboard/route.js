import { api, json } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { DIVISI } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// "Aktif" = tiket berstatus Diproses
const COUNTS = `COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE t.status = 'Diproses')::int AS aktif,
  COUNT(*) FILTER (WHERE t.status = 'Belum Diproses')::int AS belum_diproses,
  COUNT(*) FILTER (WHERE t.status = 'Selesai')::int AS selesai`;

export const GET = api(['admin', 'superadmin'], async ({ session }) => {
  const sd = scopeDivisi(session);
  const params = sd ? [sd] : [];
  const w = sd ? 'WHERE t.divisi = $1' : '';

  const stats = await query(`SELECT ${COUNTS} FROM tickets t ${w}`, params);
  const recent = await query(
    `SELECT l.id, l.status_lama, l.status_baru, l.catatan, l.created_at,
            t.id AS ticket_id, t.kode_ticket, t.divisi, t.urgensi, a.nama AS admin_nama
     FROM ticket_logs l
     JOIN tickets t ON t.id = l.ticket_id
     LEFT JOIN users a ON a.id = l.admin_id
     ${w} ORDER BY l.created_at DESC, l.id DESC LIMIT 8`, params);

  let perDivisi = null;
  if (!sd) {
    const r = await query(`SELECT t.divisi, ${COUNTS} FROM tickets t GROUP BY t.divisi`);
    const map = Object.fromEntries(r.rows.map((x) => [x.divisi, x]));
    perDivisi = DIVISI.map((d) => map[d] || { divisi: d, total: 0, aktif: 0, belum_diproses: 0, selesai: 0 });
  }
  return json({ stats: stats.rows[0], recent: recent.rows, perDivisi });
});
