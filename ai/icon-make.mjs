import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function insideRound(px, py) {
  const rad = 7;
  let dx = 0;
  let dy = 0;
  if (px < rad) dx = rad - px;
  else if (px > 32 - rad) dx = px - (32 - rad);
  if (py < rad) dy = rad - py;
  else if (py > 32 - rad) dy = py - (32 - rad);
  return dx * dx + dy * dy <= rad * rad;
}

function distToSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  const dx = px - (ax + abx * t);
  const dy = py - (ay + aby * t);
  return Math.hypot(dx, dy);
}

function sample(nx, ny) {
  const px = nx * 32;
  const py = ny * 32;
  if (!insideRound(px, py)) return [0, 0, 0, 0];
  const dots = [
    { x: 9, y: 19, r: 1.6, c: [255, 255, 255, 255] },
    { x: 16, y: 11, r: 2.1, c: [255, 255, 255, 255] },
    { x: 24, y: 15, r: 1.2, c: [141, 146, 156, 255] },
  ];
  for (const dot of dots) {
    if ((px - dot.x) ** 2 + (py - dot.y) ** 2 <= dot.r ** 2) return dot.c;
  }
  const line =
    distToSeg(px, py, 9, 19, 16, 11) <= 0.45 || distToSeg(px, py, 16, 11, 24, 15) <= 0.45;
  if (line) return [201, 198, 239, 255];
  return [7, 8, 11, 255];
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const samples = 4;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const nx = (x + (sx + 0.5) / samples) / size;
          const ny = (y + (sy + 0.5) / samples) / size;
          const col = sample(nx, ny);
          r += col[0];
          g += col[1];
          b += col[2];
          a += col[3];
        }
      }
      const n = samples * samples;
      const o = row + 1 + x * 4;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
      raw[o + 3] = Math.round(a / n);
    }
  }
  const idat = deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
writeFileSync("public/apple-touch-icon.png", png(180));
