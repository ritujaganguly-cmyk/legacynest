const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const OUTPUT = path.join(__dirname, 'LegacyNest-UI-Design-Copyright-Evidence.pdf');

// Read PNG dimensions from header
function pngDimensions(filePath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch { return { w: 1440, h: 900 }; }
}

async function build() {
  const files = fs.readdirSync(SCREENSHOTS_DIR)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => ({ file: path.join(SCREENSHOTS_DIR, f), label: f.replace('.png','').replace(/_+/g,' ').trim() }));

  console.log(`Found ${files.length} screenshots`);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('LegacyNest — UI Design Copyright Evidence');
  pdfDoc.setAuthor('LegacyNest');
  pdfDoc.setSubject('Original UI Design for Copyright Registration');

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const A4W = 595.28;
  const A4H = 841.89;

  // ── Cover page ──────────────────────────────────────────────────
  const cover = pdfDoc.addPage([A4W, A4H]);
  cover.drawRectangle({ x: 0, y: 0, width: A4W, height: A4H, color: rgb(0.996, 0.953, 0.918) });

  cover.drawText('LegacyNest', { x: 150, y: 720, size: 32, font: boldFont, color: rgb(0.545, 0.227, 0) });
  cover.drawText('UI Design & Screen Documentation', { x: 110, y: 685, size: 14, font: regFont, color: rgb(0.3,0.3,0.3) });
  cover.drawText('Prepared for Copyright Registration under the Copyright Act, 1957', { x: 60, y: 640, size: 10, font: regFont, color: rgb(0.3,0.3,0.3) });
  cover.drawText('LegacyNest TM 2026', { x: 130, y: 615, size: 11, font: boldFont, color: rgb(0.3,0.3,0.3) });
  cover.drawText('All Rights Reserved', { x: 220, y: 598, size: 10, font: regFont, color: rgb(0.3,0.3,0.3) });
  cover.drawText(`Date: ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}`, { x: 200, y: 565, size: 10, font: regFont, color: rgb(0.4,0.4,0.4) });
  cover.drawText('Live App: https://www.legacynest.co.in', { x: 175, y: 548, size: 10, font: regFont, color: rgb(0.4,0.4,0.4) });
  cover.drawText('GitHub: https://github.com/LegacyNest/legacynest', { x: 148, y: 531, size: 10, font: regFont, color: rgb(0.4,0.4,0.4) });
  cover.drawText('This document contains original screenshots submitted as evidence of original authorship.', { x: 60, y: 490, size: 8, font: regFont, color: rgb(0.6,0.6,0.6) });

  // ── Declaration page ─────────────────────────────────────────────
  const decl = pdfDoc.addPage([A4W, A4H]);
  decl.drawRectangle({ x: 0, y: A4H - 40, width: A4W, height: 40, color: rgb(0.545, 0.227, 0) });
  decl.drawText('AUTHORSHIP AND OWNERSHIP DECLARATION', { x: 90, y: A4H - 26, size: 13, font: boldFont, color: rgb(1,1,1) });

  const lines = [
    { text: 'Project Name:', bold: true,  y: 770 },
    { text: 'LegacyNest',   bold: false, y: 753 },
    { text: 'Title of Copyright Work:', bold: true,  y: 725 },
    { text: 'LegacyNest User Interface Design Collection', bold: false, y: 708 },
    { text: 'Author:', bold: true,  y: 680 },
    { text: 'LegacyNest', bold: false, y: 663 },
    { text: 'Owner:', bold: true,  y: 635 },
    { text: 'LegacyNest', bold: false, y: 618 },
    { text: 'Nature of Work:', bold: true, y: 590 },
    { text: 'Original Artistic Work comprising graphical user interfaces, screen layouts,', bold: false, y: 573 },
    { text: 'workflow designs, visual arrangements, icons, navigation structures, dashboard', bold: false, y: 558 },
    { text: 'compositions, forms, and digital user experiences.', bold: false, y: 543 },
    { text: 'Date of Creation:', bold: true, y: 515 },
    { text: '2026', bold: false, y: 498 },
    { text: 'Declaration of Originality:', bold: true, y: 470 },
    { text: 'I hereby certify that the user interface designs, layouts, workflows, and visual', bold: false, y: 450 },
    { text: 'compositions presented in this document are original creations developed by me', bold: false, y: 435 },
    { text: 'for the LegacyNest platform.', bold: false, y: 420 },
    { text: 'To the best of my knowledge, these designs do not knowingly infringe upon the', bold: false, y: 400 },
    { text: 'copyright of any third party.', bold: false, y: 385 },
    { text: 'This document is submitted as evidence of authorship and ownership for copyright', bold: false, y: 365 },
    { text: 'registration purposes under the Copyright Act, 1957.', bold: false, y: 350 },
    { text: 'Signature:', bold: true, y: 300 },
    { text: '___________________________________', bold: false, y: 278 },
    { text: 'LegacyNest', bold: false, y: 260 },
    { text: `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, bold: false, y: 240 },
  ];

  for (const { text, bold, y } of lines) {
    decl.drawText(text, { x: 50, y, size: 10, font: bold ? boldFont : regFont, color: rgb(0.15, 0.15, 0.15) });
  }

  decl.drawText('LegacyNest TM 2026. All Rights Reserved.', { x: 150, y: 20, size: 8, font: regFont, color: rgb(0.5,0.5,0.5) });

  // ── One page per screenshot ──────────────────────────────────────
  for (let i = 0; i < files.length; i++) {
    const { file, label } = files[i];
    const page = pdfDoc.addPage([A4W, A4H]);

    // Header bar
    page.drawRectangle({ x: 0, y: A4H - 28, width: A4W, height: 28, color: rgb(0.545, 0.227, 0) });
    page.drawText(label, { x: 10, y: A4H - 18, size: 9, font: boldFont, color: rgb(1,1,1) });
    page.drawText(`LegacyNest TM 2026. All Rights Reserved.`, { x: A4W - 290, y: A4H - 18, size: 7, font: regFont, color: rgb(1,1,1) });

    // Image — pixel-perfect fit, no overflow possible
    if (fs.existsSync(file)) {
      const imgBytes = fs.readFileSync(file);
      const img = await pdfDoc.embedPng(imgBytes);
      const { w, h } = pngDimensions(file);

      const maxW = A4W - 20;
      const maxH = A4H - 35;
      const scale = Math.min(maxW / w, maxH / h);
      const drawW = w * scale;
      const drawH = h * scale;
      const x = (A4W - drawW) / 2;
      const y = A4H - 30 - drawH;

      page.drawImage(img, { x, y, width: drawW, height: drawH });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(OUTPUT, pdfBytes);

  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`✅ PDF saved: ${OUTPUT}`);
  console.log(`   ${files.length} screens, ${size} KB`);
}

build().catch(console.error);
