import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import fs from 'fs';

const borderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

const borderThin = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
};

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, bottom: 1200, left: 1400, right: 1400 }
      }
    },
    children: [
      new Paragraph({
        text: "MINI-PROJECT SHORT TECHNICAL REPORT",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Course: ", bold: true }),
          new TextRun("Cross-Platform Mobile App Development (VKU)\n"),
          new TextRun({ text: "Mini-Project Title: ", bold: true }),
          new TextRun("Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)\n"),
          new TextRun({ text: "Student Name: ", bold: true }),
          new TextRun("Nguyễn Thái Sơn (Student ID: 23IT.EB086)\n"),
          new TextRun({ text: "Submission Date: ", bold: true }),
          new TextRun("03/09/2026"),
        ],
        spacing: { after: 300 }
      }),

      // Section 1
      new Paragraph({
        text: "1. GENERAL INFORMATION & DELIVERABLE LINKS",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Student: ", bold: true }),
          new TextRun("Nguyễn Thái Sơn — ID: 23IT.EB086 — Role: Fullstack Architecture & Capacitor Integration (100%)\n"),
          new TextRun({ text: "• Live Demo PWA URL: ", bold: true }),
          new TextRun("https://vku-survey.pages.dev\n"),
          new TextRun({ text: "• GitHub Repository: ", bold: true }),
          new TextRun("https://github.com/nguyenthaison2408/vku-survey\n"),
          new TextRun({ text: "• Milestones: ", bold: true }),
          new TextRun("Phase 1: Web PWA (Week 3) | Phase 2: Capacitor Native Android APK (Week 4)"),
        ],
        spacing: { after: 250 }
      }),

      // Section 2
      new Paragraph({
        text: "2. FEATURE IMPLEMENTATION CHECKLIST",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        text: "Phase 1: Web Progressive Web App (Offline-First)",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 }
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Details & Acceptance", bold: true })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("1.1")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Responsive Mobile Viewport & PWA Standalone")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("100% responsive Tailwind CSS, VKU theme palette. PWA manifest with display: standalone, custom 192/512 icons, theme color #0284c7.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("1.2")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Service Worker Cache-First App Shell")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Pre-caches App Shell via vite-plugin-pwa (injectManifest). Loads offline in < 1s. Auto updates with skipWaiting().")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("1.3")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Local Offline Persistence (IndexedDB)")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Uses idb with 3 object stores: surveys, drafts, settings. Auto-saves draft state in real time across 5 form steps.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("1.4")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Offline Queue & Background Sync")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Surveys submitted offline set to PENDING_SYNC. Auto-dispatched on reconnection via window.ononline & SW sync event.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("1.5")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Cloudflare Pages & Google Sheets")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Live at https://vku-survey.pages.dev. Form automatically appends rows to Google Sheets & uploads photos to Google Drive.")] }),
            ]
          }),
        ]
      }),

      new Paragraph({
        text: "Phase 2: Capacitor Native Android Application",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, width: { size: 10, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })] }),
              new TableCell({ borders: borderThin, width: { size: 40, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Details & Acceptance", bold: true })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("2.1")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Capacitor Native Android Platform")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Configured @capacitor/core and @capacitor/android. Native project generated in android/ with full Gradle build pipeline.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("2.2")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Native Hardware Camera API")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Uses @capacitor/camera with CAMERA and STORAGE permissions in AndroidManifest.xml. Auto-compresses JPEG photos.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("2.3")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Native Network Monitoring")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Uses @capacitor/network to monitor Android OS network state changes and trigger sync queue immediately.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("2.4")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Cross-Platform Fallback")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Transparent fallback to HTML5 file input when running in mobile browsers without Capacitor bridge.")] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders: borderThin, children: [new Paragraph("2.5")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Android APK Compilation")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Complete [PASS]")] }),
              new TableCell({ borders: borderThin, children: [new Paragraph("Verified build via gradlew assembleDebug & Android Studio. Ready for installation on physical Android devices.")] }),
            ]
          }),
        ]
      }),

      // Section 3
      new Paragraph({
        text: "3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun("The application architecture cleanly separates the offline-first web core (Phase 1) from the native Capacitor runtime layer (Phase 2):\n\n"),
          new TextRun({ text: "• Web Core (src/): ", bold: true }),
          new TextRun("Contains the TypeScript Single Page Application. Key modules include db.ts (IndexedDB wrapper managing surveys, drafts, and settings stores), sw.ts (Service Worker implementing Cache-First precaching and background sync), sync.ts (sequential sync engine for Google Sheets), and survey.ts (5-step form wizard with continuous draft persistence).\n\n"),
          new TextRun({ text: "• Native Layer (android/): ", bold: true }),
          new TextRun("Android Studio project wrapping the built web assets (android/app/src/main/assets/public). Configured with AndroidManifest.xml permissions for Camera and Network states.\n\n"),
          new TextRun({ text: "• State & Sync Flow: ", bold: true }),
          new TextRun("Form input -> Auto-save draft in IndexedDB -> Submit -> Status PENDING_SYNC -> Reconnection event -> Sequential HTTP POST to Google Apps Script -> Status updated to SYNCED with syncedAt timestamp."),
        ],
        spacing: { after: 200 }
      }),

      // Section 4
      new Paragraph({
        text: "4. EMPIRICAL EVIDENCE & TEST VERIFICATION",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Test 1 (Offline Boot): ", bold: true }),
          new TextRun("Tested with Chrome DevTools offline mode. The application boots and renders interactive dashboard in < 500ms.\n"),
          new TextRun({ text: "• Test 2 (Draft Preservation): ", bold: true }),
          new TextRun("Completed steps 1-3, closed tab and reopened. All building selections, condition ratings, and room inputs were 100% restored.\n"),
          new TextRun({ text: "• Test 3 (Offline Queue & Automatic Sync): ", bold: true }),
          new TextRun("Submitted a complete inspection with camera photo while offline. Marked as PENDING_SYNC. Restoring network immediately pushed data to Google Sheets and marked status as SYNCED.\n"),
          new TextRun({ text: "• Test 4 (Capacitor Android Hardware): ", bold: true }),
          new TextRun("Tested on Android device. Native camera triggered successfully with permission prompt and real-time image preview."),
        ],
        spacing: { after: 200 }
      }),

      // Section 5
      new Paragraph({
        text: "5. TECHNICAL CHALLENGES & RESOLUTIONS",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "1. Service Worker Cache Invalidation on Production Deploy: ", bold: true }),
          new TextRun("Added self.skipWaiting() on SW install event and controllerchange listener in main.ts to guarantee instant updates on Cloudflare Pages.\n\n"),
          new TextRun({ text: "2. Star Rating Pointer Detachment: ", bold: true }),
          new TextRun("Refactored star-rating.ts to maintain static DOM and dynamically update SVG fill, preventing click cancellation during fast touch input.\n\n"),
          new TextRun({ text: "3. Google Apps Script CORS Redirection: ", bold: true }),
          new TextRun("Configured no-cors mode in sync.ts with form URL-encoded payload to handle Google's 302 redirect chain cleanly."),
        ],
        spacing: { after: 200 }
      }),
    ]
  }]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('VKU_Survey_Technical_Report.docx', buffer);
  console.log('VKU_Survey_Technical_Report.docx generated successfully.');
});
