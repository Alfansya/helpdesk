'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PublicShell({ children }) {
  const path = usePathname();
  const isCek = path === '/cek-tiket';
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsIos(ios && !standalone);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      setIosHint(true);
      return;
    }
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
          <img src="/logo.png" alt="Logo PT. DAS" style={{ height: '30px', width: 'auto', background: '#fff', borderRadius: '4px', padding: '2px 5px', objectFit: 'contain', flexShrink: 0 }} />
          <span className="brand-text">Helpdesk PT DAS</span>
        </Link>
        <nav className="pubnav">
          {(deferredPrompt || isIos) && (
            <button type="button" onClick={installApp} className="btn ghost-light" title="Pasang aplikasi di perangkat Anda">
              Pasang
            </button>
          )}
          <Link href="/cek-tiket" className="plink">Cek status tiket</Link>
          <Link href="/login" replace className="btn ghost-light">Login admin</Link>
        </nav>
      </header>
      <main className="pub">{children}</main>

      <nav className="pubtabs" aria-label="Navigasi utama">
        <Link href="/" className={!isCek ? 'on' : ''} aria-current={!isCek ? 'page' : undefined}>
          <svg className="tabicon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            <path d="M9 3V2h6v1" />
            <path d="M9 9h6M9 13h6M9 17h4" />
          </svg>
          <span>Lapor</span>
        </Link>
        <Link href="/cek-tiket" className={isCek ? 'on' : ''} aria-current={isCek ? 'page' : undefined}>
          <svg className="tabicon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <span>Cek status</span>
        </Link>
      </nav>

      {iosHint && (
        <div className="ioshint" role="dialog" aria-modal="true" aria-label="Cara memasang aplikasi" onClick={() => setIosHint(false)}>
          <div className="ioshint-card" onClick={(e) => e.stopPropagation()}>
            <h2>Pasang di iPhone/iPad</h2>
            <p className="muted">
              Ketuk tombol <strong>Bagikan</strong> di browser, lalu pilih <strong>Tambah ke Layar Utama</strong> agar
              Helpdesk tampil seperti aplikasi.
            </p>
            <button type="button" className="btn primary" onClick={() => setIosHint(false)}>Mengerti</button>
          </div>
        </div>
      )}
    </>
  );
}
