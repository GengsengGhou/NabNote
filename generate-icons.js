const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createAppIcon(size, filePath) {
  const width = size;
  const height = size;
  const cx = width / 2;
  const cy = height / 2;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = Buffer.alloc(4);
    crcValue.writeUInt32BE(crc32(crcData));
    return Buffer.concat([length, typeBuffer, data, crcValue]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const paperPad = Math.floor(size * 0.15);
  const paperLeft = paperPad;
  const paperTop = paperPad;
  const paperRight = width - paperPad;
  const paperBottom = height - paperPad;
  const cornerSize = Math.floor(size * 0.12);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const inPaper = x >= paperLeft && x <= paperRight && y >= paperTop && y <= paperBottom;
      const inCorner = x > (paperRight - cornerSize) && y < (paperTop + cornerSize);

      if (inPaper && inCorner) {
        const dx = x - (paperRight - cornerSize);
        const dy = (paperTop + cornerSize) - y;
        if (dx + dy > cornerSize) {
          rawData.push(240, 244, 255, 0);
          continue;
        }
      }

      if (inPaper) {
        const inFoldTriangle = x >= (paperRight - cornerSize) && y <= (paperTop + cornerSize);
        if (inFoldTriangle) {
          const dx = x - (paperRight - cornerSize);
          const dy = y - paperTop;
          if (dx + dy <= cornerSize) {
            rawData.push(208, 216, 232, 255);
            continue;
          }
        }

        const boltCx = width * 0.55;
        const boltCy = height * 0.55;
        const boltScale = size * 0.18;
        const rx = (x - boltCx) / boltScale;
        const ry = (y - boltCy) / boltScale;

        const inBolt = isInLightningBolt(rx, ry);

        if (inBolt) {
          rawData.push(74, 158, 255, 255);
        } else {
          rawData.push(240, 244, 255, 255);
        }
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(filePath, png);
}

function isInLightningBolt(rx, ry) {
  const points = [
    { x: -0.2, y: -1.5 },
    { x: 0.6, y: -1.5 },
    { x: 0.1, y: -0.2 },
    { x: 0.8, y: -0.2 },
    { x: -0.3, y: 1.5 },
    { x: 0.1, y: 0.2 },
    { x: -0.6, y: 0.2 }
  ];

  return pointInPolygon(rx, ry, points);
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function createTrayIcon(filePath) {
  const size = 32;
  const cx = size / 2;
  const cy = size / 2;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = Buffer.alloc(4);
    crcValue.writeUInt32BE(crc32(crcData));
    return Buffer.concat([length, typeBuffer, data, crcValue]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0);
    for (let x = 0; x < size; x++) {
      const rx = (x - cx) / 6;
      const ry = (y - cy) / 6;
      if (isInLightningBolt(rx, ry)) {
        rawData.push(255, 255, 255, 255);
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(filePath, png);
}

const assetsDir = path.join(__dirname, 'assets');
createAppIcon(512, path.join(assetsDir, 'icon.png'));
createAppIcon(256, path.join(assetsDir, 'icon-256.png'));
createTrayIcon(path.join(assetsDir, 'tray-icon.png'));

function createIcoFromPng(pngPath, icoPath) {
  const pngData = fs.readFileSync(pngPath);
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);
  dirEntry.writeUInt8(0, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4);
  dirEntry.writeUInt16LE(32, 6);
  dirEntry.writeUInt32LE(pngData.length, 8);
  dirEntry.writeUInt32LE(22, 12);

  const ico = Buffer.concat([icoHeader, dirEntry, pngData]);
  fs.writeFileSync(icoPath, ico);
}

createIcoFromPng(path.join(assetsDir, 'icon-256.png'), path.join(assetsDir, 'icon.ico'));
fs.unlinkSync(path.join(assetsDir, 'icon-256.png'));
console.log('Icons generated: icon.png, icon.ico, tray-icon.png');
