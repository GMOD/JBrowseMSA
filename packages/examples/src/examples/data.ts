// The example data, one constant per file in ../../data. The files are what is
// canonical: `scripts/examples-gen/generate.mjs` writes them, the CLI writes the
// domain GFFs, `scripts/screenshots/writeExampleData.mjs` copies them to the
// demo app so a deep link can fetch one, and every consumer reads the same
// bytes instead of a copy pasted into a string.

import ace2DomainsGFF from '../../data/ace2-domains.gff?raw'
import ace2MSA from '../../data/ace2.aln?raw'
import ace2Tree from '../../data/ace2.nh?raw'
import aquaporinDomainsGFF from '../../data/aquaporin-domains.gff?raw'
import aquaporinMSA from '../../data/aquaporin.aln?raw'
import aquaporinTree from '../../data/aquaporin.nh?raw'
import coronaFseMSA from '../../data/corona_fse.stock?raw'
import cytochromeCMSA from '../../data/cytochrome_c.aln?raw'
import cytochromeCTree from '../../data/cytochrome_c.nh?raw'
import ef1aDomainsGFF from '../../data/ef1a-domains.gff?raw'
import ef1aMSA from '../../data/ef1a.aln?raw'
import ef1aTree from '../../data/ef1a.nh?raw'
import f12CdsMSA from '../../data/f12-cetacean-cds.stock?raw'
import f12ExonsGFF from '../../data/f12-cetacean-exons.gff?raw'
import geneClusterGFF from '../../data/gene-cluster.gff?raw'
import geneClusterMSA from '../../data/gene-cluster.stock?raw'
import globinMSA from '../../data/globin.aln?raw'
import globinTree from '../../data/globin.nh?raw'
import hammerheadMSA from '../../data/hammerhead.stock?raw'
import histoneH4MSA from '../../data/histone_h4.aln?raw'
import histoneH4Tree from '../../data/histone_h4.nh?raw'
import hoxDomainsGFF from '../../data/hox-domains.gff?raw'
import hoxMSA from '../../data/hox.aln?raw'
import hoxTree from '../../data/hox.nh?raw'
import proteinMSA from '../../data/il2ra.aln?raw'
import proteinTree from '../../data/il2ra.nh?raw'
import insulinMSA from '../../data/insulin.aln?raw'
import insulinTree from '../../data/insulin.nh?raw'
import kinaseDomainsGFF from '../../data/kinase-domains.gff?raw'
import kinaseMSA from '../../data/kinase.aln?raw'
import kinaseTree from '../../data/kinase.nh?raw'
import lysineMSA from '../../data/lysine.stock?raw'
import myd88DomainsGFF from '../../data/myd88-domains.gff?raw'
import myd88MSA from '../../data/myd88.aln?raw'
import myd88Tree from '../../data/myd88.nh?raw'
import nlrp1DomainsGFF from '../../data/nlrp1-domains.gff?raw'
import nlrp1MSA from '../../data/nlrp1.aln?raw'
import nlrp1Tree from '../../data/nlrp1.nh?raw'
import opsinDomainsGFF from '../../data/opsins-domains.gff?raw'
import opsinMSA from '../../data/opsins.aln?raw'
import opsinTree from '../../data/opsins.nh?raw'
import p53DomainsGFF from '../../data/p53-domains.gff?raw'
import p53MSA from '../../data/p53.aln?raw'
import p53Tree from '../../data/p53.nh?raw'
import prestinDomainsGFF from '../../data/prestin-domains.gff?raw'
import prestinMSA from '../../data/prestin.aln?raw'
import prestinTree from '../../data/prestin.nh?raw'
import trnaMSA from '../../data/trna.stock?raw'

export {
  proteinMSA,
  proteinTree,
  ace2DomainsGFF,
  ace2MSA,
  ace2Tree,
  aquaporinDomainsGFF,
  aquaporinMSA,
  aquaporinTree,
  coronaFseMSA,
  cytochromeCMSA,
  cytochromeCTree,
  ef1aDomainsGFF,
  ef1aMSA,
  ef1aTree,
  f12CdsMSA,
  f12ExonsGFF,
  geneClusterGFF,
  geneClusterMSA,
  globinMSA,
  globinTree,
  hammerheadMSA,
  histoneH4MSA,
  histoneH4Tree,
  hoxDomainsGFF,
  hoxMSA,
  hoxTree,
  insulinMSA,
  insulinTree,
  kinaseDomainsGFF,
  kinaseMSA,
  kinaseTree,
  lysineMSA,
  myd88DomainsGFF,
  myd88MSA,
  myd88Tree,
  nlrp1DomainsGFF,
  nlrp1MSA,
  nlrp1Tree,
  opsinDomainsGFF,
  opsinMSA,
  opsinTree,
  p53DomainsGFF,
  p53MSA,
  p53Tree,
  prestinDomainsGFF,
  prestinMSA,
  prestinTree,
  trnaMSA,
}
