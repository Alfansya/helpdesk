export const ALAMAT = ['Kantor Pusat', 'Soponyono', 'Menur', 'Jambangan', 'Sambikerep'];
export const DIVISI = ['Operasional', 'HC-GA', 'Marketing', 'Finance'];
export const URGENSI = ['Low', 'Medium', 'High'];
export const STATUS = ['Belum Diproses', 'Diproses', 'Selesai'];
export const ROLES = ['admin', 'superadmin'];
export const KODE_RE = /^TKT-[A-Z0-9]{8}$/;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
