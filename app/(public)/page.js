'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Turnstile from '@/components/Turnstile';
import { api } from '@/lib/api';
import { ALAMAT, DIVISI, URGENSI } from '@/lib/constants';

const EMPTY = { alamat: '', divisi: '', urgensi: 'Low', deskripsi: '', website: '' };
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
// Di production CAPTCHA wajib. Tanpa site key, form tidak boleh dipakai.
const CAPTCHA_MISSING = !SITE_KEY && process.env.NODE_ENV === 'production';

export default function BuatTiket() {
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [kode, setKode] = useState('');
  const [copied, setCopied] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (SITE_KEY && !captchaToken) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post('/tickets', { ...f, captchaToken });
      setKode(r.kode);
      setF(EMPTY);
      setCaptchaToken('');
    } catch (err) {
      setError(err.message);
      // Token CAPTCHA sekali pakai; minta token baru setelah gagal.
      captchaRef.current?.reset();
      setCaptchaToken('');
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(kode); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (kode) {
    return (
      <PublicShell>
        <section className="panel kode-box" role="status">
          <h1>Tiket terkirim</h1>
          <p className="muted">Simpan kode tiket ini. Anda membutuhkannya untuk melihat status penanganan.</p>
          <div className="kode">{kode}</div>
          <div className="row">
            <button className="btn" onClick={copy}>{copied ? 'Tersalin' : 'Salin kode'}</button>
            <Link className="btn primary" href={`/cek-tiket?kode=${encodeURIComponent(kode)}`}>Lihat status tiket</Link>
            <button className="btn" onClick={() => { setKode(''); setError(''); setCaptchaToken(''); }}>Buat tiket lain</button>
          </div>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="pub-head">
        <h1>Laporkan gangguan</h1>
        <p>Isi form di bawah. Tiket akan diteruskan ke admin divisi Anda. Tidak perlu login.</p>
      </div>
      <form className="panel form" onSubmit={submit}>
        {error && <div className="alert err" role="alert">{error}</div>}
        {CAPTCHA_MISSING && (
          <div className="alert err" role="alert">
            Form belum siap: CAPTCHA belum dikonfigurasi. Hubungi admin.
          </div>
        )}
        <div className="grid2">
          <label>Alamat
            <select value={f.alamat} onChange={set('alamat')} required>
              <option value="" disabled>Pilih alamat</option>
              {ALAMAT.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label>Divisi
            <select value={f.divisi} onChange={set('divisi')} required>
              <option value="" disabled>Pilih divisi</option>
              {DIVISI.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <label>Urgensi
          <select value={f.urgensi} onChange={set('urgensi')}>
            {URGENSI.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label>Deskripsi keluhan
          <textarea rows={6} value={f.deskripsi} onChange={set('deskripsi')} required maxLength={2000}
            placeholder="Jelaskan masalah yang terjadi, kapan mulai terjadi, dan perangkat yang terdampak." />
        </label>
        {/* Honeypot anti-bot: tersembunyi dari manusia */}
        <div className="hp" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
        </div>
        {SITE_KEY && (
          <div className="captcha">
            <Turnstile
              ref={captchaRef}
              siteKey={SITE_KEY}
              onVerify={(token) => { setCaptchaToken(token); setError(''); }}
              onExpire={() => setCaptchaToken('')}
              onError={() => {
                setCaptchaToken('');
                setError('Verifikasi keamanan gagal dimuat. Muat ulang halaman lalu coba lagi.');
              }}
            />
            <p className="muted small">Verifikasi keamanan untuk mencegah pengiriman otomatis.</p>
          </div>
        )}
        <p className="muted small">Status awal tiket adalah “Belum Diproses”. Kode tiket dibuat otomatis setelah dikirim.</p>
        <div className="row">
          <button className="btn primary" disabled={busy || CAPTCHA_MISSING || Boolean(SITE_KEY && !captchaToken)}>
            {busy ? 'Mengirim…' : 'Kirim tiket'}
          </button>
        </div>
      </form>
    </PublicShell>
  );
}
