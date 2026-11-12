import { Suspense, lazy, useEffect, useState } from 'react'

import { observer } from 'mobx-react'
import {
  StructurePanel,
  conservationRamp,
  noColumnColor,
} from 'react-msaview-structure/panel'

import { useDesktop } from '../lib/useDesktop'

import type {
  ColumnTrackSpec,
  Highlight,
  MsaViewModel,
  Region,
  ResidueMapping,
} from 'react-msaview'
import type { StructureColor } from 'react-msaview-structure/panel'

const defaultScheme = 'clustalx_protein_dynamic'

const alignmentSchemes = [
  { id: defaultScheme, label: 'ClustalX' },
  { id: 'jalview_hydrophobicity', label: 'Hydrophobicity' },
  { id: 'jalview_buried', label: 'Buried index' },
  { id: 'blosum62_dynamic', label: 'BLOSUM62 similarity' },
  { id: 'jalview_taylor', label: 'Taylor' },
]

const MSAViewer = lazy(() =>
  import('react-msaview').then(m => ({ default: m.MSAViewer })),
)

interface Layers {
  highlights?: Highlight[]
  columnTracks?: ColumnTrackSpec[]
  residueMappings?: ResidueMapping[]
}

function isLayers(value: unknown): value is Layers {
  return (
    typeof value === 'object' &&
    value !== null &&
    ['highlights', 'columnTracks', 'residueMappings'].every(
      key => !(key in value) || Array.isArray(Reflect.get(value, key)),
    )
  )
}

function isStructureColor(value: string): value is StructureColor {
  return value === 'none' || value === 'conservation' || value === 'scheme'
}

export interface Stop {
  label: string
  region: Region
}

export interface StructureLinkedViewerProps {
  msaUrl: string
  treeUrl?: string
  gffUrl?: string
  layersUrl: string
  structureUrl: string
  structureId: string
  focus?: Region
  stops?: Stop[]
  height?: number
}

function uri(url: string) {
  return { uri: url, locationType: 'UriLocation' as const }
}

const MappingNotes = observer(function MappingNotes({
  model,
  structureId,
}: {
  model: MsaViewModel
  structureId: string
}) {
  const mapped = model.mappedStructures.filter(
    m => m.structure.id === structureId,
  )
  return (
    <>
      <p className="structure-link-mapped">
        {mapped.length
          ? `Mapped: ${mapped.map(m => `${m.row} onto ${structureId} chain ${m.structure.asymId ?? '?'}`).join(', ')}`
          : `No row maps onto ${structureId} yet.`}
      </p>
      {model.residueMappingProblems.map(p => (
        <p
          key={`${p.row}-${p.structureId}-${p.reason}`}
          className="structure-link-problem"
          role="alert"
        >
          Ignored {p.scope} of {p.row} onto {p.structureId}: {p.reason}
        </p>
      ))}
    </>
  )
})

function StructureLegend({
  structureColor,
  schemeLabel,
}: {
  structureColor: StructureColor
  schemeLabel: string
}) {
  return (
    <div className="structure-link-legend">
      {structureColor === 'conservation' ? (
        <>
          <div>Conservation of the column</div>
          <div className="structure-link-ramp">
            {conservationRamp.map(color => (
              <span key={color} style={{ background: color }} />
            ))}
          </div>
          <div className="structure-link-ramp-labels">
            <span>0 variable</span>
            <span>1 conserved</span>
          </div>
        </>
      ) : (
        <div>Alignment colors: {schemeLabel}</div>
      )}
      <div className="structure-link-no-column">
        <span style={{ background: noColumnColor }} />
        {structureColor === 'conservation'
          ? 'No alignment column'
          : 'No alignment column, or no color there'}
      </div>
    </div>
  )
}

export function StructureLinkedViewer({
  msaUrl,
  treeUrl,
  gffUrl,
  layersUrl,
  structureUrl,
  structureId,
  focus,
  stops,
  height = 360,
  structureColor,
  colorScheme,
  schemePicks,
}: StructureLinkedViewerProps & {
  structureColor: StructureColor
  colorScheme: string
  /** each time the reader chooses an alignment scheme, the cells show it */
  schemePicks: number
}) {
  const [model, setModel] = useState<MsaViewModel>()
  const [layers, setLayers] = useState<Layers>({})
  const [layersError, setLayersError] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()
    fetch(layersUrl, { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((body: unknown) => {
        if (!isLayers(body)) {
          throw new Error('not a layers file')
        }
        setLayers(body)
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setLayersError(`Could not load ${layersUrl}: ${String(e)}`)
        }
      })
    return () => {
      controller.abort()
    }
  }, [layersUrl])

  // a layers file written before the panel read each mapping's own file url
  // names no file, so the page's structure url stands in for it
  const residueMappings = layers.residueMappings?.map(m => ({
    ...m,
    structure: { ...m.structure, url: m.structure.url ?? structureUrl },
  }))

  return (
    <div className="structure-link">
      {stops?.length ? (
        <div className="structure-link-stops">
          {stops.map(stop => (
            <button
              key={stop.label}
              type="button"
              disabled={!model}
              onClick={() => {
                model?.zoomToRegion(stop.region)
              }}
            >
              {stop.label}
            </button>
          ))}
        </div>
      ) : null}
      <Suspense fallback={<div style={{ height }} />}>
        <MSAViewer
          msaFilehandle={uri(msaUrl)}
          treeFilehandle={treeUrl ? uri(treeUrl) : undefined}
          gffFilehandle={gffUrl ? uri(gffUrl) : undefined}
          highlights={layers.highlights}
          columnTracks={layers.columnTracks}
          residueMappings={residueMappings}
          residueColor={{
            field: schemePicks > 0 ? 'residue' : 'feature',
            scale: { scheme: colorScheme },
          }}
          treeAreaWidth={150}
          height={height}
          region={focus}
          onModel={m => {
            m.setShowDomainLegend(false)
            setModel(m)
          }}
        />
      </Suspense>
      <div className="structure-link-canvas">
        {model ? (
          <StructurePanel
            model={model}
            structureId={structureId}
            colorBy={structureColor}
          />
        ) : (
          <div style={{ height: 400 }} />
        )}
        {structureColor !== 'none' ? (
          <StructureLegend
            structureColor={structureColor}
            schemeLabel={
              alignmentSchemes.find(s => s.id === colorScheme)?.label ??
              colorScheme
            }
          />
        ) : null}
      </div>
      {layersError ? (
        <p className="structure-link-problem" role="alert">
          {layersError}
        </p>
      ) : null}
      {model ? <MappingNotes model={model} structureId={structureId} /> : null}
    </div>
  )
}

export interface Dataset extends StructureLinkedViewerProps {
  id: string
  label: string
}

export default function StructureLinkedDatasets({
  datasets,
  fallbackSrc,
  fallbackAlt,
}: {
  datasets: Dataset[]
  fallbackSrc: string
  fallbackAlt: string
}) {
  const desktop = useDesktop()
  const [chosen, setChosen] = useState(datasets[0]?.id)
  const [structureColor, setStructureColor] = useState<StructureColor>('none')
  const [colorScheme, setColorScheme] = useState(defaultScheme)
  const [schemePicks, setSchemePicks] = useState(0)
  const dataset = datasets.find(d => d.id === chosen) ?? datasets[0]
  if (!desktop) {
    return (
      <figure>
        <img src={fallbackSrc} alt={fallbackAlt} />
        <figcaption>
          The linked alignment and structure run on a desktop-width screen.
        </figcaption>
      </figure>
    )
  }
  return dataset ? (
    <>
      <div className="structure-link-datasets" role="group">
        {datasets.map(d => (
          <button
            key={d.id}
            type="button"
            aria-pressed={d.id === dataset.id}
            onClick={() => {
              setChosen(d.id)
            }}
          >
            {d.label}
          </button>
        ))}
        <label className="structure-link-toggle">
          Alignment colors
          <select
            value={colorScheme}
            onChange={e => {
              setColorScheme(e.target.value)
              setSchemePicks(n => n + 1)
            }}
          >
            {alignmentSchemes.map(scheme => (
              <option key={scheme.id} value={scheme.id}>
                {scheme.label}
              </option>
            ))}
          </select>
        </label>
        <label className="structure-link-toggle">
          Color the structure by
          <select
            value={structureColor}
            onChange={e => {
              const { value } = e.target
              if (isStructureColor(value)) {
                setStructureColor(value)
              }
            }}
          >
            <option value="none">Nothing</option>
            <option value="conservation">Column conservation</option>
            <option value="scheme">Alignment colors</option>
          </select>
        </label>
      </div>
      <StructureLinkedViewer
        key={dataset.id}
        {...dataset}
        structureColor={structureColor}
        colorScheme={colorScheme}
        schemePicks={schemePicks}
      />
    </>
  ) : null
}
