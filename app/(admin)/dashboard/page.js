'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { UrgencyBadge } from '@/components/Badges';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/constants';

const describe = (a) => (a.status_lama ? `${a.status_lama} → ${a.status_baru}` : 'Tiket dibuat');

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const isSuper = user?.role === 'superadmin';

  useEffect(() => { api.get('/dashboard').then(setData).catch((e) => setError(e.message)); }, []);

  if (!user) return <div className="boot">Memuat…</div>;

  const s = data?.stats;
  const items = s && [
    { label: 'Total tiket', v: s.total },
    { label: 'Belum diproses', v: s.belum_diproses, cls: 'c-belum' },
    { label: 'Aktif (diproses)', v: s.aktif, cls: 'c-proses' },
    { label: 'Selesai', v: s.selesai, cls: 'c-selesai' },
  ];

  return (
    <AppShell
      title={isSuper ? 'Dashboard' : `Dashboard · ${user?.divisi || ''}`}
      actions={<Link className="btn" href="/tickets">Lihat daftar tiket</Link>}
    >
      {error && <div className="alert err">{error}</div>}
      {!data && !error && <p className="muted">Memuat data…</p>}
      {data && (
        <>
          <section className="stats">
            {items.map((i) => (
              <div key={i.label} className="stat">
                <div className={`stat-v ${i.cls || ''}`}>{i.v}</div>
                <div className="stat-l">{i.label}</div>
              </div>
            ))}
          </section>

          {s.total > 0 && (
            <div className="bar" aria-label="Distribusi status">
              <span className="b-belum" style={{ flex: s.belum_diproses }} />
              <span className="b-proses" style={{ flex: s.aktif }} />
              <span className="b-selesai" style={{ flex: s.selesai }} />
            </div>
          )}

          {data.perDivisi && (
            <section className="panel flush">
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Divisi</th><th>Total</th><th>Belum diproses</th><th>Aktif</th><th>Selesai</th></tr></thead>
                  <tbody>
                    {data.perDivisi.map((d) => (
                      <tr key={d.divisi}>
                        <td>{d.divisi}</td><td>{d.total}</td><td>{d.belum_diproses}</td><td>{d.aktif}</td><td>{d.selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="panel">
            <h2>Aktivitas terbaru</h2>
            {data.recent.length === 0 ? (
              <p className="empty">Belum ada aktivitas.</p>
            ) : (
              <ul className="feed">
                {data.recent.map((a) => (
                  <li key={a.id}>
                    <div>
                      <Link href={`/tickets/${a.ticket_id}`} className="code">{a.kode_ticket}</Link>{' '}
                      <span>{describe(a)}</span>
                      {a.catatan && a.status_lama && <div className="muted small">Catatan: {a.catatan}</div>}
                      <div className="muted small">
                        {isSuper && <>{a.divisi}</>}
                        {a.admin_nama && <>{isSuper ? ' · ' : ''}oleh {a.admin_nama}</>}
                      </div>
                    </div>
                    <div className="right">
                      <UrgencyBadge urgensi={a.urgensi} />
                      <div className="muted small">{fmtDate(a.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
