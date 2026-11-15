/**
 * process_avatars.js
 * assets/avatars 内の人物画像の黒背景を透過処理し、
 * キャラクター内部の髪や顔が透けないよう完全不透明化するスクリプト
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function removeBlackBackground(inPath, outPath) {
  const buf = fs.readFileSync(inPath);
  let pos = 8, width, height, bitDepth, colorType, idatBuffers = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
      bitDepth = buf[pos + 16];
      colorType = buf[pos + 17];
    } else if (type === 'IDAT') {
      idatBuffers.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decomp = zlib.inflateSync(Buffer.concat(idatBuffers));
  const stride = 1 + width * 4;
  const out = Buffer.from(decomp);

  // 1. 外周からBFSで黒背景（RGB < 35 または a < 50）を検出して透過 (a = 0)
  const isOutside = new Uint8Array(width * height);
  const queue = [];

  function isBackgroundPixel(x, y) {
    const idx = y * stride + x * 4 + 1;
    const r = decomp[idx], g = decomp[idx + 1], b = decomp[idx + 2], a = decomp[idx + 3];
    if (a < 60) return true;
    // 黒背景判定: 暗いピクセル
    if (r < 32 && g < 32 && b < 32) return true;
    return false;
  }

  function push(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (isOutside[idx]) return;
    if (isBackgroundPixel(x, y)) {
      isOutside[idx] = 1;
      queue.push(x, y);
    }
  }

  // 4辺からシード
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // 外側ピクセルを完全透明化
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (isOutside[idx]) {
        const pIdx = y * stride + x * 4 + 1;
        out[pIdx + 3] = 0;
      }
    }
  }

  // 2. キャラクター内側の輪郭を算出し、内側のピクセルを完全不透明化
  for (let y = 0; y < height; y++) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!isOutside[idx] && out[y * stride + x * 4 + 4] > 60) {
        if (minX === -1) minX = x;
        maxX = x;
      }
    }
    if (minX === -1 || maxX - minX < 5) continue;

    for (let x = minX; x <= maxX; x++) {
      const idx = y * stride + x * 4 + 1;
      if (out[idx + 3] > 0 && out[idx + 3] < 255) {
        out[idx + 3] = 255;
      }
      if (out[idx + 3] === 0) {
        // 内側の穴を周囲の色で補完
        let bestR = 30, bestG = 28, bestB = 30;
        let found = false;
        for (let d = 1; d < 80 && !found; d++) {
          if (x - d >= minX) {
            const lIdx = y * stride + (x - d) * 4 + 1;
            if (out[lIdx + 3] === 255) {
              bestR = out[lIdx]; bestG = out[lIdx + 1]; bestB = out[lIdx + 2];
              found = true; break;
            }
          }
          if (x + d <= maxX) {
            const rIdx = y * stride + (x + d) * 4 + 1;
            if (out[rIdx + 3] === 255) {
              bestR = out[rIdx]; bestG = out[rIdx + 1]; bestB = out[rIdx + 2];
              found = true; break;
            }
          }
        }
        out[idx] = bestR;
        out[idx + 1] = bestG;
        out[idx + 2] = bestB;
        out[idx + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(out);
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0); ihdrChunk.write('IHDR', 4);
  ihdrChunk.writeUInt32BE(width, 8); ihdrChunk.writeUInt32BE(height, 12);
  ihdrChunk[16] = 8; ihdrChunk[17] = 6; ihdrChunk[18] = 0; ihdrChunk[19] = 0; ihdrChunk[20] = 0;
  const crc32 = require('zlib').crc32;
  ihdrChunk.writeUInt32BE(crc32(ihdrChunk.slice(4, 21)), 21);
  const idatChunk = Buffer.alloc(12 + compressed.length);
  idatChunk.writeUInt32BE(compressed.length, 0); idatChunk.write('IDAT', 4);
  compressed.copy(idatChunk, 8);
  idatChunk.writeUInt32BE(crc32(idatChunk.slice(4, 8 + compressed.length)), 8 + compressed.length);
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0); iendChunk.write('IEND', 4);
  iendChunk.writeUInt32BE(crc32(iendChunk.slice(4, 8)), 8);

  const outBuf = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outPath, outBuf);
  console.log('Processed transparent avatar:', outPath);
}

module.exports = { removeBlackBackground };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length >= 1) {
    const inF = args[0];
    const outF = args[1] || inF;
    removeBlackBackground(inF, outF);
  } else {
    // 引数なしの場合は assets/avatars/ 内の全 PNG を自動処理
    const avatarsDir = path.resolve(__dirname, '../assets/avatars');
    if (fs.existsSync(avatarsDir)) {
      const files = fs.readdirSync(avatarsDir).filter(f => f.endsWith('.png'));
      console.log(`Processing ${files.length} avatars in ${avatarsDir}...`);
      for (const f of files) {
        const fullPath = path.join(avatarsDir, f);
        try {
          removeBlackBackground(fullPath, fullPath);
        } catch (e) {
          console.error(`Error processing ${f}:`, e.message);
        }
      }
      console.log('All avatars processed successfully!');
    }
  }
}
