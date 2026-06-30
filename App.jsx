import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase/config'

// ── Comprimare imagini în browser ─────────────────────────────
async function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Calculează dimensiunile
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width)
        width  = maxWidth
      }
      // Desenează pe canvas
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      // Exportă ca JPEG comprimat
      canvas.toBlob(blob => {
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.src = url
  })
}

// ── Upload document în Firebase Storage ───────────────────────
export async function uploadDocumentFirebase(file, folder = 'documente') {
  let fileToUpload = file
  let compressed   = false
  const sizeMB     = file.size / (1024 * 1024)

  // Comprimă imaginile automat
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file)
      compressed   = true
    } catch { /* dacă eșuează, uploadăm originalul */ }
  }

  // Generează path unic
  const timestamp = Date.now()
  const safeName  = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path      = `${folder}/${timestamp}_${safeName}`

  // Upload în Firebase Storage
  const storageRef = ref(storage, path)
  const snapshot   = await uploadBytes(storageRef, fileToUpload)
  const url        = await getDownloadURL(snapshot.ref)

  return {
    url,
    path,
    fileName:     file.name,
    format:       fileToUpload.type.includes('pdf') ? 'pdf' : 'image',
    bytes:        fileToUpload.size,
    originalBytes: file.size,
    compressed,
    sizeMB:       (fileToUpload.size / (1024 * 1024)).toFixed(2),
  }
}

export async function deleteDocumentFirebase(path) {
  if (!path) return
  try {
    await deleteObject(ref(storage, path))
  } catch { /* ignore if already deleted */ }
}

export function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)        return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
