import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size, primaryColor, secondaryColor) {
  const width = size;
  const height = size;

  // Build raw uncompressed RGBA pixel data
  // Scanline starts with filter type byte (0 = none)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const radius = size * 0.22;
  const center = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rect background
      const dx = Math.max(0, Math.abs(x - center) - (center - radius));
      const dy = Math.max(0, Math.abs(y - center) - (center - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Transparent outside rounded corners
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      } else {
        // Dark premium background with subtle radial gradient
        const grad = 1 - Math.min(1, Math.sqrt((x - center)**2 + (y - center)**2) / (center * 1.2));
        const r = Math.round(11 + 20 * grad);
        const g = Math.round(15 + 25 * grad);
        const b = Math.round(23 + 45 * grad);

        // Simple central icon mark (stylish check / lightning mark)
        // Center checkmark: (size*0.35, size*0.5) to (size*0.48, size*0.65) to (size*0.7, size*0.35)
        const inMark = isPointOnMark(x / size, y / size);

        if (inMark) {
          // Vibrant indigo/purple gradient mark
          rawData[pixelOffset] = 99;     // R
          rawData[pixelOffset + 1] = 102; // G
          rawData[pixelOffset + 2] = 241; // B
          rawData[pixelOffset + 3] = 255; // A
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      }
    }
  }

  function isPointOnMark(nx, ny) {
    // Checkmark line segments with stroke thickness ~0.06
    function distToSeg(px, py, x1, y1, x2, y2) {
      const l2 = (x1 - x2)**2 + (y1 - y2)**2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }
    const d1 = distToSeg(nx, ny, 0.32, 0.52, 0.46, 0.66);
    const d2 = distToSeg(nx, ny, 0.46, 0.66, 0.72, 0.34);
    return Math.min(d1, d2) < 0.055;
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff);
}

const iconsDir = path.resolve(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating 192x192 icon...');
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPNG(192));

console.log('Generating 512x512 icon...');
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPNG(512));

console.log('Icons generated successfully in public/icons!');
