-- Skema Helpdesk IT (PostgreSQL / Supabase). Aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  password   TEXT NOT NULL,                 -- hash bcrypt, tidak pernah dikirim ke klien
  role       VARCHAR(12) NOT NULL CHECK (role IN ('admin', 'superadmin')),
  divisi     VARCHAR(30) CHECK (divisi IN ('Operasional','HC-GA','Marketing','Finance')),
  pv         INT NOT NULL DEFAULT 0,        -- versi password; dinaikkan agar sesi lama otomatis tidak berlaku
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- admin wajib punya divisi, superadmin tidak terikat divisi
  CONSTRAINT users_role_divisi CHECK (
    (role = 'superadmin' AND divisi IS NULL) OR (role = 'admin' AND divisi IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS tickets (
  id             SERIAL PRIMARY KEY,
  kode_ticket    VARCHAR(20) NOT NULL UNIQUE,   -- acak, mis. TKT-7K3QX92M (tidak bisa ditebak)
  alamat         VARCHAR(30) NOT NULL
                 CHECK (alamat IN ('Kantor Pusat','Soponyono','Menur','Jambangan','Sambikerep')),
  divisi         VARCHAR(30) NOT NULL
                 CHECK (divisi IN ('Operasional','HC-GA','Marketing','Finance')),
  urgensi        VARCHAR(10) NOT NULL CHECK (urgensi IN ('Low','Medium','High')),
  deskripsi      TEXT NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'Belum Diproses'
                 CHECK (status IN ('Belum Diproses','Diproses','Selesai')),
  catatan_admin  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_logs (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  admin_id    INT REFERENCES users(id) ON DELETE SET NULL,
  status_lama VARCHAR(20),
  status_baru VARCHAR(20) NOT NULL,
  catatan     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pembatas laju (anti brute-force & spam), dipakai karena Vercel bersifat serverless
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL
);

-- Migrasi: form tiket kini hanya alamat, divisi, urgensi, deskripsi.
-- Aman untuk database yang sudah dibuat dengan versi sebelumnya (kolom lama dihapus jika ada).
ALTER TABLE tickets DROP COLUMN IF EXISTS nama_pelapor;
ALTER TABLE tickets DROP COLUMN IF EXISTS kontak_pelapor;

CREATE INDEX IF NOT EXISTS idx_tickets_divisi_created ON tickets(divisi, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_logs_ticket     ON ticket_logs(ticket_id);

-- KEAMANAN: Supabase membuka tabel schema public lewat REST API (PostgREST).
-- Aplikasi ini TIDAK memakai REST API itu, jadi semua akses dari luar ditutup:
-- RLS aktif tanpa policy = role anon/authenticated tidak bisa membaca/menulis apa pun.
-- Koneksi aplikasi (role postgres, pemilik tabel) tetap bisa mengakses.
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE users, tickets, ticket_logs, rate_limits FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
  END IF;
END $$;
