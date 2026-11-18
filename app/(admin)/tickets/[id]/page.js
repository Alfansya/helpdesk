'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { StatusBadge, UrgencyBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { STATUS, fmtDate } from '@/lib/constants';

export default function TicketDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [catatan, setCatatan] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get(`/tickets/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const t = data?.ticket;
  const next = t ? STATUS[STATUS.indexOf(t.status) + 1] : null;

  const advance = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      await api.patch(`/tickets/${id}/status`, { status: next, catatan });
      setCatatan(''); setMsg(`Status diubah menjadi “${next}”.`);
      load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <AppShell
      title={t ? t.kode_ticket : 'Detail tiket'}
      actions={<Link className="btn" href="/tickets">Kembali ke daftar</Link>}
    >
      {error && <div className="alert err" role="alert">{error}</div>}
      {msg && <div className="alert ok" role="status">{msg}</div>}
      {!t && !error && <p className="muted">Memuat data…</p>}
      {t && (
        <div className="detail">
          <div>
            <section className="panel">
              <div className="row spread">
                <h2>Informasi tiket</h2>
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
              {t.catatan_admin && (<><h3>Catatan admin terakhir</h3><p className="pre">{t.catatan_admin}</p></>)}
            </section>

            <section className="panel">
              <h2>Update status</h2>
              {next ? (
                <>
                  <p className="muted small">Status saat ini “{t.status}”. Langkah berikutnya: “{next}”.</p>
                  <label>Catatan untuk pelapor (opsional)
                    <textarea rows={3} value={catatan} maxLength={1000} onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Catatan ini tampil di halaman cek status tiket" />
                  </label>
                  <button className="btn primary" onClick={advance} disabled={busy} style={{ marginTop: '.75rem' }}>
                    {busy ? 'Menyimpan…' : next === 'Diproses' ? 'Mulai proses' : 'Tandai selesai'}
                  </button>
                </>
              ) : <p className="muted">Tiket ini sudah selesai.</p>}
            </section>
          </div>

          <section className="panel">
            <h2>Riwayat penanganan</h2>
            <ol className="timeline">
              {data.logs.map((l) => (
                <li key={l.id}>
                  <div><strong>{l.status_lama ? `${l.status_lama} → ${l.status_baru}` : l.status_baru}</strong></div>
                  {l.catatan && <div>{l.catatan}</div>}
                  <div className="muted small">{fmtDate(l.created_at)}{l.admin_nama && <> · {l.admin_nama}</>}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </AppShell>
  );
}
