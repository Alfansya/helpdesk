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
      setForm(null); setShowPassword(false); load();
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
      actions={<button className="btn primary" onClick={() => { setFormError(''); setShowPassword(false); setForm(EMPTY); }}>Tambah akun</button>}>
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
                <option value="superadmin">Superadmin</option>
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
            <div className="pass-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                required={!form.id}
                minLength={form.password ? 6 : undefined}
                maxLength={128}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c4.5 0 8.3 3.1 9.9 7.2a10.8 10.8 0 0 1-3 4.1" />
                    <path d="M6.6 6.6a10.6 10.6 0 0 0-4.5 5.1 1 1 0 0 0 0 .6C3.7 16.4 7.5 19.5 12 19.5c1.1 0 2.1-.2 3.1-.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.1 12.3a1 1 0 0 1 0-.6C3.7 7.6 7.5 4.5 12 4.5s8.3 3.1 9.9 7.2a1 1 0 0 1 0 .6C20.3 16.4 16.5 19.5 12 19.5s-8.3-3.1-9.9-7.2Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <div className="row">
            <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" className="btn" onClick={() => { setShowPassword(false); setForm(null); }}>Batal</button>
          </div>
        </form>
      )}

      {list && <p className="muted small">{admins} admin · {list.length - admins} superadmin</p>}
      <div className="panel flush">
        <div className="tablewrap">
          <table className="table-cards table-users">
            <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Divisi</th><th>Dibuat</th><th></th></tr></thead>
            <tbody>
              {!list && <tr><td colSpan={6} className="empty">Memuat data…</td></tr>}
              {list?.map((u) => (
                <tr key={u.id}>
                  <td data-label="Nama">{u.nama}</td><td data-label="Email">{u.email}</td>
                  <td data-label="Role"><span className={`badge ${u.role === 'superadmin' ? 'role-admin' : 'ug-low'}`}>{u.role === 'superadmin' ? 'Superadmin' : 'Admin'}</span></td>
                  <td data-label="Divisi">{u.divisi || '-'}</td>
                  <td data-label="Dibuat" className="nowrap">{fmtDate(u.created_at)}</td>
                  <td className="right nowrap td-actions">
                    <button className="btn sm" onClick={() => { setFormError(''); setShowPassword(false); setForm({ ...u, password: '' }); }}>Ubah</button>{' '}
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
