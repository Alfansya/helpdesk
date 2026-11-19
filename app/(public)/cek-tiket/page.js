'use client';
import { useEffect, useState } from 'react';
import PublicShell from '@/components/PublicShell';
import { StatusBadge, UrgencyBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/constants';

export default function CekTiket() {
  const [kode, setKode] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lookup = async (k) => {
    setError(''); setData(null); setBusy(true);
    try { setData(await api.get(`/track?kode=${encodeURIComponent(k.trim())}`)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('kode');
    if (k) { setKode(k); lookup(k); }
  }, []);

  const submit = (e) => { e.preventDefault(); lookup(kode); };
  const t = data?.ticket;

  return (
    <PublicShell>
      <div className="pub-head">
        <h1>Cek status tiket</h1>
        <p>Masukkan kode tiket yang Anda terima setelah mengirim laporan.</p>
      </div>
      <form className="filters" onSubmit={submit}>
        <input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="TKT01-191126"
          aria-label="Kode tiket" maxLength={20} required style={{ flex: '1 1 240px', width: 'auto' }} />
        <button className="btn primary" disabled={busy}>{busy ? 'Mencari…' : 'Cek status'}</button>
      </form>

      {error && <div className="alert err" role="alert">{error}</div>}
      {t && (
        <div className="detail pubdetail">
          <section className="panel">
            <div className="row spread">
              <h2>{t.kode_ticket}</h2>
              <StatusBadge status={t.status} />
            </div>
            <dl className="kv">
              <dt>Alamat</dt><dd>{t.alamat}</dd>
              <dt>Divisi</dt><dd>{t.divisi}</dd>
              <dt>Urgensi</dt><dd><UrgencyBadge urgensi={t.urgensi} /></dd>
              <dt>Dibuat</dt><dd>{fmtDate(t.created_at)}</dd>
              <dt>Diperbarui</dt><dd>{fmtDate(t.updated_at)}</dd>
            </dl>
            <h3>Deskripsi keluhan</h3>
            <p className="pre">{t.deskripsi}</p>
            {t.catatan_admin && (<><h3>Catatan dari admin</h3><p className="pre">{t.catatan_admin}</p></>)}
          </section>
          <section className="panel">
            <h2>Riwayat penanganan</h2>
            <ol className="timeline">
              {data.logs.map((l, i) => (
                <li key={i}>
                  <div><strong>{l.status_lama ? `${l.status_lama} → ${l.status_baru}` : l.status_baru}</strong></div>
                  {l.catatan && <div>{l.catatan}</div>}
                  <div className="muted small">{fmtDate(l.created_at)}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </PublicShell>
  );
}
