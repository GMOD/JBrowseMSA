Read `docs/WRITING.md` before writing docs, captions or comments, and follow it
here too: agents copy this file's prose as house voice.

- **The viewer stays a viewer.** Data preparation and analysis become a tutorial
  (`docs/tutorials/`) plus a snapshot layer (`docs/layers.md`), never a menu
  item, a remote compute queue, or work long enough to freeze the tab. Neighbor
  joining under `maxNeighborJoiningRows` is the one exception.
- **Regenerating a figure leaves `git status` clean.** `docs/media` bytes live
  in S3 behind `media.lock` and reach anyone else only through `pnpm media:push`
  (`scripts/media-store/README.md`).

Architecture and the decisions behind it:
`agent-docs/reference/viewer-architecture.md`.
