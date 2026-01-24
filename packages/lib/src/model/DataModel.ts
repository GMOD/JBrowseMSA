import { types } from '@jbrowse/mobx-state-tree'

/**
 * #stateModel DataModel
 * the data stored for the model. this is sometimes temporary in the case that
 * e.g. msaFilehandle is available on the parent model, because then the msa
 * data will not be persisted in saved session snapshots, it will be fetched
 * from msaFilehandle at startup
 */
export function DataModelF() {
  return types
    .model({
      /**
       * #property
       */
      tree: types.maybe(types.string),
      /**
       * #property
       */
      msa: types.maybe(types.string),
      /**
       * #property
       */
      treeMetadata: types.maybe(types.string),
    })
    .actions(self => ({
      /**
       * #action
       */
      setTree(tree?: string) {
        self.tree = tree
      },
      /**
       * #action
       */
      setMSA(msa?: string) {
        self.msa = msa
      },
      /**
       * #action
       */
      setTreeMetadata(treeMetadata?: string) {
        self.treeMetadata = treeMetadata
      },
    }))
    .postProcessSnapshot(snap => {
      const { tree, msa, treeMetadata } = snap
      const max = 50_000
      return {
        tree: tree && tree.length > max ? undefined : tree,
        msa: msa && msa.length > max ? undefined : msa,
        treeMetadata:
          treeMetadata && treeMetadata.length > max ? undefined : treeMetadata,
      }
    })
}
