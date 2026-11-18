export default function manifest() {
  return {
    name: 'Helpdesk PT. DAS',
    short_name: 'Helpdesk DAS',
    description: 'Sistem Pelaporan Gangguan IT & Helpdesk Ticketing PT. DAS',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f1f4f4',
    theme_color: '#14766f',
    scope: '/',
    lang: 'id',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Lapor Gangguan',
        short_name: 'Lapor',
        description: 'Buat tiket laporan gangguan baru',
        url: '/',
      },
      {
        name: 'Cek Tiket',
        short_name: 'Cek Status',
        description: 'Periksa status penanganan tiket',
        url: '/cek-tiket',
      },
      {
        name: 'Login Admin',
        short_name: 'Admin',
        description: 'Masuk ke portal admin helpdesk',
        url: '/login',
      },
    ],
  };
}
