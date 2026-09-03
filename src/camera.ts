// ── Camera Module ─────────────────────────────────────────────────────────
// Provides unified camera access:
//   • Capacitor @capacitor/camera on native Android
//   • <input type="file" capture> fallback on web browsers

let capacitorCamera: typeof import('@capacitor/camera') | null = null

// Lazy-load Capacitor camera if available
async function getCapacitorCamera() {
  if (capacitorCamera) return capacitorCamera
  try {
    capacitorCamera = await import('@capacitor/camera')
    return capacitorCamera
  } catch {
    return null
  }
}

export interface CaptureResult {
  base64: string
  mimeType: string
}

// ── Native Camera (Capacitor) ──────────────────────────────────────────────

async function captureNative(): Promise<CaptureResult | null> {
  const cam = await getCapacitorCamera()
  if (!cam) return null

  try {
    const { Camera, CameraResultType, CameraSource } = cam
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt, // Camera or Photo Library
      quality: 70,
      width: 1280,
      correctOrientation: true,
      allowEditing: false
    })

    if (!photo.base64String) return null

    return {
      base64: `data:image/${photo.format};base64,${photo.base64String}`,
      mimeType: `image/${photo.format}`
    }
  } catch (err: unknown) {
    // User cancelled
    if (err instanceof Error && err.message.includes('cancelled')) return null
    if (err instanceof Error && err.message.includes('canceled')) return null
    throw err
  }
}

// ── Web Fallback Camera ────────────────────────────────────────────────────

function captureWeb(): Promise<CaptureResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      // Compress the image
      const compressed = await compressImage(file, 1280, 0.75)
      resolve({
        base64: compressed,
        mimeType: file.type
      })
    }

    input.oncancel = () => resolve(null)

    // Fallback if oncancel doesn't fire
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!input.files?.length) resolve(null)
      }, 500)
    }, { once: true })

    input.click()
  })
}

// ── Image Compression ──────────────────────────────────────────────────────

function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }

    img.src = url
  })
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function capturePhoto(): Promise<CaptureResult | null> {
  // Check if running inside Capacitor native context
  const isNative = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative

  if (isNative) {
    return captureNative()
  } else {
    return captureWeb()
  }
}

export function isNativePlatform(): boolean {
  return !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative
}
