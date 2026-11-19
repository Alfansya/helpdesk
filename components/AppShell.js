'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

const BOTH = ['admin', 'superadmin'];

const ICONS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M9 3V2h6v1" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

const NAV = [
  { href: '/dashboard', label: 'Dashboard', short: 'Dashboard', roles: BOTH, icon: 'home' },
  { href: '/tickets', label: 'Daftar tiket', short: 'Tiket', roles: BOTH, icon: 'ticket' },
  { href: '/reports', label: 'Laporan', short: 'Laporan', roles: BOTH, icon: 'chart' },
  { href: '/users', label: 'Manajemen admin', short: 'Admin', roles: ['superadmin'], icon: 'users' },
];

export default function AppShell({ roles = BOTH, title, actions, children }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (!roles.includes(user.role)) router.replace('/dashboard');
  }, [ready, user]); // eslint-disable-line

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/login') {
        window.location.replace('/dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!ready || !user || !roles.includes(user.role)) return <div className="boot">Memuat…</div>;

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const active = (href) =>
    href === '/tickets' ? path === '/tickets' || /^\/tickets\/\d+$/.test(path) : path === href;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span>Helpdesk PT. DAS</span>
        </div>
        <nav>
          {items.map((n) => (
            <Link key={n.label} href={n.href} className={active(n.href) ? 'on' : ''}>{n.label}</Link>
          ))}
        </nav>
        <div className="me">
          <div className="me-name">{user.nama}</div>
          <div className="me-role">{user.role === 'superadmin' ? 'Superadmin · semua divisi' : `Admin · ${user.divisi}`}</div>
          <button className="btn ghost-light" onClick={logout}>Keluar</button>
        </div>
      </aside>

      <header className="mbar">
        <div className="mbar-brand">
          <span>Helpdesk</span>
          <small>{user.role === 'superadmin' ? 'Superadmin · semua divisi' : `Admin · ${user.divisi}`}</small>
        </div>
        <button type="button" className="mbar-out" onClick={logout} aria-label="Keluar dari akun">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          <span>Keluar</span>
        </button>
      </header>

      <main className="main">
        <header className="top">
          <h1>{title}</h1>
          <div>{actions}</div>
        </header>
        {children}
      </main>

      <nav className="tabbar" aria-label="Navigasi utama">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className={active(n.href) ? 'on' : ''}
            aria-current={active(n.href) ? 'page' : undefined}>
            <svg className="tabicon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[n.icon]}</svg>
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
