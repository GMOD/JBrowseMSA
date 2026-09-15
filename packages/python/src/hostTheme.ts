export type Mode = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * The notebook's own light or dark mode. JupyterLab and Notebook 7 set
 * `data-jp-theme-light` on the body. A VS Code notebook's webview sets
 * `data-vscode-theme-kind` (`vscode-dark`, `vscode-high-contrast`,
 * `vscode-light`, `vscode-high-contrast-light`). Any other host gets the
 * browser's `prefers-color-scheme`.
 */
export function hostTheme(doc: Document = document): Mode {
  const { jpThemeLight, vscodeThemeKind } = doc.body.dataset
  if (jpThemeLight !== undefined) {
    return jpThemeLight === 'false' ? 'dark' : 'light'
  }
  if (vscodeThemeKind !== undefined) {
    return vscodeThemeKind === 'vscode-dark' ||
      vscodeThemeKind === 'vscode-high-contrast'
      ? 'dark'
      : 'light'
  }
  return doc.defaultView?.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

/** call `onChange` whenever the host switches theme; returns a disposer */
export function watchHostTheme(
  onChange: () => void,
  doc: Document = document,
) {
  const observer = new MutationObserver(onChange)
  observer.observe(doc.body, {
    attributes: true,
    attributeFilter: ['data-jp-theme-light', 'data-vscode-theme-kind'],
  })
  const media = doc.defaultView?.matchMedia?.(DARK_QUERY)
  media?.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    media?.removeEventListener('change', onChange)
  }
}
