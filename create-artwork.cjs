const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT = path.join(__dirname, 'LegacyNest-UI-Artwork-Copyright.jpg');

async function build() {
  const files = fs.readdirSync(SCREENSHOTS_DIR)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => ({ file: path.join(SCREENSHOTS_DIR, f), name: f.replace('.png','').replace(/_+/g,' ') }));

  console.log(`Found ${files.length} screenshots`);

  const cols = 4;
  const rows = Math.ceil(files.length / cols);
  const thumbW = 380;
  const thumbH = 260;
  const gap = 10;
  const headerH = 70;
  const footerH = 40;
  const canvasW = cols * thumbW + (cols + 1) * gap;
  const canvasH = headerH + rows * thumbH + (rows + 1) * gap + footerH;

  // Terracotta colour #8B3A00 = rgb(139,58,0)
  const TC = { r: 139, g: 58, b: 0 };

  // Create base canvas — white
  let canvas = sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: { r: 255, g: 255, b: 255 } }
  }).png();

  // Build composites array
  const composites = [];

  // Header rectangle
  composites.push({
    input: await sharp({ create: { width: canvasW, height: headerH, channels: 3, background: TC } }).png().toBuffer(),
    left: 0, top: 0
  });

  // Footer rectangle
  composites.push({
    input: await sharp({ create: { width: canvasW, height: footerH, channels: 3, background: TC } }).png().toBuffer(),
    left: 0, top: canvasH - footerH
  });

  // Thumbnails
  for (let i = 0; i < files.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (thumbW + gap);
    const y = headerH + gap + row * (thumbH + gap);

    try {
      const thumb = await sharp(files[i].file)
        .resize(thumbW, thumbH, { fit: 'cover' })
        .png()
        .toBuffer();
      composites.push({ input: thumb, left: x, top: y });
      console.log(`  ✓ ${i + 1}/${files.length} — ${files[i].name}`);
    } catch (e) {
      console.log(`  ✗ ${files[i].name} — ${e.message}`);
    }
  }

  // SVG text overlay for header and footer
  const svgText = `<svg width="${canvasW}" height="${canvasH}">
    <text x="20" y="30" font-family="Arial" font-size="22" font-weight="bold" fill="white">LegacyNest — User Interface Design Collection</text>
    <text x="20" y="55" font-family="Arial" font-size="13" fill="white">LegacyNest TM 2026. All Rights Reserved.</text>
    <text x="20" y="${canvasH - 13}" font-family="Arial" font-size="11" fill="white">Original Artistic Work | Submitted for Copyright Registration under Copyright Act, 1957 | www.legacynest.co.in</text>
  </svg>`;

  composites.push({ input: Buffer.from(svgText), left: 0, top: 0 });

  // Compose and save
  const buf = await sharp({
    create: { width: canvasW, height: canvasH, channels: 3, background: { r: 255, g: 255, b: 255 } }
  }).composite(composites).jpeg({ quality: 90 }).toBuffer();

  fs.writeFileSync(OUTPUT, buf);
  const size = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Saved: ${OUTPUT}`);
  console.log(`   Size: ${size} MB (limit 10MB)`);
}

build().catch(console.error);
