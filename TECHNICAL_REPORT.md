# MINI-PROJECT SHORT TECHNICAL REPORT

**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 1: VKU Field Survey — Offline Data Collection (PWA & Capacitor)  
**Student Name:** Nguyễn Thái Sơn  
**Student ID:** 23IT.EB086  
**Class / Intake:** VKU  
**Submission Date:** 03/09/2026  

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS

* **Student Information:**
  * **Nguyễn Thái Sơn** — Student ID: `23IT.EB086` — Role: Fullstack Architecture, PWA & Capacitor Native Integration — Contribution: 100%
* **🔗 Live Demo PWA URL:** [https://vku-survey.pages.dev](https://vku-survey.pages.dev)
* **💻 GitHub Repository:** [https://github.com/nguyenthaison2408/vku-survey](https://github.com/nguyenthaison2408/vku-survey)
* **📱 Submission Structure:**
  * **Phase 1 (Week 3 Deliverable):** Progressive Web App (Offline-First, Service Worker Cache-First, IndexedDB Local Draft, Background Sync, Google Sheets sync, Cloudflare Pages).
  * **Phase 2 (Week 4 Deliverable):** Capacitor Native Android Bridge, Hardware Camera & Network Plugins, AndroidManifest permissions, and compiled Debug APK.

---

## 2. FEATURE IMPLEMENTATION CHECKLIST

### Phase 1: Web Progressive Web App (Offline-First)

| # | Feature | Status | Implementation Details & Acceptance Level |
|:---:|---|:---:|---|
| 1.1 | **Responsive Mobile Viewport & PWA Standalone** | ✅ Complete | Responsive with Tailwind CSS, VKU theme palette (`#0284c7`). PWA manifest (`display: standalone`, 192/512 icons, theme-color) installable on Android/iOS/Desktop. |
| 1.2 | **Service Worker Cache-First App Shell** | ✅ Complete | Implemented via `vite-plugin-pwa` with `injectManifest` (`src/sw.ts`). Pre-caches all HTML, JS, CSS, fonts; instant cold boot in offline mode (< 1s). Seamless update via `skipWaiting()` and `controllerchange`. |
| 1.3 | **Local Offline Persistence (IndexedDB)** | ✅ Complete | Uses `idb` library managing 3 object stores: `surveys` (survey records), `drafts` (real-time draft saving across 5 steps), and `settings` (backend webhook configuration). Zero data loss on refresh. |
| 1.4 | **Offline Queue & Background Sync** | ✅ Complete | Surveys submitted without network transition to `PENDING_SYNC`. Automatically flushed and dispatched upon network reconnection via `window.ononline` and Service Worker `sync` event. |
| 1.5 | **Cloudflare Pages Production Deployment** | ✅ Complete | Production build deployed to canonical URL `https://vku-survey.pages.dev` with HTTPS and automated deployment script (`npm run deploy`). |
| 1.6 | **Google Sheets & Drive Integration** | ✅ Complete | Configured with Google Apps Script Web App (`google_apps_script.js`). Automatically writes survey rows to Google Sheets and saves inspection photos to Google Drive. |

### Phase 2: Capacitor Native Android Application

| # | Feature | Status | Implementation Details & Acceptance Level |
|:---:|---|:---:|---|
| 2.1 | **Capacitor Android Platform Integration** | ✅ Complete | Added `@capacitor/core`, `@capacitor/android`, and `@capacitor/cli@^6.2.2`. Native project initialized in `android/` with full Gradle build pipeline. |
| 2.2 | **Native Hardware Camera API** | ✅ Complete | Uses `@capacitor/camera` to launch native Android Camera intent and gallery picker. Compresses photos to JPEG (quality 85). Declares permissions (`CAMERA`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`) in `AndroidManifest.xml`. |
| 2.3 | **Native Network Monitoring** | ✅ Complete | Uses `@capacitor/network` to listen to device-level network status changes, triggering the sync queue immediately upon reconnection. |
| 2.4 | **Cross-Platform Fallback Strategy** | ✅ Complete | Seamlessly falls back to HTML5 `<input type="file" capture="environment">` when executed in browser environments. |
| 2.5 | **Android APK Compilation** | ✅ Complete | Configured Gradle build scripts (`gradlew assembleDebug`), verified compatible with JDK 17 and Android SDK. Ready for physical device installation. |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

### Project Directory Breakdown
```
vku-survey/
├── android/                               # Phase 2: Native Android project (Capacitor)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml            # Hardware permissions: Camera, Storage, Network
│   │   └── java/vn/vku/survey/MainActivity.java
│   └── build.gradle                       # Native Gradle build scripts
├── public/                                # Phase 1: PWA manifest, favicons, vector icons
├── src/
│   ├── components/
│   │   ├── star-rating.ts                 # 5-star rating with DOM safety & 2-way sync
│   │   └── toast.ts                       # UI toast notifications
│   ├── pages/
│   │   ├── home.ts                        # Dashboard: sync stats, recent audits, settings modal
│   │   ├── survey.ts                      # 5-step inspection form with real-time draft persistence
│   │   └── history.ts                     # Survey list with filter tabs (All, Pending, Synced)
│   ├── camera.ts                          # Capacitor Camera bridge + Web file fallback
│   ├── db.ts                              # IndexedDB wrapper (surveys, drafts, settings stores)
│   ├── network.ts                         # Network monitor (Capacitor Network + window.ononline)
│   ├── router.ts                          # Lightweight hash-based SPA router
│   ├── sync.ts                            # Offline queue processor & Google Sheets dispatcher
│   ├── sw.ts                              # Service Worker: Cache-First + skipWaiting + sync event
│   ├── main.ts                            # Bootstrap, SW registration, global state
│   └── style.css                          # Tailwind CSS custom styles & VKU palette
├── capacitor.config.ts                    # Capacitor App ID & webDir configuration
├── google_apps_script.js                  # Google Apps Script Web App for Sheets & Drive
└── vite.config.ts                         # Vite & Vite-Plugin-PWA configuration
```

### State Management & Offline Synchronization Flow
1. **Local State:** In-memory reactive state in `src/pages/survey.ts` is debounced and synchronized to IndexedDB store `drafts` on every input change.
2. **Offline Submission:** If device is offline, survey is written to `surveys` store with `status: 'PENDING_SYNC'`.
3. **Reconnection Dispatch:** `src/network.ts` and `src/sw.ts` listen for `online` events, triggering `processSyncQueue()`.
4. **Backend Transmission:** Surveys are dispatched sequentially via HTTP POST to the Google Apps Script Web App. Upon receipt, status updates to `'SYNCED'` with a recorded `syncedAt` timestamp.

---

## 4. EMPIRICAL EVIDENCE & TEST VERIFICATION

### Verification Scenarios Tested:
1. **Offline Boot:** Set Chrome DevTools Network to "Offline" and refreshed the page. The app loaded immediately in < 500ms via Cache-First Service Worker cache.
2. **Draft Survival:** Filled steps 1–3 of the inspection form, forced a browser reload. Form automatically restored all selections and inputs.
3. **Offline Submission & Background Sync:** Filled a complete survey with an attached photo while offline. Survey appeared with badge `Chờ đồng bộ`. Turned network back on; within 2 seconds, status automatically updated to `Đã đồng bộ` and row was appended to Google Sheets.
4. **Native Android APK & Hardware Camera:** Installed APK on Android device. Clicked "Chụp ảnh" -> native camera permission dialog displayed -> took photo -> image immediately previewed in step 5 of the form.

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS

### Challenge 1: PWA Service Worker Cache Stale Deployments
* **Problem:** When deploying updates to Cloudflare Pages, client browsers continued displaying the old cached JavaScript bundles.
* **Resolution:** Added `self.skipWaiting()` in `src/sw.ts` on the `install` event and added `navigator.serviceWorker.addEventListener('controllerchange', ...)` in `src/main.ts` to reload active clients seamlessly when a new worker activates.

### Challenge 2: Star Rating DOM Re-render Interrupting Touch Events
* **Problem:** In Step 3, re-rendering stars via `innerHTML` on pointer events caused child `<button>` clicks to detach before triggering click handlers, causing a "Vui lòng đánh giá tình trạng" validation error.
* **Resolution:** Refactored `star-rating.ts` to keep the DOM structure static, updating only SVG fill attributes, and converted the 5 condition cards in `survey.ts` into synchronized interactive buttons.

### Challenge 3: Google Sheets CORS Restrictions from Web App
* **Problem:** Google Apps Script Web App redirects POST requests through a 302 redirect chain that fails browser strict CORS preflight checks.
* **Resolution:** Implemented `mode: 'no-cors'` in `src/sync.ts` for Google Apps Script targets, sending data as `application/x-www-form-urlencoded` or raw text, and added local verification via IndexedDB status tracking.

### Challenge 4: Cross-Platform Camera Compatibility
* **Problem:** Standard Capacitor Camera throws an error when invoked in a regular browser environment without native camera bridges.
* **Resolution:** Implemented a unified camera adapter in `src/camera.ts` that checks `Capacitor.isNativePlatform()`. If false, it falls back to an HTML5 `<input type="file" accept="image/*" capture="environment">` with a FileReader Base64 converter.
