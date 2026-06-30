// Topbar is now handled by Layout — this component is kept for compatibility
// Pages use the topbar-actions portal for their buttons
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Topbar({ title, subtitle, children }) {
  // Inject page title into layout topbar
  useEffect(() => {
    const el = document.querySelector('.topbar-left h1')
    if (el && title) el.textContent = title
    const sub = document.querySelector('.topbar-left p')
    if (subtitle) {
      if (sub) { sub.textContent = subtitle }
      else {
        const h = document.querySelector('.topbar-left h1')
        if (h) {
          const p = document.createElement('p')
          p.textContent = subtitle
          p.style.fontSize = '12px'
          p.style.color = 'var(--slate)'
          p.style.marginTop = '1px'
          h.after(p)
        }
      }
    }
  }, [title, subtitle])

  // Portal children (buttons) into topbar-right
  const target = document.getElementById('topbar-actions')
  if (!children || !target) return null
  return createPortal(children, target)
}
