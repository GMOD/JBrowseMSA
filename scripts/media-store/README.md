# The docs/media blob store

Figure bytes live in `s3://jbrowse.org/msaview-figures/`, and git tracks
`media.lock`: one line per file, `<path> <WxH> <bytes> <sha256>`, sorted by
path.

```sh
pnpm media:status              what docs/media and media.lock disagree about
pnpm media:pull [--force]      install every figure the manifest names
pnpm media:push [--dry-run]    upload new bytes, then rewrite media.lock
pnpm media:check               CI gate: manifest and worktree agree
pnpm media:report --base <ref> what moved since <ref>, with before/after images
```

`pnpm check:media` is a different question, and both names are the natural one.
That command asks whether every file in `docs/media` is shown by some rendered
page. `pnpm media:check` asks whether `media.lock` matches the worktree.

## Why the bytes moved

A figure regenerated on a render change is an undeltifiable blob git keeps
forever. Measured 2026-09-16: `docs/media` holds 14 MB across 150 files, and its
history already carries 506 blobs weighing 38.3 MiB of a 241 MB pack. The stock
is small. The rate is the argument: 388 figure revisions landed in September
against 95 in June, 5 in July and 50 in August, because the tutorials and their
figures are now written in bulk. At ~100 KB a revision that is tens of MB a
month that every clone carries and nobody reads.

jbrowse-components hit the same wall and its `website/scripts/figure-store.ts`
carries the reasoning at length. Four properties come from there:

- **Content-addressed**, so a key is never overwritten. This matters more than
  usual on this bucket, whose versioning is Suspended: a PUT by path clobbers in
  place and the old object is gone. `push` only ever creates a key named after
  its own bytes, so re-pushing identical content is a no-op and different
  content is a different key.
- **Immutable**, so every revision ever pushed stays fetchable at its own URL.
  That is what lets `media:report` render BEFORE and AFTER side by side from two
  store URLs, for a manifest line taken from any commit.
- **Nothing is deleted**, including keys no manifest points at. A store URL is a
  public link that goes into review comments and issues, and it should not rot
  because a figure was regenerated. Orphans cost a fraction of a cent a month.
- **Public reads**, so `pull` is a plain HTTPS GET and needs no credentials. A
  contributor, a fork's CI and a cold site build all fetch the same way a reader
  loads the page. Only `push` needs AWS.

`push` uploads bytes before it rewrites the manifest. A `media.lock` line naming
a blob nobody uploaded breaks `pull` for everyone who reads that line first.
Failing the other way leaves orphan blobs, which nobody sees.

## The cutover, which has not happened yet

The store is populated and verified: all 150 figures are pushed, and deleting
`docs/media` and running `pnpm media:pull` reconstructs it byte for byte. What
remains is taking the bytes out of git, and that is a separate commit because
four things read `docs/media` from disk and each needs `media:pull` in front of
it first:

- `pnpm build:site` and `build:pages`. `website/src/lib/tutorials.ts` imports
  individual figures (`import plddtThumb from '../../../docs/media/...'`), so a
  missing file fails the astro build rather than shipping a broken page.
- `.github/workflows/deploy-docs.yml`, before it builds the site.
- `scripts/check-media-refs.mjs`, which reads the directory.
- Any `generate.mjs` run. Its diff gate compares a fresh capture against the
  figure already on disk, so without a pull every spec looks new and a run
  rewrites all of them.

**Ten figures stay in git.** The root README and the `lib`, `cli`, `python` and
`r-msaview` package READMEs link them by relative path, which GitHub resolves
against the repo and npm rewrites to a raw URL. Gitignoring them breaks those
images on both, with no build to catch it, and pointing the READMEs at store
URLs does not help because a store URL carries the content hash and would go
stale on the next regen. They are also the figures nobody regenerates:

```
cli-clustalx.png  cli-domains.png  cli-letters.png  cli-quickstart.png
example-domains.svg  example-protein.svg  r-nucleotide.svg  r-quickstart.svg
python-quickstart.png  python-entropy-and-clicks.png
```

So `.gitignore` takes `docs/media/*` plus a `!` line for each of those ten. They
stay in the manifest as well, which costs ten lines and keeps `media:check`
asking one question about one directory.
