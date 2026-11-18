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

// Distance helper functions for anti-aliased rendering
function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function sdArc(px, py, scaX, scaY, ra, rb) {
  // Approximate arc
  const d = Math.hypot(px, py) - ra;
  return Math.abs(d) - rb;
}

function renderHelpdeskIcon(width, height, isMaskable = false) {
  return createPng(width, height, (x, y) => {
    // Normalized coordinates (-1 to 1)
    const nx = (x + 0.5) / width * 2 - 1;
    const ny = (y + 0.5) / height * 2 - 1;
    const pixelSize = 2 / width;

    // Background color: #14766f -> [20, 118, 111]
    const bgR = 20, bgG = 118, bgB = 111;
    let r = 0, g = 0, b = 0, a = 0;

    if (isMaskable) {
      // Full-bleed background for maskable
      r = bgR; g = bgG; b = bgB; a = 255;
    } else {
      // Rounded card background (radius ~ 0.28)
      const distBg = sdRoundedBox(nx, ny, 0.88, 0.88, 0.35);
      const alphaBg = Math.max(0, Math.min(1, 0.5 - distBg / pixelSize));
      if (alphaBg <= 0) return [0, 0, 0, 0];
      r = bgR; g = bgG; b = bgB;
      a = Math.round(alphaBg * 255);
    }

    // Emblem scale
    const s = isMaskable ? 0.72 : 0.86;
    const ex = nx / s;
    const ey = (ny + 0.04) / s;

    // 1. Headband: arc from top (radius ~ 0.55, thickness ~ 0.08)
    const distHeadbandRadius = Math.abs(Math.hypot(ex, ey + 0.05) - 0.55) - 0.045;
    const isUpper = ey < 0.05;
    const distHeadband = isUpper ? distHeadbandRadius : Math.min(
      Math.hypot(ex + 0.55, ey - 0.05) - 0.045,
      Math.hypot(ex - 0.55, ey - 0.05) - 0.045
    );

    // 2. Ear cups: left and right rounded boxes
    const distLeftCup = sdRoundedBox(ex + 0.56, ey - 0.05, 0.07, 0.16, 0.06);
    const distRightCup = sdRoundedBox(ex - 0.56, ey - 0.05, 0.07, 0.16, 0.06);

    // 3. Microphone boom: arc from left cup down-right
    const distMic1 = sdSegment(ex, ey, -0.52, 0.08, -0.42, 0.32);
    const distMic2 = sdSegment(ex, ey, -0.42, 0.32, -0.15, 0.38);
    const distMicBoom = Math.min(distMic1, distMic2) - 0.026;

    // Mic tip capsule:
    const distMicTip = sdRoundedBox(ex + 0.08, ey - 0.38, 0.06, 0.038, 0.035);

    // 4. Center monitor / screen:
    const distScreen = sdRoundedBox(ex, ey + 0.02, 0.28, 0.20, 0.06);
    const distScreenInner = sdRoundedBox(ex, ey + 0.02, 0.22, 0.14, 0.03);
    const distStandNeck = sdSegment(ex, ey, 0, 0.22, 0, 0.30) - 0.035;
    const distStandBase = sdRoundedBox(ex, ey - 0.32, 0.16, 0.02, 0.015);

    // Checkmark inside screen
    const distCheck1 = sdSegment(ex, ey, -0.09, 0.03, -0.02, 0.09) - 0.025;
    const distCheck2 = sdSegment(ex, ey, -0.02, 0.09, 0.10, -0.04) - 0.025;
    const distCheck = Math.min(distCheck1, distCheck2);

    // Compose colors:
    // White elements: Headband, Ear Cups, Mic Boom, Screen Outer, Stand
    const whiteDist = Math.min(
      distHeadband, distLeftCup, distRightCup, distMicBoom,
      Math.abs(distScreen) - 0.035, distStandNeck, distStandBase
    );
    const whiteAlpha = Math.max(0, Math.min(1, 0.5 - whiteDist / (pixelSize / s)));

    // Accent elements (Teal-light #89dad4 -> [137, 218, 212]):
    const accentDist = Math.min(distMicTip, distCheck);
    const accentAlpha = Math.max(0, Math.min(1, 0.5 - accentDist / (pixelSize / s)));

    // Screen inner background (#0f5d57 -> [15, 93, 87])
    const screenInnerAlpha = Math.max(0, Math.min(1, 0.5 - distScreenInner / (pixelSize / s)));

    // Blend:
    if (screenInnerAlpha > 0) {
      r = Math.round(r * (1 - screenInnerAlpha) + 15 * screenInnerAlpha);
      g = Math.round(g * (1 - screenInnerAlpha) + 93 * screenInnerAlpha);
      b = Math.round(b * (1 - screenInnerAlpha) + 87 * screenInnerAlpha);
    }

    if (accentAlpha > 0) {
      r = Math.round(r * (1 - accentAlpha) + 137 * accentAlpha);
      g = Math.round(g * (1 - accentAlpha) + 218 * accentAlpha);
      b = Math.round(b * (1 - accentAlpha) + 212 * accentAlpha);
    }

    if (whiteAlpha > 0) {
      r = Math.round(r * (1 - whiteAlpha) + 255 * whiteAlpha);
      g = Math.round(g * (1 - whiteAlpha) + 255 * whiteAlpha);
      b = Math.round(b * (1 - whiteAlpha) + 255 * whiteAlpha);
    }

    return [r, g, b, a];
  });
}

// Generate assets
fs.mkdirSync('public', { recursive: true });

console.log('Generating icon-192.png...');
fs.writeFileSync('public/icon-192.png', renderHelpdeskIcon(192, 192, false));

console.log('Generating icon-512.png...');
fs.writeFileSync('public/icon-512.png', renderHelpdeskIcon(512, 512, false));

console.log('Generating icon-maskable-192.png...');
fs.writeFileSync('public/icon-maskable-192.png', renderHelpdeskIcon(192, 192, true));

console.log('Generating icon-maskable-512.png...');
fs.writeFileSync('public/icon-maskable-512.png', renderHelpdeskIcon(512, 512, true));

console.log('Generating apple-touch-icon.png (180x180)...');
fs.writeFileSync('public/apple-touch-icon.png', renderHelpdeskIcon(180, 180, false));

console.log('Generating favicon.ico (32x32 PNG)...');
fs.writeFileSync('public/favicon.ico', renderHelpdeskIcon(32, 32, false));

// SVG Vector Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="140" fill="#14766f"/>
  <!-- Headband -->
  <path d="M 120 250 A 136 136 0 0 1 392 250" fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
  <!-- Ear cups -->
  <rect x="100" y="225" width="40" height="90" rx="20" fill="#ffffff"/>
  <rect x="372" y="225" width="40" height="90" rx="20" fill="#ffffff"/>
  <!-- Mic boom -->
  <path d="M 120 300 C 120 375 190 395 240 395" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <rect x="235" y="380" width="36" height="28" rx="14" fill="#89dad4"/>
  <!-- Monitor / Screen in center -->
  <rect x="180" y="170" width="152" height="110" rx="16" fill="#0f5d57" stroke="#ffffff" stroke-width="16"/>
  <path d="M 215 225 L 240 250 L 295 195" fill="none" stroke="#89dad4" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 256 280 L 256 315" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
  <path d="M 220 315 L 292 315" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync('public/icon.svg', svg);
console.log('SVG icon generated.');
