import { HttpError } from './http';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Di production, secret wajib ada agar form tiket tidak berjalan tanpa perlindungan.
// Di development, verifikasi dilewati agar pengujian lokal tetap mudah.
export async function verifyCaptcha(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(503, 'CAPTCHA belum dikonfigurasi. Hubungi admin.');
    }
    return; // pengembangan lokal tanpa key
  }

  const value = typeof token === 'string' ? token.trim() : '';
  if (!value || value.length > 2048) {
    throw new HttpError(400, 'Verifikasi CAPTCHA gagal. Silakan coba lagi.');
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', value);
  if (ip && ip !== 'unknown') form.set('remoteip', ip);

  let data;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error('Verifikasi CAPTCHA gagal dihubungi:', e.message);
    throw new HttpError(503, 'Layanan CAPTCHA sedang gangguan. Coba lagi beberapa saat lagi.');
  }

  // Token Turnstile sekali pakai, punya masa berlaku, dan terikat pada action.
  // Test key Cloudflare tidak mengembalikan action, jadi pengecekan action
  // dilewati hanya untuk token yang ditandai result_with_testing_key.
  const isTestKey = data.metadata?.result_with_testing_key === true;
  if (!data.success || (!isTestKey && data.action !== 'ticket')) {
    throw new HttpError(400, 'Verifikasi CAPTCHA gagal. Silakan coba lagi.');
  }
}
