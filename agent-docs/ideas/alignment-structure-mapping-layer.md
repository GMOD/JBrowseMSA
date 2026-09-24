# The alignment ↔ structure correspondence as a layer

jbrowse-plugin-protein3d currently works out which structure residue an
alignment cell corresponds to at hover time, by string equality, and falls back
to a wrong residue with no warning. The proposal replaces that inference with
data: a snapshot layer naming the correspondence, computed once by a producer
such as SIFTS, an AlphaFold model or a curator. The viewer looks the
correspondence up and returns nothing when there is no entry. This follows
[layers that take data](data-layers.md), where an agent computes a value and the
snapshot stores it for the viewer to draw, applied to the one coordinate hop
this repo does not own.

Background reading that prompted this: `~/ideas/sequence-structure-interop.md`,
local and deliberately outside the repo.

## What happens today

`jbrowse-plugin-protein3d` drives the MSA ↔ structure hover both ways. It finds
the alignment row for a structure with `findStructureRowName`
(`src/AddHighlightModel/msaRowMatch.ts`): the row whose **ungapped sequence
exactly equals** the structure's sequence. When no row matches, the sync in
`ProteinToMsaHoverSync.tsx` falls back to `col === seqPos`.

Both halves fail in the same cases, and those cases are common. Exact sequence
equality fails for a construct with an expression tag, a truncation, an
engineered residue, a selenomethionine substitution, or a row that covers only
part of the entry. A Pfam alignment whose rows are named `/27-137` never matches
a full-length structure. The fallback then maps column _n_ to residue _n_, which
for a gapped row is arbitrary. The user sees a highlight on a real residue, just
the wrong one, with no error.

The correct hop already exists one file over. `pdbUniProtMapping.ts` parses
SIFTS into `UniProtStructureSegment[]`, the authoritative UniProt ↔ structure
correspondence, and uses it for feature display. No code composes it with the
column ↔ residue hop this repo owns, so the MSA link takes the shortcut.

## The layer

A snapshot field naming the correspondence per row:

```json
"residueMappings": [
  {
    "row": "HBA_HUMAN/1-142",
    "accession": "P69905",
    "structure": {
      "id": "1A3N",
      "kind": "experimental",
      "asymId": "A",
      "url": "https://files.rcsb.org/download/1A3N.cif"
    },
    "segments": [{ "rowStart": 1, "rowEnd": 141, "structStart": 2, "structEnd": 142 }],
    "unobserved": [[1, 1], [140, 142]],
    "generated": { "by": "sifts", "date": "2026-09-10", "sourceSha256": "b8e77aba…" }
  }
]
```

**Key by row residue, not by alignment column.** Columns move under `hideGaps`,
under collapsing, and under any re-alignment, so a column-keyed table goes stale
the first time a user hides gappy columns. Row residue positions do not move,
the viewer already projects them through `seqPosToVisibleCol`, and every other
layer keys the same way: GFF features, `highlights` with a `row`, and
`columnTracks` whose `values` index a named row's residues.

**Segments, because SIFTS uses segments.** `UniProtStructureSegment` in
protein3d is already `{unpStart, unpEnd, structStart, structEnd}`; this layer
uses the same fields with the alignment row in place of a UniProt accession. A
dozen numbers covers a case that a dense per-residue array would spend kilobytes
on. Segments also define unmapped: **a position no segment covers is unmapped.**

**The segment geometry encodes three states, so the layer has no status field.**
A position a segment covers is mapped and observed. A position listed in
`unobserved` is present in SEQRES with no coordinates. That state matters to a
user, because "the crystallographer could not see it" and "this protein does not
have that residue" mean different things. Any other position is unmapped and
draws nothing. With no status enum, producers and the viewer have no vocabulary
that could drift apart.

**Positions are 1-based inclusive on both sides**, as GFF and `highlights` are.
Structure positions are `label_seq_id`, the 1-based index into the entity's
SEQRES, which is protein3d's native coordinate plus one. The layer leaves author
numbering out: it carries insertion codes, so `100A` sorts between `100` and
`101` and integer arithmetic on it is wrong. The structure viewer can derive
auth numbering for display.

The API consists of two model methods:

```ts
structureResidue(rowName, seqPos): { structure, position, observed } | undefined
rowResidue(structureId, position): { rowName, seqPos } | undefined
```

Two lookups cover the need, not a general coordinate-translation framework. This
repo has three coordinate spaces (visible column, global column, row residue),
no cycles between them, and one consumer.

## Owner-keyed highlights

`highlightedColumns` is one transient volatile slot. protein3d hover, a genome
view and a future search all write it, and the last clear erases the others.
Replace the slot with a map:

```ts
applyHighlight(owner: string, highlights: Highlight[])
clearHighlight(owner: string)
```

backed by a `Map<string, Highlight[]>` volatile that `resolvedHighlights` merges
alongside the persisted `highlights` array. `setHighlightedColumns` stays as the
legacy single owner, so downstream callers keep working.

**Done** (`applyHighlight`/`clearHighlight` in `model.ts`, tests in
`highlights.test.ts`). `resolvedHighlights` merges the owner map over the
persisted `highlights` array, so a transient highlight resolves through the same
row projection as a document one and draws above it. `reset()` drops the map
because a hover belongs to the file that was open. `setHighlightedColumns` was
left as it was: it is a cross-repo contract with jbrowse-plugin-msaview and
renders through a different path, so `applyHighlight` sits beside it. Its
callers should migrate.

## What it unlocks

[Conservation on 3D structure](conservation-on-structure.md) becomes wiring with
no lookup step. That file assumes this already, but it cannot work while the row
↔ structure anchor is a sequence-equality guess.

A **multi-structure overlay** becomes possible without a structural aligner.
Take the columns where two rows both map to observed residues, feed those
C-alpha pairs to Kabsch, and ship the resulting 4×4 matrix as data beside the
mapping. The alignment already asserts which residues correspond, so fitting on
exactly those pairs derives the overlay from the alignment. The fit is also
reproducible from the snapshot, where a superposition tool's run is not. The
overlay belongs in protein3d, with the mapping layer as its input.

Tooltips can report the per-cell state. With three states in the data, a tooltip
can say "P69905 · residue 58 · not observed in 1A3N" where today it highlights a
plausible wrong residue.

## Out of scope

A general coordinate-translation framework, meaning registered translators, a
path planner between arbitrary spaces, and a status vocabulary spanning them.
That framework generalizes the two methods above and pays off when third parties
register hops you did not write, which nobody does here.

Fetching SIFTS from the viewer. The mapping arrives in the snapshot or it does
not exist, in line with the sources rule: lookups and precomputation, not a
service call on the render path.

A dense per-cell mapping matrix, for the same reason
[data-layers](data-layers.md) rejects a per-cell color matrix. SIFTS and model
mappings are contiguous segments in every case seen so far.

## Order

1. **Delete the 1:1 fallback in protein3d.** The change is downstream, small and
   fixes correctness only. No mapping and no matched row means no highlight.
2. ~~**Owner-keyed highlights here.**~~ Done, see above.
3. ~~**`residueMappings` plus the two lookup methods.**~~ Done. The layer, the
   types and `structureResidue`/`rowResidue` are in `model.ts`, documented in
   `docs/layers.md`, tested in `residueMappings.test.ts`.

   The prototype review in `~/ideas/sequence-structure-interop.md` settled three
   questions this file left open. **Both lookups take an optional selector and
   return undefined when the answer is not unique.** A row mapped onto four
   structures is that review's own worked example, and returning the first
   mapping is the ambiguity-reported-as-exact fault it criticises.
   **`unobserved` is in structure positions**, so a residue can be unobserved
   and outside the mapped region at once; the example range in this file implies
   that without stating it. **The viewer ignores a stale mapping.** The review's
   sharpest criticism is that the digest check stops at the fixture boundary and
   never travels with the data, and a mapping loaded against a re-aligned or
   revised sequence returns a wrong residue for every query. `rowLength` is the
   cheap declared check, a segment overrunning the row is the undeclared one,
   and `residueMappingProblems` lists why each mapping was ignored.

   Three generators write the layer from a SIFTS lookup.
   `scripts/examples-gen/structure.mjs` builds the mapping for the Src,
   sickle-cell hemoglobin and ACE2-spike examples, and
   `docs/tutorials/scripts/build_spike_structure.sh` and
   `build_protein_complex.sh` write one for the spike and hemoglobin tutorials.
   `react-msaview-cli residue-mappings` writes the layer for any alignment.

4. **A published locus type and hover/select callbacks**, so protein3d stops
   reaching into `mouseCol` and `setMousePos` through autoruns. Both repos
   already document that coupling as a hazard. Step 3 makes it worth fixing,
   because the mapping gives the callbacks a correct residue to carry.

## Notes

`conservation-on-structure.md` cited `website/src/lib/proteinStl.ts` for
in-browser AlphaFold fetching. That file no longer exists, and the citation
there has been corrected.
