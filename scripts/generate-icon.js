import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const WIDTH = 256;
const HEIGHT = 256;

// Create raw uncompressed image buffer: (1 filter byte + WIDTH * 4 bytes) * HEIGHT
const rawData = Buffer.alloc((1 + WIDTH * 4) * HEIGHT);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const offset = y * (1 + WIDTH * 4) + 1 + x * 4;
  rawData[offset] = r;
  rawData[offset + 1] = g;
  rawData[offset + 2] = b;
  rawData[offset + 3] = a;
}

// Background: rounded rectangle with indigo/violet gradient
const cornerRadius = 48;
for (let y = 0; y < HEIGHT; y++) {
  // Scanline filter byte is already 0 (None)
  for (let x = 0; x < WIDTH; x++) {
    // Check rounded corner distance
    let inBounds = true;
    const dx = x < cornerRadius ? cornerRadius - x : x > WIDTH - 1 - cornerRadius ? x - (WIDTH - 1 - cornerRadius) : 0;
    const dy = y < cornerRadius ? cornerRadius - y : y > HEIGHT - 1 - cornerRadius ? y - (HEIGHT - 1 - cornerRadius) : 0;
    if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
      inBounds = false;
    }

    if (inBounds) {
      // Subtle gradient from top (79, 70, 229 = indigo-600) to bottom (30, 27, 75 = indigo-950)
      const ratio = y / HEIGHT;
      const r = Math.round(79 * (1 - ratio) + 15 * ratio);
      const g = Math.round(70 * (1 - ratio) + 23 * ratio);
      const b = Math.round(229 * (1 - ratio) + 70 * ratio);
      setPixel(x, y, r, g, b, 255);
    } else {
      setPixel(x, y, 0, 0, 0, 0); // Transparent outer
    }
  }
}

// Draw Graduation Cap (Mortarboard rhombus)
const centerX = 128;
const centerY = 110;

// Rhombus top of cap
for (let y = centerY - 38; y <= centerY + 38; y++) {
  for (let x = centerX - 80; x <= centerX + 80; x++) {
    const rx = Math.abs(x - centerX) / 80;
    const ry = Math.abs(y - centerY) / 38;
    if (rx + ry <= 1.0) {
      // Shading on diamond cap
      const highlight = (x - (centerX - 80)) / 160;
      const r = Math.round(245 + highlight * 10);
      const g = Math.round(245 + highlight * 10);
      const b = Math.round(255);
      setPixel(x, y, r, g, b, 255);
    }
  }
}

// Skull cap base underneath
for (let y = centerY + 10; y <= centerY + 50; y++) {
  const widthAtY = Math.round(44 * Math.cos(((y - (centerY + 10)) / 40) * (Math.PI / 2.5)));
  for (let x = centerX - widthAtY; x <= centerX + widthAtY; x++) {
    setPixel(x, y, 220, 225, 245, 255);
  }
}

// Tassel cord and bead
for (let t = 0; t <= 55; t++) {
  const tx = Math.round(centerX + 15 + t * 0.9);
  const ty = Math.round(centerY + 8 + t * 0.7);
  setPixel(tx, ty, 251, 191, 36, 255); // Amber-400
  setPixel(tx + 1, ty, 245, 158, 11, 255);
}

// AI Neural Nodes / Sparkles below cap
const nodes = [
  { x: 78, y: 195, size: 8 },
  { x: 128, y: 185, size: 10 },
  { x: 178, y: 195, size: 8 },
  { x: 100, y: 215, size: 7 },
  { x: 156, y: 215, size: 7 },
];

// Draw connections between nodes
nodes.forEach((n1, i) => {
  nodes.forEach((n2, j) => {
    if (i < j) {
      const steps = 30;
      for (let s = 0; s <= steps; s++) {
        const cx = Math.round(n1.x + ((n2.x - n1.x) * s) / steps);
        const cy = Math.round(n1.y + ((n2.y - n1.y) * s) / steps);
        setPixel(cx, cy, 147, 197, 253, 160); // Glowing light blue
      }
    }
  });
});

// Draw circles for nodes
nodes.forEach(n => {
  for (let dy = -n.size; dy <= n.size; dy++) {
    for (let dx = -n.size; dx <= n.size; dx++) {
      if (dx * dx + dy * dy <= n.size * n.size) {
        setPixel(n.x + dx, n.y + dy, 255, 255, 255, 255);
      }
    }
  }
});

// Generate PNG Chunks
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crc]);
}

// 1. Signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// 2. IHDR Chunk
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(WIDTH, 0);
ihdrData.writeUInt32BE(HEIGHT, 4);
ihdrData[8] = 8; // 8 bits per channel
ihdrData[9] = 6; // RGBA
ihdrData[10] = 0; // Deflate compression
ihdrData[11] = 0; // Default filter
ihdrData[12] = 0; // Non-interlaced
const ihdrChunk = makeChunk('IHDR', ihdrData);

// 3. IDAT Chunk (zlib deflate)
const compressedData = zlib.deflateSync(rawData, { level: 9 });
const idatChunk = makeChunk('IDAT', compressedData);

// 4. IEND Chunk
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

const publicDir = path.resolve('public');
const buildDir = path.resolve('build');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);

// Generate valid ICO format embedding the 256x256 PNG
function createIcoFromPng(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved (0)
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(1, 4); // Count: 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0); // Width: 0 = 256px
  dirEntry.writeUInt8(0, 1); // Height: 0 = 256px
  dirEntry.writeUInt8(0, 2); // Color count: 0 (>= 8bpp)
  dirEntry.writeUInt8(0, 3); // Reserved (0)
  dirEntry.writeUInt16LE(1, 4); // Color planes (1)
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel (32)
  dirEntry.writeUInt32LE(png.length, 8); // Image size in bytes
  dirEntry.writeUInt32LE(6 + 16, 12); // Offset to image data (22)

  return Buffer.concat([header, dirEntry, png]);
}

const icoBuffer = createIcoFromPng(pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

console.log('Successfully generated icon.png and icon.ico in public/ and build/!');
