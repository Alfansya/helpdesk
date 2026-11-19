'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (ready && user) {
      window.location.replace('/dashboard');
    }
  }, [ready, user]);

  useEffect(() => {
    // Pastikan isian kosong setiap halaman login dibuka, termasuk saat browser
    // memulihkan form (back/forward) atau melakukan autofill.
    const clear = () => {
      setEmail('');
      setPassword('');
      if (emailRef.current) emailRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';
    };
    clear();
    const onPageShow = (e) => {
      clear();
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
        <h1>Helpdesk PT. DAS</h1>
        <p>Masuk untuk memantau dan menyelesaikan tiket divisi anda.</p>
      </div>
      <form className="login-form" onSubmit={submit} autoComplete="off">
        <h2>Login admin</h2>
        {error && <div className="alert err" role="alert">{error}</div>}
        <label>Email
          <input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="off" maxLength={150} />
        </label>
        <label>Password
          <input ref={passwordRef} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" maxLength={200} />
        </label>
        <button className="btn primary" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <Link href="/" className="small">Kembali ke form tiket</Link>
      </form>
    </div>
  );
}
