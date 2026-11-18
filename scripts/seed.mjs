// npm run db:seed -> membuat akun dari seed-accounts.json (file ini TIDAK ikut ke Git).
// Jika "password" dikosongkan, dibuat password acak dan ditampilkan SEKALI di terminal.
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const DIVISI = ['Operasional', 'HC-GA', 'Marketing', 'Finance'];
const file = new URL('../seed-accounts.json', import.meta.url);

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL belum diisi di .env.local'); process.exit(1); }
if (!fs.existsSync(file)) {
  console.error('seed-accounts.json tidak ditemukan. Salin dari seed-accounts.example.json lalu sesuaikan nama/email.');
  process.exit(1);
}

const accounts = JSON.parse(fs.readFileSync(file, 'utf8'));
const emails = new Set();
for (const a of accounts) {
  const email = String(a.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Email tidak valid: ${a.email}`);
  if (emails.has(email)) throw new Error(`Email dobel: ${email}`);
  emails.add(email);
  if (!a.nama) throw new Error(`Nama kosong untuk ${email}`);
  if (a.role === 'admin' && !DIVISI.includes(a.divisi)) throw new Error(`Admin ${email} butuh divisi salah satu dari: ${DIVISI.join(', ')}`);
  if (a.role === 'superadmin' && a.divisi) throw new Error(`Superadmin ${email} tidak boleh punya divisi`);
  if (!['admin', 'superadmin'].includes(a.role)) throw new Error(`Role tidak valid untuk ${email}`);
  if (a.password && a.password.length < 10) throw new Error(`Password ${email} minimal 10 karakter`);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const created = [];
try {
  await client.connect();
  for (const a of accounts) {
    const email = a.email.trim().toLowerCase();
    const plain = a.password || crypto.randomBytes(12).toString('base64url');
    const hash = await bcrypt.hash(plain, 12);
    const r = await client.query(
      `INSERT INTO users (nama, email, password, role, divisi) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING RETURNING id`,
      [a.nama.trim(), email, hash, a.role, a.role === 'admin' ? a.divisi : null]
    );
    if (r.rowCount) created.push({ email, role: a.role, divisi: a.divisi || '-', password: plain });
    else console.log(`Dilewati (sudah ada): ${email}`);
  }
} finally {
  await client.end();
}

if (created.length) {
  console.log('\nAkun dibuat. SIMPAN password ini sekarang, tidak akan ditampilkan lagi:\n');
  console.table(created);
  console.log('Minta tiap admin mengganti password lewat Superadmin > Manajemen admin.');
}
