import Link from 'next/link';

export default function PublicShell({ children }) {
  return (
    <>
      <header className="pubtop">
        <Link href="/" className="brand">Helpdesk PT. DAS</Link>
        <nav className="pubnav">
          <Link href="/cek-tiket" className="plink">Cek status tiket</Link>
          <Link href="/login" replace className="btn ghost-light">Login admin</Link>
        </nav>
      </header>
      <main className="pub">{children}</main>
    </>
  );
}
