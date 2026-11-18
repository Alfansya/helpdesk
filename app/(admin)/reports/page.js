'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const qs = () => {
    const p = new URLSearchParams();
    if (range.from) p.set('from', range.from);
    if (range.to) p.set('to', range.to);
    return p;
  };

  useEffect(() => {
    setError('');
    api.get(`/reports/summary?${qs()}`).then(setData).catch((e) => setError(e.message));
  }, [range]); // eslint-disable-line

  const exportAs = async (format) => {
    setBusy(format); setError('');
    try {
      const p = qs(); p.set('format', format);
      await api.download(`/reports/export?${p}`, `laporan-tiket.${format}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const r = data?.ringkasan;
  const sum = (k) => data ? data.rekap.reduce((a, x) => a + x[k], 0) : 0;

  return (
    <AppShell title="Laporan"
      actions={
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={() => exportAs('xlsx')}>{busy === 'xlsx' ? 'Menyiapkan…' : 'Ekspor Excel'}</button>
          <button className="btn" disabled={!!busy} onClick={() => exportAs('pdf')}>{busy === 'pdf' ? 'Menyiapkan…' : 'Ekspor PDF'}</button>
        </div>
      }>
      <div className="filters">
        <label className="inline">Dari
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </label>
        <label className="inline">Sampai
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </label>
        {(range.from || range.to) && <button className="btn" onClick={() => setRange({ from: '', to: '' })}>Semua periode</button>}
      </div>

      {error && <div className="alert err" role="alert">{error}</div>}
      {!data && !error && <p className="muted">Memuat data…</p>}
      {data && (
        <>
          <section className="stats">
            <div className="stat"><div className="stat-v">{r.total}</div><div className="stat-l">Total tiket</div></div>
            <div className="stat"><div className="stat-v c-selesai">{r.selesai}</div><div className="stat-l">Selesai ({r.persen_selesai}%)</div></div>
            <div className="stat"><div className="stat-v c-belum">{r.belum_selesai}</div><div className="stat-l">Belum selesai</div></div>
            <div className="stat">
              <div className="stat-v">{r.rata_rata_jam_penyelesaian == null ? '-' : `${r.rata_rata_jam_penyelesaian} jam`}</div>
              <div className="stat-l">Rata-rata waktu penyelesaian</div>
            </div>
          </section>

          <section className="panel flush">
            <div className="tablewrap">
              <table>
                <thead><tr><th>Divisi</th><th>Total</th><th>Belum diproses</th><th>Diproses</th><th>Selesai</th></tr></thead>
                <tbody>
                  {data.rekap.map((x) => (
                    <tr key={x.divisi}><td>{x.divisi}</td><td>{x.total}</td><td>{x.belum_diproses}</td><td>{x.diproses}</td><td>{x.selesai}</td></tr>
                  ))}
                  <tr className="sumrow"><td>Total</td><td>{sum('total')}</td><td>{sum('belum_diproses')}</td><td>{sum('diproses')}</td><td>{sum('selesai')}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
