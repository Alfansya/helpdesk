'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) {
      window.location.replace('/dashboard');
    }
  }, [ready, user]);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      window.location.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready || user) {
    return <div className="boot">Memuat…</div>;
  }

  return (
    <div className="login">
      <div className="login-intro">
        <div style={{ marginBottom: '1rem' }}>
          <img src="/logo.png" alt="Logo Santri" style={{ height: '48px', width: 'auto', background: '#fff', borderRadius: '6px', padding: '4px 8px', objectFit: 'contain' }} />
        </div>
        <h1>Helpdesk PT. DAS</h1>
        <p>Masuk untuk memantau dan menyelesaikan tiket divisi anda.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <h2>Login admin</h2>
        {error && <div className="alert err" role="alert">{error}</div>}
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" maxLength={150} />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" maxLength={200} />
        </label>
        <button className="btn primary" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <Link href="/" className="small">Kembali ke form tiket</Link>
      </form>
    </div>
  );
}
