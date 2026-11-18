import { HttpError } from './http';

// Buang karakter kontrol (termasuk NUL yang ditolak PostgreSQL), pertahankan \n \r \t
const clean = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function text(value, { label, min = 1, max, optional = false }) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw new HttpError(400, `${label} wajib diisi.`);
  }
  if (typeof value !== 'string') throw new HttpError(400, `${label} tidak valid.`);
  const v = clean(value);
  if (!v) {
    if (optional) return null;
    throw new HttpError(400, `${label} wajib diisi.`);
  }
  if (min > 1 && v.length < min) throw new HttpError(400, `${label} minimal ${min} karakter.`);
  if (v.length > max) throw new HttpError(400, `${label} maksimal ${max} karakter.`);
  return v;
}

export function oneOf(value, list, label) {
  if (!list.includes(value)) throw new HttpError(400, `${label} tidak valid.`);
  return value;
}

export function positiveInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 2_147_483_647 ? n : null;
}

export const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
export const isEmail = (e) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 150;
