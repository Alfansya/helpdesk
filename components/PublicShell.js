'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PublicShell({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      <header className="pubtop">
        <Link href="/" className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          <img src="/logo.png" alt="Logo Santri" style={{ height: '30px', width: 'auto', background: '#fff', borderRadius: '4px', padding: '2px 5px', objectFit: 'contain', flexShrink: 0 }} />
          <span className="brand-text">Helpdesk PT DAS</span>
        </Link>
        <nav className="pubnav">
          {deferredPrompt && (
            <button type="button" onClick={installApp} className="btn ghost-light" title="Pasang aplikasi di perangkat Anda">
              Install App
            </button>
          )}
          <Link href="/cek-tiket" className="plink">Cek status tiket</Link>
          <Link href="/login" replace className="btn ghost-light">Login admin</Link>
        </nav>
      </header>
      <main className="pub">{children}</main>
    </>
  );
}
