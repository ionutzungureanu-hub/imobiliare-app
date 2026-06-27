import { useRef, useState } from 'react'
import { uploadDocument, formatBytes } from '../services/cloudinaryService'

/**
 * Reusable document upload component
 * Props:
 *   value       — current URL string
 *   onChange    — (url, meta) => void
 *   label       — field label
 *   folder      — cloudinary folder
 *   accept      — file types (default: PDF + images)
 */
export default function DocumentUpload({
  value, onChange, label = 'Document',
  folder = 'adminchirie', accept = '.pdf,.jpg,.jpeg,.png'
}) {
  const fileRef   = useRef()
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [meta,      setMeta]      = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setUploading(true)
    try {
      const result = await uploadDocument(file, folder)
      setMeta(result)
      onChange(result.url, result)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = '' // reset input
    }
  }

  const isPDF = value && (value.includes('.pdf') || value.includes('/pdf'))

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Upload button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
        >
          <i className={`ti ${uploading ? 'ti-refresh' : 'ti-upload'}`} />
          {uploading ? 'Se încarcă…' : value ? 'Înlocuiește' : 'Încarcă document'}
        </button>

        {/* View button */}
        {value && !uploading && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--blue)' }}
          >
            <i className={`ti ${isPDF ? 'ti-file-type-pdf' : 'ti-photo'}`}
               style={{ color: isPDF ? '#e53e3e' : 'var(--blue)' }} />
            {meta?.fileName || 'Vezi document'}
            {meta?.bytes && <span style={{ fontSize: 10, color: 'var(--slate)', marginLeft: 4 }}>
              ({formatBytes(meta.bytes)})
            </span>}
          </a>
        )}

        {/* Clear button */}
        {value && !uploading && (
          <button
            type="button"
            className="remove-btn"
            onClick={() => { onChange('', null); setMeta(null) }}
            title="Șterge document"
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Status */}
      {uploading && (
        <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-refresh" style={{ animation: 'spin 1s linear infinite' }} />
          Se încarcă pe Cloudinary…
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {!value && !uploading && (
        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
          Acceptă PDF, JPG, PNG — max 10 MB
        </div>
      )}
    </div>
  )
}
