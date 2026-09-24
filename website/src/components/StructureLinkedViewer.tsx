import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { observer } from 'mobx-react'

import type { Loci } from 'molstar/lib/mol-model/loci'
import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'
import type {
  Cell,
  ColumnTrackSpec,
  Highlight,
  MsaViewModel,
  Region,
  ResidueMapping,
} from 'react-msaview'

const MSAViewer = lazy(() =>
  import('react-msaview').then(m => ({ default: m.MSAViewer })),
)

let molstarModules: ReturnType<typeof importMolstar> | undefined

function importMolstar() {
  return Promise.all([
    import('molstar/lib/mol-plugin-ui'),
    import('molstar/lib/mol-plugin-ui/react18'),
    import('molstar/lib/mol-plugin-ui/spec'),
    import('molstar/lib/mol-plugin/config'),
    import('molstar/lib/mol-model/structure'),
    import('molstar/lib/mol-script/script'),
    import('molstar/build/viewer/molstar.css'),
  ]).then(([ui, react18, spec, config, structure, script]) => ({
    createPluginUI: ui.createPluginUI,
    renderReact18: react18.renderReact18,
    DefaultPluginUISpec: spec.DefaultPluginUISpec,
    PluginConfig: config.PluginConfig,
    StructureElement: structure.StructureElement,
    StructureProperties: structure.StructureProperties,
    StructureSelection: structure.StructureSelection,
    Script: script.Script,
  }))
}

function loadMolstar() {
  molstarModules ??= importMolstar().catch((e: unknown) => {
    molstarModules = undefined
    throw e
  })
  return molstarModules
}

type Molstar = Awaited<ReturnType<typeof importMolstar>>

interface Layers {
  highlights?: Highlight[]
  columnTracks?: ColumnTrackSpec[]
  residueMappings?: ResidueMapping[]
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

const idle = 'Hover a residue in the alignment or the structure.'

function uri(url: string) {
  return { uri: url, locationType: 'UriLocation' as const }
}

function loadedStructure(plugin: PluginUIContext) {
  return plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj
    ?.data
}

function residueLoci(
  molstar: Molstar,
  structure: Structure,
  labelSeqId: number,
  asymId?: string,
) {
  const selection = molstar.Script.getStructureSelection(
    Q =>
      Q.struct.generator.atomGroups({
        ...(asymId
          ? {
              'chain-test': Q.core.rel.eq([
                Q.struct.atomProperty.macromolecular.label_asym_id(),
                asymId,
              ]),
            }
          : {}),
        'residue-test': Q.core.rel.eq([
          Q.struct.atomProperty.macromolecular.label_seq_id(),
          labelSeqId,
        ]),
      }),
    structure,
  )
  return molstar.StructureSelection.toLociWithSourceUnits(selection)
}

function describeCell(
  model: MsaViewModel,
  cell: Cell,
  structureId: string,
): string {
  const { row, residue } = cell
  if (row === undefined) {
    return idle
  }
  if (residue === undefined) {
    return `${row} · gap at column ${cell.column}`
  }
  const hit = model.structureResidue(row, residue, structureId)
  if (hit) {
    const chain = hit.structure.asymId ? ` chain ${hit.structure.asymId}` : ''
    const where = `${structureId}${chain} residue ${hit.position}`
    return `${row} residue ${residue} · ${where}${hit.observed ? '' : ' · no coordinates'}`
  }
  const mapped = model.mappedStructures.some(
    m => m.row === row && m.structure.id === structureId,
  )
  return `${row} residue ${residue} · ${mapped ? 'outside the mapped region' : `no mapping onto ${structureId}`}`
}

function centerOnResidue(model: MsaViewModel, row: string, seqPos: number) {
  const col = model.seqPosToVisibleCol(row, seqPos - 1)
  if (col !== undefined) {
    model.setScrollX(model.msaCanvasWidth / 2 - (col + 0.5) * model.colWidth)
  }
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
}: StructureLinkedViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginUIContext | undefined>(undefined)
  const molstarRef = useRef<Molstar | undefined>(undefined)
  const modelRef = useRef<MsaViewModel | undefined>(undefined)
  const [model, setModel] = useState<MsaViewModel>()
  const [layers, setLayers] = useState<Layers>({})
  const [status, setStatus] = useState(idle)
  const [structureState, setStructureState] = useState('Loading structure')

  useEffect(() => {
    const controller = new AbortController()
    fetch(layersUrl, { signal: controller.signal })
      .then(res => res.json() as Promise<Layers>)
      .then(setLayers)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setStatus(`Could not load ${layersUrl}: ${String(e)}`)
        }
      })
    return () => {
      controller.abort()
    }
  }, [layersUrl])

  useEffect(() => {
    const state = {
      cancelled: false,
      plugin: undefined as PluginUIContext | undefined,
      unsubscribe: [] as (() => void)[],
    }
    const target = document.createElement('div')
    hostRef.current?.append(target)

    const readLocation = (molstar: Molstar, loci: Loci) => {
      const loc = molstar.StructureElement.Loci.is(loci)
        ? molstar.StructureElement.Loci.getFirstLocation(loci)
        : undefined
      const SP = molstar.StructureProperties
      return loc
        ? {
            labelSeqId: SP.residue.label_seq_id(loc),
            asymId: SP.chain.label_asym_id(loc),
            compId: SP.atom.label_comp_id(loc),
            polymer: SP.entity.type(loc) === 'polymer',
          }
        : undefined
    }

    void (async () => {
      try {
        const molstar = await loadMolstar()
        if (state.cancelled) {
          return
        }
        const spec = molstar.DefaultPluginUISpec()
        const plugin = await molstar.createPluginUI({
          target,
          render: molstar.renderReact18,
          spec: {
            ...spec,
            layout: {
              initial: {
                isExpanded: false,
                showControls: false,
                controlsDisplay: 'reactive',
              },
            },
            config: [
              [molstar.PluginConfig.Viewport.ShowExpand, false],
              [molstar.PluginConfig.Viewport.ShowSelectionMode, false],
              [molstar.PluginConfig.Viewport.ShowAnimation, false],
            ],
          },
        })
        state.plugin = plugin
        if (state.cancelled) {
          plugin.dispose()
          return
        }
        const data = await plugin.builders.data.download(
          { url: structureUrl, isBinary: false },
          { state: { isGhost: true } },
        )
        const trajectory = await plugin.builders.structure.parseTrajectory(
          data,
          'mmcif',
        )
        await plugin.builders.structure.hierarchy.applyPreset(
          trajectory,
          'default',
        )
        if (state.cancelled) {
          return
        }
        molstarRef.current = molstar
        pluginRef.current = plugin

        const hover = plugin.behaviors.interaction.hover.subscribe(
          ({ current }) => {
            const m = modelRef.current
            const where = readLocation(molstar, current.loci)
            if (!m || !where) {
              m?.clearHighlight('structure')
              setStatus(idle)
              return
            }
            const label = where.polymer
              ? `${structureId} chain ${where.asymId} residue ${where.labelSeqId} ${where.compId}`
              : `${structureId} ${where.compId}`
            const hit = where.polymer
              ? m.rowResidue(structureId, where.labelSeqId, where.asymId)
              : undefined
            if (hit) {
              m.applyHighlight('structure', [
                { row: hit.rowName, start: hit.seqPos, end: hit.seqPos },
              ])
              setStatus(`${label} · ${hit.rowName} residue ${hit.seqPos}`)
            } else {
              m.clearHighlight('structure')
              setStatus(`${label} · no row maps here`)
            }
          },
        )
        const click = plugin.behaviors.interaction.click.subscribe(
          ({ current }) => {
            const m = modelRef.current
            const where = readLocation(molstar, current.loci)
            const hit =
              m && where?.polymer
                ? m.rowResidue(structureId, where.labelSeqId, where.asymId)
                : undefined
            if (m && hit) {
              centerOnResidue(m, hit.rowName, hit.seqPos)
            }
          },
        )
        state.unsubscribe.push(
          () => {
            hover.unsubscribe()
          },
          () => {
            click.unsubscribe()
          },
        )
        setStructureState('')
      } catch (e) {
        console.error(e)
        if (!state.cancelled) {
          setStructureState(`Could not load ${structureUrl}: ${String(e)}`)
        }
      }
    })()

    return () => {
      state.cancelled = true
      for (const fn of state.unsubscribe) {
        fn()
      }
      pluginRef.current = undefined
      molstarRef.current = undefined
      state.plugin?.dispose()
      target.remove()
    }
  }, [structureUrl, structureId])

  const withStructure = (
    cell: Cell | undefined,
    act: (
      plugin: PluginUIContext,
      loci: ReturnType<typeof residueLoci> | undefined,
      molstar: Molstar,
    ) => void,
  ) => {
    const plugin = pluginRef.current
    const molstar = molstarRef.current
    const m = modelRef.current
    if (!plugin || !molstar || !m) {
      return
    }
    const hit =
      cell?.row !== undefined && cell.residue !== undefined
        ? m.structureResidue(cell.row, cell.residue, structureId)
        : undefined
    const structure = loadedStructure(plugin)
    const loci =
      hit && structure
        ? residueLoci(molstar, structure, hit.position, hit.structure.asymId)
        : undefined
    act(plugin, loci, molstar)
  }

  const onCellHover = (cell: Cell | undefined) => {
    const m = modelRef.current
    setStatus(cell && m ? describeCell(m, cell, structureId) : idle)
    withStructure(cell, (plugin, loci) => {
      if (loci) {
        plugin.managers.interactivity.lociHighlights.highlightOnly(
          { loci },
          false,
        )
      } else {
        plugin.managers.interactivity.lociHighlights.clearHighlights()
      }
    })
  }

  const onCellClick = (cell: Cell | undefined) => {
    withStructure(cell, (plugin, loci, molstar) => {
      if (loci && !molstar.StructureElement.Loci.isEmpty(loci)) {
        plugin.managers.camera.focusLoci(loci, { minRadius: 20 })
        plugin.managers.structure.focus.setFromLoci(loci)
      } else {
        plugin.managers.structure.focus.clear()
      }
    })
  }

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
          residueMappings={layers.residueMappings}
          colorScheme="clustalx_protein_dynamic"
          treeAreaWidth={150}
          height={height}
          region={focus}
          onModel={m => {
            modelRef.current = m
            m.setShowDomainLegend(false)
            setModel(m)
          }}
          onCellHover={onCellHover}
          onCellClick={onCellClick}
        />
      </Suspense>
      <div className="structure-link-canvas" ref={hostRef}>
        {structureState ? (
          <p className="structure-link-loading">{structureState}</p>
        ) : null}
      </div>
      <p className="structure-link-status" aria-live="polite">
        {status}
      </p>
      {model ? <MappingNotes model={model} structureId={structureId} /> : null}
    </div>
  )
}

const desktopQuery = window.matchMedia('(min-width: 641px)')
const subscribe = (cb: () => void) => {
  desktopQuery.addEventListener('change', cb)
  return () => {
    desktopQuery.removeEventListener('change', cb)
  }
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
  const desktop = useSyncExternalStore(
    subscribe,
    () => desktopQuery.matches,
    () => false,
  )
  const [chosen, setChosen] = useState(datasets[0]?.id)
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
      </div>
      <StructureLinkedViewer key={dataset.id} {...dataset} />
    </>
  ) : null
}
