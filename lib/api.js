// Pembungkus fetch ke /api (same-origin; sesi dibawa lewat cookie httpOnly, bukan localStorage).
async function request(path, { method = 'GET', body, raw = false } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
  }
  if (res.status === 401 && !path.startsWith('/auth/')) {
    window.location.href = '/login';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }
  if (!res.ok) {
    let msg = 'Terjadi kesalahan.';
    try { msg = (await res.json()).message || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return raw ? res : res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  download: async (p, fallbackName) => {
    const res = await request(p, { raw: true });
    const blob = await res.blob();
    // Batasi header dan gunakan quantifier terbatas agar parsing tetap linear.
    const cd = (res.headers.get('Content-Disposition') || '').slice(0, 512);
    const name = (cd.match(/filename="?([^"\r\n]{1,200})"?/i) || [])[1] || fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};
