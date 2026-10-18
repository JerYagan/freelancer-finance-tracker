import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i]!;
    for (let j = 0; j < 8; j++) {
      const bit = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size: number, bgHex: string, fgHex: string): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // Parse colors
  const parseHex = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };

  const [bgR, bgG, bgB] = parseHex(bgHex) as [number, number, number];
  const [fgR, fgG, fgB] = parseHex(fgHex) as [number, number, number];

  // Raw image data: height scanlines, each starting with 0x00 filter byte
  const rowBytes = 1 + size * 4;
  const rawData = Buffer.alloc(rowBytes * size);

  const center = size / 2;
  const radius = size * 0.38;
  const innerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter 0

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded icon background
      const cornerRadius = size * 0.22;
      const insideBox =
        Math.abs(dx) <= center - cornerRadius ||
        Math.abs(dy) <= center - cornerRadius ||
        Math.sqrt(
          Math.pow(Math.abs(dx) - (center - cornerRadius), 2) +
            Math.pow(Math.abs(dy) - (center - cornerRadius), 2),
        ) <= cornerRadius;

      if (!insideBox) {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Draw stylized coin/wallet symbol inside
      const isSymbol =
        (dist <= radius && dist >= innerRadius * 0.8) ||
        (Math.abs(dx) <= size * 0.04 && Math.abs(dy) <= size * 0.24) ||
        (Math.abs(dy) <= size * 0.04 && Math.abs(dx) <= size * 0.18);

      if (isSymbol) {
        rawData[pxOffset] = fgR;
        rawData[pxOffset + 1] = fgG;
        rawData[pxOffset + 2] = fgB;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const iconsDir = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192 PNG
fs.writeFileSync(
  path.join(iconsDir, "icon-192.png"),
  generatePng(192, "#0f172a", "#10b981"),
);

// 512x512 PNG
fs.writeFileSync(
  path.join(iconsDir, "icon-512.png"),
  generatePng(512, "#0f172a", "#10b981"),
);

// Maskable 512x512 PNG (solid background without transparent corners)
fs.writeFileSync(
  path.join(iconsDir, "icon-maskable.png"),
  generatePng(512, "#0f172a", "#10b981"),
);

// SVG Vector Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <circle cx="256" cy="256" r="160" stroke="#10b981" stroke-width="36"/>
  <path d="M256 160V352M192 256H320" stroke="#10b981" stroke-width="36" stroke-linecap="round"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, "icon.svg"), svg, "utf-8");

console.log("Icons generated successfully in public/icons/");
