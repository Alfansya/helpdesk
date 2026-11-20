'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { StatusBadge, UrgencyBadge } from '@/components/Badges';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { DIVISI, STATUS, URGENSI, fmtDate } from '@/lib/constants';

const LIMIT = 10;

export default function Tickets() {
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';
  const [filters, setFilters] = useState({ q: '', status: '', divisi: '', urgensi: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, q })); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const p = new URLSearchParams({ page });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    setError('');
    api.get(`/tickets?${p}`).then(setRes).catch((e) => setError(e.message));
  }, [filters, page, tick]);

  const setF = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };
  const reset = () => { setQ(''); setFilters({ q: '', status: '', divisi: '', urgensi: '' }); setPage(1); };
  const hasFilter = q || filters.status || filters.divisi || filters.urgensi;
  const pages = res ? Math.max(Math.ceil(res.total / LIMIT), 1) : 1;
  const cols = isSuper ? 7 : 5;

  const remove = async (t) => {
    if (!window.confirm(`Hapus tiket ${t.kode_ticket}?\n\nRiwayat penanganan ikut terhapus dan tidak dapat dikembalikan.`)) return;
    setError(''); setBusyId(t.id);
    try {
      await api.del(`/tickets/${t.id}`);
      // Baris terakhir di halaman ini terhapus -> mundur satu halaman.
      if (res?.data.length === 1 && page > 1) setPage(page - 1);
      else setTick((n) => n + 1);
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  if (!user) return <div className="boot">Memuat…</div>;

  return (
    <AppShell title={isSuper ? 'Semua tiket' : `Tiket divisi ${user?.divisi || ''}`}>
      <div className="filters">
        <input type="search" placeholder="Cari kode atau keluhan"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari tiket" />
        <select value={filters.status} onChange={setF('status')} aria-label="Filter status">
          <option value="">Semua status</option>{STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
        {isSuper && (
          <select value={filters.divisi} onChange={setF('divisi')} aria-label="Filter divisi">
            <option value="">Semua divisi</option>{DIVISI.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <select value={filters.urgensi} onChange={setF('urgensi')} aria-label="Filter urgensi">
          <option value="">Semua urgensi</option>{URGENSI.map((s) => <option key={s}>{s}</option>)}
        </select>
        {hasFilter && <button className="btn" onClick={reset}>Reset</button>}
      </div>

      {error && <div className="alert err">{error}</div>}
      <div className="panel flush">
        <div className="tablewrap">
          <table className="table-cards">
            <thead>
              <tr>
                <th>Kode</th><th>Alamat</th>{isSuper && <th>Divisi</th>}
                <th>Urgensi</th><th>Status</th><th>Dibuat</th>{isSuper && <th></th>}
              </tr>
            </thead>
            <tbody>
              {!res && !error && <tr><td colSpan={cols} className="empty">Memuat data…</td></tr>}
              {res && res.data.length === 0 && (
                <tr><td colSpan={cols} className="empty">
                  {hasFilter ? 'Tidak ada tiket yang cocok dengan filter.' : 'Belum ada tiket.'}
                </td></tr>
              )}
              {res?.data.map((t) => (
                <tr key={t.id}>
                  <td data-label="Kode"><Link className="code" href={`/tickets/${t.id}`}>{t.kode_ticket}</Link></td>
                  <td data-label="Alamat">{t.alamat}</td>{isSuper && <td data-label="Divisi">{t.divisi}</td>}
                  <td data-label="Urgensi"><UrgencyBadge urgensi={t.urgensi} /></td>
                  <td data-label="Status"><StatusBadge status={t.status} /></td>
                  <td data-label="Dibuat" className="nowrap">{fmtDate(t.created_at)}</td>
                  {isSuper && (
                    <td className="right nowrap td-actions">
                      <button className="btn sm danger" disabled={busyId === t.id} onClick={() => remove(t)}>
                        {busyId === t.id ? 'Menghapus…' : 'Hapus'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {res && res.total > 0 && (
        <div className="pager">
          <span className="muted small">{res.total} tiket · halaman {page} dari {pages}</span>
          <div className="row">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
            <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Berikutnya</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
