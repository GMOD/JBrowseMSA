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

The two costs have different exponents. The distance matrix is O(n²·L) and
dominates up to ~200 rows. The join loop in `neighborJoining()` is O(n³), an
O(k²) sweep over active pairs to minimize `Q` with k running from n down to 2,
and it dominates past ~400. The calculation runs on the main thread with no
progress reporting and no cancel, so n=800 freezes the tab for ten seconds and
n=1600 would freeze it for about seventy.

A user can currently reach that size. The model guards only `rows.length < 2`;
the InterProScan dialog caps itself at 140 rows, but that limit is unrelated.

## Why the hclust fix doesn't port

`@gmod/hclust` (`~/src/gmod/hclust`, GMOD/hclust) already solved the same
problem. Its `docs/optimizations.md` records a cached nearest-neighbour per
active cluster taking n=5000 from 67s to 1.1s, replacing exactly this kind of
full pair rescan.

That cache is valid for UPGMA because average linkage satisfies reducibility: a
merge only perturbs distances involving the merged cluster, so every other
cluster's cached neighbour stays valid. NJ does not have that property. It
selects on `Q(i,j) = (n−2)·d(i,j) − r_i − r_j`, and every `r` changes on every
iteration, so a plain neighbour cache goes stale globally after each merge.

RapidNJ's technique works for NJ: cache a _bound_ on `Q` per row, sort each row
once, and stop scanning a row when the best achievable `Q` from its remainder
cannot beat the current best. RapidNJ changes the algorithm and can introduce
correctness bugs, where the charcode table was a mechanical swap with provably
identical output.

## Options, cheapest first

1. **Cap and say so.** Refuse above some n with a message pointing at FastTree /
   IQ-TREE, the way `scripts/examples-gen/README.md` already suggests for
   publication-grade trees. The cap takes one commit and is arguably correct,
   since NJ on thousands of sequences is the wrong tool however fast it runs.
2. **Move it off the main thread**, with the progress and cancellation pattern
   `fetchTextWithProgress` and the InterProScan flow already use. The move
   removes the freeze without touching the math, but n=1600 still takes about
   seventy seconds.
3. **RapidNJ-style Q bounds.** This option fixes the scaling. It needs a
   property test against the current implementation (same input, identical
   newick) first, since the existing tests only assert well-formedness and leaf
   presence, not topology.

I would not start at 3. The alignment sizes users load into this viewer matter
more than the asymptote, and nobody has reported the freeze.

## hclust as a substitute

People ask this often: `@gmod/hclust` cannot replace NJ here. It clusters
feature vectors by Euclidean distance in WASM; NJ here starts from aligned
sequences and a BLOSUM62 substitution score. You would have to one-hot encode
residues, and Euclidean distance on that encoding is not an evolutionary
distance. UPGMA's molecular-clock assumption is also wrong for divergent
families, which is presumably why the viewer has its own NJ implementation.

The two algorithms are close relatives, though, and a diff of the two loops
shows the difference:

|                | `@gmod/hclust` `distance.c`            | `neighborJoining.ts`             |
| -------------- | -------------------------------------- | -------------------------------- |
| pick a pair    | min raw `d(i,j)`                       | min `(n−2)·d(i,j) − r_i − r_j`   |
| update         | Lance-Williams `wA·d(A,k) + wB·d(B,k)` | `(d(i,k) + d(j,k) − d(i,j)) / 2` |
| emit per merge | one height                             | two limb lengths                 |

The third row explains the difference. A single height per merge only makes
sense if both children are equidistant from their parent, which is the clock
assumption; NJ needs two because it lets lineages evolve at different rates.
Both codebases clamp at the same step. hclust clamps heights _upward_ for
monotonicity because UPGMA should be ultrametric, and NJ clamps limbs at zero
because non-additive distances legitimately produce negative ones.

hclust does fit the other direction. It depends on `@gmod/newick`, which
`hierarchy.ts` already re-exports traversals from, so `toNewick(result.tree)` →
`model.setTree(...)` needs no adapter. To cluster a numeric matrix such as
samples, columns or expression values, run hclust and load its dendrogram as the
tree.
