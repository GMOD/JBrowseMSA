/**
 * FileSaver.js
 * A saveAs() FileSaver implementation.
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 * source: http://purl.eligrey.com/github/FileSaver.js
 *
 * Vendored and converted to ESM/TypeScript for pure ESM compatibility.
 */

function click(node: HTMLAnchorElement) {
  try {
    node.dispatchEvent(new MouseEvent('click'))
  } catch {
    const evt = document.createEvent('MouseEvents')
    evt.initMouseEvent(
      'click',
      true,
      true,
      window,
      0,
      0,
      0,
      80,
      20,
      false,
      false,
      false,
      false,
      0,
      null,
    )
    node.dispatchEvent(evt)
  }
}

// Detect WebView inside a native macOS app by ruling out all browsers
const isMacOSWebView =
  typeof navigator !== 'undefined' &&
  /Macintosh/.test(navigator.userAgent) &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Safari/.test(navigator.userAgent)

export function saveAs(blob: Blob | string, name?: string) {
  if (typeof window === 'undefined') {
    return
  }

  const URL = window.URL || window.webkitURL
  const a = document.createElement('a')
  name = name || (blob instanceof Blob ? 'download' : 'download')

  // Use download attribute if available and not macOS WebView
  if ('download' in HTMLAnchorElement.prototype && !isMacOSWebView) {
    a.download = name
    a.rel = 'noopener'

    if (typeof blob === 'string') {
      a.href = blob
      click(a)
    } else {
      a.href = URL.createObjectURL(blob)
      setTimeout(() => URL.revokeObjectURL(a.href), 40000)
      setTimeout(() => click(a), 0)
    }
    return
  }

  // Fallback for browsers without download attribute support
  if (typeof blob === 'string') {
    window.open(blob, '_blank')
    return
  }

  const isSafari =
    /constructor/i.test((window as unknown as { HTMLElement: unknown }).HTMLElement?.toString() ?? '') ||
    !!(window as unknown as { safari?: unknown }).safari
  const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent)

  if ((isChromeIOS || isSafari || isMacOSWebView) && typeof FileReader !== 'undefined') {
    const reader = new FileReader()
    reader.onloadend = () => {
      let url = reader.result as string
      url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, 'data:attachment/file;')
      window.open(url, '_blank')
    }
    reader.readAsDataURL(blob)
  } else {
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 40000)
  }
}
