import A3m from './A3m'
import A3mSrc from './A3m.tsx?raw'
import Ace2 from './Ace2'
import Ace2Src from './Ace2.tsx?raw'
import Aquaporin from './Aquaporin'
import AquaporinSrc from './Aquaporin.tsx?raw'
import ColorSchemes from './ColorSchemes'
import ColorSchemesSrc from './ColorSchemes.tsx?raw'
import ColumnTracks from './ColumnTracks'
import ColumnTracksSrc from './ColumnTracks.tsx?raw'
import CoronaFse from './CoronaFse'
import CoronaFseSrc from './CoronaFse.tsx?raw'
import CytochromeC from './CytochromeC'
import CytochromeCSrc from './CytochromeC.tsx?raw'
import Ef1a from './Ef1a'
import Ef1aSrc from './Ef1a.tsx?raw'
import F12 from './F12'
import F12Src from './F12.tsx?raw'
import GeneCluster from './GeneCluster'
import GeneClusterSrc from './GeneCluster.tsx?raw'
import Globin from './Globin'
import GlobinSrc from './Globin.tsx?raw'
import Hammerhead from './Hammerhead'
import HammerheadSrc from './Hammerhead.tsx?raw'
import HistoneH4 from './HistoneH4'
import HistoneH4Src from './HistoneH4.tsx?raw'
import Hox from './Hox'
import HoxSrc from './Hox.tsx?raw'
import Insulin from './Insulin'
import InsulinSrc from './Insulin.tsx?raw'
import KinaseContacts from './KinaseContacts'
import KinaseContactsSrc from './KinaseContacts.tsx?raw'
import LargeTree from './LargeTree'
import LargeTreeSrc from './LargeTree.tsx?raw'
import LoadFromUrl from './LoadFromUrl'
import LoadFromUrlSrc from './LoadFromUrl.tsx?raw'
import ModelApi from './ModelApi'
import ModelApiSrc from './ModelApi.tsx?raw'
import Myd88 from './Myd88'
import Myd88Src from './Myd88.tsx?raw'
import Nextstrain from './Nextstrain'
import NextstrainSrc from './Nextstrain.tsx?raw'
import Nlrp1 from './Nlrp1'
import Nlrp1Src from './Nlrp1.tsx?raw'
import Opsins from './Opsins'
import OpsinsSrc from './Opsins.tsx?raw'
import P53ClinVar from './P53ClinVar'
import P53ClinVarSrc from './P53ClinVar.tsx?raw'
import PanelControls from './PanelControls'
import PanelControlsSrc from './PanelControls.tsx?raw'
import PfamGlobin from './PfamGlobin'
import PfamGlobinSrc from './PfamGlobin.tsx?raw'
import Prestin from './Prestin'
import PrestinSrc from './Prestin.tsx?raw'
import ProgrammaticControl from './ProgrammaticControl'
import ProgrammaticControlSrc from './ProgrammaticControl.tsx?raw'
import TreeOptions from './TreeOptions'
import TreeOptionsSrc from './TreeOptions.tsx?raw'
import Trna from './Trna'
import TrnaSrc from './Trna.tsx?raw'
import YourOwnControls from './YourOwnControls'
import YourOwnControlsSrc from './YourOwnControls.tsx?raw'
import ZeroConfig from './ZeroConfig'
import ZeroConfigSrc from './ZeroConfig.tsx?raw'
import { catalog } from './catalog'

import type { CatalogEntry } from './catalog'
import type { ComponentType } from 'react'

export { categoryOrder, slugOf } from './catalog'
export type { Category } from './catalog'

// The component and its source, by catalog id. Every entry in the catalog needs
// one, and an id with no component fails at import rather than rendering a
// sidebar row that opens onto nothing.
const components: Record<string, [ComponentType, string]> = {
  A3m: [A3m, A3mSrc],
  Ace2: [Ace2, Ace2Src],
  Aquaporin: [Aquaporin, AquaporinSrc],
  ColorSchemes: [ColorSchemes, ColorSchemesSrc],
  ColumnTracks: [ColumnTracks, ColumnTracksSrc],
  CoronaFse: [CoronaFse, CoronaFseSrc],
  CytochromeC: [CytochromeC, CytochromeCSrc],
  Ef1a: [Ef1a, Ef1aSrc],
  F12: [F12, F12Src],
  GeneCluster: [GeneCluster, GeneClusterSrc],
  Globin: [Globin, GlobinSrc],
  Hammerhead: [Hammerhead, HammerheadSrc],
  HistoneH4: [HistoneH4, HistoneH4Src],
  Hox: [Hox, HoxSrc],
  Insulin: [Insulin, InsulinSrc],
  KinaseContacts: [KinaseContacts, KinaseContactsSrc],
  LargeTree: [LargeTree, LargeTreeSrc],
  LoadFromUrl: [LoadFromUrl, LoadFromUrlSrc],
  ModelApi: [ModelApi, ModelApiSrc],
  Myd88: [Myd88, Myd88Src],
  Nextstrain: [Nextstrain, NextstrainSrc],
  Nlrp1: [Nlrp1, Nlrp1Src],
  Opsins: [Opsins, OpsinsSrc],
  P53ClinVar: [P53ClinVar, P53ClinVarSrc],
  PanelControls: [PanelControls, PanelControlsSrc],
  PfamGlobin: [PfamGlobin, PfamGlobinSrc],
  Prestin: [Prestin, PrestinSrc],
  ProgrammaticControl: [ProgrammaticControl, ProgrammaticControlSrc],
  TreeOptions: [TreeOptions, TreeOptionsSrc],
  Trna: [Trna, TrnaSrc],
  YourOwnControls: [YourOwnControls, YourOwnControlsSrc],
  ZeroConfig: [ZeroConfig, ZeroConfigSrc],
}

export interface Example extends CatalogEntry {
  Component: ComponentType
  source: string
}

export const examples: Example[] = catalog.map(entry => {
  const pair = components[entry.id]
  if (!pair) {
    throw new Error(`catalog entry ${entry.id} has no component`)
  }
  const [Component, source] = pair
  return { ...entry, Component, source }
})
