import { useRef, useState } from 'react'
import { uploadDocumentFirebase, formatBytes } from '../services/storageService'

export default function DocumentUpload({
  value, onChange, label = 'Document',
  folder = 'documente', accept = '.pdf,.jpg,.jpeg,.png'
}) {
  const fileRef    = useRef()
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [meta,      setMeta]      = useState(null)
  const [progress,  setProgress]  = useState('')

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validări
    const maxMB = 15
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Fișierul e prea mare (max ${maxMB} MB). Comprimă-l înainte.`)
      return
    }

    setError(''); setUploading(true)
    setProgress(file.type.startsWith('image/') ? 'Se comprimă imaginea…' : 'Se încarcă…')

    try {
      const result = await uploadDocumentFirebase(file, folder)
      setMeta(result)
      onChange(result.url, result)
      setProgress('')

      if (result.compressed) {
        const saved = Math.round((1 - result.bytes / result.originalBytes) * 100)
        setProgress(`✓ Comprimat cu ${saved}% (${formatBytes(result.originalBytes)} → ${formatBytes(result.bytes)})`)
      }
    } catch (err) {
      setError('Eroare upload: ' + err.message)
      setProgress('')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const isPDF = value && (value.includes('.pdf') || meta?.format === 'pdf')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm"
          onClick={() => fileRef.current.click()} disabled={uploading}>
          <i className={`ti ${uploading ? 'ti-refresh' : 'ti-upload'}`} />
          {uploading ? progress.replace('✓ ', '').split('(')[0] : value ? 'Înlocuiește' : 'Încarcă document'}
        </button>

        {value && !uploading && (
          <a href={value} target="_blank" rel="noreferrer"
            className="btn btn-ghost btn-sm" style={{ color: 'var(--blue)' }}>
            <i className={`ti ${isPDF ? 'ti-file-type-pdf' : 'ti-photo'}`}
              style={{ color: isPDF ? '#ef4444' : 'var(--blue)' }} />
            {meta?.fileName || 'Vezi document'}
            {meta?.bytes && <span style={{ fontSize: 10, color: 'var(--slate)', marginLeft: 4 }}>
              ({formatBytes(meta.bytes)})
            </span>}
          </a>
        )}

        {value && !uploading && (
          <button type="button" className="remove-btn"
            onClick={() => { onChange('', null); setMeta(null); setProgress('') }}
            title="Șterge document">
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        )}

        <input ref={fileRef} type="file" accept={accept}
          onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {/* Status messages */}
      {uploading && (
        <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-refresh" style={{ animation: 'spin 1s linear infinite' }} />
          {progress}
        </div>
      )}
      {progress && !uploading && (
        <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>{progress}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      {!value && !uploading && (
        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
          PDF, JPG, PNG — max 15 MB · Imaginile se comprimă automat
        </div>
      )}
    </div>
  )
}
