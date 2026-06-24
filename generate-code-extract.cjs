const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Key source files to include — most original/representative files
const SOURCE_FILES = [
  'src/routes/index.tsx',
  'src/routes/_app.tsx',
  'src/routes/_app.dashboard.tsx',
  'src/routes/_app.child-profile.tsx',
  'src/routes/_app.legal.tsx',
  'src/routes/_app.financial.tsx',
  'src/routes/_app.emergency.tsx',
  'src/routes/_app.care-circle.tsx',
  'src/routes/_app.medical.tsx',
  'src/routes/_app.vault.tsx',
  'src/routes/_app.caregiver.tsx',
  'src/routes/_app.ai-assistant.tsx',
  'src/routes/_app.action-plan.tsx',
  'src/routes/_app.residential.tsx',
  'src/routes/_app.succession.tsx',
];

const OUTPUT = path.join(__dirname, 'LegacyNest-SourceCode-Copyright-Evidence.pdf');
const BASE = __dirname;

// Get first N and last N lines of a file
function extractLines(filePath, n = 40) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const total = lines.length;
  if (total <= n * 2) return { first: lines, last: [], total };
  return {
    first: lines.slice(0, n),
    last: lines.slice(total - n),
    total,
  };
}

async function build() {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: 'LegacyNest — Source Code Copyright Evidence',
      Author: 'LegacyNest',
      Subject: 'Literary Work (Source Code) for Copyright Registration',
    }
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  // ── Cover page ──────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FEF3EA');

  doc.fillColor('#8B3A00').fontSize(28).font('Helvetica-Bold')
     .text('LegacyNest', 0, 90, { align: 'center', width: doc.page.width });
  doc.fontSize(14).font('Helvetica')
     .text('Source Code Extract — Literary Work', 0, 130, { align: 'center', width: doc.page.width });

  doc.moveDown(3);
  doc.fontSize(11).fillColor('#333')
     .text('Prepared for Copyright Registration — Literary Work (Computer Program)', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(11).fillColor('#555')
     .text('LegacyNest TM 2026', { align: 'center' })
     .text('All Rights Reserved', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#666')
     .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
     .text('Language: TypeScript / TSX (React)', { align: 'center' })
     .text('Framework: React 19 + Vite 7 + Supabase', { align: 'center' })
     .text('Repository: https://github.com/LegacyNest/legacynest', { align: 'center' })
     .text('Live App: https://www.legacynest.co.in', { align: 'center' });

  doc.moveDown(3);
  doc.fontSize(9).fillColor('#888')
     .text('This document contains the first and last 40 lines of each key source file,', { align: 'center' })
     .text('submitted as evidence of original authorship under the Copyright Act, 1957.', { align: 'center' });

  // ── Declaration page ─────────────────────────────────────────────
  doc.addPage();
  doc.fillColor('#8B3A00').fontSize(16).font('Helvetica-Bold').text('Declaration of Authorship', 40, 40);
  doc.strokeColor('#8B3A00').lineWidth(1).moveTo(40, doc.y + 4).lineTo(doc.page.width - 40, doc.y + 4).stroke();
  doc.moveDown(1);

  const declaration = `I, LegacyNest, residing at Kolkata, India, hereby declare that:

1. I am the sole original author of the computer program / software application known as "LegacyNest".

2. The work was created by me independently, commencing in 2026, without copying from any other work.

3. The source code is written in TypeScript (TSX) using the React framework, and constitutes an original literary work under Section 2(o) of the Copyright Act, 1957.

4. The application "LegacyNest" is a lifetime care planning platform designed to help families with children having special needs to document, plan, and secure their child's future.

5. The work has been deployed live at https://www.legacynest.co.in and the source code is hosted at https://github.com/LegacyNest/legacynest.

6. No other person has any claim to the authorship of this work.

7. The extract of source code contained in this document represents the original creative expression of the author and is submitted in support of copyright registration.

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Author: LegacyNest
Email: admin@legacynest.co.in
Location: Kolkata, India`;

  doc.fillColor('#333').fontSize(10).font('Helvetica').text(declaration, 40, doc.y + 10, {
    width: doc.page.width - 80,
    lineGap: 4,
  });

  doc.moveDown(4);
  doc.fillColor('#333').fontSize(10).text('Signature: _______________________________', 40);
  doc.moveDown(1);
  doc.text('Name: LegacyNest', 40);
  doc.text('Date: ____________________________', 40);

  // ── File index ───────────────────────────────────────────────────
  doc.addPage();
  doc.fillColor('#8B3A00').fontSize(16).font('Helvetica-Bold').text('Source Files Index', 40, 40);
  doc.strokeColor('#8B3A00').lineWidth(1).moveTo(40, doc.y + 4).lineTo(doc.page.width - 40, doc.y + 4).stroke();
  doc.moveDown(1);

  SOURCE_FILES.forEach((f, i) => {
    const full = path.join(BASE, f);
    const exists = fs.existsSync(full);
    const size = exists ? `${(fs.statSync(full).size / 1024).toFixed(1)} KB` : 'N/A';
    const lines = exists ? fs.readFileSync(full, 'utf8').split('\n').length : 0;
    doc.fillColor('#333').fontSize(9).font('Helvetica')
       .text(`${i + 1}.  ${f}   —   ${lines} lines, ${size}`, 40, doc.y + 2);
  });

  // ── Source code pages ────────────────────────────────────────────
  for (const relPath of SOURCE_FILES) {
    const fullPath = path.join(BASE, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const { first, last, total } = extractLines(fullPath, 40);

    // First 40 lines
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 30).fill('#2d2d2d');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
       .text(`FILE: ${relPath}   (${total} lines total) — FIRST 40 LINES`, 10, 9);

    doc.fillColor('#1a1a1a').rect(0, 30, doc.page.width, doc.page.height - 30).fill('#f8f8f8');

    let y = 38;
    first.forEach((line, i) => {
      if (y > doc.page.height - 30) {
        doc.addPage();
        doc.fillColor('#f8f8f8').rect(0, 0, doc.page.width, doc.page.height).fill('#f8f8f8');
        y = 15;
      }
      // Line number
      doc.fillColor('#999').fontSize(6.5).font('Courier')
         .text(String(i + 1).padStart(4, ' '), 8, y, { width: 28, lineBreak: false });
      // Code — truncate at 120 chars to prevent overflow
      const codeLine = (line.replace(/\t/g, '  ') || ' ').slice(0, 120);
      doc.fillColor('#1a1a1a').fontSize(6.5).font('Courier')
         .text(codeLine, 38, y, { width: doc.page.width - 55, lineBreak: false });
      y += 9;
    });

    // Last 40 lines (if different from first)
    if (last.length > 0) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 30).fill('#2d2d2d');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
         .text(`FILE: ${relPath}   (${total} lines total) — LAST 40 LINES`, 10, 9);

      doc.fillColor('#f8f8f8').rect(0, 30, doc.page.width, doc.page.height - 30).fill('#f8f8f8');

      y = 38;
      const startLine = total - last.length + 1;
      last.forEach((line, i) => {
        if (y > doc.page.height - 30) {
          doc.addPage();
          doc.fillColor('#f8f8f8').rect(0, 0, doc.page.width, doc.page.height).fill('#f8f8f8');
          y = 15;
        }
        doc.fillColor('#999').fontSize(6.5).font('Courier')
           .text(String(startLine + i).padStart(4, ' '), 8, y, { width: 28, lineBreak: false });
        const codeLineL = (line.replace(/\t/g, '  ') || ' ').slice(0, 120);
        doc.fillColor('#1a1a1a').fontSize(6.5).font('Courier')
           .text(codeLineL, 38, y, { width: doc.page.width - 55, lineBreak: false });
        y += 9;
      });
    }
  }

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });

  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`✅ Done! PDF saved:\n   ${OUTPUT}\n   Size: ${size} KB`);
}

build().catch(console.error);
