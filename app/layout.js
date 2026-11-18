import './globals.css';
import { IBM_Plex_Sans } from 'next/font/google';

const font = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' });

export const metadata = {
  title: 'Helpdesk IT',
  description: 'Laporkan gangguan IT dan pantau statusnya.',
  robots: { index: false, follow: false }, // aplikasi internal, jangan diindeks mesin pencari
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  );
}
