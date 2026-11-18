import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { NextResponse } from 'next/server';
import { api, HttpError } from '@/lib/server/http';
import { scopeDivisi } from '@/lib/server/auth';
import { buildReport } from '@/lib/server/report';

export const dynamic = 'force-dynamic';

async function toPdf(r, periodeText, jamText, cakupan) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.15, 0.17);
  let y = 790;
  const put = (s, x, { size = 11, f = font } = {}) =>
    page.drawText(String(s), { x, y, size, font: f, color: ink });

  put('Laporan Tiket', 50, { size: 18, f: bold }); y -= 20;
  put(`Cakupan: ${cakupan}`, 50, { size: 10 }); y -= 14;
  put(`Periode: ${periodeText}`, 50, { size: 10 }); y -= 14;
  put(`Dicetak: ${new Date().toISOString().slice(0, 10)}`, 50, { size: 10 }); y -= 34;

  const xs = [50, 190, 260, 350, 440];
  const row = (cells, f = font) => { cells.forEach((c, i) => put(c, xs[i], { f })); y -= 20; };
  row(['Divisi', 'Total', 'Belum', 'Diproses', 'Selesai'], bold);
  page.drawLine({ start: { x: 50, y: y + 14 }, end: { x: 545, y: y + 14 }, thickness: 0.7, color: rgb(0.6, 0.65, 0.66) });
  r.rekap.forEach((x) => row([x.divisi, x.total, x.belum_diproses, x.diproses, x.selesai]));
  const sum = (k) => r.rekap.reduce((a, x) => a + x[k], 0);
  row(['Total', sum('total'), sum('belum_diproses'), sum('diproses'), sum('selesai')], bold);

  y -= 16;
  put('Ringkasan penyelesaian', 50, { size: 13, f: bold }); y -= 22;
  put(`Tiket selesai: ${r.ringkasan.selesai} dari ${r.ringkasan.total} (${r.ringkasan.persen_selesai}%)`, 50); y -= 18;
  put(`Tiket belum selesai: ${r.ringkasan.belum_selesai}`, 50); y -= 18;
  put(`Rata-rata waktu penyelesaian: ${jamText}`, 50);
  return pdf.save();
}

async function toXlsx(r, periodeText, jamText, cakupan) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rekap per Divisi');
  ws.addRow(['Laporan Tiket']).font = { bold: true, size: 14 };
  ws.addRow([`Cakupan: ${cakupan}`]);
  ws.addRow([`Periode: ${periodeText}`]);
  ws.addRow([]);
  ws.addRow(['Divisi', 'Total', 'Belum Diproses', 'Diproses', 'Selesai']).font = { bold: true };
  r.rekap.forEach((x) => ws.addRow([x.divisi, x.total, x.belum_diproses, x.diproses, x.selesai]));
  const sum = (k) => r.rekap.reduce((a, x) => a + x[k], 0);
  ws.addRow(['Total', sum('total'), sum('belum_diproses'), sum('diproses'), sum('selesai')]).font = { bold: true };
  ws.addRow([]);
  ws.addRow(['Ringkasan penyelesaian']).font = { bold: true };
  ws.addRow(['Tiket selesai', r.ringkasan.selesai]);
  ws.addRow(['Tiket belum selesai', r.ringkasan.belum_selesai]);
  ws.addRow(['Persentase selesai', `${r.ringkasan.persen_selesai}%`]);
  ws.addRow(['Rata-rata waktu penyelesaian', jamText]);
  ws.columns = [{ width: 30 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 14 }];
  return wb.xlsx.writeBuffer();
}

export const GET = api(['admin', 'superadmin'], async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const format = sp.get('format');
  if (!['pdf', 'xlsx'].includes(format)) throw new HttpError(400, 'Format harus pdf atau xlsx.');

  const sd = scopeDivisi(session);
  const r = await buildReport(sd, sp.get('from'), sp.get('to'));
  const periodeText = r.periode.from || r.periode.to
    ? `${r.periode.from || 'awal'} s/d ${r.periode.to || 'sekarang'}` : 'Semua periode';
  const jam = r.ringkasan.rata_rata_jam_penyelesaian;
  const jamText = jam == null ? '-' : `${jam} jam`;
  const cakupan = sd ? `Divisi ${sd}` : 'Semua divisi';
  const name = `laporan-tiket-${new Date().toISOString().slice(0, 10)}`;

  const isPdf = format === 'pdf';
  const data = isPdf ? await toPdf(r, periodeText, jamText, cakupan) : await toXlsx(r, periodeText, jamText, cakupan);
  return new NextResponse(Buffer.from(data), {
    headers: {
      'Content-Type': isPdf ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}.${format}"`,
      'Cache-Control': 'no-store',
    },
  });
});
