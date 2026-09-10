# The alignment ↔ structure correspondence as a layer

Which residue of which structure a given alignment cell corresponds to is
currently _inferred at hover time, by string equality, with a silent fallback to
a wrong answer_. Make it data instead: a snapshot layer that names the
correspondence, computed once by whatever knows how (SIFTS, an AlphaFold model,
a curator), and a viewer whose only jobs are to look it up and to refuse when
there is no entry. Same move as [layers that take data](data-layers.md) — an
agent computes, the snapshot carries it, the viewer draws — applied to the one
coordinate hop we do not own.

Background reading that prompted this: `~/ideas/sequence-structure-interop.md`,
local and deliberately outside the repo.

## What happens today

`jbrowse-plugin-protein3d` drives the MSA ↔ structure hover both ways. It finds
the alignment row for a structure with `findStructureRowName`
(`src/AddHighlightModel/msaRowMatch.ts`): the row whose **ungapped sequence
exactly equals** the structure's sequence. When no row matches, the sync in
`ProteinToMsaHoverSync.tsx` falls back to `col === seqPos`.

Both halves are wrong in the same cases, which are the common ones. Exact
sequence equality fails for a construct with an expression tag, a truncation, an
engineered residue, a selenomethionine substitution, or a row that is a
subsequence of the entry — a Pfam alignment whose rows are named `/27-137` never
matches a full-length structure. The fallback then maps column _n_ to residue
_n_, which for a gapped row is not merely approximate but arbitrary, and it
fails in the direction that looks like it worked: the highlight lands on a
residue, just not the right one.

Meanwhile the correct hop already exists one file over. `pdbUniProtMapping.ts`
parses SIFTS into `UniProtStructureSegment[]`, the authoritative UniProt ↔
structure correspondence, and uses it for feature display. Nothing composes it
with the column ↔ residue hop this repo owns, so the MSA link takes the shortcut
instead.

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
the viewer already owns the projection through `seqPosToVisibleCol`, and every
other layer follows the same rule: GFF features, `highlights` with a `row`, and
`columnTracks` whose `values` index a named row's residues.

**Segments, because SIFTS is segment-shaped.** `UniProtStructureSegment` in
protein3d is already `{unpStart, unpEnd, structStart, structEnd}`; this is the
same shape with the alignment row on the left instead of a UniProt accession. A
dozen numbers covers a case that a dense per-residue array would spend kilobytes
on, and the compact form makes the refusal rule structural: **a position not
covered by a segment is unmapped.**

**Three states, encoded by shape rather than by a status field.** Covered by a
segment is mapped and observed. Listed in `unobserved` is present in SEQRES with
no coordinates — worth distinguishing, because "the crystallographer could not
see it" and "this protein does not have that residue" mean different things to a
user. Anything else is unmapped, and unmapped draws nothing. Tables like this
rot at their status vocabulary; leaving the states implicit in the geometry
means there is no vocabulary to disagree about.

**Positions are 1-based inclusive on both sides**, as GFF and `highlights` are.
Structure positions are `label_seq_id`, the 1-based index into the entity's
SEQRES, which is protein3d's native coordinate plus one. Author numbering stays
out: it carries insertion codes, so `100A` sorts between `100` and `101` and
integer arithmetic on it is wrong. Let the structure viewer derive auth
numbering for display.

Two model methods are the entire API:

```ts
structureResidue(rowName, seqPos): { structure, position, observed } | undefined
rowResidue(structureId, position): { rowName, seqPos } | undefined
```

Two lookups, not a general coordinate-translation framework. This repo has three
coordinate spaces (visible column, global column, row residue), no cycles
between them, and one consumer.

## Owner-keyed highlights

`highlightedColumns` is one transient volatile slot. Two sources — protein3d
hover, a genome view, a future search — fight over it, and whoever clears last
wins. Replace the slot with a map:

```ts
applyHighlight(owner: string, highlights: Highlight[])
clearHighlight(owner: string)
```

backed by a `Map<string, Highlight[]>` volatile that `resolvedHighlights` merges
alongside the persisted `highlights` array. `setHighlightedColumns` stays as the
legacy single owner, so nothing downstream breaks.

**Done** (`applyHighlight`/`clearHighlight` in `model.ts`, tests in
`highlights.test.ts`). `resolvedHighlights` merges the owner map over the
persisted `highlights` array, so a transient highlight resolves through the same
row projection as a document one and draws above it, and `reset()` drops the map
because a hover belongs to the file that was open. `setHighlightedColumns` was
left alone rather than reimplemented on top: it is a cross-repo contract with
jbrowse-plugin-msaview and it renders through a different path, so this adds a
second door rather than moving the first. Its callers should migrate.

## What it unlocks

[Conservation on 3D structure](conservation-on-structure.md) becomes wiring with
no lookup step, which is what that file already claims but cannot deliver while
the row ↔ structure anchor is a sequence-equality guess.

A **multi-structure overlay** becomes possible without a structural aligner.
Take the columns where two rows both map to observed residues, feed those
C-alpha pairs to Kabsch, and ship the resulting 4×4 matrix as data beside the
mapping. The alignment already asserts which residues correspond, so fitting on
exactly those pairs makes the overlay a consequence of the alignment rather than
a second, independent claim about it — and the fit is reproducible from the
snapshot instead of from whatever a superposition tool did that afternoon. That
belongs in protein3d, not here, but the mapping layer is its input.

Per-cell honesty in the UI. With three states in the data, a tooltip can say
"P69905 · residue 58 · not observed in 1A3N" instead of highlighting something
plausible and wrong.

## What stays out

A general coordinate-translation framework — registered translators, a path
planner between arbitrary spaces, a status vocabulary spanning them. It is the
generalization of the two methods above and it pays off when third parties
register hops you did not write. Nobody does that here.

Fetching SIFTS from the viewer. The mapping arrives in the snapshot or it does
not exist, in line with the sources rule: lookups and precomputation, not a
service call on the render path.

A dense per-cell mapping matrix, for the same reason
[data-layers](data-layers.md) rejects a per-cell color matrix. Every real case
is segment-shaped, because the underlying biology is.

## Order

1. **Delete the 1:1 fallback in protein3d.** Downstream, small, pure
   correctness. No mapping and no matched row means no highlight.
2. ~~**Owner-keyed highlights here.**~~ Done — see above.
3. **`residueMappings` plus the two lookup methods.** The actual generalization.
4. **A published locus type and hover/select callbacks**, so protein3d stops
   reaching into `mouseCol` and `setMousePos` through autoruns. Both repos
   already document that coupling as a hazard; step 3 makes it worth fixing,
   because the mapping gives the callbacks something correct to carry.

## Notes

`conservation-on-structure.md` cited `website/src/lib/proteinStl.ts` for
in-browser AlphaFold fetching. That file no longer exists — corrected there.
