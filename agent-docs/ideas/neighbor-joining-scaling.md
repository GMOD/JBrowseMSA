# Neighbor joining past ~400 sequences

`calculateNeighborJoiningTreeFromMSA` has no upper bound on row count, and the
join loop is cubic. Measured 2026-08-19 on random 300-column protein input,
after the BLOSUM62 charcode-table commit (800c59a):

```
n=100      211ms
n=200      306ms
n=400     1497ms
n=800    10351ms
```

Two costs with different exponents. The distance matrix is O(n²·L) and dominates
up to ~200 rows; the join loop in `neighborJoining()` is O(n³) — an O(k²) sweep
over active pairs to minimize `Q`, with k running n down to 2 — and takes over
past ~400. It runs on the main thread with no progress reporting and no cancel,
so n=800 is a ten-second freeze and n=1600 would be about seventy.

Nothing currently stops a user reaching that. The model guards only
`rows.length < 2`; the InterProScan dialog caps itself at 140 rows but that is
its own limit, unrelated.

## Why the obvious fix doesn't port

`@gmod/hclust` (`~/src/gmod/hclust`, GMOD/hclust) already solved the identical
shape. Its `docs/optimizations.md` records a cached nearest-neighbour per active
cluster taking n=5000 from 67s to 1.1s, replacing exactly this kind of full pair
rescan.

That cache is valid for UPGMA because average linkage satisfies reducibility: a
merge only perturbs distances involving the merged cluster, so every other
cluster's cached neighbour survives. NJ does not have that property. It selects
on `Q(i,j) = (n−2)·d(i,j) − r_i − r_j`, and every `r` changes on every
iteration, so a plain neighbour cache goes stale globally after each merge.

The real technique is RapidNJ's: cache a _bound_ on `Q` per row, sort each row
once, and stop scanning a row when the best achievable `Q` from its remainder
cannot beat the current best. That is a genuine algorithm change with real
correctness surface — not the mechanical, provably-identical swap the charcode
table was.

## Options, cheapest first

1. **Cap and say so.** Refuse above some n with a message pointing at FastTree /
   IQ-TREE, the way `scripts/examples-gen/README.md` already suggests for
   publication-grade trees. Honest, one commit, and arguably correct: NJ on
   thousands of sequences is the wrong tool regardless of how fast it runs.
2. **Move it off the main thread**, with the progress + cancellation shape
   `fetchTextWithProgress` and the InterProScan flow already use. Fixes the
   freeze without touching the math. Does not make n=1600 finish.
3. **RapidNJ-style Q bounds.** The actual fix. Wants a property test against the
   current implementation (same input, identical newick) before anything else,
   since the existing tests only assert well-formedness and leaf presence, not
   topology.

I would not start at 3. The alignment sizes this viewer is actually pointed at
matter more than the asymptote, and nobody has reported the freeze.

## While you are here: hclust is not a substitute

Recurring question, so: `@gmod/hclust` cannot replace this. It clusters feature
vectors by Euclidean distance in WASM; NJ here starts from aligned sequences and
a BLOSUM62 substitution score. You would have to one-hot encode residues, and
Euclidean distance on that is not an evolutionary distance. UPGMA's molecular-
clock assumption is also wrong for divergent families — which is presumably why
the viewer grew its own NJ instead of calling the package.

The two are close relatives, though, and the difference is visible in a diff of
the two loops:

|                | `@gmod/hclust` `distance.c`            | `neighborJoining.ts`             |
| -------------- | -------------------------------------- | -------------------------------- |
| pick a pair    | min raw `d(i,j)`                       | min `(n−2)·d(i,j) − r_i − r_j`   |
| update         | Lance-Williams `wA·d(A,k) + wB·d(B,k)` | `(d(i,k) + d(j,k) − d(i,j)) / 2` |
| emit per merge | one height                             | two limb lengths                 |

The third row is the whole story. A single height per merge only makes sense if
both children are equidistant from their parent, which is the clock assumption;
NJ needs two because it lets lineages run at different rates. Each codebase then
defends its own assumption at the same line — hclust clamps heights _upward_ for
monotonicity because UPGMA should be ultrametric, NJ clamps limbs at zero
because non-additive distances legitimately produce negative ones.

Where hclust _does_ fit is the other direction. It depends on `@gmod/newick`,
which `hierarchy.ts` already re-exports traversals from, so
`toNewick(result.tree)` → `model.setTree(...)` needs no adapter. That is the
path for clustering a numeric matrix — samples, columns, expression — and
feeding the dendrogram in as the tree.
