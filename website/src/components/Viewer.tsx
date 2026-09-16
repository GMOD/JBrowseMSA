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
  return desktop ? (
    <Suspense fallback={<div style={{ height: 390 }} />}>
      <LiveViewer />
    </Suspense>
  ) : (
    <a href={`${base}/demo/`}>
      <img
        src={`${base}/media/domain-loss.png`}
        alt="Multiple sequence alignment viewer with phylogenetic tree and protein domains"
      />
      Open the interactive viewer
    </a>
  )
}
