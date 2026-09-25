import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { compareStructural, reaction } from 'mobx'
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
    import('molstar/lib/mol-plugin-state/helpers/structure-overpaint'),
    import('molstar/lib/mol-util/color'),
    import('molstar/build/viewer/molstar.css'),
  ]).then(
    ([ui, react18, spec, config, structure, script, overpaint, color]) => ({
      createPluginUI: ui.createPluginUI,
      renderReact18: react18.renderReact18,
      DefaultPluginUISpec: spec.DefaultPluginUISpec,
      PluginConfig: config.PluginConfig,
      StructureElement: structure.StructureElement,
      StructureProperties: structure.StructureProperties,
      StructureSelection: structure.StructureSelection,
      Script: script.Script,
      setStructureOverpaint: overpaint.setStructureOverpaint,
      clearStructureOverpaint: overpaint.clearStructureOverpaint,
      Color: color.Color,
    }),
  )
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
  labelSeqIds: number[],
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
        'residue-test': Q.core.set.has([
          Q.core.type.set(labelSeqIds),
          Q.struct.atomProperty.macromolecular.label_seq_id(),
        ]),
      }),
    structure,
  )
  return molstar.StructureSelection.toLociWithSourceUnits(selection)
}

const conservationRamp = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281']
const noColumnColor = '#c9c9c4'
const paintColors = [...conservationRamp, noColumnColor]

type ChainResidues = [asymId: string, labelSeqIds: number[]][]

function polymerResidues(molstar: Molstar, structure: Structure) {
  const SP = molstar.StructureProperties
  const residues = new Map<string, { asymId: string; labelSeqId: number }>()
  molstar.StructureElement.Loci.forEachLocation(
    molstar.StructureElement.Loci.all(structure),
    loc => {
      if (SP.entity.type(loc) === 'polymer') {
        const asymId = SP.chain.label_asym_id(loc)
        const labelSeqId = SP.residue.label_seq_id(loc)
        residues.set(`${asymId}:${labelSeqId}`, { asymId, labelSeqId })
      }
    },
  )
  return [...residues.values()]
}

function conservationBins(
  model: MsaViewModel,
  structureId: string,
  residues: { asymId: string; labelSeqId: number }[],
): ChainResidues[] {
  const bins = paintColors.map(() => new Map<string, number[]>())
  for (const { asymId, labelSeqId } of residues) {
    const hit = model.rowResidue(structureId, labelSeqId, asymId)
    const col = hit
      ? model.seqPosToVisibleCol(hit.rowName, hit.seqPos - 1)
      : undefined
    const value = col === undefined ? undefined : model.conservation[col]
    const bin =
      value === undefined
        ? conservationRamp.length
        : Math.min(
            conservationRamp.length - 1,
            Math.floor(value * conservationRamp.length),
          )
    const chains = bins[bin]
    const ids = chains.get(asymId) ?? []
    ids.push(labelSeqId)
    chains.set(asymId, ids)
  }
  return bins.map(chains => [...chains])
}

async function paintConservation(
  plugin: PluginUIContext,
  molstar: Molstar,
  bins: ChainResidues[],
) {
  const components =
    plugin.managers.structure.hierarchy.current.structures[0]?.components ?? []
  await molstar.clearStructureOverpaint(plugin, components)
  for (const [bin, chains] of bins.entries()) {
    if (chains.length) {
      await molstar.setStructureOverpaint(
        plugin,
        components,
        molstar.Color.fromHexStyle(paintColors[bin]),
        structure =>
          Promise.resolve(
            chains
              .map(([asymId, ids]) =>
                residueLoci(molstar, structure, ids, asymId),
              )
              .reduce((a, b) => molstar.StructureElement.Loci.union(a, b)),
          ),
      )
    }
  }
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

function ConservationLegend() {
  return (
    <div className="structure-link-legend">
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
      <div className="structure-link-no-column">
        <span style={{ background: noColumnColor }} />
        No alignment column
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
  colorByConservation,
}: StructureLinkedViewerProps & { colorByConservation: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginUIContext | undefined>(undefined)
  const molstarRef = useRef<Molstar | undefined>(undefined)
  const modelRef = useRef<MsaViewModel | undefined>(undefined)
  const overpaintQueue = useRef(Promise.resolve())
  const [model, setModel] = useState<MsaViewModel>()
  const [layers, setLayers] = useState<Layers>({})
  const [status, setStatus] = useState(idle)
  const [structureState, setStructureState] = useState('Loading structure')
  const structureLoaded = structureState === ''

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

  useEffect(() => {
    const plugin = pluginRef.current
    const molstar = molstarRef.current
    const structure = plugin ? loadedStructure(plugin) : undefined
    if (
      !colorByConservation ||
      !structureLoaded ||
      !model ||
      !plugin ||
      !molstar ||
      !structure
    ) {
      return
    }
    const enqueue = (step: () => Promise<void>) => {
      overpaintQueue.current = overpaintQueue.current
        .then(() => (pluginRef.current === plugin ? step() : undefined))
        .catch((e: unknown) => {
          console.error(e)
        })
    }
    const residues = polymerResidues(molstar, structure)
    const dispose = reaction(
      () => conservationBins(model, structureId, residues),
      bins => {
        enqueue(() => paintConservation(plugin, molstar, bins))
      },
      { fireImmediately: true, equals: compareStructural },
    )
    return () => {
      dispose()
      enqueue(() => paintConservation(plugin, molstar, []))
    }
  }, [colorByConservation, structureLoaded, model, structureId])

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
        ? residueLoci(molstar, structure, [hit.position], hit.structure.asymId)
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
        {colorByConservation && structureLoaded ? <ConservationLegend /> : null}
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
  const [colorByConservation, setColorByConservation] = useState(false)
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
          <input
            type="checkbox"
            checked={colorByConservation}
            onChange={e => {
              setColorByConservation(e.target.checked)
            }}
          />
          Color the structure by conservation
        </label>
      </div>
      <StructureLinkedViewer
        key={dataset.id}
        {...dataset}
        colorByConservation={colorByConservation}
      />
    </>
  ) : null
}
