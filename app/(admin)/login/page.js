'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setShowPassword(false);
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
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <div className="pass-wrap">
            <input id="login-password" ref={passwordRef} type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" maxLength={200} />
            <button type="button" className="pass-toggle" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
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
        </div>
        <button className="btn primary" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <Link href="/" className="small">Kembali ke form tiket</Link>
      </form>
    </div>
  );
}
