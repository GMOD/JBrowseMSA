import type { MsaViewModel } from '../../model'
import type { FileLocation } from '@jbrowse/core/util'

export async function load(
  model: MsaViewModel,
  msaFile?: FileLocation,
  treeFile?: FileLocation,
  gffFile?: FileLocation,
) {
  model.setError(undefined)
  if (msaFile) {
    model.setMSAFilehandle(msaFile)
  }
  if (treeFile) {
    model.setTreeFilehandle(treeFile)
  }
  if (gffFile) {
    model.setGFFFilehandle(gffFile)
  }
}
