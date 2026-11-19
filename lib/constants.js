export const ALAMAT = ['Kantor Pusat', 'Soponyono', 'Menur', 'Jambangan', 'Sambikerep'];
export const DIVISI = ['Operasional', 'HC-GA', 'Marketing', 'Finance'];
export const URGENSI = ['Low', 'Medium', 'High'];
export const STATUS = ['Belum Diproses', 'Diproses', 'Selesai'];
export const ROLES = ['admin', 'superadmin'];
// Format baru: TKT01-191126. Format lama (termasuk TKT01-19/11/2026)
// tetap diterima agar tiket yang sudah terlanjur dibagikan masih bisa dicek.
export const KODE_RE = /^(?:TKT-[A-Z0-9]{8}|TKT\d{2,3}-\d{2}\/\d{2}\/\d{4}|TKT\d{2,3}-\d{6})$/;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
