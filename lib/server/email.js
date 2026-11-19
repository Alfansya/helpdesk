// Validasi email tanpa regex dengan quantifier berulang.
// Semua langkah linear terhadap panjang input (maksimal 150 karakter),
// sehingga tidak bisa memicu catastrophic backtracking / ReDoS.
export function isEmail(value) {
  if (typeof value !== 'string' || value.length < 3 || value.length > 150) return false;

  // Satu kelas karakter tanpa quantifier: aman dan linear.
  if (/\s/.test(value)) return false;

  const at = value.indexOf('@');
  if (at < 1 || at > 64 || at !== value.lastIndexOf('@')) return false;

  const labels = value.slice(at + 1).split('.');
  if (labels.length < 2) return false;

  return labels.every((label) => label.length > 0 && label.length <= 63);
}
