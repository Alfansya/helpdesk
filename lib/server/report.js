import { query } from './db';
import { DIVISI } from '@/lib/constants';

const isDate = (s) => typeof s === 'string' && s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Rekap per divisi + ringkasan penyelesaian. sd = divisi admin (null = semua divisi)
export async function buildReport(sd, from, to) {
  const params = [];
  const where = [];
  if (sd) { params.push(sd); where.push(`t.divisi = $${params.length}`); }
  if (isDate(from)) { params.push(from); where.push(`t.created_at >= $${params.length}::date`); }
  if (isDate(to)) { params.push(to); where.push(`t.created_at < ($${params.length}::date + 1)`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const per = await query(
    `SELECT t.divisi, COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE t.status = 'Belum Diproses')::int AS belum_diproses,
            COUNT(*) FILTER (WHERE t.status = 'Diproses')::int AS diproses,
            COUNT(*) FILTER (WHERE t.status = 'Selesai')::int AS selesai
     FROM tickets t ${w} GROUP BY t.divisi`, params);
  const byDiv = Object.fromEntries(per.rows.map((r) => [r.divisi, r]));
  const rekap = (sd ? [sd] : DIVISI).map(
    (d) => byDiv[d] || { divisi: d, total: 0, belum_diproses: 0, diproses: 0, selesai: 0 });

  const avg = await query(
    `SELECT AVG(EXTRACT(EPOCH FROM (l.created_at - t.created_at)) / 3600.0)::float AS jam
     FROM tickets t JOIN ticket_logs l ON l.ticket_id = t.id AND l.status_baru = 'Selesai' ${w}`, params);

  const total = rekap.reduce((a, r) => a + r.total, 0);
  const selesai = rekap.reduce((a, r) => a + r.selesai, 0);
  return {
    periode: { from: isDate(from) ? from : null, to: isDate(to) ? to : null },
    rekap,
    ringkasan: {
      total, selesai, belum_selesai: total - selesai,
      persen_selesai: total ? Math.round((selesai / total) * 1000) / 10 : 0,
      rata_rata_jam_penyelesaian: avg.rows[0].jam == null ? null : Math.round(avg.rows[0].jam * 10) / 10,
    },
  };
}
