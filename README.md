# VKU Field Survey — Offline Data Collection App

> 📱 PWA + Capacitor Android | Offline-First | IndexedDB + Background Sync

Ứng dụng thu thập dữ liệu kiểm tra cơ sở vật chất VKU hoạt động hoàn toàn offline, hỗ trợ cài đặt standalone, và đồng bộ tự động khi có mạng.

---

## ✨ Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| 🔵 **PWA Standalone** | `manifest.json` + Service Worker Cache-First, cài đặt như app thật |
| 📝 **Form 5 bước** | Vị trí → Loại thiết bị → Đánh giá sao → Ghi chú → Ảnh |
| 💾 **IndexedDB Draft** | Tự động lưu nháp real-time, không mất dữ liệu khi refresh |
| 📴 **Offline Queue** | Submit offline → `PENDING_SYNC` → tự sync khi có mạng |
| 🔄 **Background Sync** | Background Sync API + `window.ononline` để dispatch tự động |
| 📷 **Camera** | Capacitor native camera (Android) + `<input type="file">` fallback |
| 📡 **Network Monitor** | Real-time status bar + Capacitor Network plugin |

---

## 🚀 Khởi chạy

### Web PWA

```bash
# Cài đặt dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

### Android APK (Capacitor)

```bash
# 1. Build web app
npm run build

# 2. Thêm platform Android (chỉ cần làm 1 lần)
npx cap add android

# 3. Sync web assets
npx cap sync android

# 4. Mở Android Studio để build APK
npx cap open android
```

> **Yêu cầu:** Android Studio, Android SDK, Java 17+

---

## 🏗️ Kiến trúc

```
src/
├── main.ts           # Entry: SW registration, routes, init
├── sw.ts             # Service Worker: Cache-First + Background Sync
├── db.ts             # IndexedDB: surveys, drafts, settings
├── sync.ts           # Offline queue + dispatch logic
├── camera.ts         # Capacitor Camera + web fallback
├── network.ts        # Network monitoring (Capacitor + web)
├── router.ts         # Hash-based SPA router
├── style.css         # Tailwind CSS + VKU theme
├── pages/
│   ├── home.ts       # Dashboard: stats + recent surveys
│   ├── survey.ts     # 5-step inspection form
│   └── history.ts    # All surveys with filter tabs
└── components/
    ├── toast.ts      # Toast notifications
    └── star-rating.ts # Interactive star rating
```

---

## 📊 IndexedDB Schema

```typescript
// Database: vku-survey-db, version: 1

Survey {
  id: string           // UUID (crypto.randomUUID)
  status: 'DRAFT' | 'PENDING_SYNC' | 'SYNCED'
  building: string     // Tòa nhà
  floor: string        // Tầng
  room: string         // Số phòng
  category: 'Hardware' | 'Projector' | 'AC' | 'Electrical' | 'Furniture'
  rating: 1 | 2 | 3 | 4 | 5
  notes: string        // Ghi chú lỗi
  photoBase64: string | null  // Ảnh dưới dạng base64 JPEG
  createdAt: string    // ISO 8601
  syncedAt: string | null
  syncAttempts: number
}
```

---

## 🔄 Offline Sync Flow

```
1. User fill form offline
       ↓
2. Submit → saveSurvey(status: 'PENDING_SYNC')
       ↓
3. registerBackgroundSync('sync-surveys')
       ↓
4. Network restored?
   ├─ window.ononline → processSyncQueue()
   └─ SW 'sync' event → postMessage → processSyncQueue()
       ↓
5. POST to API endpoint (sequential)
       ↓
6. status → 'SYNCED', syncedAt = now
```

---

## 📱 Capacitor Plugins

| Plugin | Dùng cho |
|--------|---------|
| `@capacitor/camera` | Chụp ảnh native / chọn từ thư viện |
| `@capacitor/network` | Theo dõi trạng thái mạng real-time |

---

## 🔧 Cấu hình

### Thay đổi API endpoint
Sửa `API_ENDPOINT` trong [`src/sync.ts`](./src/sync.ts#L8):
```typescript
const API_ENDPOINT = 'https://your-backend.com/api/surveys'
```

### Thêm tòa nhà mới
Sửa mảng `BUILDINGS` trong [`src/pages/survey.ts`](./src/pages/survey.ts#L29):
```typescript
const BUILDINGS = ['Nhà A', 'Nhà B', ...]
```

---

## 🎯 PWA Requirements Checklist

- [x] `manifest.json` với `display: standalone`
- [x] `theme_color: #0284c7`
- [x] Icons 192×192 và 512×512
- [x] Service Worker với Cache-First strategy
- [x] HTTPS (required for production)
- [x] Offline-capable
- [x] Installable prompt

---

*VKU Field Survey — VKU University, Da Nang, Vietnam*
