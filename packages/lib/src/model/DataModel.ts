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
      /**
       * #property
       */
      gff: types.maybe(types.string),
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
      /**
       * #action
       */
      setGFF(gff?: string) {
        self.gff = gff
      },
    }))
    .postProcessSnapshot(snap =>
      // a large document is dropped from the snapshot rather than inlined
      // into a session or a shared URL, and every field here holds one, so
      // the rule is the same for all of them
      Object.fromEntries(
        Object.entries(snap).map(([key, text]) => [
          key,
          text && text.length > 50_000 ? undefined : text,
        ]),
      ),
    )
}
