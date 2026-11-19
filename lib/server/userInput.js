import { HttpError } from './http';
import { text, oneOf, isEmail } from './validate';
import { DIVISI, ROLES } from '@/lib/constants';

// Validasi input akun admin/superadmin (dipakai tambah & ubah)
export function parseUser(body, { passwordRequired }) {
  const nama = text(body.nama, { label: 'Nama', min: 2, max: 100 });
  const email = text(body.email, { label: 'Email', max: 150 }).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Format email tidak valid.');
  const role = oneOf(body.role, ROLES, 'Role');
  const divisi = role === 'admin' ? oneOf(body.divisi, DIVISI, 'Divisi') : null;
  const password = typeof body.password === 'string' ? body.password : '';
  if (passwordRequired || password) {
    if (password.length < 7) throw new HttpError(400, 'Password minimal 7 karakter.');
    if (password.length > 128) throw new HttpError(400, 'Password maksimal 128 karakter.');
    if (!/[A-Z]/.test(password)) throw new HttpError(400, 'Password harus mengandung minimal 1 huruf kapital.');
    if (!/[0-9]/.test(password)) throw new HttpError(400, 'Password harus mengandung minimal 1 angka.');
  }
  return { nama, email, role, divisi, password };
}
