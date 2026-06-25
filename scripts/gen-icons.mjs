// Regenerates the icon suite and the vector logo from the source artwork.
//
// Pipeline: decode the source PNG -> split into per-colour masks (the lavender
// tile cluster and the grey accent tile) -> trace each mask to a vector path
// with potrace -> compose a theme-able logo.svg -> rasterise the toolbar icon
// suite (16-128) with resvg.
//
// Run with: node scripts/gen-icons.mjs

import { inflateSync, deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import potrace from 'potrace';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'marketing', 'branding', 'dark.png');
const iconDir = join(root, 'public', 'icon');
const brandDir = join(root, 'marketing', 'branding');
const componentsDir = join(root, 'components');
mkdirSync(iconDir, { recursive: true });

// Brand palette.
const BLACK = '#000000';
const LAVENDER = '#f0f1ff';
const ACCENT = '#545454';

// --- PNG decoding (minimal, RGBA/RGB, supports all filter types) ------------
function decodePng(path) {
  const buf = readFileSync(path);
  let p = 8;
  const idat = [];
  let w, h, colorType;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const rowBytes = 1 + w * ch;
  const out = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    const f = raw[y * rowBytes];
    for (let x = 0; x < w * ch; x++) {
      const cur = raw[y * rowBytes + 1 + x];
      const a = x >= ch ? out[y * w * ch + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * w * ch + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * w * ch + x - ch] : 0;
      let v;
      if (f === 0) v = cur;
      else if (f === 1) v = cur + a;
      else if (f === 2) v = cur + b;
      else if (f === 3) v = cur + ((a + b) >> 1);
      else {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v = cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[y * w * ch + x] = v & 0xff;
    }
  }
  return { w, h, ch, out };
}

// --- Minimal grayscale PNG encoder (for the masks fed to potrace) -----------
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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
function encodeGrayPng(w, h, gray) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const rowBytes = 1 + w;
  const rawBuf = Buffer.alloc(rowBytes * h);
  for (let y = 0; y < h; y++) {
    rawBuf[y * rowBytes] = 0;
    gray.copy(rawBuf, y * rowBytes + 1, y * w, y * w + w);
  }
  const idat = deflateSync(rawBuf);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Keep only the largest 4-connected component of a boolean shape grid. Used to
// isolate the single solid accent tile from the thin anti-aliased slivers that
// share its grey luma band along every other tile's edge.
function keepLargest(shape, w, h) {
  const label = new Int32Array(w * h);
  const stack = [];
  let best = [];
  let bestSize = 0;
  for (let s = 0; s < w * h; s++) {
    if (!shape[s] || label[s]) continue;
    const cells = [];
    stack.push(s);
    label[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      cells.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && shape[p - 1] && !label[p - 1]) (label[p - 1] = 1), stack.push(p - 1);
      if (x < w - 1 && shape[p + 1] && !label[p + 1]) (label[p + 1] = 1), stack.push(p + 1);
      if (y > 0 && shape[p - w] && !label[p - w]) (label[p - w] = 1), stack.push(p - w);
      if (y < h - 1 && shape[p + w] && !label[p + w]) (label[p + w] = 1), stack.push(p + w);
    }
    if (cells.length > bestSize) (bestSize = cells.length), (best = cells);
  }
  const kept = new Uint8Array(w * h);
  for (const p of best) kept[p] = 1;
  return kept;
}

// --- Build a black-on-white mask for pixels matching a predicate ------------
function buildMask({ w, h, ch, out }, predicate, { largestOnly = false } = {}) {
  let shape = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    const i = s * ch;
    if (predicate(out[i], out[i + 1], out[i + 2])) shape[s] = 1;
  }
  if (largestOnly) shape = keepLargest(shape, w, h);

  const gray = Buffer.alloc(w * h, 255); // white background
  let count = 0;
  let minx = w, miny = h, maxx = 0, maxy = 0;
  for (let s = 0; s < w * h; s++) {
    if (!shape[s]) continue;
    gray[s] = 0; // black = shape
    count++;
    const x = s % w, y = (s / w) | 0;
    if (x < minx) minx = x;
    if (x > maxx) maxx = x;
    if (y < miny) miny = y;
    if (y > maxy) maxy = y;
  }
  return { png: encodeGrayPng(w, h, gray), count, bbox: { minx, miny, maxx, maxy } };
}

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
// Lavender tiles: bright. Accent tile: a tight band around grey ~84, which
// excludes the ~128 anti-aliased edges between the lavender tiles and the
// black background.
const isMain = (r, g, b) => luma(r, g, b) >= 150;
const isAccent = (r, g, b) => {
  const l = luma(r, g, b);
  return l >= 55 && l <= 115;
};

// --- Trace a mask PNG to a single path's `d` attribute ----------------------
function tracePath(pngBuffer) {
  const tmp = join(tmpdir(), `unhook-mask-${pngBuffer.length}.png`);
  writeFileSync(tmp, pngBuffer);
  return new Promise((resolve, reject) => {
    const tracer = new potrace.Potrace({
      threshold: 128,
      turdSize: 8, // drop specks from anti-aliasing
      optTolerance: 0.4,
      turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
    });
    tracer.loadImage(tmp, (err) => {
      rmSync(tmp, { force: true });
      if (err) return reject(err);
      const svg = tracer.getSVG();
      const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
      resolve(d);
    });
  });
}

// --- Compose SVGs -----------------------------------------------------------
// Fit the artwork's content bbox into a padded 100x100 logical canvas.
function fitTransform(bbox, { canvas = 100, pad = 14 } = {}) {
  const cw = bbox.maxx - bbox.minx + 1;
  const choriz = bbox.maxy - bbox.miny + 1;
  const scale = (canvas - 2 * pad) / Math.max(cw, choriz);
  const tx = pad + (canvas - 2 * pad - cw * scale) / 2 - bbox.minx * scale;
  const ty = pad + (canvas - 2 * pad - choriz * scale) / 2 - bbox.miny * scale;
  return { scale, tx, ty };
}

function logoSvg({ mainPath, accentPath, transform, background, mainColor }) {
  const { scale, tx, ty } = transform;
  const bg = background
    ? `<rect width="100" height="100" rx="22" fill="${background}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
${bg}  <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})">
    <path d="${mainPath}" fill="${mainColor}"/>
    <path d="${accentPath}" fill="${ACCENT}"/>
  </g>
</svg>`;
}

// --- Main -------------------------------------------------------------------
const img = decodePng(source);
const main = buildMask(img, isMain);
const accent = buildMask(img, isAccent, { largestOnly: true });
console.log(`main tiles: ${main.count}px  accent: ${accent.count}px`);

const [mainPath, accentPath] = await Promise.all([
  tracePath(main.png),
  tracePath(accent.png),
]);

// Combined content bbox so both layers share one transform.
const bbox = {
  minx: Math.min(main.bbox.minx, accent.bbox.minx),
  miny: Math.min(main.bbox.miny, accent.bbox.miny),
  maxx: Math.max(main.bbox.maxx, accent.bbox.maxx),
  maxy: Math.max(main.bbox.maxy, accent.bbox.maxy),
};
const transform = fitTransform(bbox);

// Theme-able vector logo: tiles inherit text colour, accent stays grey.
const themeSvg = logoSvg({ mainPath, accentPath, transform, background: null, mainColor: 'currentColor' });
writeFileSync(join(brandDir, 'logo.svg'), themeSvg + '\n');
console.log('wrote marketing/branding/logo.svg');

// React component using the raw artwork coordinates so consumers control
// padding via the container. Tiles inherit `currentColor`; accent stays grey.
const vb = `${bbox.minx} ${bbox.miny} ${bbox.maxx - bbox.minx + 1} ${bbox.maxy - bbox.miny + 1}`;
const component = `// AUTO-GENERATED by scripts/gen-icons.mjs — do not edit by hand.
// The brand mark: tiles inherit \`currentColor\`, the accent tile stays grey.

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="${vb}"
      className={className}
      role="img"
      aria-label="Unhook for LinkedIn"
    >
      <path d="${mainPath}" fill="currentColor" />
      <path d="${accentPath}" fill="${ACCENT}" />
    </svg>
  );
}
`;
writeFileSync(join(componentsDir, 'Logo.tsx'), component);
console.log('wrote components/Logo.tsx');

// Toolbar icon: self-contained black squircle with lavender tiles + grey accent.
const iconSvg = logoSvg({ mainPath, accentPath, transform, background: BLACK, mainColor: LAVENDER });
for (const size of [16, 32, 48, 96, 128]) {
  const resvg = new Resvg(iconSvg, { fitTo: { mode: 'width', value: size } });
  writeFileSync(join(iconDir, `${size}.png`), resvg.render().asPng());
  console.log(`wrote public/icon/${size}.png`);
}
