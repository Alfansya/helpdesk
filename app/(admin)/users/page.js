'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { DIVISI, fmtDate } from '@/lib/constants';

const EMPTY = { id: null, nama: '', email: '', password: '', role: 'admin', divisi: DIVISI[0] };

export default function Users() {
  const { user: me } = useAuth();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/users').then((r) => setList(r.data)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (!me) return <div className="boot">Memuat…</div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    try {
      const body = { nama: form.nama, email: form.email, password: form.password, role: form.role, divisi: form.role === 'admin' ? form.divisi : null };
      if (form.id) await api.put(`/users/${form.id}`, body);
      else await api.post('/users', body);
      setForm(null); load();
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Hapus akun ${u.nama} (${u.email})?`)) return;
    setError('');
    try { await api.del(`/users/${u.id}`); load(); } catch (err) { setError(err.message); }
  };

  const admins = list?.filter((u) => u.role === 'admin').length ?? 0;

  return (
    <AppShell roles={['superadmin']} title="Manajemen admin"
      actions={<button className="btn primary" onClick={() => { setFormError(''); setForm(EMPTY); }}>Tambah akun</button>}>
      {error && <div className="alert err" role="alert">{error}</div>}

      {form && (
        <form className="panel form" onSubmit={save}>
          <h2>{form.id ? 'Ubah akun' : 'Tambah akun'}</h2>
          {formError && <div className="alert err" role="alert">{formError}</div>}
          <div className="grid2">
            <label>Nama<input value={form.nama} onChange={set('nama')} required minLength={2} maxLength={100} /></label>
            <label>Email<input type="email" value={form.email} onChange={set('email')} required maxLength={150} /></label>
          </div>
          <div className="grid2">
            <label>Role
              <select value={form.role} onChange={set('role')}>
                <option value="admin">Admin (satu divisi)</option>
                <option value="superadmin">Superadmin (semua divisi)</option>
              </select>
            </label>
            {form.role === 'admin' && (
              <label>Divisi
                <select value={form.divisi} onChange={set('divisi')}>
                  {DIVISI.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            )}
          </div>
          <label>
            {form.id ? 'Password baru (kosongkan jika tidak diubah)' : 'Password (minimal 10 karakter)'}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                required={!form.id}
                minLength={form.password ? 10 : undefined}
                maxLength={128}
                autoComplete="new-password"
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'inherit',
                  opacity: 0.7,
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <div className="row">
            <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" className="btn" onClick={() => setForm(null)}>Batal</button>
          </div>
        </form>
      )}

      {list && <p className="muted small">{admins} admin · {list.length - admins} superadmin</p>}
      <div className="panel flush">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Divisi</th><th>Dibuat</th><th></th></tr></thead>
            <tbody>
              {!list && <tr><td colSpan={6} className="empty">Memuat data…</td></tr>}
              {list?.map((u) => (
                <tr key={u.id}>
                  <td>{u.nama}</td><td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'superadmin' ? 'role-admin' : 'ug-low'}`}>{u.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span></td>
                  <td>{u.divisi || 'Semua'}</td>
                  <td className="nowrap">{fmtDate(u.created_at)}</td>
                  <td className="right nowrap">
                    <button className="btn sm" onClick={() => { setFormError(''); setForm({ ...u, password: '' }); }}>Ubah</button>{' '}
                    <button className="btn sm danger" disabled={u.id === me?.id} onClick={() => remove(u)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
