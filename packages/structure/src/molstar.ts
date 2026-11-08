import type { Structure } from 'molstar/lib/mol-model/structure'
import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context'

function importMolstar() {
  return Promise.all([
    import('molstar/lib/mol-plugin-ui'),
    import('react-dom/client'),
    import('molstar/lib/mol-plugin-ui/spec'),
    import('molstar/lib/mol-plugin/config'),
    import('molstar/lib/mol-model/structure'),
    import('molstar/lib/mol-script/script'),
    import('molstar/lib/mol-plugin-state/helpers/structure-overpaint'),
    import('molstar/lib/mol-util/color'),
    import('molstar/lib/mol-plugin-state/transforms'),
    import('molstar/lib/mol-math/linear-algebra'),
    import('molstar/lib/mol-plugin-state/helpers/structure-selection-query'),
    import('molstar/lib/mol-model/structure/structure/util/tm-align'),
    import('molstar/lib/mol-script/language/builder'),
    import('molstar/build/viewer/molstar.css'),
  ]).then(
    ([
      ui,
      reactDom,
      spec,
      config,
      structure,
      script,
      overpaint,
      color,
      transforms,
      linearAlgebra,
      selectionQuery,
      tmAlignModule,
      scriptBuilder,
    ]) => ({
      createPluginUI: ui.createPluginUI,
      createRoot: reactDom.createRoot,
      DefaultPluginUISpec: spec.DefaultPluginUISpec,
      PluginConfig: config.PluginConfig,
      Structure: structure.Structure,
      StructureElement: structure.StructureElement,
      StructureProperties: structure.StructureProperties,
      StructureSelection: structure.StructureSelection,
      Script: script.Script,
      setStructureOverpaint: overpaint.setStructureOverpaint,
      clearStructureOverpaint: overpaint.clearStructureOverpaint,
      Color: color.Color,
      StateTransforms: transforms.StateTransforms,
      Mat4: linearAlgebra.Mat4,
      QueryContext: structure.QueryContext,
      StructureSelectionQueries: selectionQuery.StructureSelectionQueries,
      tmAlign: tmAlignModule.tmAlign,
      MS: scriptBuilder.MolScriptBuilder,
    }),
  )
}

let loading: ReturnType<typeof importMolstar> | undefined

/** Mol* is a large chunk, so it loads when a panel first mounts */
export function loadMolstar() {
  loading ??= importMolstar().catch((e: unknown) => {
    loading = undefined
    throw e
  })
  return loading
}

export type Molstar = Awaited<ReturnType<typeof importMolstar>>

export function asStructure(molstar: Molstar, data: unknown) {
  return data instanceof molstar.Structure ? data : undefined
}

function transformCell(plugin: PluginUIContext, molstar: Molstar, ref: string) {
  return plugin.state.data.selectQ(q =>
    q
      .byRef(ref)
      .subtree()
      .withTransformer(
        molstar.StateTransforms.Model.TransformStructureConformation,
      ),
  )[0]
}

/**
 * The structure a state ref draws: the transformed one once a superposition
 * has moved it, else the loaded one. A locus has to come from this structure
 * to light in the view.
 */
export function drawnStructure(
  plugin: PluginUIContext,
  molstar: Molstar,
  ref: string,
) {
  const cell =
    transformCell(plugin, molstar, ref) ?? plugin.state.data.cells.get(ref)
  return asStructure(molstar, cell?.obj?.data)
}

/**
 * The components of a loaded structure, read from the hierarchy Mol*
 * publishes. That snapshot refreshes only on some state events and on none
 * while a data transaction is open, so right after a load it can lack the
 * structure. This waits a bounded time for it and then fails, so a paint that
 * cannot find its target says so instead of doing nothing.
 */
export async function componentsOfStructure(
  plugin: PluginUIContext,
  ref: string,
  { attempts = 30, delayMs = 100 } = {},
) {
  for (let i = 0; i < attempts; i++) {
    const found = plugin.managers.structure.hierarchy.current.structures.find(
      s => s.cell.transform.ref === ref,
    )
    if (found) {
      return found.components
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  throw new Error(
    `Mol* has not listed the structure ${ref} among its components`,
  )
}

export interface TmAlignment {
  ref: string
  tmScore: number
  rmsd: number
  alignedLength: number
}

/**
 * Superposes every loaded structure on the first by TM-align of their traces,
 * with no sequence alignment involved, and moves each. A structure whose trace
 * yields nothing is left where it is.
 */
export async function tmAlignOnto(
  plugin: PluginUIContext,
  molstar: Molstar,
  refs: string[],
) {
  const { QueryContext, StructureSelection, StructureElement } = molstar
  const { query } = molstar.StructureSelectionQueries.trace
  const traces = refs.flatMap(ref => {
    const root = asStructure(
      molstar,
      plugin.state.data.cells.get(ref)?.obj?.data,
    )
    if (!root) {
      return []
    }
    const loci = StructureSelection.toLociWithSourceUnits(
      query(new QueryContext(root)),
    )
    return [{ ref, loci: StructureElement.Loci.remap(loci, root) }]
  })
  const [pivot, ...mobile] = traces
  const results: TmAlignment[] = []
  if (!pivot) {
    return results
  }
  for (const { ref, loci } of mobile) {
    const { bTransform, tmScoreA, rmsd, alignedLength } = molstar.tmAlign(
      pivot.loci,
      loci,
    )
    await transformStructure(plugin, molstar, ref, [...bTransform])
    results.push({ ref, tmScore: tmScoreA, rmsd, alignedLength })
  }
  return results
}

/** moves a loaded structure by a column-major 4x4, or back with the identity */
export async function transformStructure(
  plugin: PluginUIContext,
  molstar: Molstar,
  ref: string,
  matrix: number[],
) {
  const existing = transformCell(plugin, molstar, ref)
  const params = {
    transform: {
      name: 'matrix' as const,
      params: {
        data: molstar.Mat4.fromArray(molstar.Mat4(), matrix, 0),
        transpose: false,
      },
    },
  }
  const build = existing
    ? plugin.state.data.build().to(existing).update(params)
    : plugin.state.data
        .build()
        .to(ref)
        .insert(
          molstar.StateTransforms.Model.TransformStructureConformation,
          params,
        )
  await plugin.runTask(plugin.state.data.updateTree(build))
}

function chainLoci(
  molstar: Molstar,
  structure: Structure,
  labelSeqIds: number[],
  chain: string | undefined,
  by: 'label' | 'auth',
) {
  const selection = molstar.Script.getStructureSelection(
    Q =>
      Q.struct.generator.atomGroups({
        ...(chain
          ? {
              'chain-test': Q.core.rel.eq([
                by === 'label'
                  ? Q.struct.atomProperty.macromolecular.label_asym_id()
                  : Q.struct.atomProperty.macromolecular.auth_asym_id(),
                chain,
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

/**
 * The residues of one chain by `label_seq_id`. `kind` says which id `chain`
 * is. With none given the label id is tried first and the author id only if no
 * chain carries that label, so an entry whose two ids collide is read as the
 * label id. A mapping that names no chain takes every chain.
 */
export function residueLoci(
  molstar: Molstar,
  structure: Structure,
  labelSeqIds: number[],
  chain?: string,
  kind?: 'label' | 'auth',
) {
  const first = kind ?? 'label'
  const loci = chainLoci(molstar, structure, labelSeqIds, chain, first)
  if (kind !== undefined || chain === undefined) {
    return loci
  }
  return molstar.StructureElement.Loci.isEmpty(loci)
    ? chainLoci(molstar, structure, labelSeqIds, chain, 'auth')
    : loci
}

/**
 * Draws only the polymer chains `residues` come from, as cartoon, and the
 * ligands and ions the file files under the same author chains, as ball and
 * stick. Waters and every other chain stay hidden. `ref` is a structure with no
 * representation yet.
 */
export async function showChains(
  plugin: PluginUIContext,
  molstar: Molstar,
  ref: string,
  residues: PolymerResidue[],
) {
  const { MS } = molstar
  const builder = plugin.builders.structure
  const ofEntity = (type: string, chainId: 'label' | 'auth', ids: string[]) =>
    MS.struct.generator.atomGroups({
      'entity-test': MS.core.rel.eq([MS.ammp('entityType'), type]),
      'chain-test': MS.core.set.has([
        MS.set(...ids),
        MS.ammp(chainId === 'label' ? 'label_asym_id' : 'auth_asym_id'),
      ]),
    })
  const polymer = await builder.tryCreateComponentFromExpression(
    ref,
    ofEntity('polymer', 'label', [
      ...new Set(residues.map(r => r.labelAsymId)),
    ]),
    'mapped-polymer',
    { label: 'Mapped chains' },
  )
  if (polymer) {
    await builder.representation.addRepresentation(polymer, { type: 'cartoon' })
  }
  const ligand = await builder.tryCreateComponentFromExpression(
    ref,
    ofEntity('non-polymer', 'auth', [
      ...new Set(residues.map(r => r.authAsymId)),
    ]),
    'mapped-ligand',
    { label: 'Ligands of the mapped chains' },
  )
  if (ligand) {
    await builder.representation.addRepresentation(ligand, {
      type: 'ball-and-stick',
    })
  }
}

export interface PolymerResidue {
  labelAsymId: string
  authAsymId: string
  labelSeqId: number
}

export function polymerResidues(molstar: Molstar, structure: Structure) {
  const SP = molstar.StructureProperties
  const residues = new Map<string, PolymerResidue>()
  molstar.StructureElement.Loci.forEachLocation(
    molstar.StructureElement.Loci.all(structure),
    loc => {
      if (SP.entity.type(loc) === 'polymer') {
        const labelAsymId = SP.chain.label_asym_id(loc)
        const labelSeqId = SP.residue.label_seq_id(loc)
        residues.set(`${labelAsymId}:${labelSeqId}`, {
          labelAsymId,
          authAsymId: SP.chain.auth_asym_id(loc),
          labelSeqId,
        })
      }
    },
  )
  return [...residues.values()]
}
