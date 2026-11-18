'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

const BOTH = ['admin', 'superadmin'];
const NAV = [
  { href: '/dashboard', label: 'Dashboard', roles: BOTH },
  { href: '/tickets', label: 'Daftar tiket', roles: BOTH },
  { href: '/reports', label: 'Laporan', roles: BOTH },
  { href: '/users', label: 'Manajemen admin', roles: ['superadmin'] },
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
    href === '/tickets' ? path === '/tickets' || /^\/tickets\/\d+/.test(path) : path === href;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Helpdesk PT. DAS</div>
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
      <main className="main">
        <header className="top">
          <h1>{title}</h1>
          <div>{actions}</div>
        </header>
        {children}
      </main>
    </div>
  );
}
