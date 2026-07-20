import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) image.pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function createImage(width, height, color) {
  const pixels = Buffer.alloc(width * height * 4);
  const image = { width, height, pixels };
  fillRect(image, 0, 0, width, height, color);
  return image;
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  image.pixels[offset] = color[0];
  image.pixels[offset + 1] = color[1];
  image.pixels[offset + 2] = color[2];
  image.pixels[offset + 3] = color[3] ?? 255;
}

function fillRect(image, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(image.height, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(image.width, x + width); column += 1) setPixel(image, column, row, color);
  }
}

function roundedRect(image, x, y, width, height, radius, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const dx = Math.max(x + radius - column, 0, column - (x + width - radius - 1));
      const dy = Math.max(y + radius - row, 0, row - (y + height - radius - 1));
      if (dx * dx + dy * dy <= radius * radius) setPixel(image, column, row, color);
    }
  }
}

function ellipse(image, centerX, centerY, radiusX, radiusY, color, rotation = 0) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const radius = Math.max(radiusX, radiusY);
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      if ((rx * rx) / (radiusX * radiusX) + (ry * ry) / (radiusY * radiusY) <= 1) setPixel(image, x, y, color);
    }
  }
}

function paw(image, centerX, centerY, scale, color) {
  ellipse(image, centerX, centerY + 24 * scale, 60 * scale, 50 * scale, color);
  ellipse(image, centerX - 65 * scale, centerY - 32 * scale, 24 * scale, 32 * scale, color, -0.35);
  ellipse(image, centerX - 22 * scale, centerY - 66 * scale, 23 * scale, 32 * scale, color, -0.1);
  ellipse(image, centerX + 25 * scale, centerY - 66 * scale, 23 * scale, 32 * scale, color, 0.1);
  ellipse(image, centerX + 68 * scale, centerY - 30 * scale, 24 * scale, 32 * scale, color, 0.35);
}

function createShareCover() {
  const image = createImage(1200, 630, [255, 241, 229, 255]);
  for (let y = 0; y < image.height; y += 1) {
    const ratio = y / image.height;
    const color = [255 - Math.round(7 * ratio), 244 - Math.round(24 * ratio), 233 + Math.round(5 * ratio), 255];
    fillRect(image, 0, y, image.width, 1, color);
  }
  roundedRect(image, 54, 52, 710, 526, 18, [53, 44, 40, 255]);
  roundedRect(image, 62, 60, 694, 510, 13, [255, 250, 245, 255]);
  fillRect(image, 62, 60, 694, 14, [217, 87, 56, 255]);
  paw(image, 310, 303, 1.8, [217, 87, 56, 255]);
  roundedRect(image, 522, 159, 174, 48, 9, [38, 124, 114, 255]);
  roundedRect(image, 496, 235, 202, 24, 7, [53, 44, 40, 255]);
  roundedRect(image, 520, 281, 178, 16, 6, [127, 112, 105, 255]);
  roundedRect(image, 483, 319, 215, 16, 6, [127, 112, 105, 255]);
  roundedRect(image, 527, 357, 171, 16, 6, [127, 112, 105, 255]);
  const colors = [[118, 86, 168, 255], [35, 133, 109, 255], [41, 116, 173, 255], [185, 106, 19, 255]];
  colors.forEach((color, index) => {
    const y = 102 + index * 118;
    roundedRect(image, 826, y, 306, 88, 14, [255, 250, 245, 255]);
    roundedRect(image, 850, y + 26, 46 + index * 18, 36, 9, color);
    roundedRect(image, 923, y + 30, 176 - index * 12, 12, 6, [86, 75, 69, 255]);
    roundedRect(image, 923, y + 51, 134, 9, 5, [177, 157, 147, 255]);
  });
  return encodePng(image);
}

function createIcon(size) {
  const image = createImage(size, size, [255, 250, 245, 255]);
  const margin = Math.round(size * 0.07);
  roundedRect(image, margin, margin, size - margin * 2, size - margin * 2, Math.round(size * 0.1), [53, 44, 40, 255]);
  roundedRect(image, margin + Math.round(size * 0.025), margin + Math.round(size * 0.025), size - margin * 2 - Math.round(size * 0.05), size - margin * 2 - Math.round(size * 0.05), Math.round(size * 0.075), [255, 241, 229, 255]);
  paw(image, size / 2, size / 2 + size * 0.025, size / 380, [217, 87, 56, 255]);
  return encodePng(image);
}

async function writeStable(file, contents) {
  const target = resolve(ROOT, file);
  await mkdir(dirname(target), { recursive: true });
  try {
    const current = await readFile(target);
    if (current.equals(contents)) return;
  } catch (_error) {
    // The asset does not exist yet.
  }
  await writeFile(target, contents);
}

export async function generateAssets() {
  await Promise.all([
    writeStable("assets/share-cover.png", createShareCover()),
    writeStable("assets/favicon.png", createIcon(192)),
    writeStable("assets/app-icon-512.png", createIcon(512))
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await generateAssets();
