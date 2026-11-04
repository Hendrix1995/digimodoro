// WebView2 (Windows) keeps browser shortcuts such as F5/Ctrl+R (reload) and
// Ctrl+P (print). Reloading the pet window wipes the running focus session, so
// these are disabled in every app window.
export function blockBrowserShortcuts(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (key === 'f5' || (mod && (key === 'r' || key === 'p'))) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    true,
  )
}
