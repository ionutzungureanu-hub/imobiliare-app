// Storage via Google Drive link — no Firebase Storage needed
// User uploads PDF to Google Drive, shares it, and pastes the link here

export const validateDriveLink = (url) => {
  if (!url) return false
  return url.includes('drive.google.com') || url.includes('docs.google.com')
}

export const formatDriveLink = (url) => {
  // Convert share link to direct view link if needed
  if (!url) return ''
  // Already a view link
  if (url.includes('/view')) return url
  // Convert /file/d/ID/edit to /file/d/ID/view
  return url.replace('/edit', '/view')
}
