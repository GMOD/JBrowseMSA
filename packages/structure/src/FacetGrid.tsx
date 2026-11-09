import { useEffect, useRef, useState } from 'react'

import { observer } from 'mobx-react'

import { StructurePanel } from './StructurePanel.tsx'
import { cameraLink } from './cameraLink.ts'

import type { Facet } from './facets.ts'
import type { PolymerRepresentation } from './molstar.ts'
import type { StructureColor } from './paint.ts'
import type { Camera } from 'molstar/lib/mol-canvas3d/camera'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import type { MsaViewModel } from 'react-msaview'

export interface FacetGridProps {
  model: MsaViewModel
  facets: Facet[]
  /**
   * column-major 4x4 by structure id, from a superposition, so every facet
   * shares one frame
   */
  transforms?: Record<string, number[]>
  columns?: number
  /** height of one cell, in pixels */
  cellHeight?: number
  colorBy?: StructureColor
  representation?: PolymerRepresentation
  highlights?: boolean
}

/**
 * Small multiples of structures: one Mol* view per facet, each facet's
 * structures in its own color and all in one frame, with the cameras tied so
 * turning one turns every facet. Each cell is a separate WebGL context, so a
 * grid suits a handful of facets, not dozens.
 */
export const FacetGrid = observer(function FacetGrid({
  model,
  facets,
  transforms,
  columns = 3,
  cellHeight = 260,
  colorBy = 'none',
  representation,
  highlights = true,
}: FacetGridProps) {
  const [link] = useState(() => cameraLink<Camera.Snapshot>())
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // keyed by label, as the cells are, so a facet added in front does not
  // take over the registration of the one it displaced
  function register(label: string, plugin: PluginUIContext | undefined) {
    link.register(label, plugin?.canvas3d?.camera)
    // the cells finish loading and framing at different times, so the first
    // facet's frame is applied to the rest once the last one has registered
    clearTimeout(settle.current)
    if (facets.every(f => link.has(f.label))) {
      settle.current = setTimeout(() => {
        link.follow(facets[0]!.label)
      }, 1500)
    }
  }

  useEffect(
    () => () => {
      clearTimeout(settle.current)
      link.dispose()
    },
    [link],
  )

  return (
    <div
      data-testid="facet-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(columns, facets.length)}, minmax(0, 1fr))`,
        gap: 12,
      }}
    >
      {facets.map(facet => (
        <div
          key={facet.label}
          style={{ borderTop: `3px solid ${facet.color}`, paddingTop: 4 }}
        >
          <StructurePanel
            model={model}
            structureIds={facet.structureIds}
            transforms={transforms}
            solidColor={colorBy === 'none' ? facet.color : undefined}
            colorBy={colorBy}
            representation={representation}
            highlights={highlights}
            caption={`${facet.label} (${facet.rows.length})`}
            compact
            height={cellHeight}
            onPlugin={plugin => {
              register(facet.label, plugin)
            }}
          />
        </div>
      ))}
    </div>
  )
})
