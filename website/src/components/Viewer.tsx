import { Suspense, lazy, useSyncExternalStore } from 'react'

// react-msaview is a large canvas + MUI bundle. Load it lazily, and only when
// the viewport is desktop-sized: phones get a static screenshot linking to the
// full demo instead of downloading the whole app.
const LiveViewer = lazy(() => import('./LiveViewer'))

const desktopQuery = window.matchMedia('(min-width: 641px)')
const subscribe = (cb: () => void) => {
  desktopQuery.addEventListener('change', cb)
  return () => {
    desktopQuery.removeEventListener('change', cb)
  }
}

export default function Viewer({ base }: { base: string }) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => desktopQuery.matches,
    () => false,
  )
  const box = { border: '1px solid var(--border)', borderRadius: 6 }
  return desktop ? (
    <>
      <p>A live viewer, running right here on the page:</p>
      <Suspense fallback={<div style={{ ...box, height: 400 }} />}>
        <LiveViewer />
      </Suspense>
    </>
  ) : (
    <a
      href={`${base}/demo/`}
      style={{
        display: 'block',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        ...box,
      }}
    >
      <img
        src={`${base}/media/colorscheme-clustalx.png`}
        alt="Multiple sequence alignment viewer with phylogenetic tree"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
      <span
        style={{
          display: 'block',
          padding: '10px 12px',
          color: 'var(--accent)',
          fontWeight: 600,
        }}
      >
        Open the full interactive demo →
      </span>
    </a>
  )
}
