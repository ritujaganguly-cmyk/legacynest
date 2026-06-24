const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

const BASE_URL = 'https://www.legacynest.co.in';

const screens = [
  { route: '/',                    label: '01 — Landing Page',                  fullPage: true  },
  { route: '/sign-in',             label: '02 — Sign In',                       fullPage: false },
  { route: '/dashboard',           label: '03 — Dashboard',                     fullPage: true  },
  { route: '/child-profile',       label: '04 — Child Profile',                 fullPage: true  },
  { route: '/parent-profile',      label: '05 — Parent Profile',                fullPage: true  },
  { route: '/care-circle',         label: '06 — Care Circle',                   fullPage: true  },
  { route: '/medical',             label: '07 — Medical Management',            fullPage: true  },
  { route: '/insurance-policies',  label: '08 — Insurance Policies',            fullPage: true  },
  { route: '/financial',           label: '09 — Financial Planning',            fullPage: true  },
  { route: '/legal',               label: '10 — Legal Planning',                fullPage: true  },
  { route: '/residential',         label: '11 — Residential Planning',          fullPage: true  },
  { route: '/emergency',           label: '12 — Emergency Continuity Plan',     fullPage: true  },
  { route: '/vault',               label: '13 — Digital Vault',                 fullPage: true  },
  { route: '/succession',          label: '14 — Succession Planning',           fullPage: true  },
  { route: '/caregiver',           label: '15 — Caregiver Succession',          fullPage: true  },
  { route: '/ai-assistant',        label: '16 — AI Advisory Hub',               fullPage: true  },
  { route: '/action-plan',         label: '17 — Personalized Action Plan',      fullPage: true  },
  { route: '/disability-documents',label: '18 — Disability Documents',          fullPage: true  },
  { route: '/settings',            label: '19 — Account & Security Settings',   fullPage: true  },
];

async function buildPDF(imageFiles) {
  const outputPath = path.join(__dirname, 'LegacyNest-UI-Design-Copyright-Evidence.pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 30, info: {
    Title: 'LegacyNest — UI Design Copyright Evidence',
    Author: 'LegacyNest',
    Subject: 'Original UI Design Documentation',
  }});

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FEF3EA');
  doc.fillColor('#8B3A00').fontSize(32).font('Helvetica-Bold')
     .text('LegacyNest', 0, 100, { align: 'center', width: doc.page.width });
  doc.fontSize(16).font('Helvetica')
     .text('UI Design & Screen Documentation', 0, 145, { align: 'center', width: doc.page.width });
  doc.moveDown(3);
  doc.fontSize(12).fillColor('#333')
     .text('Prepared for Copyright Registration under the Copyright Act, 1957', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(11).fillColor('#555')
     .text('LegacyNest TM 2026', { align: 'center' })
     .text('All Rights Reserved', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#666')
     .text(`Date of Documentation: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' })
     .text('Live Application: https://www.legacynest.co.in', { align: 'center' })
     .text('https://www.legacynest.co.in', { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(9).fillColor('#888')
     .text('This document contains original screenshots of the LegacyNest application, submitted as evidence for copyright registration.', { align: 'center' })
     .text('Submitted as evidence of original authorship for copyright registration.', { align: 'center' });

  // Screen pages
  for (const { file, label, index, total } of imageFiles) {
    doc.addPage();
    // Header
    doc.rect(0, 0, doc.page.width, 32).fill('#8B3A00');
    doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
       .text(label, 30, 9);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text(`LegacyNest`, doc.page.width - 200, 12);

    // Image — always fit within single page, no overflow
    if (fs.existsSync(file)) {
      const imgW = doc.page.width - 60;
      const imgH = doc.page.height - 70;
      doc.image(file, 30, 38, { fit: [imgW, imgH], align: 'center', valign: 'top' });
    } else {
      doc.fillColor('#ccc').fontSize(10).text('[Screenshot not available]', 30, 60);
    }

    // Footer
    doc.fillColor('#aaa').fontSize(7)
       .text(`Screen ${index} of ${total} — LegacyNest IP Documentation — ${new Date().toLocaleDateString('en-IN')}`,
             0, doc.page.height - 20, { align: 'center', width: doc.page.width });
  }

  doc.end();
  await new Promise((res, rej) => { stream.on('finish', res); stream.on('error', rej); });
  return outputPath;
}

async function run() {
  console.log('\n🚀 Opening browser — please sign in when prompted...\n');
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Go to sign-in and pre-fill email
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForSelector('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 15000 });
  await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'admin@legacynest.co.in');
  console.log('⏳ Email pre-filled. Please type your password and click Sign In...');

  // Wait until we land on /dashboard (sign-in complete)
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 300000 });
  console.log('✅ Signed in! Starting screenshots...\n');
  await page.waitForTimeout(2000);

  const imageFiles = [];

  for (let i = 0; i < screens.length; i++) {
    const { route, label, fullPage } = screens[i];
    const filename = `${label.replace(/[^a-z0-9]/gi, '_')}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);

    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: filepath, fullPage });
      console.log(`  ✓ ${label}`);
      imageFiles.push({ file: filepath, label, index: i + 1, total: screens.length });
    } catch (e) {
      console.log(`  ✗ ${label} — ${e.message}`);
      imageFiles.push({ file: filepath, label, index: i + 1, total: screens.length });
    }
  }

  await browser.close();

  console.log('\n📄 Building PDF...');
  const pdfPath = await buildPDF(imageFiles);
  console.log(`\n✅ Done! PDF saved to:\n   ${pdfPath}\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
