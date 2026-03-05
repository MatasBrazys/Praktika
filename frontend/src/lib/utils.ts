// src/lib/utils.ts
// Shared utility functions used across the application.

// Delays calling fn until ms milliseconds have passed since the last call.
// Used for CRM lookup to avoid firing on every keystroke.
export function debounce<Args extends unknown[]>(
  fn:  (...args: Args) => void,
  ms:  number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// Triggers a CSV file download in the browser from a string content.
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), {
    href:     url,
    download: filename,
  })
  link.click()
  URL.revokeObjectURL(url)
}