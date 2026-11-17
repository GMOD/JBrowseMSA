# Handoff: the viewer on someone else's page

The goal is a viewer that costs a host page little until a reader uses it.
Desktop browsers are the target; phones and Safari are not a priority.

## Landed

- `docs/tutorials/static_first.md`: the CLI draws the first frame as an SVG from
  one props file, the page shows it, and a click loads the bundle.
  `docs/tutorials/scripts/build_static_first.sh` measures it with Lighthouse: 8
  KB against 455 KB, Speed Index about 1.1 s against 4.8 s.
- `<jbrowse-msa loading="lazy">` (`packages/lib/src/element.ts`) mounts the
  viewer near the viewport and shows the element's own children until then.
- `packages/lib/src/useWheelScroll.ts`: a vertical wheel passes to the page at
  the top or bottom row, and panning uses pointer events.

## Open, in order

1. **A slim embed bundle.** `packages/lib/esbuild.mjs` writes one IIFE, 452 KB
   gzipped, and an IIFE cannot split, so every `lazy()` dialog (About, Help,
   Export SVG, GoTo, Metadata, the annotation dialogs) is inlined. An ESM build
   with splitting would load them on demand, and a `hideHeader` embed could
   leave out the import form and the menu bar. Check that the
   jbrowse-plugin-msaview UMD build still works, and that `script src` users of
   `bundle/index.js` keep a working path.
2. **Isolate the viewer from the host page's CSS.** `<jbrowse-msa>` renders into
   the page's DOM, so a host rule reaches the viewer: the tutorial's
   `.msa-embed button` rule moved the track menus into a corner. A shadow root
   would stop it, but MUI's emotion styles then have to be injected into that
   root.
3. **Draw the exported legend the way the live view does.** The CLI export puts
   the domain legend in a panel to the right (`LegendSVG` placement in
   `packages/lib/src/renderToSvg.tsx`), which widens a 900 px viewport export to
   1111 px. The live view overlays it on the alignment. An overlay option for
   `--viewport` exports would make the static frame match the first live frame.
4. **Bump the tutorial's pins.** The page, the build script and the hosted
   `packages/app/public/data/static_first/` pin `react-msaview@9.1.1`, which has
   neither the wheel fix nor `loading="lazy"`; 9.3.0 and later have both, and
   npm's latest is 11.0.0. Rerun the build script, copy its four files into the
   hosted folder, update the numbers in step 6, and consider showing
   `<jbrowse-msa loading="lazy">` with an `<img>` child in step 5.
