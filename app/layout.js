import './globals.css';
import { IBM_Plex_Sans } from 'next/font/google';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const font = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' });

export const viewport = {
  themeColor: '#14766f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  title: 'Helpdesk PT. DAS',
  description: 'Laporkan gangguan IT dan pantau statusnya.',
  applicationName: 'Helpdesk PT. DAS',
  manifest: '/manifest.json',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Helpdesk PT. DAS',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
