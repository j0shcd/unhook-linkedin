import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icon');
mkdirSync(outDir, { recursive: true });

const TOP = [14, 165, 233, 255]; // sky-500
const BOTTOM = [3, 105, 161, 255]; // sky-800
const WHITE = [255, 255, 255, 255];
const CUT = [2, 132, 199, 255]; // sky-600

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[i] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function makePng(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scale = 4;
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(rowBytes * size);

  for (let y = 0; y < size; y++) {
    const row = y * rowBytes;
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = (x + (sx + 0.5) / scale) / size;
          const py = (y + (sy + 0.5) / scale) / size;
          const color = sampleIcon(px, py);
          r += color[0];
          g += color[1];
          b += color[2];
          a += color[3];
        }
      }

      const samples = scale * scale;
      const offset = row + 1 + x * 4;
      raw[offset] = Math.round(r / samples);
      raw[offset + 1] = Math.round(g / samples);
      raw[offset + 2] = Math.round(b / samples);
      raw[offset + 3] = Math.round(a / samples);
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function sampleIcon(x, y) {
  if (!insideRoundedRect(x, y, 0.08, 0.08, 0.84, 0.84, 0.18)) {
    return [0, 0, 0, 0];
  }

  const t = Math.max(0, Math.min(1, (y - 0.08) / 0.84));
  let color = mix(TOP, BOTTOM, t);
  color = blend(color, [255, 255, 255, softCircle(x, y, 0.35, 0.22, 0.28) * 28]);

  const u = uStrokeAlpha(x, y);
  if (u > 0) {
    color = blend(color, [...WHITE.slice(0, 3), u * 255]);
  }

  const cut = capsuleAlpha(x, y, 0.58, 0.26, 0.76, 0.44, 0.07);
  if (cut > 0) {
    color = blend(color, [...CUT.slice(0, 3), cut * 255]);
  }

  return color;
}

function uStrokeAlpha(x, y) {
  const width = 0.145;
  const d = Math.min(
    capsuleDistance(x, y, 0.34, 0.28, 0.34, 0.58),
    capsuleDistance(x, y, 0.66, 0.28, 0.66, 0.58),
    arcDistance(x, y, 0.5, 0.58, 0.16),
  );
  return smoothstep(width / 2 + 0.018, width / 2 - 0.018, d);
}

function arcDistance(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  const angle = Math.atan2(dy, dx);
  if (angle >= 0 && angle <= Math.PI) {
    return Math.abs(Math.hypot(dx, dy) - radius);
  }
  return Math.min(
    Math.hypot(x - (cx - radius), y - cy),
    Math.hypot(x - (cx + radius), y - cy),
  );
}

function capsuleDistance(x, y, x1, y1, x2, y2) {
  const ax = x - x1;
  const ay = y - y1;
  const bx = x2 - x1;
  const by = y2 - y1;
  const denom = bx * bx + by * by;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, (ax * bx + ay * by) / denom));
  return Math.hypot(x - (x1 + bx * t), y - (y1 + by * t));
}

function capsuleAlpha(x, y, x1, y1, x2, y2, width) {
  return smoothstep(width / 2 + 0.018, width / 2 - 0.018, capsuleDistance(x, y, x1, y1, x2, y2));
}

function insideRoundedRect(x, y, rx, ry, w, h, radius) {
  const cx = Math.max(rx + radius, Math.min(x, rx + w - radius));
  const cy = Math.max(ry + radius, Math.min(y, ry + h - radius));
  return Math.hypot(x - cx, y - cy) <= radius;
}

function softCircle(x, y, cx, cy, radius) {
  return smoothstep(radius, 0, Math.hypot(x - cx, y - cy));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function blend(bottom, top) {
  const topAlpha = top[3] / 255;
  const bottomAlpha = bottom[3] / 255;
  const outAlpha = topAlpha + bottomAlpha * (1 - topAlpha);
  if (outAlpha === 0) return [0, 0, 0, 0];
  return [
    Math.round((top[0] * topAlpha + bottom[0] * bottomAlpha * (1 - topAlpha)) / outAlpha),
    Math.round((top[1] * topAlpha + bottom[1] * bottomAlpha * (1 - topAlpha)) / outAlpha),
    Math.round((top[2] * topAlpha + bottom[2] * bottomAlpha * (1 - topAlpha)) / outAlpha),
    Math.round(outAlpha * 255),
  ];
}

for (const size of [16, 32, 48, 96, 128]) {
  writeFileSync(join(outDir, `${size}.png`), makePng(size));
  console.log(`wrote ${size}.png`);
}
