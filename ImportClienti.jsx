// Cloudinary upload service — unsigned preset (no backend needed)
const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadDocument(file, folder = 'adminchirie') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary neconfigurat. Verifică variabilele de mediu.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('resource_type', 'auto') // suportă PDF + imagini

  // Use 'raw' for PDFs to ensure correct delivery URL
  const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const resourceType = isPDF ? 'raw' : 'image'

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Upload eșuat: ${res.status}`)
  }

  const data = await res.json()
  return {
    url:       data.secure_url,
    publicId:  data.public_id,
    format:    data.format,
    bytes:     data.bytes,
    fileName:  file.name,
  }
}

export function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
