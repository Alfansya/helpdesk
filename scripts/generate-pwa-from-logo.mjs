import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw.writeUInt8(0, offset++);
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw.writeUInt8(r, offset++);
      raw.writeUInt8(g, offset++);
      raw.writeUInt8(b, offset++);
      raw.writeUInt8(a, offset++);
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function decodePng(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4, rowBytes = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }
  let inOffset = 0, prevRowOffset = -1;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[inOffset++];
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = decompressed[inOffset++];
      const a = x >= bpp ? pixels[rowOffset + x - bpp] : 0;
      const b = prevRowOffset >= 0 ? pixels[prevRowOffset + x] : 0;
      const c = (prevRowOffset >= 0 && x >= bpp) ? pixels[prevRowOffset + x - bpp] : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 0xFF;
      else if (filter === 2) val = (raw + b) & 0xFF;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xFF;
      else if (filter === 4) val = (raw + paeth(a, b, c)) & 0xFF;
      pixels[rowOffset + x] = val;
    }
    prevRowOffset = rowOffset;
  }
  return { width, height, pixels };
}

// Bilinear sampling from decoded source
function sampleBilinear(src, sx, sy) {
  const { width, height, pixels } = src;
  if (sx < 0 || sx >= width - 1 || sy < 0 || sy >= height - 1) {
    if (sx >= -0.5 && sx < width - 0.5 && sy >= -0.5 && sy < height - 0.5) {
      const cx = Math.max(0, Math.min(width - 1, Math.round(sx)));
      const cy = Math.max(0, Math.min(height - 1, Math.round(sy)));
      const idx = (cy * width + cx) * 4;
      return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
    }
    return [0, 0, 0, 0];
  }

  const x0 = Math.floor(sx), x1 = x0 + 1;
  const y0 = Math.floor(sy), y1 = y0 + 1;
  const fx = sx - x0, fy = sy - y0;

  const idx00 = (y0 * width + x0) * 4;
  const idx10 = (y0 * width + x1) * 4;
  const idx01 = (y1 * width + x0) * 4;
  const idx11 = (y1 * width + x1) * 4;

  const res = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = pixels[idx00 + c] * (1 - fx) + pixels[idx10 + c] * fx;
    const btm = pixels[idx01 + c] * (1 - fx) + pixels[idx11 + c] * fx;
    res[c] = Math.round(top * (1 - fy) + btm * fy);
  }
  return res;
}

// Distance helper for rounded corners
function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function renderSquareIcon(src, targetSize, { isMaskable = false, isRounded = false, bgWhite = true }) {
  // Bounding box of content inside source
  const srcW = src.width;
  const srcH = src.height;

  // Determine scale so the logo fits inside targetSize with appropriate padding
  // Maskable needs safe area (~70%), standard gets ~88%
  const paddingFactor = isMaskable ? 0.70 : 0.88;
  const maxContentDim = targetSize * paddingFactor;
  const scale = Math.min(maxContentDim / srcW, maxContentDim / srcH);

  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  const offsetX = (targetSize - scaledW) / 2;
  const offsetY = (targetSize - scaledH) / 2;

  return createPng(targetSize, targetSize, (x, y) => {
    const nx = (x + 0.5) / targetSize * 2 - 1;
    const ny = (y + 0.5) / targetSize * 2 - 1;
    const pixelSize = 2 / targetSize;

    // Corner mask if isRounded
    let cardAlpha = 1.0;
    if (isRounded) {
      const dist = sdRoundedBox(nx, ny, 0.90, 0.90, 0.32);
      cardAlpha = Math.max(0, Math.min(1, 0.5 - dist / pixelSize));
      if (cardAlpha <= 0) return [0, 0, 0, 0];
    }

    // Source coords
    const sx = (x - offsetX) / scale;
    const sy = (y - offsetY) / scale;

    const [lr, lg, lb, la] = sampleBilinear(src, sx, sy);
    const logoAlphaNorm = (la / 255);

    let r, g, b, a;

    if (bgWhite) {
      // Solid white background #ffffff
      const bgR = 255, bgG = 255, bgB = 255;
      r = Math.round(lr * logoAlphaNorm + bgR * (1 - logoAlphaNorm));
      g = Math.round(lg * logoAlphaNorm + bgG * (1 - logoAlphaNorm));
      b = Math.round(lb * logoAlphaNorm + bgB * (1 - logoAlphaNorm));
      a = Math.round(255 * cardAlpha);
    } else {
      // Transparent background
      r = lr;
      g = lg;
      b = lb;
      a = Math.round(la * cardAlpha);
    }

    return [r, g, b, a];
  });
}

// Run generation
const srcBuf = fs.readFileSync('public/logo.png');
const src = decodePng(srcBuf);
console.log('Source loaded:', src.width, 'x', src.height);

console.log('Generating icon-192.png...');
fs.writeFileSync('public/icon-192.png', renderSquareIcon(src, 192, { isRounded: true, bgWhite: true }));

console.log('Generating icon-512.png...');
fs.writeFileSync('public/icon-512.png', renderSquareIcon(src, 512, { isRounded: true, bgWhite: true }));

console.log('Generating icon-maskable-192.png...');
fs.writeFileSync('public/icon-maskable-192.png', renderSquareIcon(src, 192, { isMaskable: true, isRounded: false, bgWhite: true }));

console.log('Generating icon-maskable-512.png...');
fs.writeFileSync('public/icon-maskable-512.png', renderSquareIcon(src, 512, { isMaskable: true, isRounded: false, bgWhite: true }));

console.log('Generating apple-touch-icon.png (180x180)...');
fs.writeFileSync('public/apple-touch-icon.png', renderSquareIcon(src, 180, { isRounded: false, bgWhite: true }));

console.log('Generating favicon.ico (32x32)...');
fs.writeFileSync('public/favicon.ico', renderSquareIcon(src, 32, { isRounded: false, bgWhite: true }));

// Also generate SVG that contains the logo image embedded
const base64Logo = srcBuf.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="110" fill="#ffffff"/>
  <image href="data:image/png;base64,${base64Logo}" x="30" y="94" width="452" height="324" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
fs.writeFileSync('public/icon.svg', svg);
console.log('Generated public/icon.svg');
