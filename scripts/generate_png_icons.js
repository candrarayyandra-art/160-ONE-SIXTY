// Generate valid 192x192 and 512x512 PNG icons for Chrome Android PWA requirements
import fs from 'fs';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function generateIconPNG(size) {
  // RGBA raw pixels: (size * 4 + 1) per row
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter type None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded app icon shape / rounded rect
      const rx = Math.abs(x - cx);
      const ry = Math.abs(y - cy);
      const cornerR = size * 0.22;
      const inBox = rx < (size/2 - 4) && ry < (size/2 - 4);

      if (inBox) {
        // Gradient from Sky Blue (#0284c7) to Cyan (#06b6d4)
        const t = (x + y) / (size * 2);
        const r = Math.round(2 + t * 4);
        const g = Math.round(132 + t * 50);
        const b = Math.round(199 + t * 13);

        // Water droplet shape in center
        const dropY = y / size;
        const dropX = x / size;
        const inDrop = (dist < size * 0.26) && (dropY > 0.35 && dropY < 0.75);

        if (inDrop) {
          // White droplet motif
          raw[pxOffset] = 255;
          raw[pxOffset + 1] = 255;
          raw[pxOffset + 2] = 255;
          raw[pxOffset + 3] = 240;
        } else {
          raw[pxOffset] = r;
          raw[pxOffset + 1] = g;
          raw[pxOffset + 2] = b;
          raw[pxOffset + 3] = 255;
        }
      } else {
        // Transparent border
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
      }
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public/icons')) {
  fs.mkdirSync('public/icons', { recursive: true });
}

fs.writeFileSync('public/icons/icon-192.png', generateIconPNG(192));
fs.writeFileSync('public/icons/icon-512.png', generateIconPNG(512));
console.log('Successfully generated icon-192.png and icon-512.png');
