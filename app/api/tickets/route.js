import crypto from 'node:crypto';
import { api, json, readJson, clientIp, HttpError } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { query, tx } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { text, oneOf, likeEscape } from '@/lib/server/validate';
import { ALAMAT, DIVISI, URGENSI, STATUS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // tanpa 0/O/1/I agar mudah dibaca
const genKode = () =>
  'TKT-' + Array.from({ length: 8 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

// PUBLIK: pelapor membuat tiket tanpa login
export const POST = api(null, async ({ req }) => {
  const body = await readJson(req);

  // Honeypot: kolom tersembunyi yang hanya diisi bot. Pura-pura sukses, tidak disimpan.
  if (body.website) return json({ kode: genKode() }, 201);

  await rateLimit(`ticket:${clientIp(req)}`, 6, 600); // 6 tiket / 10 menit / IP

  const alamat = oneOf(body.alamat, ALAMAT, 'Alamat');
  const divisi = oneOf(body.divisi, DIVISI, 'Divisi');
  const urgensi = oneOf(body.urgensi, URGENSI, 'Urgensi');
  const deskripsi = text(body.deskripsi, { label: 'Deskripsi keluhan', max: 2000 });

  const kode = await tx(async (c) => {
    for (let i = 0; i < 5; i++) {
      const k = genKode();
      const r = await c.query(
        `INSERT INTO tickets (kode_ticket, alamat, divisi, urgensi, deskripsi)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (kode_ticket) DO NOTHING RETURNING id`,
        [k, alamat, divisi, urgensi, deskripsi]);
      if (r.rowCount) {
        await c.query(
          `INSERT INTO ticket_logs (ticket_id, admin_id, status_lama, status_baru, catatan)
           VALUES ($1, NULL, NULL, 'Belum Diproses', 'Tiket dibuat')`, [r.rows[0].id]);
        return k;
      }
    }
    throw new HttpError(500, 'Gagal membuat tiket. Silakan coba lagi.');
  });
  return json({ kode }, 201);
});

const COLS = `t.id, t.kode_ticket, t.alamat, t.divisi, t.urgensi,
              t.deskripsi, t.status, t.catatan_admin, t.created_at, t.updated_at`;

// ADMIN: daftar tiket. Admin hanya melihat divisinya; superadmin melihat semua.
export const GET = api(['admin', 'superadmin'], async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const page = Math.min(Math.max(parseInt(sp.get('page')) || 1, 1), 100000);
  const limit = 10;

  const where = [];
  const params = [];
  const add = (sql, val) => { params.push(val); where.push(sql.replace('?', `$${params.length}`)); };

  const sd = scopeDivisi(session);
  if (sd) add('t.divisi = ?', sd);
  else if (DIVISI.includes(sp.get('divisi'))) add('t.divisi = ?', sp.get('divisi'));
  if (STATUS.includes(sp.get('status'))) add('t.status = ?', sp.get('status'));
  if (URGENSI.includes(sp.get('urgensi'))) add('t.urgensi = ?', sp.get('urgensi'));
  const q = (sp.get('q') || '').trim().slice(0, 100);
  if (q) {
    params.push(`%${likeEscape(q)}%`);
    const i = params.length;
    where.push(`(t.kode_ticket ILIKE $${i} OR t.deskripsi ILIKE $${i})`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await query(`SELECT COUNT(*)::int AS n FROM tickets t ${w}`, params);
  const list = await query(
    `SELECT ${COLS} FROM tickets t ${w} ORDER BY t.created_at DESC
     LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
  return json({ data: list.rows, total: count.rows[0].n, page, limit });
});
