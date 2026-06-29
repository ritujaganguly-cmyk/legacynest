const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// All screenshot IDs captured in order
const screenshots = [
  // Landing page
  { id: 'ss_6001buvb8', label: 'Landing Page — Hero' },
  { id: 'ss_765481omz', label: 'Landing Page — The Unspoken Worry (80%+ stat)' },
  { id: 'ss_5392ufryg', label: 'Landing Page — What\'s Covered' },
  { id: 'ss_5920oghi1', label: 'Landing Page — Care Circle, Digital Vault, Succession' },
  { id: 'ss_66707yyq6', label: 'Landing Page — How It Works' },
  { id: 'ss_5798bsv26', label: 'Landing Page — Footer' },
  // Auth
  { id: 'ss_6562ce3kq', label: 'Sign In Page' },
  // App screens
  { id: 'ss_14524vemn', label: 'Dashboard — Plan Progress' },
  { id: 'ss_82186knud', label: 'Dashboard — Action Items' },
  { id: 'ss_41317g7yo', label: 'Dashboard — Quick Access' },
  { id: 'ss_88963f5lp', label: 'Child Profile' },
  { id: 'ss_3116k9oeo', label: 'Parent Profile' },
  { id: 'ss_058437ihb', label: 'Care Circle' },
  { id: 'ss_516872fsu', label: 'Medical Management — Appointments' },
  { id: 'ss_879562vy5', label: 'Insurance Policies' },
  { id: 'ss_79779lgqb', label: 'Financial Planning — Corpus Projection' },
  { id: 'ss_5019yg8iz', label: 'Legal Planning — Will, Trust, Guardianship, POA' },
  { id: 'ss_1731rqa66', label: 'Residential Planning' },
  { id: 'ss_8589h14zd', label: 'Emergency Continuity Plan' },
  { id: 'ss_5390pkess', label: 'Digital Vault' },
  { id: 'ss_0766dqf4o', label: 'Succession Planning' },
  { id: 'ss_1664xwhf6', label: 'Caregiver Succession Planning' },
  { id: 'ss_59926myx8', label: 'AI Assistant — Legacy Advisory Hub' },
  { id: 'ss_1777elndq', label: 'Personalized Action Plan' },
  { id: 'ss_5955hp1pd', label: 'Disability Documents' },
  { id: 'ss_5917tukva', label: 'Account & Security Settings' },
];

// Find screenshot files in temp dir
const tempBase = 'C:\\Users\\sidhwartha\\AppData\\Local\\Temp\\claude';

function findScreenshot(id) {
  // Try multiple possible locations
  const dirs = [
    tempBase,
    'C:\\Users\\sidhwartha\\AppData\\Local\\Temp',
  ];

  // Search recursively in temp for the file
  const searchDir = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.includes(id)) {
        return path.join(dir, entry.name);
      }
      if (entry.isDirectory()) {
        const found = searchDir(path.join(dir, entry.name));
        if (found) return found;
      }
    }
    return null;
  };

  return searchDir('C:\\Users\\sidhwartha\\AppData\\Local\\Temp\\claude');
}

async function generatePDF() {
  const outputPath = path.join(__dirname, 'LegacyNest-UI-Design-Copyright-Evidence.pdf');

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: 'LegacyNest — UI Design Copyright Evidence',
      Author: 'LegacyNest',
      Subject: 'Original UI Design Documentation for Copyright Registration',
      Creator: 'LegacyNest',
      Keywords: 'LegacyNest, copyright, UI design, IP protection',
    }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FEF3EA');
  doc.fillColor('#8B3A00')
     .fontSize(28)
     .font('Helvetica-Bold')
     .text('LegacyNest', 40, 80, { align: 'center' });
  doc.fontSize(14)
     .font('Helvetica')
     .text('UI Design & Screen Documentation', 40, 120, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12)
     .fillColor('#333')
     .text('Prepared for Copyright Registration', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(11)
     .text('LegacyNest TM 2026', { align: 'center' });
  doc.text('All Rights Reserved.', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(10)
     .fillColor('#555')
     .text(`Date of Documentation: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.text('Live Application: https://www.legacynest.co.in', { align: 'center' });
  doc.text('GitHub: https://github.com/LegacyNest/legacynest', { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(9)
     .fillColor('#777')
     .text('This document contains original screenshots of the LegacyNest application, created solely by LegacyNest.', { align: 'center' })
     .text('It is submitted as evidence of original authorship for copyright registration under the Copyright Act, 1957.', { align: 'center' });

  // Table of contents page
  doc.addPage();
  doc.fillColor('#8B3A00').fontSize(18).font('Helvetica-Bold').text('Screen Index', 40, 40);
  doc.moveDown(0.5);
  doc.strokeColor('#8B3A00').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.5);

  screenshots.forEach((s, i) => {
    doc.fillColor('#333').fontSize(10).font('Helvetica')
       .text(`${i + 1}. ${s.label}`, 40, doc.y, { continued: false });
  });

  // Screenshot pages
  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];
    doc.addPage();

    // Header bar
    doc.rect(0, 0, doc.page.width, 35).fill('#8B3A00');
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
       .text(`${i + 1}. ${s.label}`, 40, 10);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(`LegacyNest TM — Confidential`, doc.page.width - 280, 14);

    // Find and embed screenshot
    const imgPath = findScreenshot(s.id);
    if (imgPath) {
      try {
        const imgMargin = 40;
        const imgTop = 50;
        const maxW = doc.page.width - imgMargin * 2;
        const maxH = doc.page.height - imgTop - 60;
        doc.image(imgPath, imgMargin, imgTop, { fit: [maxW, maxH], align: 'center' });
      } catch (e) {
        doc.fillColor('red').fontSize(10).text(`[Image not available: ${s.id}]`, 40, 60);
      }
    } else {
      doc.fillColor('#999').fontSize(10).text(`[Screenshot not found: ${s.id}]`, 40, 60);
    }

    // Footer
    doc.fillColor('#999').fontSize(7)
       .text(`Screen ${i + 1} of ${screenshots.length} — LegacyNest IP Documentation — ${new Date().toLocaleDateString('en-IN')}`,
             40, doc.page.height - 30, { align: 'center' });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  console.log('PDF generated:', outputPath);
  console.log('Size:', fs.statSync(outputPath).size, 'bytes');
}

generatePDF().catch(console.error);
