# CHANGELOG

Generated from the commit history by [git-cliff](https://git-cliff.org);
`scripts/release.js` prepends the new section as it tags. Releases up to v3.1.3
were written by hand and are kept at the bottom.

## [10.1.1](https://github.com/GMOD/JBrowseMSA/compare/v10.1.0...v10.1.1) (2026-11-10)

### Other Changes

- Row coordinate helpers get their own package, msa-coordinates ([6949115](https://github.com/GMOD/JBrowseMSA/commit/6949115e69d6b78eca52cdac3e1db631fcfee863))
- The release script stops on a package npm has never seen ([05c7bbf](https://github.com/GMOD/JBrowseMSA/commit/05c7bbfb4a2261d1fcfb76fcdf4c28d479435805))
- The release script also checks each package trusts this repository ([598aa1e](https://github.com/GMOD/JBrowseMSA/commit/598aa1ef9ae818ffccce1ea4112339a3d6a7e3fe))
- Bump tsrs, serve-handler, astro and @astrojs/react ([1c9ae83](https://github.com/GMOD/JBrowseMSA/commit/1c9ae83788ce19f5309d1cee3a8a873e428651b3))
- The release script warns when it cannot read a package's trust ([f7f0779](https://github.com/GMOD/JBrowseMSA/commit/f7f07790d1b31bc47ced8c7ad714ac94c3ec8b6c))
- Pin @astrojs/react to 7.1.5 ([c37d5b4](https://github.com/GMOD/JBrowseMSA/commit/c37d5b496113a1f276b33b6195e0519e0040daa1))

## [10.1.0](https://github.com/GMOD/JBrowseMSA/compare/v10.0.0...v10.1.0) (2026-11-10)

### Documentation

- Docs/tutorials/CLAUDE.md keeps the figure traps, and the authoring guide moves to agent-docs ([3cc4b2d](https://github.com/GMOD/JBrowseMSA/commit/3cc4b2d1f1b2f1d432f19ed91d68fe25aa75e1f9))

### Other Changes

- The root CLAUDE.md keeps the repo-wide traps, packages/lib/CLAUDE.md the model's ([4072ed6](https://github.com/GMOD/JBrowseMSA/commit/4072ed6c8624c12b80b17bb1e42987f9f9f04ca5))
- Typecheck and type-aware lint run on tsrs ([763dd28](https://github.com/GMOD/JBrowseMSA/commit/763dd28b4e6d856367fddd6bd766862aad412ed1))
- Clear the strict lint rules in the JS scripts ([2aa1f2e](https://github.com/GMOD/JBrowseMSA/commit/2aa1f2e63ed229aa8f160ac970081a522eb41070))
- Type the viewer's any sources for the strict lint rules ([91d1105](https://github.com/GMOD/JBrowseMSA/commit/91d110537af752cb29e3a80a0a757afd79a96961))
- Lint with the strict type-aware rule set ([ee005de](https://github.com/GMOD/JBrowseMSA/commit/ee005de01285a8c4c39b64ffc524034a460ff19b))
- Dialogs queue with their component's props, as jbrowse's session does ([a457281](https://github.com/GMOD/JBrowseMSA/commit/a457281caa5c402ba1b3411a33c3024ca32733e6))
- Update dependencies to latest, keeping typescript ([0093189](https://github.com/GMOD/JBrowseMSA/commit/00931890515835d93c081e9e3f5f77a66b5f475f))
- Ellipsize cuts a label's middle, keeping both ends ([ee44090](https://github.com/GMOD/JBrowseMSA/commit/ee44090d7591d26628f81e713d97c07ac0f735f8))
- Fix stale demo comments, a typecast and unread residueMappings in the examples ([5f8a938](https://github.com/GMOD/JBrowseMSA/commit/5f8a9380cdcc4fb480d63d9ce3ce8007e839bac7))
- Structure demos share a selection-following fit, and the index globs its examples ([f4d50e0](https://github.com/GMOD/JBrowseMSA/commit/f4d50e073056c6e69d4e30d9e203f87eac0ce1c5))
- Fold the examples into 24 demos that each show several things ([ad55101](https://github.com/GMOD/JBrowseMSA/commit/ad55101d906c10adf9843c15135c2ca15beeac49))
- Examples page shows each demo's source behind a button ([809f54c](https://github.com/GMOD/JBrowseMSA/commit/809f54c33fb03733e0ad47a5ca906d94e01e747f))
- KinaseFacets is tall enough for its eight rows under the CA distance track ([8641c9e](https://github.com/GMOD/JBrowseMSA/commit/8641c9ea01d5f301fbecd8ec9465c96bd59833c0))
- Drop the Pfam full alignment from the examples, leaving the A3M demo ([3bf8126](https://github.com/GMOD/JBrowseMSA/commit/3bf81260e8f467efb01eca34bc8ae079ad8430af))
- Example generators stop writing residue mappings no example reads ([18a685f](https://github.com/GMOD/JBrowseMSA/commit/18a685f3b6e0735da28212f3bf5e65d85cc55721))
- HemoglobinChains and KinaseFacets share one structure color select ([50bad9e](https://github.com/GMOD/JBrowseMSA/commit/50bad9e219bed29176d0539a05472c2e1a85a70a))
- Regenerate the apidocs and the protein figure for the typed signatures and middle ellipsis ([5d20a5c](https://github.com/GMOD/JBrowseMSA/commit/5d20a5cde7ef0d5b4c68e9f0b57aeb1cfcebfffb))
- Add a machine learning example: ESM-2 against a measured p53 screen ([f54ad40](https://github.com/GMOD/JBrowseMSA/commit/f54ad40013265190dd9b27d67125406f92bc90ff))
- Structures paint from any column track and draw as a surface ([e9c75ee](https://github.com/GMOD/JBrowseMSA/commit/e9c75eee5e224aff1411b2dcf77ab9cb3aea5af4))
- Highlights take a bracket mark: a labeled strip above the alignment ([aca6ea9](https://github.com/GMOD/JBrowseMSA/commit/aca6ea9b513bac4d7dcb8e16da0f3b491259cade))
- Structure panel hides its search and style controls behind buttons ([b11d068](https://github.com/GMOD/JBrowseMSA/commit/b11d068d69950a5ccfd9482119dc0835caeb74cd))
- Hovering a highlight bracket lights its range on the structure ([3dd2f25](https://github.com/GMOD/JBrowseMSA/commit/3dd2f256af07a5283b1f6a7ec81c38789e35b18e))
- A label wider than its bracket starts past the bracket's end ([5a9dc65](https://github.com/GMOD/JBrowseMSA/commit/5a9dc654158decf14dec6bc96f1ddf4b6d4d720d))
- The spike tutorial draws its UniProt regions as brackets ([e83f7db](https://github.com/GMOD/JBrowseMSA/commit/e83f7dbc541635ba6a1a105204196ca6e96b9d00))
- Format layers.md and paint.ts with oxfmt ([55b6f32](https://github.com/GMOD/JBrowseMSA/commit/55b6f32368ce440202e56e8b5e4e7c7408ed523c))
- The spike tutorial's R figure draws the highlight strip ([c1dcfdb](https://github.com/GMOD/JBrowseMSA/commit/c1dcfdb4c047b248dd9ca1dd650447ecc8266cd0))
- Reflow the spike tutorial's R caption ([c6323af](https://github.com/GMOD/JBrowseMSA/commit/c6323afb095c833c72817831b773925872e063ac))
- Row coordinate helpers move to msa-parsers ([bf93838](https://github.com/GMOD/JBrowseMSA/commit/bf938383357421071248514acd585f9bfc7eefd2))
- Tutorial specs share one FASTA reader and residue walk ([2c7b9d1](https://github.com/GMOD/JBrowseMSA/commit/2c7b9d158f00773b2fc9f4902252dd521c16ff31))
- Tree reading moves to msa-parsers, rerooting to @gmod/newick ([8c9949a](https://github.com/GMOD/JBrowseMSA/commit/8c9949a0d572ebf7e4cb9a08b33d0bf031ca98cc))

## [10.0.0](https://github.com/GMOD/JBrowseMSA/compare/v9.8.0...v10.0.0) (2026-11-06)

### Other Changes

- The R package page carries ggmsaview's README and gallery ([aa8b11c](https://github.com/GMOD/JBrowseMSA/commit/aa8b11c00038da908916790a686a83f8476403b8))
- Link the site's own pages instead of their GitHub copies ([1191ec8](https://github.com/GMOD/JBrowseMSA/commit/1191ec8bb72ad64ed6c30927508d3445de969c08))
- Bump p2s_mapper to 2.4.0 ([0e504de](https://github.com/GMOD/JBrowseMSA/commit/0e504de8163aad84716c85a6fe47aea37135be8d))
- Settings list Domains beside the color schemes under Color by ([8834bf5](https://github.com/GMOD/JBrowseMSA/commit/8834bf500d50e86a5018883c60895c6a3294301f))
- The app fills the window and docks the structure finder right ([82edfb3](https://github.com/GMOD/JBrowseMSA/commit/82edfb30cbfb086453a1fa9080bab8638e91bdfd))
- Test that a measured height stays out of the snapshot; regenerate apidocs ([d826c21](https://github.com/GMOD/JBrowseMSA/commit/d826c21497a66a3631e51e3017c4cace7a0002d0))
- Read the accession out of a Pfam-style ACC_SPECIES row name ([86e628b](https://github.com/GMOD/JBrowseMSA/commit/86e628baf373b1706577c550c00edf6871050a7d))
- The app's empty screen leads with four example cards ([8c69e5e](https://github.com/GMOD/JBrowseMSA/commit/8c69e5e91ca14137cde1fc61483dab19d3cebfc0))
- Put the file inputs ahead of the example cards on the app's empty screen ([48782ac](https://github.com/GMOD/JBrowseMSA/commit/48782acb10f3c7a1f4c965f5f99e417b09096ffe))
- Collapse the app's example cards behind a Show examples button ([227fa5b](https://github.com/GMOD/JBrowseMSA/commit/227fa5b0578791a25dbdabc29339a38c51c5515b))
- Add a URL parameters page for the app's #data= link ([59c1622](https://github.com/GMOD/JBrowseMSA/commit/59c1622a39938c405b24a3475202c1ee79dde784))
- Keep the lib's import form layout; examples below the inputs is an opt-in prop ([d501d07](https://github.com/GMOD/JBrowseMSA/commit/d501d07a99f06345732e163356903484b1735ccd))
- Name the omitted file in the not-shareable badge and mute its color ([580d8c5](https://github.com/GMOD/JBrowseMSA/commit/580d8c56faf6701fd97dd3290d784f2517fdaead))
- Remove the header's not-shareable badge ([e92a851](https://github.com/GMOD/JBrowseMSA/commit/e92a8519e1d94541e10dd7a0897d93acba17fab0))
- Fix model state bugs: clade seeding, data setters, arcs, warnings ([2aba6cc](https://github.com/GMOD/JBrowseMSA/commit/2aba6cc6e3a199a19e0aed548beaab4281620509))
- Name each panel and track channel for what it paints ([6daa9e4](https://github.com/GMOD/JBrowseMSA/commit/6daa9e40c37fb46597a74f9c80333bff45f689f0))
- Rebuild the tree overview image on rotate, reorder and reroot; keep its layout observed across hover ([3046d0d](https://github.com/GMOD/JBrowseMSA/commit/3046d0ddc364456ba20bd0a19e057a562b2febcd))
- Clip each exported row panel to its own width ([560054f](https://github.com/GMOD/JBrowseMSA/commit/560054f29ce73522cf6464feb66869ab4af547d5))
- Anchor the row panel headers to the foot of the top band ([9a6b0e8](https://github.com/GMOD/JBrowseMSA/commit/9a6b0e89fa68b9102b04e1a7e0000833ebe4d120))
- Draw row bands as clipped runs, shared by the hover overlays and the row washes ([189557b](https://github.com/GMOD/JBrowseMSA/commit/189557bbf3d048c991484f2e72928b4bd551dd9e))
- Keep the minimap bar sharp and bound its domain rects ([17902a5](https://github.com/GMOD/JBrowseMSA/commit/17902a5734bbb68b1a53efb0430685503ea66b75))
- Make svgcanvas save/restore carry state only, and leave rgba to svgSafeColors ([14fbf60](https://github.com/GMOD/JBrowseMSA/commit/14fbf609c484b35ee83c64d95896c2fd878d268a))
- Drop export on four helpers only their own module calls ([90fc63c](https://github.com/GMOD/JBrowseMSA/commit/90fc63c798641a6de524990347b83222b88595f0))
- Drop an unused binding in the track export, and format two tests ([c5a7afa](https://github.com/GMOD/JBrowseMSA/commit/c5a7afaad0070d4435658d6c935869efab38f080))
- Paint a highlight's whole rows on the structure when it also names columns ([3f0f7e2](https://github.com/GMOD/JBrowseMSA/commit/3f0f7e24ee8ac1221fc16db4a2b257599db739f1))
- Share one fetchText across the structure package and the app ([19815eb](https://github.com/GMOD/JBrowseMSA/commit/19815ebba941cc93ac496f1ce83b945549dafc03))
- Look up PDB entries for a UniProt entry AlphaFold DB has no model of ([033c8a8](https://github.com/GMOD/JBrowseMSA/commit/033c8a8fefc57c31bef82fc6ac013320b5f049d7))
- Parse UniProt accessions with one function in msa-parsers ([a21313d](https://github.com/GMOD/JBrowseMSA/commit/a21313dca37dda10744b8ad4ca1e632f847525ce))
- Read an Ensembl Compara EMF dump past its ## header lines ([4498fe8](https://github.com/GMOD/JBrowseMSA/commit/4498fe8e4393ddc39e201c4233c99622698ad311))
- Name the chain id space in the CLI's residue mappings ([d0a87cb](https://github.com/GMOD/JBrowseMSA/commit/d0a87cb519461ab29807e40db1b295d951b4f833))
- Write the genestructure GFF through annotationsToGFF ([a167b20](https://github.com/GMOD/JBrowseMSA/commit/a167b200379f22ee5b8e4aebff49db7bdd8e2ba4))
- Share one fetchJsonWithRetry between residue-mappings and genestructure ([3dc07ae](https://github.com/GMOD/JBrowseMSA/commit/3dc07aec21d704015fc7f17281d4c73194753092))
- Take the model's 1-based selection in superposeRows ([bb50fe6](https://github.com/GMOD/JBrowseMSA/commit/bb50fe6534ac67ba1f66f3b64ad6712413a31a4e))
- Trim react-msaview-structure's exports to what callers import ([942b7ba](https://github.com/GMOD/JBrowseMSA/commit/942b7badecc7465ec83d92e07fe13ed1ffa90f08))
- Write the header test's strip in the encoding spelling, and format renderHighlights ([72210ea](https://github.com/GMOD/JBrowseMSA/commit/72210ea391dbf289e9cf25f34713333e5018326d))
- Nest each channel's scale and legend, as jbrowse-components' displays do ([5e69638](https://github.com/GMOD/JBrowseMSA/commit/5e6963844bbebf7171ad95f1e5dad3852c2da39e))
- Keep genestructure's own GFF lines, with the row name escaped ([100eb4f](https://github.com/GMOD/JBrowseMSA/commit/100eb4f9b8a637fc52993cb9caa322ea5e736ec4))
- Fix what the branch review found ([f96d951](https://github.com/GMOD/JBrowseMSA/commit/f96d951444924adda410e655213d414539463958))
- Drop every reader of the earlier layer spellings ([64f65bc](https://github.com/GMOD/JBrowseMSA/commit/64f65bc162badf9784b4c71a5ececc2df19d06aa))
- Write the tutorials' layers, data files and figure links in today's spelling ([633f86d](https://github.com/GMOD/JBrowseMSA/commit/633f86df9c7bcbf5e43d94e65c13c3f874129029))
- Drop the earlier spellings from the reference docs ([df5e702](https://github.com/GMOD/JBrowseMSA/commit/df5e70272f9e6d1cb4646be25e3f91908373b1a0))
- Write the CLI test's and the entropy notebook's tracks in today's spelling ([ff75b98](https://github.com/GMOD/JBrowseMSA/commit/ff75b983808a5166175a06b7a6ed731df6811857))
- Format the converted docs and specs ([96385b6](https://github.com/GMOD/JBrowseMSA/commit/96385b6b5b3d80343b54669f5e27047bc2cf8567))
- Sync the R package page from ggmsaview 02ac791, whose geom_msa_features takes fill ([ea53175](https://github.com/GMOD/JBrowseMSA/commit/ea53175d5a2d2e3bd4845ebf986cd847d47767bd))
- Name each interpro GFF line by its member database entry ([1b7f7e4](https://github.com/GMOD/JBrowseMSA/commit/1b7f7e465bccb7f9e30261b76b2e99c83ea36641))
- Describe the Annotations list as the panel draws it: names, no counts ([92ab64d](https://github.com/GMOD/JBrowseMSA/commit/92ab64dfa7726776aab6cba72ca1a5534db42c6c))
- Regenerate the figures after the cutover and the member-accession GFFs ([7209d75](https://github.com/GMOD/JBrowseMSA/commit/7209d752793da94c82e0d80b5a0470b59930c8fe))
- Run the Python widget job on Ubuntu 24.04, which still has 3.9 ([d9d989e](https://github.com/GMOD/JBrowseMSA/commit/d9d989ebe53ce9f992ad8c5bf60f2822836be6e9))
- Install a font for the CLI's label measurement test ([8890e0e](https://github.com/GMOD/JBrowseMSA/commit/8890e0e4a4e1952f71eb97f11a8c51886173a5b4))
- Measure the CLI's labels in a proportional face where only DejaVu is installed ([033d2fd](https://github.com/GMOD/JBrowseMSA/commit/033d2fd8047f240085a97403d69c5dfdb3e68555))

## [9.8.0](https://github.com/GMOD/JBrowseMSA/compare/v9.7.0...v9.8.0) (2026-10-20)

### Other Changes

- A column highlight scrolled out of view draws no label ([f45eeeb](https://github.com/GMOD/JBrowseMSA/commit/f45eeeb3e082328e0378c07500356513cc2fcb6e))

## [9.7.0](https://github.com/GMOD/JBrowseMSA/compare/v9.6.0...v9.7.0) (2026-10-20)

### Other Changes

- Domains take mid-light fills, so their ends show against unfilled cells ([b233e63](https://github.com/GMOD/JBrowseMSA/commit/b233e63b2e7b37d3bfb4b4c7dcae5950538fc1af))

## [9.6.0](https://github.com/GMOD/JBrowseMSA/compare/v9.5.0...v9.6.0) (2026-10-20)

### Other Changes

- Domains take light fills and sites dark ones, so a site shows on its domain ([c3ad8f4](https://github.com/GMOD/JBrowseMSA/commit/c3ad8f4419e4b10376132d857637e2f8ea8cbab5))
- Regenerate the MsaView API docs and format for the light-domain, dark-site palette ([5e149e9](https://github.com/GMOD/JBrowseMSA/commit/5e149e96ffd8091d75fcdb099a586bb724ced96d))

## [9.5.0](https://github.com/GMOD/JBrowseMSA/compare/v9.4.0...v9.5.0) (2026-10-20)

### Other Changes

- A phylogram's scale bar always draws: remove showTreeScaleBar ([57e8c17](https://github.com/GMOD/JBrowseMSA/commit/57e8c171d101c021f8fc7c7889aa239892d44344))
- README figures: regenerate with the tree's scale bar ([e8fd1f7](https://github.com/GMOD/JBrowseMSA/commit/e8fd1f747be72b3a3d4aad2d0a3d57384f2cf999))

## [9.4.0](https://github.com/GMOD/JBrowseMSA/compare/v9.3.0...v9.4.0) (2026-10-19)

### Other Changes

- Group the domain palette by feature type so CDD sites sit apart from their domain ([5052267](https://github.com/GMOD/JBrowseMSA/commit/50522674e1bde1e2c544bd7aecdf52598e4b0160))

## [9.3.0](https://github.com/GMOD/JBrowseMSA/compare/v9.2.0...v9.3.0) (2026-10-19)

### Other Changes

- Hand the wheel to the page at the edges, and pan with pointer events ([70632da](https://github.com/GMOD/JBrowseMSA/commit/70632dac8693f086cd0adfef4c654a2d195e30e1))
- Say which scrolls pass to the page: a swipe only when the rows fit ([6f5b3a8](https://github.com/GMOD/JBrowseMSA/commit/6f5b3a8649bdebec8d9f3910d59ea70687ae3f10))
- Reflow the user guide's scroll bullet ([5d2fd0a](https://github.com/GMOD/JBrowseMSA/commit/5d2fd0a824c7b858b3388355766773b8818a7812))
- Add a static-first tutorial: an SVG on the page, the viewer on a click ([801fe6d](https://github.com/GMOD/JBrowseMSA/commit/801fe6df30180967355aca0a9f87f1f05399cd0e))
- Destroy each app the app model tests open ([0fa9175](https://github.com/GMOD/JBrowseMSA/commit/0fa9175892f39d13cc4eb45348eecdeecfaa483e))
- Add loading="lazy" to <jbrowse-msa>, mounting the viewer near the viewport ([7a99125](https://github.com/GMOD/JBrowseMSA/commit/7a991254978fac5a6a052d16f6a24de4ebc9ac5e))
- Print a default's value in the apidocs, where the model names a constant ([c2af062](https://github.com/GMOD/JBrowseMSA/commit/c2af0629fc2ac62bd50d7d235249a39d8f1fd8e5))
- Fix three faults in the wheel and pointer pan a review found ([717de97](https://github.com/GMOD/JBrowseMSA/commit/717de97ca48e80df0a8b41df57776e1401421af1))
- Format docgen's inlineConstants ([a509f27](https://github.com/GMOD/JBrowseMSA/commit/a509f2760f4d6acec8f4ee4b8d72c70cc1c8a937))
- Tighten the static-first page and its checks after review ([6548968](https://github.com/GMOD/JBrowseMSA/commit/65489688472a66d887451553ab18c69fdc397d6f))
- Push the recaptured static-first figures ([2b8e72a](https://github.com/GMOD/JBrowseMSA/commit/2b8e72afe045e3583e6a951a360e211f43bcccca))
- Hand off the remaining embed work ([6a4aaae](https://github.com/GMOD/JBrowseMSA/commit/6a4aaae32d79b7b84e63fbb075a8742c25b75be0))
- Hold tutorial openings to a list of what the page does ([33cff9f](https://github.com/GMOD/JBrowseMSA/commit/33cff9f38952996d6da2d6b90e945cc89590e1ef))
- Pare the tutorials down and let the figures carry them ([8dc5396](https://github.com/GMOD/JBrowseMSA/commit/8dc5396a3d44f8cc72b17de4035a2f3584168ec1))
- Color object: range and domain replace {palette, map}, one scale per declaration ([867e522](https://github.com/GMOD/JBrowseMSA/commit/867e52248e51ec6812899388b91ed4c429770e4e))
- Docs, USAGE and the Python widget write the color object ([da058aa](https://github.com/GMOD/JBrowseMSA/commit/da058aaa551908217b38eb551988408a9214fc81))
- Agent docs: the color object, and step 7 of scales-and-guides ([726495f](https://github.com/GMOD/JBrowseMSA/commit/726495fc925c42fd003a6558f4a0ad441cbcbaaa))
- Setters read the earlier spelling, typed ([5af12e2](https://github.com/GMOD/JBrowseMSA/commit/5af12e2d67b4a02d535ac555af4f064ab48e3109))
- Specs, tutorial scripts and tutorial prose write the color object ([1182729](https://github.com/GMOD/JBrowseMSA/commit/1182729a08289e4d71bd29dcdc1db56c41a863b9))
- Regenerated layers, tutorial links and tests in the color object ([0eb48f4](https://github.com/GMOD/JBrowseMSA/commit/0eb48f40629066d9c2eec00edb2250f880527712))
- Replace tutorial prose with eight new figures ([b2e5f87](https://github.com/GMOD/JBrowseMSA/commit/b2e5f87904d533a8388706290867477e60874afe))
- Resolve the structure package against the workspace's one React ([dcf3fb3](https://github.com/GMOD/JBrowseMSA/commit/dcf3fb3279dfd782f9e3e550d9eb5f7de5fbec90))
- Keep the spike figures on the alignment now the structure panel loads ([33ecbfb](https://github.com/GMOD/JBrowseMSA/commit/33ecbfb8669cb41ab44789792034074b2b2028e6))
- Push the new tutorial figures ([97acb45](https://github.com/GMOD/JBrowseMSA/commit/97acb45fe6378b628d1d37d09dbc6df1201e6656))
- Deep-import AppBar and ButtonBase, which a JBrowse host's MUI re-exports lack ([1afa87c](https://github.com/GMOD/JBrowseMSA/commit/1afa87c0f915cbd1ab0a627b9ddf6ee8a6293a74))
- Regenerate MsaView.md for the color object ([e23216a](https://github.com/GMOD/JBrowseMSA/commit/e23216afed24161b1632b5e02917e2d5f146503c))

## [9.2.0](https://github.com/GMOD/JBrowseMSA/compare/v9.1.1...v9.2.0) (2026-10-19)

### Other Changes

- Pin the reference row above the alignment as a track ([6749167](https://github.com/GMOD/JBrowseMSA/commit/674916789c60e87ede9919618b2e09669b77fc21))
- Document relativeTo, and read the TEM alleles against a pinned TEM-1 ([8ae3c77](https://github.com/GMOD/JBrowseMSA/commit/8ae3c776194102b3853443d6f9048a16e8369cf6))
- Regenerate the 18 figures that set a reference row ([0f91372](https://github.com/GMOD/JBrowseMSA/commit/0f913723232cb8f9cbe41574035cce22dcf6fe06))
- Rename the Python package to jbrowsemsa ([e7227ce](https://github.com/GMOD/JBrowseMSA/commit/e7227ceb5ad9a43b9daef000ae56bd6e774d1b3e))
- Read #data= JSON as typed, so a hand-written link needs no encoding ([ac56381](https://github.com/GMOD/JBrowseMSA/commit/ac563810a8f472d4a8822e92b8c535730988f987))

## [9.1.1](https://github.com/GMOD/JBrowseMSA/compare/v9.1.0...v9.1.1) (2026-10-19)

### Other Changes

- A viewer capture leaves out the toolbar ([8816459](https://github.com/GMOD/JBrowseMSA/commit/88164595eb1a8738a17406dd100b790190bb6d30))
- Pull keeps a figure media.lock has never named ([bf59e3b](https://github.com/GMOD/JBrowseMSA/commit/bf59e3bd80f5735c0a4ac210af857255fb5d64f5))
- Regenerate the app captures without the toolbar ([e581a14](https://github.com/GMOD/JBrowseMSA/commit/e581a14f1916b704dec7a49015bd6c13fc77379b))
- Six captures main's feature-span commits redrew ([6cc2a35](https://github.com/GMOD/JBrowseMSA/commit/6cc2a351e48f87b9a873907fe97b48ec08508901))
- The R package moves to GMOD/ggmsaview ([6fbfbe7](https://github.com/GMOD/JBrowseMSA/commit/6fbfbe7b7204a921e9f16a289515084a02f025ff))
- Viewer captures keep the toolbar again ([88f970a](https://github.com/GMOD/JBrowseMSA/commit/88f970a64008317b1bce7ea2a602908e84398162))
- The app captures with the toolbar again ([a03b5b5](https://github.com/GMOD/JBrowseMSA/commit/a03b5b50bfb0e1e086ff759d9462d95577e293db))
- A Web | R switch at the step that opens the result ([0b4d6ea](https://github.com/GMOD/JBrowseMSA/commit/0b4d6ea397da9844e80d0d42ee970ee1168f61bb))
- CI runs every tutorial's R panel against ggmsaview's main ([3d1a485](https://github.com/GMOD/JBrowseMSA/commit/3d1a48521d03a057f5421e1dd7f5dc3e735ccc4c))
- Tutorials holds every page to a Web | R switch ([9c4accd](https://github.com/GMOD/JBrowseMSA/commit/9c4accd5780b177a41207537a122ec7b2c015dec))
- The finished view in R, beside its #data= link ([ce8b76a](https://github.com/GMOD/JBrowseMSA/commit/ce8b76a8ba7016ee23976616896c25a5016a540f))
- The finished view in R, beside its #data= link ([adc3486](https://github.com/GMOD/JBrowseMSA/commit/adc34867db547730067e78ee22488b5e6d3d6423))
- The finished view in R, beside its #data= link ([1ce5e6d](https://github.com/GMOD/JBrowseMSA/commit/1ce5e6dc6dd21b7554c61f1d0654364a25e91ed9))
- Step 10 splits into the shared link and the saved widget ([2260092](https://github.com/GMOD/JBrowseMSA/commit/22600928e768d2e6a59a776346c1ebbd6ace42b5))
- Open the three files in R as well as on the web ([53b689e](https://github.com/GMOD/JBrowseMSA/commit/53b689e068fc3fc109c97a50343719ba38db0a63))
- The pocket logo in R as well as on the web ([96a36f6](https://github.com/GMOD/JBrowseMSA/commit/96a36f69121f3edd812b61deff5ab50354dd3534))
- The three evidence tracks in R as well as on the web ([641a96b](https://github.com/GMOD/JBrowseMSA/commit/641a96b3fbcdb91b4215b48310b2c905f11a77c3))
- Open the whole thing in R as well as on the web ([9e3bcb2](https://github.com/GMOD/JBrowseMSA/commit/9e3bcb275181713d674eda7a3e3902734a61f51d))
- The whole view in R beside its #data= link ([70a3291](https://github.com/GMOD/JBrowseMSA/commit/70a3291db5e523ea9c91ed49a0e50bfbb2b440d2))
- The shared view in R beside the Python link ([9541b21](https://github.com/GMOD/JBrowseMSA/commit/9541b21652c8df5d622a39fe4fbb38b0d8b28604))
- The finished figure in R beside the link ([fc93124](https://github.com/GMOD/JBrowseMSA/commit/fc931249488ad55afc3de38eba3719636d7024d1))
- The shared view in R beside its link ([33e5227](https://github.com/GMOD/JBrowseMSA/commit/33e5227ce59142ef18620864b371a8378eb0fe53))
- The shared view in R as well as by link ([e8594d6](https://github.com/GMOD/JBrowseMSA/commit/e8594d61eff2f70d6d5049bacb47968a935774d0))
- The trpE-aligned panel in R as well as by link ([506a282](https://github.com/GMOD/JBrowseMSA/commit/506a282fb206346ed6678f2f1aaa67c605b8e403))
- The whole view in R as well as by link ([c69eb37](https://github.com/GMOD/JBrowseMSA/commit/c69eb377a0291c726bb71bf21bb767cd0d1f91b2))
- Recombination_breakpoint's R half, and the R captions match the figures ([69e365e](https://github.com/GMOD/JBrowseMSA/commit/69e365eb73c6e305a8b90d08a79b98a57fdf4d0d))
- The seventeen tutorial R figures ([0ab5ee1](https://github.com/GMOD/JBrowseMSA/commit/0ab5ee195b075d19947cbd83e78e70b6e6c65217))
- Gene_neighborhoods, protein_complex: the R halves load the GFF as the links do ([650c147](https://github.com/GMOD/JBrowseMSA/commit/650c14709f9565bcf06385d4d4944a8e697faba1))
- Gene_neighborhoods' R figure with its alignment ([ddae9e4](https://github.com/GMOD/JBrowseMSA/commit/ddae9e451e3fb845b1bb426f2c4577a1ecda98b5))
- Reflow the R panel's prose ([1e88d83](https://github.com/GMOD/JBrowseMSA/commit/1e88d83fde26ac3674ef1c482ae94da72c098ddb))
- Draw canvases dark while Dark Reader darkens the page ([80f8e80](https://github.com/GMOD/JBrowseMSA/commit/80f8e80259ecbc109fd479bd14a4a1ed8dbbc0c1))
- Metadata dialog: plain-language Stockholm tags, grouped references, grid layout ([d436be0](https://github.com/GMOD/JBrowseMSA/commit/d436be0eab77886d255c334f1d130da6d73afc64))
- Ease wheel zoom per notch and track pinch 1:1 ([1d0b3ae](https://github.com/GMOD/JBrowseMSA/commit/1d0b3ae943f8df4cf18f1652ba0a35cbc772857e))
- Add a ctrl-wheel zoom benchmark ([0a207d7](https://github.com/GMOD/JBrowseMSA/commit/0a207d7bef6603e9050ad50db8ed73ccf1405a22))
- Stretch drawn alignment blocks through a wheel zoom ([9537d19](https://github.com/GMOD/JBrowseMSA/commit/9537d199b54a597ec98426fbedf7f569050e6273))
- Add blosum62_dynamic color scheme ([c26bc21](https://github.com/GMOD/JBrowseMSA/commit/c26bc21201685b54ff1cb74f952bd2ca7824c92c))
- Regenerate state model docs for colSimilarity ([f194f9f](https://github.com/GMOD/JBrowseMSA/commit/f194f9fb5f42373349aa2937950f7d86274c813c))
- Paint the linked structure with the alignment's color scheme ([eca1151](https://github.com/GMOD/JBrowseMSA/commit/eca1151e7d6475dcc5d97b1277ad27202a73cb04))
- Fix CI: export ZoomSnapshot, format with oxfmt ([61b9ba7](https://github.com/GMOD/JBrowseMSA/commit/61b9ba7ba7d7eaccc7d509596cc7fd5229686acf))
- Drop an unneeded non-null assertion on the scheme list ([c80e2d2](https://github.com/GMOD/JBrowseMSA/commit/c80e2d2a1afeeaacf4ec36764a5712691be35255))
- Add showTreeScaleBar, off by default ([42a6a09](https://github.com/GMOD/JBrowseMSA/commit/42a6a09ee000e1357892d30ab9ef8fe089d4abba))
- Simplify the viewer header: labelled menus, no slider, no wheel modes ([a18af19](https://github.com/GMOD/JBrowseMSA/commit/a18af192b9cd6a1b69f7cfdfc23f2d0664e797d3))
- Move go-to from the header into View → Go to row or column… ([ce02620](https://github.com/GMOD/JBrowseMSA/commit/ce02620b2fb034db89bae371ea57c58efa068c6b))
- Compact, simpler header menus in a light MUI AppBar ([78fc923](https://github.com/GMOD/JBrowseMSA/commit/78fc923ebff81f6edd9e8a67f9efbc8eb20bf4da))
- Tree menu: one Phylogram/Cladogram/Labels only choice for the layout ([6320eb6](https://github.com/GMOD/JBrowseMSA/commit/6320eb6c080c64967bdff1054a0051a75a1ec621))
- Header menu bar: File, Edit, View, Tools, Help ([72c9f5c](https://github.com/GMOD/JBrowseMSA/commit/72c9f5cb91a4089c90ef3f75d43ccadcd41fd4e7))
- Zoom on scroll checkbox in the header, and a cleaner import form ([18c3775](https://github.com/GMOD/JBrowseMSA/commit/18c3775f8eaea08959c1d95c2448285fc650f1d1))
- Fit fills a tall alignment, and zooming finds the default cell size ([c88c93f](https://github.com/GMOD/JBrowseMSA/commit/c88c93fac5db8db43100681cd58509149c777b3e))
- Drop the Edit menu, add a track selector, restore the import form ([6665c82](https://github.com/GMOD/JBrowseMSA/commit/6665c8235e021e4e41e16388f49ec7e8c100123a))
- SetTracksShown ([133ebe2](https://github.com/GMOD/JBrowseMSA/commit/133ebe277fff1fd76dc21a809d38c81bd73ce17f))
- Minimap draws the domain overlay ([93d1833](https://github.com/GMOD/JBrowseMSA/commit/93d1833692940777a5140fddec541bc720308a62))
- Settings panel docked beside the alignment ([2b4d291](https://github.com/GMOD/JBrowseMSA/commit/2b4d291367fadabe44625b4b68beca2411aac214))
- Name who fills the cells: residue colors, domain colors, or nothing ([f81f1d0](https://github.com/GMOD/JBrowseMSA/commit/f81f1d0295f6a99ec06363929b566340284d2e00))
- Settings beside the menus and under Tools, short sections opened in place ([6a53426](https://github.com/GMOD/JBrowseMSA/commit/6a5342658e54d429fa919a972d90f9f87f7b8c9c))
- Track list groups a Stockholm file's per-row lines by tag ([af53b3b](https://github.com/GMOD/JBrowseMSA/commit/af53b3b4699f959dd146972beceb77de9b82cac5))
- Stockholm #=GR lines draw on their row as annotations, not as tracks ([2a5e0fa](https://github.com/GMOD/JBrowseMSA/commit/2a5e0fa407f66899a7221ab40a322c3dd0592a10))
- Drop Tools → Settings now the Settings button sits beside the menus ([550d314](https://github.com/GMOD/JBrowseMSA/commit/550d3144e99ae0e5ae69c37923e46e01fda897a9))
- Fold main's scale bar toggle and BLOSUM62 scheme into the new menus ([64f30f8](https://github.com/GMOD/JBrowseMSA/commit/64f30f8007141b397db617cd2d162f916c6509f7))
- Let the structure page's alignment colors reach the alignment cells ([0bfaabf](https://github.com/GMOD/JBrowseMSA/commit/0bfaabf80f399016d81554116b29ca24ad97e83c))
- Metadata dialog: show a string header field as a row, not one row per character ([38e7f6e](https://github.com/GMOD/JBrowseMSA/commit/38e7f6e57236c80d8d2a7768e1c88025eff5f6f3))
- Screenshot specs: follow the Settings panel and the Alignment info dialog ([5d0ff5b](https://github.com/GMOD/JBrowseMSA/commit/5d0ff5b0146fdabaad8802f9b1d3450002c68140))
- Metadata-dialog and protein-family-filter ([353a60a](https://github.com/GMOD/JBrowseMSA/commit/353a60a4681b32c3ff0ca5f6b3cb576d26de5cfd))
- Add a linked Mol* structure panel and a structure lookup to the app ([6cee64c](https://github.com/GMOD/JBrowseMSA/commit/6cee64cbcb70b1c2956226f48198b5bad993604d))
- Superpose rows by the alignment, and split the app view left and right ([4b08019](https://github.com/GMOD/JBrowseMSA/commit/4b080198c0f3c69623c910d8f78d51facd637376))
- Regenerate the README figures for the scale bar default ([8ec9960](https://github.com/GMOD/JBrowseMSA/commit/8ec9960916985c6b7001a275d61b2836deedea5a))
- Fix the review findings in the structure lookup, panel and app ([95b19c3](https://github.com/GMOD/JBrowseMSA/commit/95b19c3a2bec74fa010bd490201a8e4008c52c75))
- Resolve entry names and RefSeq ids to a UniProt accession ([9a447ec](https://github.com/GMOD/JBrowseMSA/commit/9a447ec65d2cd7e0c62b5669adeefc5cae861358))
- Add an opt-in Foldseek search for rows with no identifier ([dbf0049](https://github.com/GMOD/JBrowseMSA/commit/dbf004996454c50bd20488bf2c835a25c359d1bb))
- Add a one-click close button to each track label ([1030d58](https://github.com/GMOD/JBrowseMSA/commit/1030d58a80ef771ce2bdb48f0929cef508990352))
- Harden the structure panel and add a TM-align fit ([14947dc](https://github.com/GMOD/JBrowseMSA/commit/14947dc72019fdac77f2b0364503b2c23ee84cbf))
- Add facets and highlights to the structure panel, and refine fits ([ceb55ef](https://github.com/GMOD/JBrowseMSA/commit/ceb55ef83081a0197ff50f8fadb301bf0b53b4f5))
- Say what a row's name is, and close the structure area by default ([52ccae5](https://github.com/GMOD/JBrowseMSA/commit/52ccae511e9aabaff634ec5300be85801b398dc2))
- Add three structure demos to the examples catalog ([082df53](https://github.com/GMOD/JBrowseMSA/commit/082df53f60044f788e0a5663df7cd74297428b17))
- Take database ids from p2s_mapper instead of a regex of our own ([40feae8](https://github.com/GMOD/JBrowseMSA/commit/40feae8de9d2bb3e6422c27eefe48b59cc622955))
- Use p2s_mapper 2.2.0 for the Foldseek client, entry names and label chains ([97518cc](https://github.com/GMOD/JBrowseMSA/commit/97518cce3dea58e3eee09f0ddb6c6b13746d5935))
- Regenerate the app figures for the 3D structure button ([f82458e](https://github.com/GMOD/JBrowseMSA/commit/f82458e3c5bb988af3248dd80efbe085ec92c7c5))
- Use p2s_mapper 2.3.0 ([244b52e](https://github.com/GMOD/JBrowseMSA/commit/244b52ea5bb368adbcbf9139a9cc7254bc9399ed))
- Drop the descriptions after the home page links ([a53eeae](https://github.com/GMOD/JBrowseMSA/commit/a53eeaedaab5ce1f67de73236dcc10f682b01875))
- Trim the home page, the tutorials index and the card blurbs ([3a9f7d6](https://github.com/GMOD/JBrowseMSA/commit/3a9f7d680e2720aa25eac1deab8cc77893b99add))
- Add toolbar slots to MSAView, and put the app's buttons in the viewer's bar ([2f7e1d1](https://github.com/GMOD/JBrowseMSA/commit/2f7e1d11889d8d04cf4893a690284ad2ca40cd38))
- Cut the long examples descriptions to a sentence or two ([eb200e2](https://github.com/GMOD/JBrowseMSA/commit/eb200e2e495fc7b844fcca3e9db7278dcc0a9209))
- Trim the JBrowse integration and structure link page intros ([a4cdb67](https://github.com/GMOD/JBrowseMSA/commit/a4cdb67f1956572b0e1456a080dee6f8d31c0ea0))
- Open the README on In/Out bullets and trim the user guide's opening ([7e2bdc5](https://github.com/GMOD/JBrowseMSA/commit/7e2bdc5fad8d91ba3f1135716eef8791eb35928d))
- Drop 'uploads nothing' from the home page and user guide ([c49d79c](https://github.com/GMOD/JBrowseMSA/commit/c49d79cc4ee8c3eaea0a518f857195528631113b))
- Sort the toolbar-slot imports so format:check passes ([044f541](https://github.com/GMOD/JBrowseMSA/commit/044f541133caa772b009d18eee714d0fb1e6dea8))
- Regenerate the app figures for the merged toolbar ([b7216f6](https://github.com/GMOD/JBrowseMSA/commit/b7216f63f65acfe2ca7e0aaf62d02103fa5d5d8e))
- Put each import form file selector's toggle and field on one line ([492e72b](https://github.com/GMOD/JBrowseMSA/commit/492e72bb462fcf02545d7b1369eed4c2dbc2e4d2))
- Pad the import form and space its file selector rows ([2cd66c8](https://github.com/GMOD/JBrowseMSA/commit/2cd66c8f84c13c3d121dba5411f8c02b386bd907))
- Structure section: one abort per search, cancellable superposition, and a link with a structure opens the area ([0be1911](https://github.com/GMOD/JBrowseMSA/commit/0be19119bfd6723e82964ef47fccf8bb7b7c3a23))
- Structure demos fit once on an onReady event, and share their summaries ([7e822a5](https://github.com/GMOD/JBrowseMSA/commit/7e822a50e95e509788ac5426ec676f68a99ec710))
- CA distance bars scale to their largest distance, and a demo row can name its PDB entry ([7e2ff09](https://github.com/GMOD/JBrowseMSA/commit/7e2ff095275d3249fdbd5966659d9c183664634f))
- Add adenylate kinase and hemoglobin structure demos ([9d386d9](https://github.com/GMOD/JBrowseMSA/commit/9d386d913ac2a3538073e74b55bed1d3866ef9ed))
- Superposition reads the chain the mapping names, and skips a row whose file fails ([733b6bc](https://github.com/GMOD/JBrowseMSA/commit/733b6bcfb5906e1039241e74bfc46c4b174799c9))
- Accession cache: one caller's abort no longer fails the next lookup ([c1751ff](https://github.com/GMOD/JBrowseMSA/commit/c1751ffb66f9e2bf9d99fd2c9decba6c8062a6e7))
- Accession cache test: a type import and a thrown message, as oxlint asks ([e9c9df7](https://github.com/GMOD/JBrowseMSA/commit/e9c9df74eb14bfdb58ac30a8485642c0f3c613a8))
- Structure panel: unmount Mol*'s React root, skip a structure that fails to load ([efa4651](https://github.com/GMOD/JBrowseMSA/commit/efa4651393ff4157c66f1c6fc252def48ca0e283))
- Settle a structure's chain id space once, and never light both ([3b61f71](https://github.com/GMOD/JBrowseMSA/commit/3b61f71c845b253d7648d4db833f6dbe47a6dac1))
- Facet grid: tie cameras by label, and pass on the last change of a drag ([bb9d5e0](https://github.com/GMOD/JBrowseMSA/commit/bb9d5e01b757bddd878ffc787f71a6fab20106c6))
- Structure package: drop exports nothing calls, and one tokenizer for row names ([3b5bde2](https://github.com/GMOD/JBrowseMSA/commit/3b5bde21d25ea4e31329e243655bf0a608cbd2e5))
- Structure panel: a chains prop that draws only the mapped chains ([20e7dd1](https://github.com/GMOD/JBrowseMSA/commit/20e7dd14b714809c0734e6868e5b6f91ca84e011))
- Structure README: chains, PDB-format files, skipped rows and the bar's max ([0011708](https://github.com/GMOD/JBrowseMSA/commit/00117082013e7ca0ed1a8ef8582ca62c1c99fdbb))
- Offer Domain colors only while some domain is drawn ([a81fc0a](https://github.com/GMOD/JBrowseMSA/commit/a81fc0a16bd4d1be6416c4bea0fa42b142896e3a))
- Wheel zoom: detent only for default-shaped cells, released by any other size change ([a59d070](https://github.com/GMOD/JBrowseMSA/commit/a59d07014a7401dfcd4cbc57625ae6bdb92a696e))
- Wheel zoom: keep the stop on crossing the default, gate only the hold ([0730082](https://github.com/GMOD/JBrowseMSA/commit/07300823a2f19767262c4c9bbc4c6cbc2efe8959))
- Draw the domain overlay between the cell colors and the letters, in one place ([ef08bf8](https://github.com/GMOD/JBrowseMSA/commit/ef08bf8182c01630e2531c23a11d797ec68ce86d))
- Show the Ctrl + scroll hint only while Zoom on scroll is off ([e02a3d2](https://github.com/GMOD/JBrowseMSA/commit/e02a3d26cb5ec979c9c40c49bd6a620ac54a3010))
- Drop track-level defaultOff, and keep default-matching choices out of turnedOffTracks ([ad6ed1d](https://github.com/GMOD/JBrowseMSA/commit/ad6ed1db73700052b814afce3d590f750ff38093))
- Track list: one id per entry, toggled directly ([ba4b671](https://github.com/GMOD/JBrowseMSA/commit/ba4b671481af68554d83a55c349abb8c43328127))
- Move the go-to box and gap slider beside the dialogs that host them ([e398d9c](https://github.com/GMOD/JBrowseMSA/commit/e398d9ce08b6ccb96a6e1aedf0e9715eb58dfcc4))
- Describe the menu bar, three dynamic schemes, and the track × button ([2f03c19](https://github.com/GMOD/JBrowseMSA/commit/2f03c19ac182113e76416acb8dad686bb2eb9697))
- SetTracksShown, turnedOffFeatures, setFilter ([97632dc](https://github.com/GMOD/JBrowseMSA/commit/97632dcc7047999b7830e4067918eadc17779d8d))
- Format the user guide ([ef599a0](https://github.com/GMOD/JBrowseMSA/commit/ef599a02929ee462151ee528d05f651968f608f0))
- Regenerate the README figures for the overlay draw order ([f66b2fa](https://github.com/GMOD/JBrowseMSA/commit/f66b2fa40d160cece1ef1891c0496ad1b17077bf))
- Trim the two new structure demo descriptions to the catalog's length ([3299e0d](https://github.com/GMOD/JBrowseMSA/commit/3299e0dd306e7e42e1c823b2d869e1813d58d8f5))
- Compact the settings panel with segmented controls and selects ([8365fe3](https://github.com/GMOD/JBrowseMSA/commit/8365fe3f1f0ed457f61c2964b1c35a3dd3ba5c0e))
- Reflow the user guide's settings paragraph ([2112d9c](https://github.com/GMOD/JBrowseMSA/commit/2112d9c4d7ff213d11232052a0cd7c59c54569f4))
- Show the whole settings panel in its two figures ([b45de32](https://github.com/GMOD/JBrowseMSA/commit/b45de32bd09a6443e63b9c2a2213dc7699c1e561))
- Name the cell fill choice as the panel now labels it ([e758c2c](https://github.com/GMOD/JBrowseMSA/commit/e758c2ce60b953d2a7c0b8aaaab72bfe40dd07c8))
- Open a PDB hit from its assembly file instead of a data: URL ([a641a02](https://github.com/GMOD/JBrowseMSA/commit/a641a02547da67cc8c10952deac04a587633afd4))
- Add three structure demos: a replayed Foldseek search, a fit that follows the selection, and rows named any way ([912a57b](https://github.com/GMOD/JBrowseMSA/commit/912a57bb21a4886e58cbc6d3927f1d5ee3e1dd9c))
- Simplify the structure controls: one Find structure button, hide the accession and Foldseek until a row needs them ([ac7e4ea](https://github.com/GMOD/JBrowseMSA/commit/ac7e4eaba2302c22cc6f57b5f9a6d8186174b15e))
- Fold settings panel sections, remembered per browser ([9d9bf72](https://github.com/GMOD/JBrowseMSA/commit/9d9bf7239f55e4e007fe244535ddb78c9483454e))
- Fill every structure control button ([d7f9a52](https://github.com/GMOD/JBrowseMSA/commit/d7f9a52b7a8634af5b83b9a9b3b961b4f7fbe974))
- One CA distance bar for the app and the demos ([e9db2a9](https://github.com/GMOD/JBrowseMSA/commit/e9db2a9abff77c1f0575c2c2c31a1f132c022f69))
- Split the app's structure section into a hook per workflow ([68071a9](https://github.com/GMOD/JBrowseMSA/commit/68071a984cb11bff2df8a844113a993c86d6f7cb))
- Embedded mode: icon-only menu bar and Settings ([580b259](https://github.com/GMOD/JBrowseMSA/commit/580b259a9a5a5f73d68747ca71676ffd65df498c))
- EmbeddedMode is a snapshot property ([8f3bdea](https://github.com/GMOD/JBrowseMSA/commit/8f3bdea328662ed9823525e5bbf0aa82726aae3c))
- Tutorial data sections: a linked-file table, and a check against bare URLs ([20b689d](https://github.com/GMOD/JBrowseMSA/commit/20b689d3e9f57fb627754d67385fb9bd4946fa8d))
- Drop dead exports and an unreferenced script module ([06949a7](https://github.com/GMOD/JBrowseMSA/commit/06949a7882adbbc4aa3a8347f3252c3f1686936d))
- Extract the filehandle loader and an abort rotation from model.ts ([3434b01](https://github.com/GMOD/JBrowseMSA/commit/3434b01b17f461be8b65d3f60be4113e1d00f1cf))
- Move model.ts's pure tree and feature-panel helpers into their own modules ([e4070a2](https://github.com/GMOD/JBrowseMSA/commit/e4070a29f631c5e6d4e2ed40e2dcef4909e3c323))
- One session ref, shared cell lookup and paint queue ([61c69bf](https://github.com/GMOD/JBrowseMSA/commit/61c69bfcf5a266cfe26764803c5cb86f615beb6e))
- Keep the panel scale aliases in model.ts ([dd2c48a](https://github.com/GMOD/JBrowseMSA/commit/dd2c48aef684aeb9ebd008dd0d813b10d99cfe7c))
- Define the data properties from one key list ([795e119](https://github.com/GMOD/JBrowseMSA/commit/795e119175f5010456f6d71d080d7e4cba106b38))
- Regenerate the MsaView apidocs for embeddedMode ([efffbe3](https://github.com/GMOD/JBrowseMSA/commit/efffbe39ead74c4fb912edc4aa736f7bb9161860))
- Model.ts keeps the model, its pure helpers sit beside it ([1fb19ab](https://github.com/GMOD/JBrowseMSA/commit/1fb19abbe51a58c6ba0df27d64389a6b1c609a63))
- Read the panel's own status line ([1a276cc](https://github.com/GMOD/JBrowseMSA/commit/1a276cc378a436008d5783f7a2099b0d90122ec1))
- Name the pending-tree check and trim the seeding comment ([60deea5](https://github.com/GMOD/JBrowseMSA/commit/60deea5803b0b3075e615c5891b842f7abdea942))
- Review fixes: preorder collects parents on request, tidy the new modules ([eaaed5f](https://github.com/GMOD/JBrowseMSA/commit/eaaed5f5b363f54d291a194fc5cc6f77dcf227d3))
- Build the UMD and notebook bundles for es2022 ([18be404](https://github.com/GMOD/JBrowseMSA/commit/18be4049d6b280c5db62e6132e9cdc7be510e2e0))
- Bump dependencies, and format with oxfmt 0.73 ([4bfeed3](https://github.com/GMOD/JBrowseMSA/commit/4bfeed39e479b9c0672dc935b16d5fa9fc5b68c1))
- GenGuideLinks --check: ignore the angle brackets oxfmt puts round a wrapped link ([4d326c3](https://github.com/GMOD/JBrowseMSA/commit/4d326c386ad7d8dd4c0d7a8501e64d10e26cd0f8))

## [9.1.0](https://github.com/GMOD/JBrowseMSA/compare/v9.0.0...v9.1.0) (2026-10-14)

### Bug Fixes

- Surface a failed layers fetch on the structure-link page ([a5f3e9a](https://github.com/GMOD/JBrowseMSA/commit/a5f3e9a7ad95959c8995e906d5c7e07a341a418f))

### Chores

- Drop four dependencies nothing imports ([e220c24](https://github.com/GMOD/JBrowseMSA/commit/e220c24baa86174927477a0d5af1675c0aee8dfd))

### Documentation

- Reflow the CLAUDE.md tutorials paragraph ([308bba2](https://github.com/GMOD/JBrowseMSA/commit/308bba2fe5f9ab996f571aad1e3c569f45e6aeed))
- Point the H5N1 page at the RSV page instead of re-teaching it ([fb01956](https://github.com/GMOD/JBrowseMSA/commit/fb0195609eef117bf09c2a4d8379b8819f13634d))
- Merge the RSV metadata page into phylogeny_at_scale ([9c02269](https://github.com/GMOD/JBrowseMSA/commit/9c022699d5406839d26f5629eddbbaa662ef9751))
- Link the pages that pair up, and fix two wrong labels ([671127f](https://github.com/GMOD/JBrowseMSA/commit/671127f76a3d89ec074990933d2193e9ae3afc3f))
- Regenerate MsaView apidocs ([488826d](https://github.com/GMOD/JBrowseMSA/commit/488826d7429e3da367d02757172fb0bad5ad97f2))
- Every page in the shape check:tutorials holds, and the check in CI ([482f9c7](https://github.com/GMOD/JBrowseMSA/commit/482f9c73467c9dc6ed587ebbc8d4ac848c3efc1f))
- The default row order is branch length, not ladderized ([a88755a](https://github.com/GMOD/JBrowseMSA/commit/a88755af93fbd78d290d8fa3815269b76c8d142c))
- The influenza build script writes three files, not four ([9d1d9c1](https://github.com/GMOD/JBrowseMSA/commit/9d1d9c14e4683abe7801d2a3e015d94891c5088f))
- Number the TEM build script's steps consecutively ([28e97df](https://github.com/GMOD/JBrowseMSA/commit/28e97dfdeca16401bba3e852937bc2f5446693e6))
- Protein_complex downloads 2HHB.cif where step 6 reads it ([ef0add0](https://github.com/GMOD/JBrowseMSA/commit/ef0add0619f16f5398db4bf84267742d08c12469))
- The kinase script prints every number its page quotes ([7d932a4](https://github.com/GMOD/JBrowseMSA/commit/7d932a4ab82242e52f300fc047bb820bb999d254))
- Install line on the npm README, pinning rationale under Troubleshooting ([d49be30](https://github.com/GMOD/JBrowseMSA/commit/d49be30f755797c7a534b31696b2134d9e283940))

### Features

- One docs sidebar for the reference pages and the tutorials ([e9b7ae9](https://github.com/GMOD/JBrowseMSA/commit/e9b7ae9162cb39022e3021f14f1849f0ba2bb832))
- Forget, to retire a figure no page shows ([9400d96](https://github.com/GMOD/JBrowseMSA/commit/9400d96edb82201699c77a788ece1db07ae26d24))
- Check:tutorials, and the protein_family page in its shape ([8bbbd6f](https://github.com/GMOD/JBrowseMSA/commit/8bbbd6f24b4173fe6d98cac1ec21bbbd33f10b01))

### Other Changes

- Name the 9.0.0 breaking changes ([d8ac3c0](https://github.com/GMOD/JBrowseMSA/commit/d8ac3c04a1ca1950b745ce314a0041d3bab27e86))
- Fix legend colors, NJ menu crash, stale filehandles, IUPAC detection ([9f2a27e](https://github.com/GMOD/JBrowseMSA/commit/9f2a27ea2ccb486b2a3070e6c96a26b1dd4064df))
- Resolve tree-spelled row names in every row lookup ([2eb4e46](https://github.com/GMOD/JBrowseMSA/commit/2eb4e4628b7f7e0916c581b293f85f025c81b994))
- Hide gaps under a focus, clamp dividers, keep alignment errors ([c2d2bcd](https://github.com/GMOD/JBrowseMSA/commit/c2d2bcd2015664d2b58d0612540a3cff53b03e86))
- SVG export: one layout for the dialog and the figure ([0929266](https://github.com/GMOD/JBrowseMSA/commit/0929266f1e6083e28d4dfe2dee6f61871c3d7a9b))
- No demo import form in a host's page ([e4ed11c](https://github.com/GMOD/JBrowseMSA/commit/e4ed11c7903d81c67388410f3b3520f70e0dd4df))
- SVG export: valid XML around a non-breaking space, one font ([146c217](https://github.com/GMOD/JBrowseMSA/commit/146c2172953304d0f969db963b598400f4fb1033))
- CLI export-svg --props: draw what MSAViewer draws ([4bfa9dc](https://github.com/GMOD/JBrowseMSA/commit/4bfa9dc823afe62caa836056c6057ed8f54ef016))
- Msaview_save() writes a static SVG, PNG or PDF ([c19ac4e](https://github.com/GMOD/JBrowseMSA/commit/c19ac4e16c7cbf78b0caf91b9d1e620f04170ee0))
- Format the R README ([fe9c281](https://github.com/GMOD/JBrowseMSA/commit/fe9c281ace95de49324bc948c307ae242fc4ec4c))
- Msaview_plot() draws a viewer with ggplot2 through QuickJS ([228818e](https://github.com/GMOD/JBrowseMSA/commit/228818e2c34538783df3a5af44c983dd19db242e))
- Header ? opens a mouse & keyboard help dialog ([225638d](https://github.com/GMOD/JBrowseMSA/commit/225638dc9ab95bd3dbda16a19cbeaa31107d70b6))
- One zoom group, wheel mode in settings, no tree menu without a tree ([a4b8b8d](https://github.com/GMOD/JBrowseMSA/commit/a4b8b8dbcf283ddc680014daa7f417e2d60f0a03))
- Zero-config caption names the filehandles it passes ([b82ebb0](https://github.com/GMOD/JBrowseMSA/commit/b82ebb044cdbe5457117b7f7fd607e9eed06fead))
- CLI export-svg writes PNG and PDF by the -o extension ([794c712](https://github.com/GMOD/JBrowseMSA/commit/794c7129192385aa819c81d4a3a6427e160a1366))
- CLI export-svg refuses an entire export past 500,000 letters ([8f48cbe](https://github.com/GMOD/JBrowseMSA/commit/8f48cbe885c137bbd6b24b24970f1f62e85a7621))
- CLI export-svg measures text with @napi-rs/canvas when installed ([a665353](https://github.com/GMOD/JBrowseMSA/commit/a6653530da1a222661739146355227efed3dc906))
- SVG export leaves out the shift-drag selection ([b1f38dd](https://github.com/GMOD/JBrowseMSA/commit/b1f38dd372db5e055f23c99ff25d73e933747763))
- MSAView.save() writes an SVG, PNG or PDF ([3627fa1](https://github.com/GMOD/JBrowseMSA/commit/3627fa101cc8167d29398011292b94d1d72cadc3))
- R README: msaview_save() and the CLI's letter limit ([91f7c12](https://github.com/GMOD/JBrowseMSA/commit/91f7c12b06264fe85b32c9cfe4d646a1089ceddf))
- **BREAKING** HighlightColumns takes 1-based columns, drawn as highlights ([51350a4](https://github.com/GMOD/JBrowseMSA/commit/51350a4778eb7600bfc7a9c22d5cdbbf749b566c))
- Range clades count the tips inside collapsed rows ([6a49de6](https://github.com/GMOD/JBrowseMSA/commit/6a49de6157c2c53fc0cfaf027c85e6ffbaebfda3))
- Sync props to the model from one table ([4ee5961](https://github.com/GMOD/JBrowseMSA/commit/4ee596169711d89732f49aa84367863c66a0f49a))
- MsaUrl, treeUrl and gffUrl props ([be56ff4](https://github.com/GMOD/JBrowseMSA/commit/be56ff4eb20985819813824405c3e6032ad980d8))
- A ref holds the model ([7420100](https://github.com/GMOD/JBrowseMSA/commit/742010040042d83bc6cbae3f583a6a72991d68e2))
- R figures read the URLs a widget names ([e0f6089](https://github.com/GMOD/JBrowseMSA/commit/e0f6089421d74b5661dd9dcbd7669fe78784123d))
- Track renders TrackBlocks directly; drop BasicTrack.ReactComponent ([3856059](https://github.com/GMOD/JBrowseMSA/commit/3856059b4c9c79bf8659d70f1df8faab670e7e2b))
- Tree overview lays out through layoutTree; drop clusterLayout ([aab2fa2](https://github.com/GMOD/JBrowseMSA/commit/aab2fa269efd76b7f13347a73f2e603a9fac220c))
- Drop unused model members and the smallMSAOnly sample ([d5b6bd8](https://github.com/GMOD/JBrowseMSA/commit/d5b6bd8c1168e6eca97f574d7b38d4e0b21c4003))
- Drop clearRect ([dcb62b3](https://github.com/GMOD/JBrowseMSA/commit/dcb62b38b25f7600145df235370d86e4432401c7))
- Unexport file-local helpers; register colord names once ([b4f2a6f](https://github.com/GMOD/JBrowseMSA/commit/b4f2a6fdaf56a65d9c6d0b36e34ffb293dc0f796))
- One cladeLabelBoxes for the live clade labels and the SVG export ([e9cfa41](https://github.com/GMOD/JBrowseMSA/commit/e9cfa41792f422c4032d327679e50240d3758b1e))
- One rasterApplies for MSACanvasBlock and the SVG export ([b1795b5](https://github.com/GMOD/JBrowseMSA/commit/b1795b54b97c13b55a93a66c8e3fa2b53b520721))
- SVG export clips text through ellipsize; one CHAR_WIDTH_RATIO ([03edc14](https://github.com/GMOD/JBrowseMSA/commit/03edc14dfc6326183f653e630b1609b8dfd69b18))
- One makeOffscreenCanvas for the raster tiles and the tree overview ([23f08d7](https://github.com/GMOD/JBrowseMSA/commit/23f08d7b96feccf1fe61b186e08bac80a879cfc8))
- Drop the x assertions and the tipX branch lint flags ([6aa4c3c](https://github.com/GMOD/JBrowseMSA/commit/6aa4c3c6b1cc121a201bb8386c4af541e85b2990))
- Reword the rasterApplies doc comment ([17bc9e1](https://github.com/GMOD/JBrowseMSA/commit/17bc9e1414a5edf07ee0d9a9ce2706a3c11cae96))
- R core bundle: drop the TrackBlocks stub the model no longer needs ([21a9496](https://github.com/GMOD/JBrowseMSA/commit/21a949638a2ce85ad802b400d5945ec92b0fc55c))
- Keep the generated R core bundle out of oxfmt, prettier and typos ([7b1fb6a](https://github.com/GMOD/JBrowseMSA/commit/7b1fb6affaeb882ba7d55ede2be6f512cc0bc56e))
- The R ggplot2 path and its QuickJS bundle ([08ef0df](https://github.com/GMOD/JBrowseMSA/commit/08ef0df4c4cf198d98d02fddb6fafe6bdf2e4118))
- R package: CI publishes it to an r-dist branch; main tracks no bundle ([c4e634d](https://github.com/GMOD/JBrowseMSA/commit/c4e634de8c3e429bdc922683572d016c83808936))
- README figures: git is their store, and CI checks them against the renderer ([0cceecc](https://github.com/GMOD/JBrowseMSA/commit/0cceecc5ca01b7cbad167c8d167fda3c4de7633b))
- The script prints alignment, tree, exon and FEL site counts ([65f9958](https://github.com/GMOD/JBrowseMSA/commit/65f99581232a5c450181b31bdd55713447669d00))
- Loading jsdom no longer breaks fetch's gzip decoding ([c5b7d77](https://github.com/GMOD/JBrowseMSA/commit/c5b7d7741330fc6078f4dd1a8fbcc14f6721ed84))
- Drop MEME, correct three claims against a real FEL run ([6da12ff](https://github.com/GMOD/JBrowseMSA/commit/6da12ffd8db69335d39c7ec47489b76feeb31c31))
- LoadJsdom returns the JSDOM class under a named type ([e268761](https://github.com/GMOD/JBrowseMSA/commit/e268761c0af9d4d13f0fb44ea5559904cd6ad381))
- The Python and R jobs failing on main pass again ([547651b](https://github.com/GMOD/JBrowseMSA/commit/547651bb13b001ebe9884854310f68dfa3197072))
- Install librsvg for the CLI's PNG and PDF export test ([054502f](https://github.com/GMOD/JBrowseMSA/commit/054502f780b34bfbc197bb471ffe7462d8f7d142))
- One option list per command renders --help and the README tables ([0b6303e](https://github.com/GMOD/JBrowseMSA/commit/0b6303e1c4e9603645807de61a674e553b04917f))
- R msaview_plot: draw every column track the viewer can ([749afca](https://github.com/GMOD/JBrowseMSA/commit/749afca3b33ac069280b36d1284e263a69eb6d9b))
- Feature spans: featureSpanMarks returns the mark as geometry ([fd2e48b](https://github.com/GMOD/JBrowseMSA/commit/fd2e48b24a6825d28553d48baf7a687b5454a874))
- R msaview_plot: row panels, the span mark and the viewer's legend ([4ab2f43](https://github.com/GMOD/JBrowseMSA/commit/4ab2f43fe2e98160b020a5b93d2dcf347abfecf4))
- R msaview_plot: clade brackets and the tree's scale bar ([b904020](https://github.com/GMOD/JBrowseMSA/commit/b90402077fdd096a3a568cc2b1c1a2bc9f04a274))
- R msaview_plot: map fill to each category, with real ggplot2 guides ([33ec0d0](https://github.com/GMOD/JBrowseMSA/commit/33ec0d096f1522728ab947e7781460c75f4b4b55))
- A region naming a row opens with that row in the middle ([26f7018](https://github.com/GMOD/JBrowseMSA/commit/26f7018270f7eefe20d804b653c0ecf7f07c365e))
- RevealRegion ([69dcc6f](https://github.com/GMOD/JBrowseMSA/commit/69dcc6fe2323e7a45953d0ff071d31f4ec90daac))

### Refactoring

- Build the linked JBrowse sessions from one helper ([a595b5e](https://github.com/GMOD/JBrowseMSA/commit/a595b5e7e7dc54f6495fc62b3e5727d97cc6243f))

## [9.0.0](https://github.com/GMOD/JBrowseMSA/compare/v8.4.1...v9.0.0) (2026-10-12)

### Breaking Changes

- The tree area fits its labels and tree by default, so the sidebar stays compact; a label that outgrows its room ends in an ellipsis
- The `autoTreeAreaWidth` prop is gone from `MSAViewer`, the Python widget and the R package, since the fit it turned on is now the default
- `model.treeAreaWidth` and `model.treeWidth` are undefined until a snapshot, a prop or the divider sets them; read `effectiveTreeAreaWidth` and `effectiveTreeWidth` instead

### Documentation

- Regenerate MsaView apidocs for the tree-area fit ([836b3ba](https://github.com/GMOD/JBrowseMSA/commit/836b3bad502d7b53157590bf966c3b2c3ac52076))

### Other Changes

- Port the jbrowse-components member rendering ([f943d86](https://github.com/GMOD/JBrowseMSA/commit/f943d86b5f3c4e79451c3b427622b3bae773bcda))
- Scales-and-guides design, the colour object and the guides it needs ([79b2491](https://github.com/GMOD/JBrowseMSA/commit/79b2491ff347811f12ffd1c9255b5fb048c2b4c4))
- Triage agent-docs into reference, ideas and handoffs ([8bfbe7c](https://github.com/GMOD/JBrowseMSA/commit/8bfbe7c9f9702355ed18c6b07decea609446c6ba))
- Fit the tree area to its labels and tree by default, ellipsize overflow ([2ade8d7](https://github.com/GMOD/JBrowseMSA/commit/2ade8d7a66a97e45993790844ce8bb49fdffaa07))
- Fit the tree area as a computed width, measured at one label font ([3c25c46](https://github.com/GMOD/JBrowseMSA/commit/3c25c46c6862d8d054ee757dbb7b79df28e24f44))
- Tip labels: the tooltip names the drawn label, a cut label keeps a box ([7079b77](https://github.com/GMOD/JBrowseMSA/commit/7079b776483051d467826ea5e4de153c4e86f9c5))
- Format the triaged agent-docs ([085babd](https://github.com/GMOD/JBrowseMSA/commit/085babdf93343e1e8d6a632a965b6c6736eda4c3))

## [8.4.1](https://github.com/GMOD/JBrowseMSA/compare/v8.4.0...v8.4.1) (2026-09-25)

### Bug Fixes

- Label the Go to input through inputProps on MUI 7, which JBrowse hosts serve ([d04a382](https://github.com/GMOD/JBrowseMSA/commit/d04a3820c1bd06af2d03979e9bb73b52f1c90700))

### Documentation

- Regenerate MsaView apidocs for @jbrowse/core 5.0.0-beta.9 ([3465ff6](https://github.com/GMOD/JBrowseMSA/commit/3465ff6993ffdca5130b65f3f1a1a0c3b3119d6f))

### Other Changes

- @jbrowse/core 5.0.0-beta.9 from npm, drop vendored tarballs ([7cfa523](https://github.com/GMOD/JBrowseMSA/commit/7cfa523a2ee76d9b9b1236f847d7107813b97a30))

## [8.4.0](https://github.com/GMOD/JBrowseMSA/compare/v8.3.0...v8.4.0) (2026-09-25)

### Bug Fixes

- Refuse a structure_link capture that lost its hover ([6313327](https://github.com/GMOD/JBrowseMSA/commit/6313327a18daaeb4a7eb799a94694ec35ccd8871))
- Unbreak the CLI build and the docs deploy ([5d49acd](https://github.com/GMOD/JBrowseMSA/commit/5d49acd70d4d50dc549d3ebf79b2d898888df8e5))
- Clip the viewer to its height so focus cannot scroll it ([e80fd4a](https://github.com/GMOD/JBrowseMSA/commit/e80fd4af24091c75e66328d0cd46f634d9ae6305))
- Filter Go to suggestions without createFilterOptions, which JBrowse hosts do not re-export ([07c366f](https://github.com/GMOD/JBrowseMSA/commit/07c366f7a90fa8722c1aa1a5492845635f6c86b7))
- A number in the row table reads as its string ([364b8eb](https://github.com/GMOD/JBrowseMSA/commit/364b8eb6b9bd0bdda076b3954b04f1578597547e))
- Hiding a feature type leaves the rest in their colors ([fbf6b01](https://github.com/GMOD/JBrowseMSA/commit/fbf6b0173cff263d8664595fa5893c01aa86b26c))

### Chores

- Delete the four protein-link generators ([fa56abb](https://github.com/GMOD/JBrowseMSA/commit/fa56abbfa6ab0a0146bd4fe9073d1bceb1c0f2d6))
- Drop the utils import only df_to_gff3 used ([3dabce2](https://github.com/GMOD/JBrowseMSA/commit/3dabce2fda38cc25df131254246c000ba28cc191))

### Documentation

- Protein3d dropped the sequence-matching bridge ([447134b](https://github.com/GMOD/JBrowseMSA/commit/447134b83e922f94b34c480a0cbfc282c17f4257))
- Document customColorScheme and mark the letter map shipped ([e881ee7](https://github.com/GMOD/JBrowseMSA/commit/e881ee75f55240143ef9a8bda624b1bc27344365))
- Name the {map} rule customColorScheme shares with encodings ([3f2ff09](https://github.com/GMOD/JBrowseMSA/commit/3f2ff09a7fe74674e8784243939dc12d0cfe4a95))
- Write the four gene sessions as short-form specs ([8dd8b8a](https://github.com/GMOD/JBrowseMSA/commit/8dd8b8ae2c3570107c69a8a3856a62ca61950160))
- Close out the protein-link generator consolidation ([76cbe3e](https://github.com/GMOD/JBrowseMSA/commit/76cbe3e3910b8b596c6ecce639d6aebd3e038626))
- Regenerate the figures for the Go to box ([acaa5ba](https://github.com/GMOD/JBrowseMSA/commit/acaa5baea62460b62416f15d047e01126bf55c7e))
- Write every demo link as #data= ([7f76d2a](https://github.com/GMOD/JBrowseMSA/commit/7f76d2a38d2e1ab5ca5599397dd39abe5c361fc6))
- Document the selection layer and the shift-drag gesture ([0391648](https://github.com/GMOD/JBrowseMSA/commit/03916485b9a5f2dd4e9cd0003215c855f1b92ab2))
- Describe the Rfam download by what the page shows ([f6e99f4](https://github.com/GMOD/JBrowseMSA/commit/f6e99f475657a7884ffefc20f0c24575121fb58a))
- Mark the selection, the two demos and structure conservation shipped ([f137546](https://github.com/GMOD/JBrowseMSA/commit/f137546b461c2a1dbfa3194c624c653618630c33))
- Regenerate the model API docs for the selection ([8c84233](https://github.com/GMOD/JBrowseMSA/commit/8c84233281bacb093e238a568f99121dcd7713c3))
- Document the features layer; the codon example uses it ([2934ec7](https://github.com/GMOD/JBrowseMSA/commit/2934ec7887650b7739e3553acbd5ea8038b28718))

### Features

- Go to a column or a row's residue from the header box ([a6c2a74](https://github.com/GMOD/JBrowseMSA/commit/a6c2a74ab98b408de7673c08fd951c7f5c5e2e03))
- List the renderer commits since the last full regen ([5ac745f](https://github.com/GMOD/JBrowseMSA/commit/5ac745fc2dc0c9a3d203964282542c0d673313a0))
- Color residues from a customColorScheme letter map ([0eef7dd](https://github.com/GMOD/JBrowseMSA/commit/0eef7dde28e32c1fbf5c1b0eab4f50d035714912))
- ColorScheme prop takes a {map} of letter colors ([e4c4e12](https://github.com/GMOD/JBrowseMSA/commit/e4c4e12e35d87cbd4e7f6acf00257b4fcb71eb41))
- A letter color map through color_scheme ([d2f213d](https://github.com/GMOD/JBrowseMSA/commit/d2f213d1ac12bbdee6c52908ee5aeb6adc7ca7f4))
- Carry the shared view in #data=, which reaches no server ([ba71ac2](https://github.com/GMOD/JBrowseMSA/commit/ba71ac202e97889d5ede4deecd5103ed6874cafb))
- Compare an alignment's codons against a reference row ([082eb0b](https://github.com/GMOD/JBrowseMSA/commit/082eb0beb2219959f83708d585e126bd72fc3837))
- Read the F12 coding alignment as codons ([b5da778](https://github.com/GMOD/JBrowseMSA/commit/b5da778a7dc4e3ba5431cd4d6e882de50e3686fa))
- A persisted selection of columns and rows ([6f824f9](https://github.com/GMOD/JBrowseMSA/commit/6f824f94de121782d4db9f95f4ae63bf0b23e81d))
- Shift-drag selects a block, with a header menu to act on it ([ce71105](https://github.com/GMOD/JBrowseMSA/commit/ce71105b432c2678115d09a505f48909b437e476))
- A selection prop and change event in React, R and Python ([4c4b5b0](https://github.com/GMOD/JBrowseMSA/commit/4c4b5b03304e4c5bc01ff6062e513105a35ff013))
- Load a Pfam or Rfam family by accession ([8b94b55](https://github.com/GMOD/JBrowseMSA/commit/8b94b5594da1db25a71dfb6e8d4752ff751d6bde))
- Color the linked structure by column conservation ([e9448ef](https://github.com/GMOD/JBrowseMSA/commit/e9448ef2fad197aa8daf79950cb69e2ba346fea5))
- A new gff or gffFilehandle keeps the model ([ff61e64](https://github.com/GMOD/JBrowseMSA/commit/ff61e64fa5a190186b826eb5f050eefb358871f9))
- A features layer takes the rows' spans as JSON ([cedd39a](https://github.com/GMOD/JBrowseMSA/commit/cedd39ab1fb15bd643273b3e3262197fedc0c941))
- Features as a data frame or a list of dicts ([85e87b6](https://github.com/GMOD/JBrowseMSA/commit/85e87b68b30ea8258c301198cc865356802fb4b1))

### Refactoring

- Render metadata with a local table, not core's BaseFeatureDetail ([e19ba99](https://github.com/GMOD/JBrowseMSA/commit/e19ba9956674578447487337edccdd3c6d8271d6))

### Styling

- Split strings instead of spreading them ([cfa5de2](https://github.com/GMOD/JBrowseMSA/commit/cfa5de2940886f611cd06cc523c788646a1f818a))
- Format LoadByAccession ([6bbbb2a](https://github.com/GMOD/JBrowseMSA/commit/6bbbb2a8a86b652dc4f3c8322c2adbc6c8366b0b))

## [8.3.0](https://github.com/GMOD/JBrowseMSA/compare/v8.2.0...v8.3.0) (2026-09-24)

### Bug Fixes

- Read protein3d's selection as a list of ranges ([0c0885c](https://github.com/GMOD/JBrowseMSA/commit/0c0885cb5a8f8d64d454e1d4ace022055a5b76df))
- Gzip ?data= and keep shared links under gmod.org's 8 kB limit ([fe46f1e](https://github.com/GMOD/JBrowseMSA/commit/fe46f1e505adadb8a3aaf2849972e2a82ee3d78f))
- Give the demo's deployed address, /JBrowseMSA/demo/, in its README ([f36c69d](https://github.com/GMOD/JBrowseMSA/commit/f36c69d5c984add6363fe39e563f1f70ff787a91))
- Format the link-size docs and the app model test ([62dc6d4](https://github.com/GMOD/JBrowseMSA/commit/62dc6d4383a1653c078a94c1cbe5bc91a5b7aabe))
- Normalize line endings before sniffing any format ([fb9b331](https://github.com/GMOD/JBrowseMSA/commit/fb9b331fa63441e92c2c61ffd1e6c4051fffd43b))
- Throw on an unrecognized format instead of reading it as Clustal ([6c9fd25](https://github.com/GMOD/JBrowseMSA/commit/6c9fd25b228a7de7b87c3415cb30d2ecf030b71b))
- Read a FASTA id after whitespace following the > ([80b07cd](https://github.com/GMOD/JBrowseMSA/commit/80b07cd52e3d0b29552842d932b9222f1b97f581))
- Split FASTA-style records once per load ([768d782](https://github.com/GMOD/JBrowseMSA/commit/768d7825ee95e07c40a616bae3fa16b3f3c482c1))
- Percent-decode the GFF seq_id and drop valueless attributes ([04d1239](https://github.com/GMOD/JBrowseMSA/commit/04d1239c3a708bd2522f861f448d7735611a710d))
- Keep the strand of a CDS feature ([e89a937](https://github.com/GMOD/JBrowseMSA/commit/e89a937b70a6caec07add519a7fc81be6105b9f2))
- Show the build-on-open JBrowse sessions ([bd34fee](https://github.com/GMOD/JBrowseMSA/commit/bd34feefe93bde28b489dcb1131aa974d4b630da))
- Link the app, tutorials and guide from the examples sidebar ([b6f7cdf](https://github.com/GMOD/JBrowseMSA/commit/b6f7cdf559c5d88f7f63971fc2fa6571f1ebae8b))
- Match the settings menu label and the guide's Pfam timing ([b46231c](https://github.com/GMOD/JBrowseMSA/commit/b46231c00cb6fe29b3a3b81ce72b5c103195fcfe))
- Derive the row-mismatch annotation warning from the data ([a1131b5](https://github.com/GMOD/JBrowseMSA/commit/a1131b586c00d9a431ad94e6f0c13978a10c1e0e))
- Stop horizontal scroll at the last column ([5c3603b](https://github.com/GMOD/JBrowseMSA/commit/5c3603b08d41e8a5805e2e67afcdc3bd91036302))
- Clamp a feature or region end to the row's last residue ([2d1574d](https://github.com/GMOD/JBrowseMSA/commit/2d1574d4a215a34d3eb3153169204ed6e018f054))
- Seed clade collapse and focus on every clades change and load ([feaf1aa](https://github.com/GMOD/JBrowseMSA/commit/feaf1aa83a0db026769798fb3cd80f46c1212858))
- Count a short row's missing columns as gaps ([1f6c711](https://github.com/GMOD/JBrowseMSA/commit/1f6c711a2d689c6a9fe9560236b0162b44e1ecce))
- Read a reversed span like 10-5 in order in expandSpec ([612add4](https://github.com/GMOD/JBrowseMSA/commit/612add46da147b7713349ed00975ca6b2db7726e))
- Document that a gap cell's letter is its gap character ([bfc64bb](https://github.com/GMOD/JBrowseMSA/commit/bfc64bb7d7aeb799d985aab2777ab16052cac1e3))
- Anchor toolbar zoom on the center of the view ([6d53650](https://github.com/GMOD/JBrowseMSA/commit/6d536506b9c0a14e5903b668276b3ce06f76f643))
- Fold the per-row encoding color loops into colorByRow ([586ea6c](https://github.com/GMOD/JBrowseMSA/commit/586ea6cdc1cf1cee33469b6fa4177fd9a1c99531))
- Format model.ts ([4c6d95e](https://github.com/GMOD/JBrowseMSA/commit/4c6d95ee8e397a6dfd30e5d388534d818aac3bf4))
- Regenerate the MsaView state model docs ([1d53288](https://github.com/GMOD/JBrowseMSA/commit/1d532888f227a4b6d163bf30d6e26b37c1cff4a3))
- Interpro accepts only UniProtKB accessions ([e0d6435](https://github.com/GMOD/JBrowseMSA/commit/e0d64354e72e38be5bbe8938319d05f13f2c06a0))
- Interpro shifts matches onto /start-end fragment rows ([3826b05](https://github.com/GMOD/JBrowseMSA/commit/3826b059f1b15ab9b3aa3f1d42b938fbb250c588))
- Export-svg --gff converts an InterProScan JSON ([8025549](https://github.com/GMOD/JBrowseMSA/commit/802554979413a539b69b3c4d9ac4c9e8fb16fad7))
- Type the interpro test helper's optional msa path ([798e700](https://github.com/GMOD/JBrowseMSA/commit/798e700a6fc269b602f052a594772922760b4233))
- A failed fetch names its cause code ([16b8c0c](https://github.com/GMOD/JBrowseMSA/commit/16b8c0c6677f0f23b5bdfdd039eb88d0e29e1765))
- Genestructure retries, and names a gene it cannot find ([9a3f984](https://github.com/GMOD/JBrowseMSA/commit/9a3f984bb041518a0d1680f13583fbc7d0aae3fe))
- Interpro falls back to the newest cached release offline ([a8c8951](https://github.com/GMOD/JBrowseMSA/commit/a8c89518a38ee33a17e55714fb045a57b3c8f835))
- Genestructure reads every range of a multi-range CDS ([b71eb6a](https://github.com/GMOD/JBrowseMSA/commit/b71eb6abfeb8efb31b240e19360d560e968b22f5))
- Format the new CLI code, fixtures and README ([8157ccb](https://github.com/GMOD/JBrowseMSA/commit/8157ccb94779fce2a2aa2268671353625cd298d8))
- Draw the reference-row tint in the shared tree render ([6313b49](https://github.com/GMOD/JBrowseMSA/commit/6313b49ca50ce1cc01d9b81a4fbd0afd9b495bce))
- Draw the tree hover overlay at the device pixel ratio ([ee8e9e7](https://github.com/GMOD/JBrowseMSA/commit/ee8e9e76822cdf61e404f5f4f2aaf9f39f8a431c))
- Name an unnamed internal node by its tip count ([35a0b66](https://github.com/GMOD/JBrowseMSA/commit/35a0b6606da34f65c1610b635ea382939a67a630))
- Keep the import form and its fields through a failed load ([f2be385](https://github.com/GMOD/JBrowseMSA/commit/f2be385ad51ca1a828236340ef0957ca8b5017a3))
- Number ruler ticks at 1-based multiples of the step ([9fe026a](https://github.com/GMOD/JBrowseMSA/commit/9fe026aba6a3eaa020c405f20ad975958fc567a8))
- Leave the crosshair unpinned after a drag-to-pan ([0c339ff](https://github.com/GMOD/JBrowseMSA/commit/0c339ffeb1b3f7252a58c4f2254175dcb7ff2dd9))
- Let the legend pass the pointer to the cells beneath it ([14031a0](https://github.com/GMOD/JBrowseMSA/commit/14031a0228bbeb96ed840f2a0477414150b839e3))
- Make the export dialog observe the model ([33d7533](https://github.com/GMOD/JBrowseMSA/commit/33d7533d4f4c4beef2c744deae058676bf69977c))
- Redraw the SVG figure for transient and column highlights ([c0b4a5d](https://github.com/GMOD/JBrowseMSA/commit/c0b4a5db319d839b862845a9517abe46c09f9b0a))
- Type the laid-out tree as NodeWithIds ([b2bd6cb](https://github.com/GMOD/JBrowseMSA/commit/b2bd6cbd57da022d77e0cdfb432ada16d22188f5))
- Run the overview cull test on a 16k-tip tree ([fbdd066](https://github.com/GMOD/JBrowseMSA/commit/fbdd066a2e72b3cc4c76dd5f8adfcff59f0ba613))
- Regenerate the MsaView API docs ([7e004c9](https://github.com/GMOD/JBrowseMSA/commit/7e004c97bec6f13a1c6acf6ae9d1a708e6c4a90e))
- Export the tree layout types a host's inferred model type names ([6ceb4fb](https://github.com/GMOD/JBrowseMSA/commit/6ceb4fb34d78ceed250ead48d8fe5cab8afd1697))
- Tighten rotate and reroot edge cases, document them ([b98fb86](https://github.com/GMOD/JBrowseMSA/commit/b98fb869fafe79f5bde82a7937cf3e310a404f93))
- Give the USAGE.md name sort a compare function ([fedec27](https://github.com/GMOD/JBrowseMSA/commit/fedec27b88c55f82064255c9d81af2df1c82c0e0))
- Keep the gap slider's thumb off the row search ([4347b97](https://github.com/GMOD/JBrowseMSA/commit/4347b97c687a131446c6c88d8cc1b406e5f5acf6))
- Keep the hover readout from wrapping the header ([1acb2e4](https://github.com/GMOD/JBrowseMSA/commit/1acb2e414c271d795083efec30493151d7e336c2))
- Capture no figure for the two link-only layers specs ([5b8071c](https://github.com/GMOD/JBrowseMSA/commit/5b8071cc710e4e3c41e6a0e40ecf80b271ac76ee))

### Documentation

- Clone GMOD/JBrowseMSA in the README development steps ([e9925aa](https://github.com/GMOD/JBrowseMSA/commit/e9925aa562765369d94b7894f73b5a3d628bdb56))
- List python-package.astro in the website page table ([afbaa9f](https://github.com/GMOD/JBrowseMSA/commit/afbaa9f0ff292b0de1a400ee7ed0c92913642936))
- Close the multi-assembly alignment idea ([ea9ab94](https://github.com/GMOD/JBrowseMSA/commit/ea9ab94eb0a6d0c518608c47a7ed17b77fc9a57b))
- Recount the protein-link generators and drop the finished screenshot half ([d5a4a45](https://github.com/GMOD/JBrowseMSA/commit/d5a4a45d986ca72ef0decad9bcadb2ae81ae3c7a))
- Name the generators that write residueMappings ([2147ea8](https://github.com/GMOD/JBrowseMSA/commit/2147ea8724e16b94e933acf89e36600e2311da59))
- List the none color scheme in USAGE.md and test the list is complete ([05bbbd8](https://github.com/GMOD/JBrowseMSA/commit/05bbbd80db0dbaa89a7ef56188648447a250dcf4))
- Test USAGE.md's <jbrowse-msa> attribute and property lists ([d5bd6d7](https://github.com/GMOD/JBrowseMSA/commit/d5bd6d756c2ff70c5ea9c4ac974ef25592730b47))
- Point USAGE.md's clade, rowData and rowPanels examples at layers.md ([e635ffc](https://github.com/GMOD/JBrowseMSA/commit/e635ffc759f28be939d12f18b674a9e6cb7d1fe5))
- Link the Shorthand and rowData examples in layers.md to the app ([4ece6c3](https://github.com/GMOD/JBrowseMSA/commit/4ece6c3cc515a8616b1acfb125096d43d25be3ea))
- Describe what the app does with unshareable data today ([b9a7591](https://github.com/GMOD/JBrowseMSA/commit/b9a75912cc28db31c88ff4857d59ae9e44c3ca5b))
- Link structure_link from spike and hemoglobin, note live pages ([cd306b8](https://github.com/GMOD/JBrowseMSA/commit/cd306b8c03761e838c0b4f0ed461914d6e005dbe))
- The structure_link card figure ([39d54d1](https://github.com/GMOD/JBrowseMSA/commit/39d54d1270aaa766aab45f78567aaf42e1258a86))
- Prune the backlog of shipped and fixed items ([72d7b54](https://github.com/GMOD/JBrowseMSA/commit/72d7b544bc784aa48a247c86511818a59d5250b1))
- Regenerate the app figures ([4a5c75c](https://github.com/GMOD/JBrowseMSA/commit/4a5c75c3941861b9a2191d5ece2cdd2750948fbc))

### Features

- A top bar with site links and a Copy link button ([fcf5b0c](https://github.com/GMOD/JBrowseMSA/commit/fcf5b0c84e02f1527f3831410f7cd9831ab2d3d2))
- List curated hosted datasets in the import form's examples ([95f2695](https://github.com/GMOD/JBrowseMSA/commit/95f269528076e017233e61ad803477fcd87ec219))
- Export-svg --spec draws any layer ([2fbfe80](https://github.com/GMOD/JBrowseMSA/commit/2fbfe809a8cb9b734beaf61ad7bf192fd1265981))
- Residue-mappings writes the residueMappings layer ([6675e22](https://github.com/GMOD/JBrowseMSA/commit/6675e22fe76bb0c74a0fb508a0f8121b822238db))
- Find a row by name from the header ([712e3ec](https://github.com/GMOD/JBrowseMSA/commit/712e3ecbe89c644145fb7f65de112a53fc118c84))
- Scroll and zoom the alignment from the keyboard ([50b9ec5](https://github.com/GMOD/JBrowseMSA/commit/50b9ec566716e80dbd05f805d7182e300db396b4))
- Center the view where the minimap or scrollbar track is clicked ([43d3717](https://github.com/GMOD/JBrowseMSA/commit/43d3717140f756a7fd8ad6bbb9a6ea73d35d9d89))
- Add molstar to the website ([06441b0](https://github.com/GMOD/JBrowseMSA/commit/06441b05099bfabd759aadae7342124cdb768d6b))
- Structure_link page, an alignment beside its Mol* structure ([f127652](https://github.com/GMOD/JBrowseMSA/commit/f12765222af0557077429cc685c9d24655ee69ff))
- Card the structure_link page after the hemoglobin tutorial ([ee3dbb4](https://github.com/GMOD/JBrowseMSA/commit/ee3dbb46fe74f059d6b03e0c33d4521d1bffc95d))
- Give the hemoglobin set room for every row ([334e83e](https://github.com/GMOD/JBrowseMSA/commit/334e83e90dabaf95c7b797d51ff2652c9d7464f9))
- Rotate nodes, ladderize, and reroot at a node or the midpoint ([9e66042](https://github.com/GMOD/JBrowseMSA/commit/9e66042b172d00adc0e3b4d42aac06140fe1a4c6))
- Export the displayed tree as Newick ([5fdddf8](https://github.com/GMOD/JBrowseMSA/commit/5fdddf85163e926d2dcdb59f4e9352a2160421ca))

### Other Changes

- Stack the import form's columns under 640 px wide ([9658873](https://github.com/GMOD/JBrowseMSA/commit/9658873ea72befa80df6ecc919260923345bc7bf))
- Widen the resize dividers' hit zone by 4 px each side ([078c2ed](https://github.com/GMOD/JBrowseMSA/commit/078c2edba9e268e6ce0ea89e2fa331203aa96002))
- Format ([dadecdf](https://github.com/GMOD/JBrowseMSA/commit/dadecdf4ef9b0f4de997505258ba34f2605caef6))
- Cap the metadata dialog's FASTA textarea ([303e1a7](https://github.com/GMOD/JBrowseMSA/commit/303e1a77f761ab5e6a0f6f2d1fc1c2b9817e19bc))
- Filter the feature dialog's annotation table ([a19e01a](https://github.com/GMOD/JBrowseMSA/commit/a19e01a3c65c8dba1b584d2159ecda2c5a1246a6))
- Write the gappyness threshold on release ([4f3789a](https://github.com/GMOD/JBrowseMSA/commit/4f3789a2c0d7d9af2ffc5063c9f97330213fc7a9))

### Performance Improvements

- Resolve row panel scales apart from their geometry ([44eb0ee](https://github.com/GMOD/JBrowseMSA/commit/44eb0ee23fe70662d647b54477b114120b7939de))
- Measure each column track once per spec ([123afde](https://github.com/GMOD/JBrowseMSA/commit/123afde3dde68bc7265f4b348409976947881760))
- Lay the tree out once per root and scale it on read ([03545c3](https://github.com/GMOD/JBrowseMSA/commit/03545c3a98a346eee3bf741264b82136759b5a02))

### Refactoring

- Keep one row store in BaseMSA ([b929d9b](https://github.com/GMOD/JBrowseMSA/commit/b929d9b25372f4491856b539728e0e198cca30c6))
- Run the CRLF format check as one test per format ([d2f5934](https://github.com/GMOD/JBrowseMSA/commit/d2f5934358d064a04e74e68d5ace50b3f7bfb128))
- One tooltip and one hover anchor ([bc5ad30](https://github.com/GMOD/JBrowseMSA/commit/bc5ad301767605407021699c8eccbe068fa1ba49))
- One tree menu for branches and leaves ([24c3e09](https://github.com/GMOD/JBrowseMSA/commit/24c3e09e7350b557458296d3f1b4ab446d319be6))
- One scale bar for the ruler and the export ([b348f1a](https://github.com/GMOD/JBrowseMSA/commit/b348f1a37c728a37765db23fda55251a4007d5bb))
- One status message for the page and the header ([49901a7](https://github.com/GMOD/JBrowseMSA/commit/49901a7bb04dfe04ba569bd4a823619bc9df0232))

## [8.2.0](https://github.com/GMOD/JBrowseMSA/compare/v8.1.0...v8.2.0) (2026-09-18)

### Features

- ExpandSpec reads a shorthand view spec, and region is a model property ([ec0249e](https://github.com/GMOD/JBrowseMSA/commit/ec0249e86e605f343a11205c3688293c78912634))
- ExpandSpec reads a shorthand view spec, and region is a model property ([242cafe](https://github.com/GMOD/JBrowseMSA/commit/242cafe2829af229564cbc39426497575ec02105))

## [8.1.0](https://github.com/GMOD/JBrowseMSA/compare/v8.0.0...v8.1.0) (2026-09-17)

### Bug Fixes

- The Python README's figures live in docs/media ([ad9bd2b](https://github.com/GMOD/JBrowseMSA/commit/ad9bd2b962ec8b4be7d1546dae98d6ebce9c017d))
- A Stockholm header ends the open alignment ([b60fd5f](https://github.com/GMOD/JBrowseMSA/commit/b60fd5f0c30782926c8487f5f1e9b2dff417074f))
- Residue_mappings drops list names, df_to_gff3 writes color ([5be04f4](https://github.com/GMOD/JBrowseMSA/commit/5be04f42853cd1adc849af810a73249f2717d73a))
- A path to a missing file raises FileNotFoundError ([3e22b1d](https://github.com/GMOD/JBrowseMSA/commit/3e22b1df507d6333f2abc1c87139a3d717c15fdd))
- The EBI job calls retry on a transient status ([5a36da5](https://github.com/GMOD/JBrowseMSA/commit/5a36da5d1afbd3cb4ed0adb2731a64bc2ef9ba61))
- A non-numeric --width or --height is an error ([bba2f4a](https://github.com/GMOD/JBrowseMSA/commit/bba2f4a40bf5ad061fadb62cb856c1f7dc301609))
- Scale the scale bar by the root-to-tip extent the layout draws ([7186055](https://github.com/GMOD/JBrowseMSA/commit/7186055d9a68bfc2468cb52a2a627301eee1cc36))
- Hold collapse and focus seeding until a tree filehandle lands ([dcc462b](https://github.com/GMOD/JBrowseMSA/commit/dcc462bacb83958331a9283c91515596771ef9d0))
- Disable Open annotations until a file or URL is chosen ([8d75b12](https://github.com/GMOD/JBrowseMSA/commit/8d75b127705d6d9cd0c16c9346f03f2b8db10cbf))
- Contrast letters against the fill the domain box was painted with ([044db2a](https://github.com/GMOD/JBrowseMSA/commit/044db2a8ad74be7e23255ddd7987529c9b4dec9e))
- Put the letter baseline where the tree puts its tip labels ([2ef68ad](https://github.com/GMOD/JBrowseMSA/commit/2ef68ada1762306ad2e6db69c05dc72ac8827519))
- Draw a span label only where the span is tall enough to hold it ([b7f014b](https://github.com/GMOD/JBrowseMSA/commit/b7f014b9f2683108f0b9067dba65c2fd072eb47e))
- Default `data` to an empty object ([7eba5ed](https://github.com/GMOD/JBrowseMSA/commit/7eba5ed752dfece68788c84b37a8ad8caccb1cfb))
- Submit an EBI job once, retry only the reads ([f335f7b](https://github.com/GMOD/JBrowseMSA/commit/f335f7b40b667b9deac10d05e4b5539742afcd80))
- An InterPro 404 is asked again, and never cached as "no matches" ([080a68b](https://github.com/GMOD/JBrowseMSA/commit/080a68b7cfea0ef1022c63145786b93e16a1ac63))
- A row's spans are all drawn before any of its labels ([b46d2d9](https://github.com/GMOD/JBrowseMSA/commit/b46d2d9cc70f656c809c41779c620216fd689554))
- The render guard checks that the alignment painted ([191126e](https://github.com/GMOD/JBrowseMSA/commit/191126ecc92a8fb6ad69e2833acfea976efd3c1d))
- Capture the viewport and crop, so no layer goes missing ([10b0a49](https://github.com/GMOD/JBrowseMSA/commit/10b0a497788bbe473160ea2fb17048956d64d961))

### Chores

- Bump docgen's aliased TypeScript from v5 to v6 ([60084e3](https://github.com/GMOD/JBrowseMSA/commit/60084e3c69c31102517bd5bee2e153d2415e13da))
- Check:data holds the hosted data to its provenance table ([ae8dad7](https://github.com/GMOD/JBrowseMSA/commit/ae8dad75ee501396918a4dfb91905fae15676c49))
- Take the figure bytes out of git ([7408fcf](https://github.com/GMOD/JBrowseMSA/commit/7408fcff3c13f6d48f69329fab96fbb2f447e6a5))

### Documentation

- Match the prose to the code ([d2f7c3d](https://github.com/GMOD/JBrowseMSA/commit/d2f7c3d68fef4c61833360c7bff0c1cc7ac5c264))
- The PYD-only link hides domains through turnedOffFeatures ([42b56d0](https://github.com/GMOD/JBrowseMSA/commit/42b56d012aa3a09a29540cfe6ba416061d2691fc))
- Fix the RNA tree link, name the tools, drop dashes ([017ffc3](https://github.com/GMOD/JBrowseMSA/commit/017ffc34a93962f032853871db5c0ce819a75cf6))
- List every hosted file under Where the data comes from ([afd105d](https://github.com/GMOD/JBrowseMSA/commit/afd105d746ed0cc7d06a658ef90f8203c1721b7d))
- A README per hosted tutorial folder ([32d6ff1](https://github.com/GMOD/JBrowseMSA/commit/32d6ff1aac4d9ea996f8bad9f9b0f5cab06e84c9))
- Say what the build scripts print ([5b60400](https://github.com/GMOD/JBrowseMSA/commit/5b604004d8ff1ed6298218fce5d8dbe464573a49))
- Drop the sickle-cell figure no page shows ([e53ca4a](https://github.com/GMOD/JBrowseMSA/commit/e53ca4a6bc384267711fd677701cf0e2ff2fb811))
- Regenerate the settings menu figure with the renamed toggles ([6fd08b6](https://github.com/GMOD/JBrowseMSA/commit/6fd08b605dde56ae15a77c1a1ce27b7f90532871))
- Hemoglobin's two subunits and the interfaces between them ([992c4a9](https://github.com/GMOD/JBrowseMSA/commit/992c4a9725878e1cc3ed00464ce43e35162e9208))
- A text track's color keys are upper case ([ec68a26](https://github.com/GMOD/JBrowseMSA/commit/ec68a2678295b760d1c76e54423bf3e074c2e1b6))
- TEM beta-lactamase alleles and their phenotype ([386988a](https://github.com/GMOD/JBrowseMSA/commit/386988a15b58114ce82b9e5bb1cbdf1b9679da30))
- AlphaFold confidence across a TDP-43 ortholog set ([fc04ac5](https://github.com/GMOD/JBrowseMSA/commit/fc04ac5d91f0f10eb197b371ca5dccbd65e760a7))
- The XBB recombination breakpoint from two difference counts ([22e16c0](https://github.com/GMOD/JBrowseMSA/commit/22e16c0e3a1619b5ea4cbe6a8bf6c0b3f748d015))
- Guard the recombination scan and name the data README's steps ([b216014](https://github.com/GMOD/JBrowseMSA/commit/b2160145f143dfccca9d9a7a0972df1ca9830002))
- The Pango lineage names pass the spell check ([b026fec](https://github.com/GMOD/JBrowseMSA/commit/b026fecf22cb201a9ecb2f354db03cbdca78a47b))
- The gene figures, redrawn with the head inside the feature ([48153e1](https://github.com/GMOD/JBrowseMSA/commit/48153e1f4d918c94605d44b9881cf40a5b95fcc6))
- The recombination figures draw their ORFs as arrows ([44b1631](https://github.com/GMOD/JBrowseMSA/commit/44b16315b98c1cf541f03e2abe7401f1ffc34e05))
- Norovirus recombination pipeline, data and figure spec ([752109f](https://github.com/GMOD/JBrowseMSA/commit/752109f5bb565d9011f4e71f8048559043830bf2))
- The norovirus recombination page, its figures and its card ([dad9aa1](https://github.com/GMOD/JBrowseMSA/commit/dad9aa1723e4761753982fe7be586d0ebd98f6e1))
- Two figure traps, and the two recombination pages cross-link ([b6e5e58](https://github.com/GMOD/JBrowseMSA/commit/b6e5e586e3b96addc12717317ce3de8613e1ca89))
- A figure per layer, and less prose around them ([9de13e2](https://github.com/GMOD/JBrowseMSA/commit/9de13e2539acad619abb9a018d7f18af514bff55))
- Rebaseline every figure against this checkout's renderer ([8284f92](https://github.com/GMOD/JBrowseMSA/commit/8284f92183fc4c79d706467f4b7b336ab55fe231))
- Say which check catches which failure ([aa7f432](https://github.com/GMOD/JBrowseMSA/commit/aa7f432ae8c8974debf98e59514cff6e1e3f1311))

### Features

- Warn when a GFF names no row of the alignment ([613f001](https://github.com/GMOD/JBrowseMSA/commit/613f00157fb9a0f518d0ebc249ac31107597d1d6))
- A gene arrow's head lives inside the feature it points for ([f9925bf](https://github.com/GMOD/JBrowseMSA/commit/f9925bf707c59f4a085c913ee521f756bcad2734))
- Position: "strandpile" splits a features panel by strand ([29941a8](https://github.com/GMOD/JBrowseMSA/commit/29941a83cb45c83a6e3839949900007bf449a05a))
- Content-addressed blob store for docs/media ([8d5c467](https://github.com/GMOD/JBrowseMSA/commit/8d5c467fc055fb5a90c0ee2cea5049944bf12c3c))
- Populate and verify the S3 blob store for docs/media ([5239c1e](https://github.com/GMOD/JBrowseMSA/commit/5239c1e9a06d419d1884ea6227aa288b0162d7e6))

### Other Changes

- Rename the MSA settings toggles and the track menu's Hide track ([a85ba16](https://github.com/GMOD/JBrowseMSA/commit/a85ba160487813d4b68990dcbd5ebf02d8ff91eb))
- The toolbar wraps, and the warning is a button ([c48b54e](https://github.com/GMOD/JBrowseMSA/commit/c48b54ea3f3a7b78ff1945a7e4f8e69e833b90f3))
- Small component cleanups ([1bf9728](https://github.com/GMOD/JBrowseMSA/commit/1bf9728b0f3f61adf7248fcd0190d41d72e8fee0))

### Performance Improvements

- Keep a column track's object and canvas through a vertical zoom ([aa4abc0](https://github.com/GMOD/JBrowseMSA/commit/aa4abc0b8a86e653a6880e8baa1086cdee8eb89a))
- Mount canvas blocks only as far as the content reaches ([f10528c](https://github.com/GMOD/JBrowseMSA/commit/f10528c7bb0f69d37f4d58f773db01558016964b))

### Refactoring

- Delete unread getters, a constant flag and a guard nothing sets ([5bf5c5d](https://github.com/GMOD/JBrowseMSA/commit/5bf5c5d4718e4f982b707e204f150ec78b493cd0))

## [8.0.0](https://github.com/GMOD/JBrowseMSA/compare/v7.0.0...v8.0.0) (2026-09-16)

### Bug Fixes

- Typecheck against one copy of mst, mobx, MUI and react ([8bc6f37](https://github.com/GMOD/JBrowseMSA/commit/8bc6f3711e35a4b132174b73a3b1e648f240621c))
- Resolve the widget's script from htmlwidgets/lib ([126cd7a](https://github.com/GMOD/JBrowseMSA/commit/126cd7ae654a005738c1718da77e0c95b6edfaca))
- Take fractional Nightingale ranges, and ignore the element's own range written back ([3e61e68](https://github.com/GMOD/JBrowseMSA/commit/3e61e68d60d4dbba58c034b55ad0b96d1c1f45f0))
- One resize handle for tracks sharing a height ([6ef41af](https://github.com/GMOD/JBrowseMSA/commit/6ef41af74a6277744e152892945521fc0ab3fef6))
- A track name keeps its menu button on its own row ([a0584ee](https://github.com/GMOD/JBrowseMSA/commit/a0584ee98129abdd327676b4fe966024ad6d0991))
- Tighter domain legend ([f6de1d1](https://github.com/GMOD/JBrowseMSA/commit/f6de1d13f84ddde1376d6840a040491cf2642135))
- Letter-color mode keeps its colors under the domain overlay ([2584a31](https://github.com/GMOD/JBrowseMSA/commit/2584a31e8ec186d070f3856305a0b8cad7e53650))
- The chevron shares the first legend row ([60a14b5](https://github.com/GMOD/JBrowseMSA/commit/60a14b570ea3eff5dba66f71496607abd19cf62f))
- Sub-row layout packs lanes by overlap and stays inside its row ([8818f78](https://github.com/GMOD/JBrowseMSA/commit/8818f788975c3ec1e2f32643f9d71ffc2ab2e57d))
- A named highlights or column_tracks list reaches the viewer as an array ([d017384](https://github.com/GMOD/JBrowseMSA/commit/d017384b1fa299a66d0d172308c6b1997cb4b5cc))
- Scale legends are the Legend entries the model already carries ([fec354b](https://github.com/GMOD/JBrowseMSA/commit/fec354b3a2878633cdf1b10d599a330951ccf3a3))
- Resolve the channel lists left by the rebase ([a1af3ec](https://github.com/GMOD/JBrowseMSA/commit/a1af3ec941ade6f9390b47020f009de9b0169cb9))
- Clip a strip header to its band in the export ([e9cdc46](https://github.com/GMOD/JBrowseMSA/commit/e9cdc46863532d7ef709ac70d9307c48edb8659b))
- Drop the unused column constant from the mitogenome spec ([d65cb13](https://github.com/GMOD/JBrowseMSA/commit/d65cb13b894f965eba726b331d7cf99d354dc611))
- The domain key lists nothing when there are no columns ([7f1fcea](https://github.com/GMOD/JBrowseMSA/commit/7f1fcea2bb02016463ab700ea2fa84559047ae13))
- The top band counts the scale bar, and wide panel headers run across ([3cd8fd1](https://github.com/GMOD/JBrowseMSA/commit/3cd8fd17194bc8d2d51f4a8e726c50c8ba39d7e9))
- The legend key floats above the alignment's overlay canvas ([b01c7d4](https://github.com/GMOD/JBrowseMSA/commit/b01c7d4ca09eb895a7ae3faf65550356e68acd73))

### Chores

- Untrack Python bytecode and ignore __pycache__ ([3a074c3](https://github.com/GMOD/JBrowseMSA/commit/3a074c34545a0e96527602c52e0abbc04a162f1a))
- Test msaview-widget on each push, bump it on release, publish it from the tag ([f3735c1](https://github.com/GMOD/JBrowseMSA/commit/f3735c175f9b2d18b9ac246667864bda2d97aeb9))
- Regenerate the figures ([aa67fcf](https://github.com/GMOD/JBrowseMSA/commit/aa67fcfeee7ce6a5876db546e258ff9c58986192))
- Fail on a figure no page shows, and on a guide link its spec has outgrown ([b7cc9d9](https://github.com/GMOD/JBrowseMSA/commit/b7cc9d96fbbbe83e3c181aead288dce9db88cafe))
- Regenerate five stale figures ([88c76f4](https://github.com/GMOD/JBrowseMSA/commit/88c76f46df6a691417cbe92cac9dd43cdae64ece))
- Exclude .aln alignments like .afa ([bc7fa2a](https://github.com/GMOD/JBrowseMSA/commit/bc7fa2ac519ff7c3862d0948965bb34bc7a2394d))

### Documentation

- Say which mirror gates the build-on-open links ([44efe7d](https://github.com/GMOD/JBrowseMSA/commit/44efe7d5625eb596f1594c4bd0a1cd1f43b778b9))
- Regenerate the state model reference for mst 6.5.1 ([a99acd2](https://github.com/GMOD/JBrowseMSA/commit/a99acd242bd51f5d95cbb4284371789a98db85e3))
- Add a writing checklist and rewrite CLAUDE.md to follow it ([98d8b4b](https://github.com/GMOD/JBrowseMSA/commit/98d8b4b1b05d91927122a426e72fed45fe32406b))
- Rewrite kinase_pocket, codon_selection and protein_family prose ([a5a0fb3](https://github.com/GMOD/JBrowseMSA/commit/a5a0fb3c442c8671bb0d3d39a55d7bf55921f08b))
- Rewrite the package and hosted-data READMEs ([b05bf47](https://github.com/GMOD/JBrowseMSA/commit/b05bf4720f147cb2ab278c0ed95992785f7cd42e))
- Regenerate msaview.Rd from the rewritten roxygen ([05396f5](https://github.com/GMOD/JBrowseMSA/commit/05396f5834d15001245b290a04edb8bc06f160a1))
- Rewrite the user guide, layers reference, README and USAGE ([3eab273](https://github.com/GMOD/JBrowseMSA/commit/3eab273a554c4b968f7df8d3600f922df9b99d9b))
- Rewrite rna_family, spike_structure, phylogeny_at_scale and p53 prose ([ff64151](https://github.com/GMOD/JBrowseMSA/commit/ff64151311e2b18d1cca12bac1eae26ade6a9d81))
- Rewrite the idea and design notes ([e0dd290](https://github.com/GMOD/JBrowseMSA/commit/e0dd2903f83e2d781987fcf8913301e3f6584cd8))
- Rewrite the gallery captions, example notes and site pages ([be4e1a7](https://github.com/GMOD/JBrowseMSA/commit/be4e1a77a395cb2502d506a9def95ff3d3782865))
- Add figures of speech, density and padding ([dbe9764](https://github.com/GMOD/JBrowseMSA/commit/dbe9764214f361132978ee2e1467b0753ff8b536))
- Rewrite the pipeline READMEs and generator comments ([f387d9a](https://github.com/GMOD/JBrowseMSA/commit/f387d9ad2333212b8c2474d027b9df840d529991))
- Regenerate the state model reference from the thinned comments ([97d21fb](https://github.com/GMOD/JBrowseMSA/commit/97d21fb95914d5f44a60b57c1aa069550aca56cd))
- Add synonym cycling, announcers and changelog-style docs ([357cdea](https://github.com/GMOD/JBrowseMSA/commit/357cdeaab3d7ba46b18c8a6def8869cad0e73274))
- Make contrastive framing the strictest rule ([1e3654f](https://github.com/GMOD/JBrowseMSA/commit/1e3654f6bd66da47b258ca4ca4ac76c8454ebfea))
- README, example notebooks, and their screenshots ([a577e98](https://github.com/GMOD/JBrowseMSA/commit/a577e98edff7da00423298cecc1877a56bfa8c6c))
- List packages/python among the key packages ([6d44194](https://github.com/GMOD/JBrowseMSA/commit/6d4419406737d30e86bcb60e28d55c0a30a5eb25))
- Regenerate apidocs ([e015312](https://github.com/GMOD/JBrowseMSA/commit/e0153129e4714221e75d8914695715485d0d5d78))
- A protease family in R, from UniProt to the widget ([382f2a9](https://github.com/GMOD/JBrowseMSA/commit/382f2a95006eb5f2e39b084b27ec66ea811f621c))
- Influenza drift in a notebook, with msaview-widget ([eebc082](https://github.com/GMOD/JBrowseMSA/commit/eebc082e30bf57744040804fe6c3f945404f644e))
- Register the two new tutorials ([645bd37](https://github.com/GMOD/JBrowseMSA/commit/645bd370c1d6f414e6846e01d95900a2dcbcabd8))
- The plan for ggtree-style figures ([dd99b64](https://github.com/GMOD/JBrowseMSA/commit/dd99b6401e6d4a360a7fd22029fd90fee279892a))
- Panels and marks, replacing the ggtree figures plan ([bbab249](https://github.com/GMOD/JBrowseMSA/commit/bbab2493a3f575aa9b9e6fad0b16fdfb3fbfc4cb))
- Check panels-and-marks against ggtree and ComplexHeatmap ([51e934a](https://github.com/GMOD/JBrowseMSA/commit/51e934afd3b23dd997ed0766ad1e30d58f0a7df2))
- The rowData table and the encodings that read it ([ef1c32f](https://github.com/GMOD/JBrowseMSA/commit/ef1c32fa39aa2f37d07231d745faf010a6b08dcd))
- Steps 3 and 4 shipped ([947a20c](https://github.com/GMOD/JBrowseMSA/commit/947a20c608371984491ec4d03672e3e27a061f5b))
- Steps 4 and 5 of panels-and-marks shipped ([b87b3ec](https://github.com/GMOD/JBrowseMSA/commit/b87b3ec84fe8b583fc1898c6c16bb869559642a3))
- The feature channels across the layers reference and the wrappers ([fed3679](https://github.com/GMOD/JBrowseMSA/commit/fed367915d567f280e4f3c1630d5ff4bd5f1404c))
- Record the span color order and the shipped step 6 ([03cfb75](https://github.com/GMOD/JBrowseMSA/commit/03cfb75182a46e6b8241f72f760e53ce8ad0b38a))
- Regenerate after the rebase ([f2420df](https://github.com/GMOD/JBrowseMSA/commit/f2420dfa2bf5cb90dfbc5dcfba93be83fbf0dd3f))
- Step 7 of panels-and-marks is the clades highlight mark ([ec0cfda](https://github.com/GMOD/JBrowseMSA/commit/ec0cfda82822943e3da61bcefb039dffa7e31025))
- Color the RSV phylogeny by its metadata ([de60404](https://github.com/GMOD/JBrowseMSA/commit/de6040488cb00d873576d8eb48f8507c0854b4bd))
- Tighten two sentences in phylogeny_metadata ([fb68eba](https://github.com/GMOD/JBrowseMSA/commit/fb68eba5f4ef248e7cd6f10b4fefa73596aeddaf))
- Step 8 of panels-and-marks is the rowPanels strip ([ff7811f](https://github.com/GMOD/JBrowseMSA/commit/ff7811fca69c61d0f704f0e1a27c12270e54f105))
- Mitogenome_genes, gene arrows colored by respiratory complex ([b30d905](https://github.com/GMOD/JBrowseMSA/commit/b30d9050718d166ded8ee9c810d8e298681f900b))
- Refresh the mitogenome share figure after the rowPanels rebase ([6f4f6b3](https://github.com/GMOD/JBrowseMSA/commit/6f4f6b3d486387fb2b7c88c2cc70e7eb65baa3f3))
- The tree overview in the guide, the plan and CLAUDE.md ([a3039b1](https://github.com/GMOD/JBrowseMSA/commit/a3039b11b5c9d8b9328eb343d92448b480a95295))
- The bracket, collapse and focus marks, and a mark argument in R ([798b963](https://github.com/GMOD/JBrowseMSA/commit/798b96368eb0766f2f5610b85cb2a6776edcc7f7))
- Record the clade marks and the bracket gutter in CLAUDE.md ([ccf44a7](https://github.com/GMOD/JBrowseMSA/commit/ccf44a7cce2273d44c3a6cfa79a4a2e031b55b68))
- The features row panel across layers.md, USAGE and the wrappers ([abd9fc1](https://github.com/GMOD/JBrowseMSA/commit/abd9fc1b3c6170dacce83463396bc08e12d7e826))
- Step 9 of panels-and-marks is the features panel ([764f394](https://github.com/GMOD/JBrowseMSA/commit/764f394079022b4919f86053fb2f1ced95ffd93a))
- The H5N1 surveillance figure page ([eecd345](https://github.com/GMOD/JBrowseMSA/commit/eecd3455e90cc9d0798bac62aa44db51e6cfdd18))
- Build script and hosted files for trp gene neighborhoods ([b69c29c](https://github.com/GMOD/JBrowseMSA/commit/b69c29cd57ecc58091bfd7ed6934fa0775dd8faf))
- The trp gene-neighborhood page ([541a3cc](https://github.com/GMOD/JBrowseMSA/commit/541a3cc94b501f095d3cfb85adc7557691ee10a2))
- CLAUDE.md records the strip legend key and the lane overlap rule ([46c7ff8](https://github.com/GMOD/JBrowseMSA/commit/46c7ff81f3d20baea9a0f41c225188999b937b95))
- Correct five captions against the numbers they describe ([9b77dfe](https://github.com/GMOD/JBrowseMSA/commit/9b77dfed8e62af94a719a0cf606c305e8b395f4b))
- Name IQ-TREE where the H5N1 page describes the tree ([a30ce6e](https://github.com/GMOD/JBrowseMSA/commit/a30ce6e5cbadac31c30d54a44d04ba03d325f09d))
- Regenerate the model API docs and geom_msa_strip's Rd ([0aabd6e](https://github.com/GMOD/JBrowseMSA/commit/0aabd6e0453d1fa55aa2fe7965acb60c6b76cfd3))

### Features

- **BREAKING** HideHeader, cell and viewport events, and mount() for non-React hosts ([b9f12e5](https://github.com/GMOD/JBrowseMSA/commit/b9f12e592009c6e6e02d014bc4b59180be9cf7e2))
- The widget mounts MSAViewer and reports clicks to Shiny ([7228685](https://github.com/GMOD/JBrowseMSA/commit/722868500cacf1ffd72f786dcb0d4c3b5f647fe3))
- A theme prop, and dark-mode colors for the handles and tree bubbles ([295c4d6](https://github.com/GMOD/JBrowseMSA/commit/295c4d6fa3e783006f4d573c5cfabdba7bc74730))
- ZoomToRegion, a region prop, and useMsaSvgFigure ([27b392c](https://github.com/GMOD/JBrowseMSA/commit/27b392c6b05ceaeda83aeb90cf29e2b9920166c8))
- <jbrowse-msa> custom element that joins a nightingale-manager ([8f5bf92](https://github.com/GMOD/JBrowseMSA/commit/8f5bf921941b2800e902d637802179dfd66add65))
- An anywidget notebook widget that mounts MSAViewer ([c973d6b](https://github.com/GMOD/JBrowseMSA/commit/c973d6b8c15ef5be39ecca68ee2740c511f87ffc))
- Add favicon.svg to website ([7b1af90](https://github.com/GMOD/JBrowseMSA/commit/7b1af906880365ffa77bac052399c223da93c950))
- A longer home page demo, and plain markup in place of the card UI ([5c8d2a4](https://github.com/GMOD/JBrowseMSA/commit/5c8d2a4a3c1b23b2322db5752a33382d4136cfa8))
- Add favicon to app, dedupe from website ([18f9ec0](https://github.com/GMOD/JBrowseMSA/commit/18f9ec01e09a77e019675740dc2357ad9882bfa7))
- Three-way scroll zoom, choosing the axes the wheel scales ([78c49bf](https://github.com/GMOD/JBrowseMSA/commit/78c49bf5fccd0faa9a2a5e8fc8eb27e0edb5a693))
- JBrowse 2 integration is its own page under /tutorials ([8d218a3](https://github.com/GMOD/JBrowseMSA/commit/8d218a37394b4424f25b771580e5765e2f7ee648))
- Track heights travel in the shared URL ([4331200](https://github.com/GMOD/JBrowseMSA/commit/43312007864e49da83d3e91b27b7ab9f62153d33))
- A hairline between tracks ([9b62ce4](https://github.com/GMOD/JBrowseMSA/commit/9b62ce43c062272b1920da61dd79ab7e08a92b41))
- Each track tooltips its own column, and the cell tooltip drops the stats ([3938896](https://github.com/GMOD/JBrowseMSA/commit/39388967370d56b0a28b09f5b4c2d2e9ca23bae5))
- BgColor is a prop, with an example toggling it over a domain overlay ([f268c13](https://github.com/GMOD/JBrowseMSA/commit/f268c13812abf6faebc5520d294c16b552b0b170))
- Bg_color trait ([2219b85](https://github.com/GMOD/JBrowseMSA/commit/2219b854736ecaf532764b181423382e74f8843f))
- Every MSAViewer prop reaches both R and Python, held there by a test ([a76a8e4](https://github.com/GMOD/JBrowseMSA/commit/a76a8e4f22f6787a0ea0d1ffd0aba6c5f5f7153c))
- **BREAKING** ResidueEncoding names the channel the color scheme paints ([22cd372](https://github.com/GMOD/JBrowseMSA/commit/22cd372cc0598bdabcd804af2bebd2f329e844e6))
- Layers composed with +, over the props msaview() already takes ([6085ef9](https://github.com/GMOD/JBrowseMSA/commit/6085ef91620f90bd75b1aca1f795a275b79e27ae))
- Stable panel ids on the exported groups ([6e988b3](https://github.com/GMOD/JBrowseMSA/commit/6e988b37c1d98cedf5cce5d60d5af260b1b102da))
- Draw the internal node labels newick carries ([ee30063](https://github.com/GMOD/JBrowseMSA/commit/ee300632551883c212f1982384632a3a1123348f))
- Model.legends, one list behind both legend renderings ([2660a71](https://github.com/GMOD/JBrowseMSA/commit/2660a71f7d964aa8ef3e9851022008846738c576))
- ResolveScale, and palettes a scale can name ([fbb26af](https://github.com/GMOD/JBrowseMSA/commit/fbb26af6ef9b3c78397ea92064a067caf7254706))
- RowData and encodings on the model ([a02a92e](https://github.com/GMOD/JBrowseMSA/commit/a02a92eb337613a26722dc070e28fc2efd580043))
- TipLabel colors, rowTint washes, and a culled overlay ([2232090](https://github.com/GMOD/JBrowseMSA/commit/2232090fc3a10064559f24ebdfea156ff3cbeed4))
- RowData and encodings reach all four surfaces ([a0b7821](https://github.com/GMOD/JBrowseMSA/commit/a0b78217a70545793e8e6ae29836a5850c663b5a))
- Every categorical encoding produces a legend ([81c5dc3](https://github.com/GMOD/JBrowseMSA/commit/81c5dc3b6f50f928c83a6815050189f8314d77a4))
- The branch channel colors a clade by a row field ([0d58362](https://github.com/GMOD/JBrowseMSA/commit/0d58362a46e8ecbdf1760d9aca844a2cc945fda0))
- GFF color= and the column 9 attributes reach Annotation ([de9be63](https://github.com/GMOD/JBrowseMSA/commit/de9be6376d852446890b9f84467fa0977d1f34d4))
- FeatureFill and featureLabel color and name the overlay's spans ([44c6eca](https://github.com/GMOD/JBrowseMSA/commit/44c6eca8a359d7d82466b19729c78855382adec9))
- The clades data layer and its highlight mark ([0145e21](https://github.com/GMOD/JBrowseMSA/commit/0145e218f2117635482991cdf95f130d2e331361))
- The rowPanels container and the strip kind ([54e35bc](https://github.com/GMOD/JBrowseMSA/commit/54e35bc57e9920fceb939a124b8e9aec62fe2fd1))
- Build script and hosted data for mitogenome_genes ([530ce20](https://github.com/GMOD/JBrowseMSA/commit/530ce20b415c17a0c78909031a42dcc3bc05a914))
- Pad the fetched genomes into mito-unaligned.afa ([068ada9](https://github.com/GMOD/JBrowseMSA/commit/068ada9297e1e6de731af60780c7a3aa60ec6a6e))
- The tree overview, a brush on the row scale ([9576804](https://github.com/GMOD/JBrowseMSA/commit/9576804c7f912a0c5800d436761b3f8ddf25da20))
- The bracket, collapse and focus clade marks ([b319479](https://github.com/GMOD/JBrowseMSA/commit/b3194797cb8959c27e8639db2186c6e5a8fb0a96))
- The features row panel and the align transform ([f839fb5](https://github.com/GMOD/JBrowseMSA/commit/f839fb5f94f893e16af852557719284ebd5663b1))
- Geom_msa_features, the gene panel as a layer ([aecb290](https://github.com/GMOD/JBrowseMSA/commit/aecb290cd0a41ffba387a3ca43f3dfd5b3bdf56c))
- The SVG export carries the tree's branch-length scale bar ([0c43b44](https://github.com/GMOD/JBrowseMSA/commit/0c43b44cc746a5a7c28766eb24d6cfdb6a5cd0f5))
- The H5N1 surveillance figure build script ([53d4a78](https://github.com/GMOD/JBrowseMSA/commit/53d4a78c12f59a1fffa699d0eec38eaee9314aa6))
- A strip names the legend it lists under ([a26989d](https://github.com/GMOD/JBrowseMSA/commit/a26989d5ac943c2098883ab46f0391e7fd3c3bc6))
- A features panel keeps an operon on one lane, and a scale's misses draw grey ([37fdc7f](https://github.com/GMOD/JBrowseMSA/commit/37fdc7f40abee43f017ebe512acca32ecf1065f2))

### Other Changes

- Update deps ([9051645](https://github.com/GMOD/JBrowseMSA/commit/905164527fda26815422c3ebe5b4a2e9b528caf6))
- A row table for the RSV-A subsample ([738a23f](https://github.com/GMOD/JBrowseMSA/commit/738a23ffae42e08857d23ac83810e4749fa6e552))
- The seven phylogeny_metadata figures ([59d9f4b](https://github.com/GMOD/JBrowseMSA/commit/59d9f4bd97c20259def192524b807b70dcad073f))

### Refactoring

- Thin the model.ts comments ([16f6bb7](https://github.com/GMOD/JBrowseMSA/commit/16f6bb7336f63dd9fcaafdbcbe7b0756733d705d))
- Thin the source comments in lib, cli, msa-parsers and svgcanvas ([14081c3](https://github.com/GMOD/JBrowseMSA/commit/14081c3959e5f330834eb7044fb380ee1102418e))
- A link list under the demo, and keep public/media in place ([8de7741](https://github.com/GMOD/JBrowseMSA/commit/8de7741e90fa5f147d32287a704adabe10d6c985))
- The tutorial index is the gallery, and 21 figures leave docs/media ([69c2118](https://github.com/GMOD/JBrowseMSA/commit/69c2118f89bfef0254df3c201191807a7f6acd68))
- One trackHeights map, keyed by what a divider resizes ([c445fc1](https://github.com/GMOD/JBrowseMSA/commit/c445fc110b42164c9106c83aa4bcfff51b3cde1e))
- The wheel-zoom control is one dropdown ([1c9afe1](https://github.com/GMOD/JBrowseMSA/commit/1c9afe15c4401cfb17399266f70ba3ee49c99333))
- Tutorials in the bar, one Docs menu, Examples as a dev reference ([fef7780](https://github.com/GMOD/JBrowseMSA/commit/fef778092e607134cbd97d12f64f12a3acef8fdd))
- One withAlpha for the row tint and the clade fill ([d09d812](https://github.com/GMOD/JBrowseMSA/commit/d09d812adc8ba9a00a9a2d3d9d09f64989a2d1df))

### Styling

- Run oxfmt over the rewritten docs ([b9fde8c](https://github.com/GMOD/JBrowseMSA/commit/b9fde8c3e44dcb6f6b1c12d1eca7a9f739f84fe5))
- Oxfmt the mouseover canvas imports ([fbf7561](https://github.com/GMOD/JBrowseMSA/commit/fbf756132c48ca1bd8ac43615480e0057bbd90e9))

### Tests

- Type the captured theme as Theme ([892e631](https://github.com/GMOD/JBrowseMSA/commit/892e631a8f82380f654727a22f179fc000a58e85))
- Trait conversions, defaults, and the front end's trait handling ([015a330](https://github.com/GMOD/JBrowseMSA/commit/015a330ddb8ba2529da39cf59d541ed04c9681d0))
- The feature channels color, label and legend the overlay ([17812d0](https://github.com/GMOD/JBrowseMSA/commit/17812d08d7bbe406b39b66d94d55ac0b5729c90c))
- Pin the strips, their width and their shared legend ([f67e382](https://github.com/GMOD/JBrowseMSA/commit/f67e3825d49e41e361974326b191ee992c22f482))
- Pin the overview's pick, its cache and its export ([ae1b557](https://github.com/GMOD/JBrowseMSA/commit/ae1b557c86a6b21f633ebf0f08e78abd00d901b8))
- Pin the clade gutter, the seeding and the exported bracket ([f618cac](https://github.com/GMOD/JBrowseMSA/commit/f618cacbcecf2114c19ab4c5658f1ff6762b9654))
- Geom_msa_clade carries the mark it is given ([0e409b4](https://github.com/GMOD/JBrowseMSA/commit/0e409b4e8f258ceaf00f0ecb96b60040fd30d6a4))
- Pin the features panel, the align shift and the no-msa figure ([31987b1](https://github.com/GMOD/JBrowseMSA/commit/31987b18987d3c6c5ecb72e4da6d4c438f356cd3))

## [7.0.0](https://github.com/GMOD/JBrowseMSA/compare/v6.5.0...v7.0.0) (2026-09-14)

### Bug Fixes

- Highlights keyed by owner, so two sources stop erasing each other ([c69541f](https://github.com/GMOD/JBrowseMSA/commit/c69541fba7559214c12d9031b7d24ea31efd0e84))
- Verify the row's numbering instead of assuming it ([7850f83](https://github.com/GMOD/JBrowseMSA/commit/7850f83064146c6a5014e70b69f987ddfb78d9d3))
- ResidueMappings refuses ambiguity and staleness ([3344552](https://github.com/GMOD/JBrowseMSA/commit/3344552054f515b665fc01331c27ce4e2a9f08a1))
- RootDir is an emit concern, so put it in the config that emits ([077f69c](https://github.com/GMOD/JBrowseMSA/commit/077f69cdbf8147e6394069bb9db32aa319cac972))
- Bundle the CLI so npm installs work ([7a137cd](https://github.com/GMOD/JBrowseMSA/commit/7a137cdf7cc7a14a82a1f47c18b041844bb26715))
- Make the watch script actually watch ([caed4b2](https://github.com/GMOD/JBrowseMSA/commit/caed4b27f40f03329554645d426a2c51c35d3a4a))
- Open a bare MsaView snapshot, and say when ?data= is unreadable ([a4281f5](https://github.com/GMOD/JBrowseMSA/commit/a4281f5497a49743891839f59a32bcd2089fd70c))
- Split FASTA on line-start >, sniff past BOM and blank lines, read ColabFold a3m, reject HTML pages ([4a7dafe](https://github.com/GMOD/JBrowseMSA/commit/4a7dafef981cf76af0b1fa8173aa2d9bfe90e246))
- Join a Stockholm tree split across #=GF NH lines, accept multi-character PDB chain ids ([cb137ea](https://github.com/GMOD/JBrowseMSA/commit/cb137ea279575331ccb9d67d6d4dca59ab6c8b4a))
- Read InterProScan GFF3 as written, and keep unintegrated signatures ([df88360](https://github.com/GMOD/JBrowseMSA/commit/df88360ebf45c7217fada51580eb18559aaa6ed8))
- Page the InterPro API, fix the docker image tag, and keep partial EBI results ([6f61f30](https://github.com/GMOD/JBrowseMSA/commit/6f61f3011e988ae21c78c2c9a8b3673798a0d007))
- One name rule for the alignment, the tree and the annotations; fetch URLs as URLs ([203497e](https://github.com/GMOD/JBrowseMSA/commit/203497eac6c782f6747443acb52c4cd9248092f3))
- The tracks come out of the alignment's own height ([010ad3c](https://github.com/GMOD/JBrowseMSA/commit/010ad3c62cccddc4bb9bf0ff28c2561a2407f1ce))
- The tree layout stops writing on the parsed tree ([fb8dafc](https://github.com/GMOD/JBrowseMSA/commit/fb8dafcb567731ac2197a8b6f0701f85d1374b8a))
- A collapsed clade hides rows, it does not delete them ([28c4959](https://github.com/GMOD/JBrowseMSA/commit/28c495946fbe4c6db8fb2317ddcb5230d1ee2810))
- The annotation overlay remembers what the reader chose ([c873839](https://github.com/GMOD/JBrowseMSA/commit/c873839cf59e6b4bc1cc9b6271f7f43fb25c766d))
- Loads that go wrong, and views that go away ([a45fff2](https://github.com/GMOD/JBrowseMSA/commit/a45fff21ed7f091e68f366f89e895371de1a3967))
- A tree width that arrives with the view is the one it opens at ([a85d759](https://github.com/GMOD/JBrowseMSA/commit/a85d759b2c53bec4e5992c22a347f1c6dff3f2d6))
- Downsample per axis, so fit-to-width keeps row boundaries ([4d964b1](https://github.com/GMOD/JBrowseMSA/commit/4d964b1493dc4d1682de446e1875cfb7d963d745))
- Take a letter's color from the cell it lands on ([aaaf7d1](https://github.com/GMOD/JBrowseMSA/commit/aaaf7d18c4048c5b0a37296fc423390a204814e0))
- Keep the overlay the document owns, and stop clearing fills ([4356f72](https://github.com/GMOD/JBrowseMSA/commit/4356f72e72735bc4d6806d8d7e892e529bacbded))
- Hand SVG colors it can hold, alpha included ([cbd5eee](https://github.com/GMOD/JBrowseMSA/commit/cbd5eeea045af810d05d7e8d063122a292e9ae1f))
- Pad the block cull by a row, and stop allocating 600px of it ([32fae14](https://github.com/GMOD/JBrowseMSA/commit/32fae148644ca663d209d9d392d898b47edef683))
- Resize the data track you dragged, not its whole kind ([937e76d](https://github.com/GMOD/JBrowseMSA/commit/937e76de19fd6cd1adfaded989be26f2c4572cbb))
- Keep a label on screen and off the one before it ([ff7e14f](https://github.com/GMOD/JBrowseMSA/commit/ff7e14fafe9d63a76730d14622a24630f3bab281))
- Repair the COVID tree link, gate the 3.5-only gallery links, drop the duplicate examples app ([e6683a4](https://github.com/GMOD/JBrowseMSA/commit/e6683a4c8d7f1cc540fb8f2fec7252f7a9b771cf))
- Point the figures' live links at the deployed app ([c0f197f](https://github.com/GMOD/JBrowseMSA/commit/c0f197ffc70b97cb53018f27090949e1eaf96962))
- Put the protein_family links back on nlrp1.aln ([6f068cf](https://github.com/GMOD/JBrowseMSA/commit/6f068cf413078c4a2085a2d1a7910238fba43ebc))
- Take @gmod/newick 1.0.3, which strips bracketed comments ([ac7b2b1](https://github.com/GMOD/JBrowseMSA/commit/ac7b2b1ba6564d2335839b5dfc0f1537ed6e313d))

### Chores

- Unbreak the spell check and the link check on main (#116) ([a4d8ca5](https://github.com/GMOD/JBrowseMSA/commit/a4d8ca50a916086a72fa12b7f1d5cf2603acd477))
- Deploy Pages via GitHub's native Actions flow, drop gh-pages branch ([8a86767](https://github.com/GMOD/JBrowseMSA/commit/8a86767a09a97ad7e596ee28d4c94c93445333dd))
- Per-tutorial spec modules, a --port flag, and tutorial conventions ([6eff587](https://github.com/GMOD/JBrowseMSA/commit/6eff5876e1ea55cc94a3b84ebf2f00f2724227f2))
- Build the CLI in the root build, and check packs actually install ([7b86a54](https://github.com/GMOD/JBrowseMSA/commit/7b86a54e337b02594c6ce19162c99b6b2d85e3b4))
- One setup action, PRs, a pinned typos, and no duplicated work ([d3b4af3](https://github.com/GMOD/JBrowseMSA/commit/d3b4af376fe502236f700a6b689483d6701c4bdd))
- Give the Pages workflow the token scopes its actions need ([4f5210f](https://github.com/GMOD/JBrowseMSA/commit/4f5210fbd649dd024b4334f13ba7babeddcbb773))
- Report the runner's Chrome before the smoke render ([89d6f9b](https://github.com/GMOD/JBrowseMSA/commit/89d6f9bd30235991de0c3abf2deb3d0d7c64b888))
- Fail when the generated model API docs are stale ([49ed8ed](https://github.com/GMOD/JBrowseMSA/commit/49ed8edb578f3d40ab5cddab05d33f374ff40af5))
- Generate the changelog from the tags, and keep it that way ([ae443a3](https://github.com/GMOD/JBrowseMSA/commit/ae443a365546c32eb0ca1e8b9d5f82a1e7f02da2))
- Drop four figures nothing shows, and the specs behind them ([f16f7c1](https://github.com/GMOD/JBrowseMSA/commit/f16f7c14450002a02032dcecb48db57ed8abd21c))
- Reconcile the lockfile with git-cliff ([c8a7d3d](https://github.com/GMOD/JBrowseMSA/commit/c8a7d3d5d8628a9a88cecf73550ab08fa6119bd1))
- Oxfmt ([03bf967](https://github.com/GMOD/JBrowseMSA/commit/03bf9677d0b1508e1a6d6b2dddb11cbfacf3f8e9))
- Protein-family tutorial figures, and InterPro 110.0 domains ([7565645](https://github.com/GMOD/JBrowseMSA/commit/756564541a6e66b3f192733457c55d621037ef0f))
- Stop the spell check on the generated changelog ([c6a69f4](https://github.com/GMOD/JBrowseMSA/commit/c6a69f4f0324200f94629286e5c22ea974b60079))
- Regenerate phylogeny-at-scale figures after rebase ([3b0801c](https://github.com/GMOD/JBrowseMSA/commit/3b0801cde916f98aa1056e6320ad323717e75fbd))
- Regenerate TRIM5 figures after rebase onto main ([442dba5](https://github.com/GMOD/JBrowseMSA/commit/442dba5920a206ea2c1661e17f0bd23513f6753c))
- Reconcile the data files with the names main links to ([c2ab87e](https://github.com/GMOD/JBrowseMSA/commit/c2ab87eac6f37428bd6c7fc0fefd3842213497df))
- Regenerate every figure against the fixed raster ([5e2458d](https://github.com/GMOD/JBrowseMSA/commit/5e2458d149267de6d5e22eeacbcff37f02c99b35))

### Documentation

- The arc track, and a gallery figure for the pseudoknot ([708e1d2](https://github.com/GMOD/JBrowseMSA/commit/708e1d2022da77ac529979860ec8e0e406dd78e7))
- Name the simpler shape beside the connected session ([5e5fbd1](https://github.com/GMOD/JBrowseMSA/commit/5e5fbd12401cfd533feb6fba0ce90487f597b175))
- The alignment<->structure correspondence as a layer ([fab9c49](https://github.com/GMOD/JBrowseMSA/commit/fab9c49d442c22cf2772d71d2582033b745438b6))
- The owner-keyed highlight API, and mark that step done ([d1bbd8e](https://github.com/GMOD/JBrowseMSA/commit/d1bbd8e73be7d878a048c7c7eea4b55c1585c0a8))
- Tutorials, for the work that happens outside the viewer (#114) ([50a3ee7](https://github.com/GMOD/JBrowseMSA/commit/50a3ee7c949c7fe981452187901073c6edafd216))
- ADR for the WebGL/GPU rendering rejection ([1bdb49d](https://github.com/GMOD/JBrowseMSA/commit/1bdb49d089199fbaf69456def4b5474aec7192c2))
- One quick start, with the version pins that make it work ([ec5e639](https://github.com/GMOD/JBrowseMSA/commit/ec5e639d2739297c35e907ce9785d651e1ad9c75))
- Say why pages-dist still writes .nojekyll ([7100d85](https://github.com/GMOD/JBrowseMSA/commit/7100d8525d7510cae2b70be5f7ab583d311929c4))
- Point at the live examples page, and say what the CLI does now ([f228e9c](https://github.com/GMOD/JBrowseMSA/commit/f228e9cb97055d83c0a5d3115c363f7d416a6950))
- Guard the props table, and stop restating the layers reference ([d29b4ce](https://github.com/GMOD/JBrowseMSA/commit/d29b4ce8337ea98465a6a60addaca66c7ba63c33))
- Correct the CLI and msa-parsers READMEs ([1c5906e](https://github.com/GMOD/JBrowseMSA/commit/1c5906e3c73fab9a0e817242af9d82d98f571a60))
- Rewrite the protein family page around its figures ([4632351](https://github.com/GMOD/JBrowseMSA/commit/46323512c5e3ceae683d002f1c3ca575a10e33b9))
- The LRR section names three rows, so plural the heading ([ca78e0f](https://github.com/GMOD/JBrowseMSA/commit/ca78e0f06fa794a556af49618d77cbe248d1f849))
- Build script and hosted data for the p53 variant-effect page ([6390679](https://github.com/GMOD/JBrowseMSA/commit/6390679a3852a7f4e6f0c06bc670b020d560f738))
- Figures and specs for the p53 variant-effect page ([8001bcd](https://github.com/GMOD/JBrowseMSA/commit/8001bcd4a89ca9ad20d8e145880f0b7e1bc570c2))
- Where p53's damaging variants fall ([5351d05](https://github.com/GMOD/JBrowseMSA/commit/5351d058997e347a11518d8044d505bfecfbbe15))
- Match the p53 page to the protein family page's conventions ([5faa13c](https://github.com/GMOD/JBrowseMSA/commit/5faa13cb3dfd243674b165c0d30d7e179fb2725d))
- The 8 kB request line a ?data= link has to fit in ([35ea582](https://github.com/GMOD/JBrowseMSA/commit/35ea5828eb0df618a0e0a6e57458add6f634c9d3))
- Open on the gene rather than a tumor statistic ([e04bb3d](https://github.com/GMOD/JBrowseMSA/commit/e04bb3d20018a972d99268089e6fe2a1cfe1c471))
- The closing link is the view, not the encoding ([4a6dbba](https://github.com/GMOD/JBrowseMSA/commit/4a6dbba6d3747bc66fa198dbf9fa376868790b0d))
- Spike, 6VXX, and the residues the structure did not resolve ([00310e8](https://github.com/GMOD/JBrowseMSA/commit/00310e816ee418767328f6addb5a5192b91e00d0))
- Show the real command output in the spike page ([5944e19](https://github.com/GMOD/JBrowseMSA/commit/5944e19be9327a7e510b6a9094e9a9c55dbd1ea3))
- Point residueMappings at the tutorial that builds one ([a2cd902](https://github.com/GMOD/JBrowseMSA/commit/a2cd902aa2216f4fc42b54bbca738d617d2d42f4))
- Match the sibling page's source list and prerequisites ([718e460](https://github.com/GMOD/JBrowseMSA/commit/718e460e1b7c22d317ffb4e56e5c8d75d15b2a65))
- The live data-layer props, and regenerated state-model docs ([2478e06](https://github.com/GMOD/JBrowseMSA/commit/2478e060e7da23697fe4e736dba3ee104f7133ce))
- Reading cross-reactivity off the kinase pocket ([6efc3ca](https://github.com/GMOD/JBrowseMSA/commit/6efc3ca9611c19519da516cc6e98da7940b17521))
- Build script for the SAM-I riboswitch page ([6779966](https://github.com/GMOD/JBrowseMSA/commit/6779966c0d2612a8124f53353f697b7fa8a9fddc))
- Figures for the SAM-I riboswitch page ([b03ad55](https://github.com/GMOD/JBrowseMSA/commit/b03ad55f02b12b5c93c2e1baf37267c78c0da23b))
- An RNA family, from a model and six genomes ([4f8b4d4](https://github.com/GMOD/JBrowseMSA/commit/4f8b4d424ce6a63dcceb4e56004e77297aca405e))
- Match the sibling pages' prerequisites and source list ([0e7bd99](https://github.com/GMOD/JBrowseMSA/commit/0e7bd9968e674366d89f3cdf645dfb2c79ae472c))
- Quote the printed length range for the insert columns ([037f78a](https://github.com/GMOD/JBrowseMSA/commit/037f78a28488452e088ed4aef4cb8ccd5b8e19e4))
- The file's own #=GC lines are tracks now ([bb01172](https://github.com/GMOD/JBrowseMSA/commit/bb0117254f33c90cd29d7829eaae86d3bcf749af))
- Bring CLAUDE.md's rendering notes back in line with the code ([f9f2cc7](https://github.com/GMOD/JBrowseMSA/commit/f9f2cc7c9313b53b118a720d15710daf17c3b4fa))
- A phylogeny-at-scale page, RSV-A at 1,840 tips ([6575106](https://github.com/GMOD/JBrowseMSA/commit/657510634dac5794b8db09a51f2766a96ee22103))
- TRIM5 codon selection, from orthologs to a dN/dS track ([4c61a51](https://github.com/GMOD/JBrowseMSA/commit/4c61a515049a6ce077391a0af048d27982ef8dd5))
- Three traps the figure specs keep hitting ([5243146](https://github.com/GMOD/JBrowseMSA/commit/5243146b2df7632d5bf40e1955e77c7193b366c9))
- Point CLAUDE.md and the layers doc at the examples catalog ([803a7a5](https://github.com/GMOD/JBrowseMSA/commit/803a7a58babe09bf2576bb417d468cc397791534))
- Absolute links between the tutorial pages ([3c625d8](https://github.com/GMOD/JBrowseMSA/commit/3c625d86b9aa52a8f54dfd84d072600db88d52de))
- Regenerate the state model reference ([8fdc340](https://github.com/GMOD/JBrowseMSA/commit/8fdc3401c2478a056a083799080c335946e8c793))

### Features

- Arc track kind, and RNA base pairs drawn from SS_cons ([12cfca5](https://github.com/GMOD/JBrowseMSA/commit/12cfca5a52c808d179004e8dc9f66a356dff34f6))
- A pseudoknot and a disulfide bond, drawn as arcs ([b30b362](https://github.com/GMOD/JBrowseMSA/commit/b30b3620e1bf499d4f2176d05f509882ff232545))
- Arc tracks from the R widget ([c6e0fc3](https://github.com/GMOD/JBrowseMSA/commit/c6e0fc3ab59158f0fd9f0c48ec6465bd99f5747e))
- A real contact map, Src autoinhibition ([ac39764](https://github.com/GMOD/JBrowseMSA/commit/ac39764fde4ae4e678beda636f858a432afff591))
- MSAViewer props stay live after mount ([8fb1d67](https://github.com/GMOD/JBrowseMSA/commit/8fb1d6708671d94f858ecc5e0f10935ba7f081fd))
- Where the disease variants are, from ClinVar ([a2d2aa4](https://github.com/GMOD/JBrowseMSA/commit/a2d2aa4953cd69aad92f577151e9f624f1014b59))
- ResidueMappings, the alignment<->structure correspondence as data ([edaad06](https://github.com/GMOD/JBrowseMSA/commit/edaad0613b29d53bd0d2819af1054510743feba9))
- Emit the SIFTS correspondence, not just what it derived ([049b2bf](https://github.com/GMOD/JBrowseMSA/commit/049b2bfde05b3948cd4fff052cfa0ccffaf3b45e))
- A home page that reads as three steps, not eight equal cards ([0618470](https://github.com/GMOD/JBrowseMSA/commit/0618470680daa16ccbf9c82308796f1bf17d8ff4))
- Draw every Stockholm #=GC line, and #=GR lines on request ([b3555ab](https://github.com/GMOD/JBrowseMSA/commit/b3555abb8f8ea11f598f0d8095fd8c2fef1f4c69))
- Let a host answer "is this data in the link?" per view ([821a9ec](https://github.com/GMOD/JBrowseMSA/commit/821a9ec589b3fc5e76d3bf1c3c8857301408ef14))
- A column position ruler and a branch-length scale bar ([5f68f72](https://github.com/GMOD/JBrowseMSA/commit/5f68f7292e082b9f1be2c3b23cea581adedb70f3))
- Choose the tracks and the viewport for an SVG export ([1565a5c](https://github.com/GMOD/JBrowseMSA/commit/1565a5cba81305f66bca79eee6ceac308fd0c575))

### Other Changes

- Say when the data is not in the link, instead of losing it quietly (#113) ([d4580f0](https://github.com/GMOD/JBrowseMSA/commit/d4580f083cbd047b0558b43db973d4a9bdc89c3d))
- Keep the R package's DESCRIPTION version with the rest ([06fb7b7](https://github.com/GMOD/JBrowseMSA/commit/06fb7b79933a9c1833c16a06f948c7099c064069))
- Kinase-pocket data, build script and screenshot specs ([e483dda](https://github.com/GMOD/JBrowseMSA/commit/e483dda429dbf56e8f1a8966a6228f4955bb6fd4))

### Performance Improvements

- Skip the subtrees a block cannot see ([39835a9](https://github.com/GMOD/JBrowseMSA/commit/39835a955f97db4e117fe228bc91cdb586f018cc))
- Cut svgcanvas to what the renderers draw, splice layers as strings ([3cd76cd](https://github.com/GMOD/JBrowseMSA/commit/3cd76cdc4a4587faff538043a9246de90c35271c))

### Refactoring

- Stop scanning and start pointing, for the two in-tab analyses (#115) ([a2f34f9](https://github.com/GMOD/JBrowseMSA/commit/a2f34f9a6d0475760951dd5c228fb67f6808208a))
- What hosts can see, and what a zoom frame rebuilds ([a8769da](https://github.com/GMOD/JBrowseMSA/commit/a8769daa01b97610e4b65eb29a2c52c3cfde7b76))
- The data is files, the story is written once ([d73de2c](https://github.com/GMOD/JBrowseMSA/commit/d73de2c16b3be4e63df64d647bb858ef41dde82d))

### Styling

- Oxfmt website/README.md so format:check passes ([b3f361b](https://github.com/GMOD/JBrowseMSA/commit/b3f361b53e2b275613ef9520b33190821964fd72))
- Format, and keep the formatter off the generated changelog ([3115b53](https://github.com/GMOD/JBrowseMSA/commit/3115b5364d793420e0afccf73066d77359ab0441))
- Format the kinase pocket tutorial ([761fd84](https://github.com/GMOD/JBrowseMSA/commit/761fd84c7ef570e56e5ebcc7c4ffa806dc250fbc))
- Format the codon selection tutorial ([3339517](https://github.com/GMOD/JBrowseMSA/commit/33395176ce437b92b5ee6c4a520f597d6df78da5))

### Tests

- A Stockholm #=GR track stays hidden until toggled ([ed2152d](https://github.com/GMOD/JBrowseMSA/commit/ed2152da450f66fccbd0a3b40f8c6e733f879a50))

## [6.5.0](https://github.com/GMOD/JBrowseMSA/compare/v6.4.2...v6.5.0) (2026-09-05)

### Chores

- Block a release until CI is green on the commit being tagged ([41ec9ab](https://github.com/GMOD/JBrowseMSA/commit/41ec9ab9be5fd2d90321f77860fe7d446baa175a))

### Documentation

- Two links that build their alignment on open ([b507c39](https://github.com/GMOD/JBrowseMSA/commit/b507c399686502701ae052bd8b5f02bd847d4cba))

### Styling

- Format gallery.astro ([8b549a1](https://github.com/GMOD/JBrowseMSA/commit/8b549a1df4ee34109f7b2161a7f72eb62dd5556f))

## [6.4.1](https://github.com/GMOD/JBrowseMSA/compare/v6.4.0...v6.4.1) (2026-09-03)

### Chores

- Provision pnpm 11.25.0 in CI ([080cbb3](https://github.com/GMOD/JBrowseMSA/commit/080cbb391ffebdcf2361b421c39666b18abbfae6))

## [6.4.0](https://github.com/GMOD/JBrowseMSA/compare/v6.3.0...v6.4.0) (2026-09-03)

### Bug Fixes

- Regenerate the R help page, declare jsonlite for its tests, and unbreak the layers link and two formatter drifts ([f173b76](https://github.com/GMOD/JBrowseMSA/commit/f173b76187c66e0a140cd79e6c3dccb6fa6791d8))
- Own renderToStaticMarkup instead of taking it from the core barrel ([f8ae8c9](https://github.com/GMOD/JBrowseMSA/commit/f8ae8c90091872281fc280046b3a47a82ba17b3f))

### Refactoring

- Name the residue, not the column, in the JBrowse session links ([ff1a643](https://github.com/GMOD/JBrowseMSA/commit/ff1a643de133c802f258b6729cabb2ab20fa13dc))

## [6.3.0](https://github.com/GMOD/JBrowseMSA/compare/v6.2.3...v6.3.0) (2026-09-02)

### Bug Fixes

- Omit an absent gff from the widget config ([51a613c](https://github.com/GMOD/JBrowseMSA/commit/51a613c1cadfc90776666f089efcfd1cd87d3669))
- Size the page to hold the domain key, fail fast on a load error ([34e452f](https://github.com/GMOD/JBrowseMSA/commit/34e452fa3a950cb0fc7ef21bade375ccd09873bb))
- Export ExportSvgOptions so a host's inferred model type is nameable ([768675b](https://github.com/GMOD/JBrowseMSA/commit/768675b6734f156f7e23e44cc95fc3c976d0b8fa))

### Documentation

- Layers that take data, the viewer as an agent's render target ([9b8e5f9](https://github.com/GMOD/JBrowseMSA/commit/9b8e5f9ad01ca2ac275743fe62fcab8ad72460ef))
- React prop, R argument, layers reference, F12 example ([0e8c72e](https://github.com/GMOD/JBrowseMSA/commit/0e8c72ea173b01bbda22092aedb307ad57938dd7))
- Teach the React prop, the R widget, the examples and the docs about columnTracks ([d6f96ba](https://github.com/GMOD/JBrowseMSA/commit/d6f96bad977503c751b1c89c74faad33d29ebdc8))
- Record the two shipped data layers ([47e2892](https://github.com/GMOD/JBrowseMSA/commit/47e289225f970559fcfa2d5e12b73c3e9d8ea95b))
- Regenerate help for the highlights argument ([9c2a4ed](https://github.com/GMOD/JBrowseMSA/commit/9c2a4edb2d21f4ff5fc9fcb04e7d5bd7a066b100))

### Features

- Labeled highlights in residue, column, or row coordinates ([e567d59](https://github.com/GMOD/JBrowseMSA/commit/e567d598bf523d5751903efceeac97fbe0770c42))
- Column tracks supplied as data, drawn beside the computed ones ([10b37ed](https://github.com/GMOD/JBrowseMSA/commit/10b37ed1c598bb21e6ae2c56425d3895daf25828))
- Help pages, R CMD check in CI, install line, Biostrings tests ([b14e3c4](https://github.com/GMOD/JBrowseMSA/commit/b14e3c47a7e850f554e2f1e2dcc8b7e2500b0b78))
- Draw the export background as one image via @napi-rs/canvas ([31feb21](https://github.com/GMOD/JBrowseMSA/commit/31feb2132a65a647c301161477e89841df3535f6))
- Implement drawImage as a cropped, scaled <image> ([95fb9ae](https://github.com/GMOD/JBrowseMSA/commit/95fb9ae234779e9cfd84e61a8705b63180deac56))

### Refactoring

- Theme-aware borders, export named after the file, shared test setup ([7d666d8](https://github.com/GMOD/JBrowseMSA/commit/7d666d8c2befa135a5d64df954b36d5e08de6cb5))

## [6.2.3](https://github.com/GMOD/JBrowseMSA/compare/v6.2.2...v6.2.3) (2026-09-02)

### Bug Fixes

- Point the cli README's react-msaview link at GitHub ([d43892a](https://github.com/GMOD/JBrowseMSA/commit/d43892a8f305d0b18e9d390ce35f6be96f041bf9))

### Features

- Refuse to release when main has diverged from origin ([909fc54](https://github.com/GMOD/JBrowseMSA/commit/909fc546cc65234185fddcef1060da6046bc0312))

## [6.2.2](https://github.com/GMOD/JBrowseMSA/compare/v6.2.0...v6.2.2) (2026-09-02)

### Bug Fixes

- Treat dropped inline data as uninitialized, and repair a few smaller slips ([1e2f04a](https://github.com/GMOD/JBrowseMSA/commit/1e2f04a26121071a1881ca02bacf1030b8f29d85))
- Keep exon projection inside a short row, and annotate the color schemes ([0ad791b](https://github.com/GMOD/JBrowseMSA/commit/0ad791b21e7730aff571f437de3d0972ffbb1143))
- Clear data-referencing view state on reset ([e75ca13](https://github.com/GMOD/JBrowseMSA/commit/e75ca137476396a1aa8a03c19bb49d55fa88158d))
- Clear tree-shape state in reset() so the next file opens unfolded ([4728991](https://github.com/GMOD/JBrowseMSA/commit/47289916b3c840c2f599d904b4f6fc3ac83c29d6))
- Drop duplicate setTreeMetadataFilehandle from rebase merge ([96c7c6a](https://github.com/GMOD/JBrowseMSA/commit/96c7c6a97256561f957f24e499deb5b6640bdda6))

### Refactoring

- Drop the gene explorer for jb2hubs' protein browser ([f4ae402](https://github.com/GMOD/JBrowseMSA/commit/f4ae402f3134e11b17f3974486cc499ff284c53a))
- Reset() by default-snapshot with a preserved-preferences allowlist ([8361cf6](https://github.com/GMOD/JBrowseMSA/commit/8361cf6be14d7dd6369f738f1e4010f21029f22a))

## [6.2.0](https://github.com/GMOD/JBrowseMSA/compare/v6.1.1...v6.2.0) (2026-08-26)

### Bug Fixes

- Skip attributes whose value is undefined ([7412117](https://github.com/GMOD/JBrowseMSA/commit/7412117967d90d0a481b754c242a1f502667b3e8))
- Take the theme background, and export only what the viewport shows ([f6eefd2](https://github.com/GMOD/JBrowseMSA/commit/f6eefd2158d691d2f37e4a87a5ff5a57381e92a1))
- Show progress, and warn about what actually costs ([ea27d67](https://github.com/GMOD/JBrowseMSA/commit/ea27d6710b9e68006ced050143954e935ab5fb97))
- Pin the model id so exports are reproducible ([7d2f8bc](https://github.com/GMOD/JBrowseMSA/commit/7d2f8bc5d019f7382f608bb2597b637c2549f522))

### Chores

- Regenerate the README figures ([3c1380b](https://github.com/GMOD/JBrowseMSA/commit/3c1380b971769ae65969656f2b4a33cffa8b44ec))
- Regenerate the README figures ([9f267dc](https://github.com/GMOD/JBrowseMSA/commit/9f267dc6e14b06d0bd3fed10e18947fddc8fa9ee))

### Features

- Name each track in the exported figure ([0f468c4](https://github.com/GMOD/JBrowseMSA/commit/0f468c4c049661eedbe8dedf89cc09aebceaaf20))
- --col-width/--row-height, and a guide built around the figures ([1c389d6](https://github.com/GMOD/JBrowseMSA/commit/1c389d615b4629bb870439a2813b9bdd6f82e94a))

### Performance Improvements

- Stop emitting text attributes that are already the svg default ([ce5d18d](https://github.com/GMOD/JBrowseMSA/commit/ce5d18d53dc9d0ce54448f4018c0c23a9d8329c2))
- Draw the alignment background as one image ([8e87d01](https://github.com/GMOD/JBrowseMSA/commit/8e87d01997216469c689f47404e52dd957558bac))

### Refactoring

- Share the headless render shims with the cli ([e0fe5c7](https://github.com/GMOD/JBrowseMSA/commit/e0fe5c7a6a67529a4cdb6b846a2421aa751c3e0b))

## [6.1.1](https://github.com/GMOD/JBrowseMSA/compare/v6.1.0...v6.1.1) (2026-08-26)

### Bug Fixes

- Keep the gene search box filled on a ?gene= link ([fcd244e](https://github.com/GMOD/JBrowseMSA/commit/fcd244ebb6c6978d8234e593b7027289d5e04c89))
- Keep tree nodes clickable when node bubbles are hidden ([7135aa3](https://github.com/GMOD/JBrowseMSA/commit/7135aa37b80a01c07cea233a6738b7f75ffc2eb6))

### Refactoring

- Split the gene explorer and give the preview the page width ([f8bc3f7](https://github.com/GMOD/JBrowseMSA/commit/f8bc3f77a2000592b9a210b93584ab1d1d16abb0))

## [6.1.0](https://github.com/GMOD/JBrowseMSA/compare/v6.0.0...v6.1.0) (2026-08-25)

### Bug Fixes

- Stop the track row overhanging the alignment it annotates ([3eb335a](https://github.com/GMOD/JBrowseMSA/commit/3eb335a246e8fa4d6ce332f8ce66f02ca26e0fcb))
- Restore the gene explorer's tiled layout, and look up the canonical symbol ([aabd619](https://github.com/GMOD/JBrowseMSA/commit/aabd6198ddb2cf438a7948381766846269a767a9))

### Chores

- Drop dead deps, refresh the stale architecture notes ([80a0612](https://github.com/GMOD/JBrowseMSA/commit/80a06121bf694c9c5c5928ceedc9fc7a562f7e99))
- One script per UCSC assembly, hg38 output byte-identical ([566048e](https://github.com/GMOD/JBrowseMSA/commit/566048e14f415636f4215df08fe738e01a1e368a))
- Choose transcripts from the alignment itself, close blocks after the last run ([bb5a834](https://github.com/GMOD/JBrowseMSA/commit/bb5a83409fa5b2f24bfecb93bbcefa38e19e2a23))
- Name retired-id transcripts by the gene whose coding span they overlap ([24bee1f](https://github.com/GMOD/JBrowseMSA/commit/24bee1f8d333f474ae2c5a74475753ed15908940))

### Documentation

- Figures for the logo track, and one fewer copy of the jsdom shim ([fac716d](https://github.com/GMOD/JBrowseMSA/commit/fac716d35df6ae5419e1c5a283e26f3e818dc1e8))
- The tracks note describes the shape the code now has ([67659a3](https://github.com/GMOD/JBrowseMSA/commit/67659a32d718fbd66103c5c15a8c26a6f2869211))
- Capture the neighbor-joining scaling idea ([b7cfba8](https://github.com/GMOD/JBrowseMSA/commit/b7cfba8b39d0749e8df394dfb4fb12736c4afaa7))
- One file per idea, and close the four we won't do ([c77cca7](https://github.com/GMOD/JBrowseMSA/commit/c77cca7605a084b867ef36f87df5e41cdfdaeb2a))
- The gene explorer is no longer human-only, and has one name ([fe4cb23](https://github.com/GMOD/JBrowseMSA/commit/fe4cb235eec2936530c45408ac59f1e5f11aea4c))
- Measure ortholog sources beyond NCBI, prototype the PANTHER one ([01c5cbc](https://github.com/GMOD/JBrowseMSA/commit/01c5cbca5dd84eded8befcaa4502980cf90cc847))
- Record the raster cache and the transformed scroll containers ([b1a5948](https://github.com/GMOD/JBrowseMSA/commit/b1a5948681556912a718a79844eb0bc120f7676b))

### Features

- Sequence logo track ([105406c](https://github.com/GMOD/JBrowseMSA/commit/105406ce7d1024b41ad5a57cc5731cabc5f799e0))
- Read minus-strand genes 5'→3', optional hg38 tracks, alignment preview, ortholog carry-over ([54d5eda](https://github.com/GMOD/JBrowseMSA/commit/54d5eda5968ff7ef4218ce0007a9566878b611d0))
- Non-human sessions open on their jb2hubs genome, with the alignment built by the plugin ([725e1cb](https://github.com/GMOD/JBrowseMSA/commit/725e1cbce2ed016930a7a33093708e08e31cd9bf))
- Ask PANTHER for the orthologs of fly, worm, Arabidopsis and yeast genes ([1b0253d](https://github.com/GMOD/JBrowseMSA/commit/1b0253d8b55dbdcd8cd8ba6451159f8428f364cb))

### Performance Improvements

- Index BLOSUM62 by charcode instead of a Map of upper-cased characters ([800c59a](https://github.com/GMOD/JBrowseMSA/commit/800c59a69eccaab58933d6d76fa21b0093eda20b))
- Measure tree labels once, raise the letter floor, size blocksY to the viewport ([c9cea63](https://github.com/GMOD/JBrowseMSA/commit/c9cea6341c7d61122c1bf157d1fc7a10665d3d48))
- Draw MSA tiles from a zoom-independent raster cache ([d115164](https://github.com/GMOD/JBrowseMSA/commit/d115164a41a82c49649862ffbbc73162c1ffa432))
- Scroll the MSA, tree and track blocks with one transform ([1ba1024](https://github.com/GMOD/JBrowseMSA/commit/1ba1024fa67f9c7d6feaf4066ea62af19d65ee1b))

### Refactoring

- One canvas host and one draw dispatch for every track kind ([d852b39](https://github.com/GMOD/JBrowseMSA/commit/d852b39b456da8cae4a91af5ea8dfff8f8eb14d7))
- One Shannon entropy, shared by the conservation and logo tracks ([74ef9ba](https://github.com/GMOD/JBrowseMSA/commit/74ef9ba521012e40262d08446df19f5b4ceacca8))
- Hoist the InterProScan program table out of the dialog ([ffdf2b3](https://github.com/GMOD/JBrowseMSA/commit/ffdf2b39eb3037733e4a2c356f2e1e4dea5bbe23))
- Drop the PANTHER prototype the plugin superseded ([cafd06e](https://github.com/GMOD/JBrowseMSA/commit/cafd06ef4006e05b9df987acc01e3b17ce46ca50))

### Styling

- Wrap CLAUDE.md the way oxfmt does ([5558820](https://github.com/GMOD/JBrowseMSA/commit/55588202dcb16ae55132cad6093cb12eb814085b))

### Tests

- Share the puppeteer plumbing, assert the tiled layout, probe live strings ([ee96fee](https://github.com/GMOD/JBrowseMSA/commit/ee96fee94aebf8d31a48e2ddfdb8037c2f4e4451))
- Read the ProteinView check off the decoded session ([dd05321](https://github.com/GMOD/JBrowseMSA/commit/dd05321e6d95898ef0ab37915c84f8db53900247))
- Assert the flipped loc lands as reversed, descending displayed regions ([699af73](https://github.com/GMOD/JBrowseMSA/commit/699af73fc35410fae16a77d3da315cfe3aec7cba))
- Read the genome view's init through a typed helper ([696ceaa](https://github.com/GMOD/JBrowseMSA/commit/696ceaae1c6df0c61bce807626f596c6f89d1170))

## [6.0.0](https://github.com/GMOD/JBrowseMSA/compare/v5.10.0...v6.0.0) (2026-08-18)

### Bug Fixes

- Show a failed load instead of spinning on it forever (#111) ([9d8af2e](https://github.com/GMOD/JBrowseMSA/commit/9d8af2ed3af44d8670ea7d9495b50e78b0ae46cf))
- Gate the label gutter on the same condition that draws labels ([60f73a8](https://github.com/GMOD/JBrowseMSA/commit/60f73a8a60d6d59cfca2382ff1908382ed993738))
- Keep domain bands that start or end in a hidden column ([32828f6](https://github.com/GMOD/JBrowseMSA/commit/32828f6e837e4befaf687200582ca65cc5d72ca3))
- A deep newick no longer overflows the stack while getting node ids ([d77f465](https://github.com/GMOD/JBrowseMSA/commit/d77f465f5afcd024ea866ee6c64a4c65f0b10133))
- Honor an explicit -o, match EBI status exactly, handle data-less tracks ([82f15f3](https://github.com/GMOD/JBrowseMSA/commit/82f15f3def736552971247f64b772a282827941f))
- Fit horizontally was 20px wider than the alignment canvas ([856d749](https://github.com/GMOD/JBrowseMSA/commit/856d749056de7ecd6d64789cbf3512f48dd8ca56))
- Line the minimap up with the alignment it maps ([c07f6ac](https://github.com/GMOD/JBrowseMSA/commit/c07f6ac33b68d16c28ebb4feed8272649866994c))
- Contrast letters against the domain box that is actually on top ([29e3787](https://github.com/GMOD/JBrowseMSA/commit/29e378779ff5a0bcd3af97f2ec3d23c22d4de2eb))
- A one-sequence named vector is sequences, not alignment text ([a17ed06](https://github.com/GMOD/JBrowseMSA/commit/a17ed0678f80068aa2e6ecf044be7b4f4a5b3300))
- Run the state model doc generator again ([7581ce5](https://github.com/GMOD/JBrowseMSA/commit/7581ce5c6d096bc53c3351e9ef69b8f2dc3270f2))
- Stop statedocs reformatting the package with the wrong formatter ([0654dd5](https://github.com/GMOD/JBrowseMSA/commit/0654dd5225f9917004125b736c4628f0cefc58e4))

### Chores

- Refresh the R package's vendored bundle on every release ([c5cfb77](https://github.com/GMOD/JBrowseMSA/commit/c5cfb777615451971907b295d5d822acea1a03ee))

### Performance Improvements

- Stop asking InterPro for the same protein twice (#110) ([49f9fd5](https://github.com/GMOD/JBrowseMSA/commit/49f9fd5f024d63361a817bd2d9dae7038915fff2))
- Stop re-walking the tree on every mousemove over the same node ([9f7f284](https://github.com/GMOD/JBrowseMSA/commit/9f7f2844c2482db2dd86bd1f3b45c0ed0b8a4d81))

### Refactoring

- Dedup drag handles, binary-search column mapping, drop dead code ([bea28c1](https://github.com/GMOD/JBrowseMSA/commit/bea28c1b8c6b5cb237427c628b4815a8b48c26db))
- Stop scanning the rest of the PDB after ENDMDL ([3dd9f9f](https://github.com/GMOD/JBrowseMSA/commit/3dd9f9fd9bcf344944a07421e9c5d841f09fcf42))
- Make overlay annotations the model's own shape, not InterProScan's ([dc5c523](https://github.com/GMOD/JBrowseMSA/commit/dc5c5230668cadf0aede8163118071454d0c74b1))
- Call them annotations in the UI, not domains ([d5288c9](https://github.com/GMOD/JBrowseMSA/commit/d5288c9710494388c0fe0e6bd554ea1cdcd0ffca))

### Tests

- Cover the resize handles and scrollbars, unflake the caterpillar tests ([a4d061f](https://github.com/GMOD/JBrowseMSA/commit/a4d061f068f46ff925b7d8ff5afdf864604b2b54))
- Cover the minimap in the viewport SVG export ([8fad91e](https://github.com/GMOD/JBrowseMSA/commit/8fad91e6e320f5ee7c6c70eda28cd98719855046))
- Stop collecting tests out of sibling worktrees ([a519d26](https://github.com/GMOD/JBrowseMSA/commit/a519d265ad815d6d0a29ac52e3efa77b0e60f85c))

## [5.10.0](https://github.com/GMOD/JBrowseMSA/compare/v5.9.0...v5.10.0) (2026-08-17)

### Bug Fixes

- Ragged rows in NJ, duplicate ids in clustal/emf parsers ([9204f9c](https://github.com/GMOD/JBrowseMSA/commit/9204f9c60616631427e5eb39f9c9db58d9a535b9))
- Draw domain boxes across the whole alignment ([543b908](https://github.com/GMOD/JBrowseMSA/commit/543b908b623b77a4c9c504d526a945eca8891120))
- Redraw after React resizes a canvas ([cef23a5](https://github.com/GMOD/JBrowseMSA/commit/cef23a51cc7d46b0e99cbb48fca948f8394dfa7e))
- Stop spreading one argument per sequence ([eb81f70](https://github.com/GMOD/JBrowseMSA/commit/eb81f70b6ad40a5da72e97278868ca56a4a7e890))

### Chores

- Point every JBrowse link at code/jb2/main ([bf21625](https://github.com/GMOD/JBrowseMSA/commit/bf2162561e066dc72ffd0c8f1044695bb8d3ee84))
- Re-wrap the three READMEs bf21625 left unformatted ([256b3e5](https://github.com/GMOD/JBrowseMSA/commit/256b3e5ce592020986401e95aaf0490295c15f2a))

### Documentation

- Regenerate the stale README figures ([915bc48](https://github.com/GMOD/JBrowseMSA/commit/915bc4816777e6c263e66e29208052b1faa5abf8))

### Refactoring

- One reactive filehandle loader, guarded for all four ([347ddd1](https://github.com/GMOD/JBrowseMSA/commit/347ddd16e9c8462b4dd12b3a94b306a432ab986f))
- Drop the unused seqPosToGlobalCol scan ([2f5a908](https://github.com/GMOD/JBrowseMSA/commit/2f5a908a5cb2a4ddee5cd5e0b1e953ceee42d284))
- Share the crosshair colors, collapse repeated menu/overlay markup ([91097c8](https://github.com/GMOD/JBrowseMSA/commit/91097c86c4bd14ccc670083fac8bf42bd38131ca))
- Build the collapsed-node set once per render ([68af2a2](https://github.com/GMOD/JBrowseMSA/commit/68af2a25907f96da5d8769ff382bc33cc698fdba))

## [5.9.0](https://github.com/GMOD/JBrowseMSA/compare/v5.8.0...v5.9.0) (2026-08-17)

### Features

- Persist the domain legend's expanded state ([4b955c6](https://github.com/GMOD/JBrowseMSA/commit/4b955c6f3e55d9b4acc3393c1e505c42a908555c))

## [5.8.0](https://github.com/GMOD/JBrowseMSA/compare/v5.7.3...v5.8.0) (2026-08-16)

### Bug Fixes

- Scale the cladogram by the tree area, not max branch length ([4342404](https://github.com/GMOD/JBrowseMSA/commit/4342404931c253aad7611c45a3fa07fa262b1099))
- Keep inline gff in the snapshot ([145f632](https://github.com/GMOD/JBrowseMSA/commit/145f6322c73a3f3685ad34884186dc88149b9729))
- Take the alignment width from the widest row ([89b665f](https://github.com/GMOD/JBrowseMSA/commit/89b665f0efde057457464d1881c5262474fa1ea2))
- Keep feature type and strand when writing GFF ([94ad35c](https://github.com/GMOD/JBrowseMSA/commit/94ad35c04e53fdf2c86a2775af93b3c34d8cb79c))
- Treat '.' as a gap, like the rest of the viewer ([5e765df](https://github.com/GMOD/JBrowseMSA/commit/5e765df813e1bef10cf9b5dbd406885cd5823a47))
- Carry BLAST tree labels and branch lengths into the tree ([978b87b](https://github.com/GMOD/JBrowseMSA/commit/978b87b8ca211e4d076b7092ee40e52f3bf97430))
- Compute labelsWidth without spreading every row ([af9da3e](https://github.com/GMOD/JBrowseMSA/commit/af9da3e6df117c85fc0090ab73516323cba8252b))

### Chores

- Reflow the ideas.md paragraphs the formatter rewrapped ([bfe795c](https://github.com/GMOD/JBrowseMSA/commit/bfe795c84d3a36779a78f4ab64e8ef141fe865dc))

### Performance Improvements

- Index Clustal and EMF rows by name ([eedb5eb](https://github.com/GMOD/JBrowseMSA/commit/eedb5ebbc3151f62a91837cc2d5e1b26a54ff2c6))

### Refactoring

- Tighten a few domain and label inconsistencies ([97dd69e](https://github.com/GMOD/JBrowseMSA/commit/97dd69e4c41f3e9695470c80543f90d58b75e67d))
- Destructure treeWidth with its siblings ([df22dae](https://github.com/GMOD/JBrowseMSA/commit/df22daecb5c46e2e50837b727a2472d72a02f26f))
- Reuse getUngappedSequence in SequenceTextArea ([39d7d2e](https://github.com/GMOD/JBrowseMSA/commit/39d7d2e09a4ea71c6b69dfb7b5532b018c0af2cf))
- Use @gmod/newick for parsing and tree traversal ([e96b9e9](https://github.com/GMOD/JBrowseMSA/commit/e96b9e9e270f0722acae89bb09fdd527e43681c6))

### Tests

- Pin A3M match-column correspondence ([7ec2765](https://github.com/GMOD/JBrowseMSA/commit/7ec276571b6e28d71e8bd5bb80a1fa686bd2f5b7))

## [5.7.3](https://github.com/GMOD/JBrowseMSA/compare/v5.7.2...v5.7.3) (2026-08-13)

### Bug Fixes

- An A3M insert must not consume a match column ([7c64125](https://github.com/GMOD/JBrowseMSA/commit/7c6412585a05a140e25d37579fcd303fc864ac0d))
- Keep Stockholm rows in file order ([30ef04f](https://github.com/GMOD/JBrowseMSA/commit/30ef04fa8a92fffee0b8bb9153a96c73244314a0))
- Restore Newick names quoted only in part ([021c2c2](https://github.com/GMOD/JBrowseMSA/commit/021c2c2bfcbb4f2b38a600cbdcacbc2c252ea655))

### Documentation

- The domain legend clips because 60% is of the wrong box ([3606c51](https://github.com/GMOD/JBrowseMSA/commit/3606c5136d1adde7bee10682ccd4bf0245329e00))
- Retract the legend-clipping diagnosis, it is not clipped ([942c940](https://github.com/GMOD/JBrowseMSA/commit/942c9409389a2d5eac355de449079304263e6a8d))

### Refactoring

- Tidy the GFF conversions and BaseMSA ([04857ef](https://github.com/GMOD/JBrowseMSA/commit/04857efda53059c6866f128cbee5580d28277130))

## [5.7.2](https://github.com/GMOD/JBrowseMSA/compare/v5.7.1...v5.7.2) (2026-08-09)

### Chores

- Reflow the CLAUDE.md paragraph the formatter rewrapped ([2446876](https://github.com/GMOD/JBrowseMSA/commit/24468767caf97cf51c9371171ac5b8e30b191187))

### Features

- Name the gappyness slider with a data-testid ([7cd10eb](https://github.com/GMOD/JBrowseMSA/commit/7cd10eb591f7521a4d5e7d84828c903b39b29379))

## [5.7.1](https://github.com/GMOD/JBrowseMSA/compare/v5.7.0...v5.7.1) (2026-08-06)

### Bug Fixes

- Build the CLI for real, correct stale dev docs ([4c8b155](https://github.com/GMOD/JBrowseMSA/commit/4c8b155913ae0ed833cd48e14707c9e3b1f654bf))
- Inline statusMessageText so old jbrowse hosts don't blow up ([bfadbaa](https://github.com/GMOD/JBrowseMSA/commit/bfadbaa57455ec172cc7cbfd5f369bd999e2cd77))

### Chores

- Allowlist Wnt and CONSTANS in the spell checker ([84dd262](https://github.com/GMOD/JBrowseMSA/commit/84dd2622f4560faaec0c0e790b875290fe964e91))
- Pnpm-only workspace, drop yarn residue ([89c4e74](https://github.com/GMOD/JBrowseMSA/commit/89c4e7403faf4feb1bf922f1c811341f6d313bf7))

### Documentation

- Regenerate every figure, and retarget the stale settings spec ([8e1b054](https://github.com/GMOD/JBrowseMSA/commit/8e1b0542117380f0164fe1be01c2becd6b6c7af4))

### Features

- NLRP1 orthologs, an example where architecture differs ([4fb6b46](https://github.com/GMOD/JBrowseMSA/commit/4fb6b46ef8351c7b326c9aff9ebcc6d41660411a))
- Anchored callouts, composed figures, column-lock demo ([2906070](https://github.com/GMOD/JBrowseMSA/commit/2906070580706edd09394f901f2c77f6fd10d7c5))

### Styling

- Brace the single-statement ifs oxlint's curly rule flags ([56f3f40](https://github.com/GMOD/JBrowseMSA/commit/56f3f4015e91dd5b91c81736fe8fd7534ce4e4b2))
- Run oxfmt/prettier over the files the switch missed ([e510b39](https://github.com/GMOD/JBrowseMSA/commit/e510b391b6c4ce97706f80deb9b8994689b2aae1))

## [5.7.0](https://github.com/GMOD/JBrowseMSA/compare/v5.6.3...v5.7.0) (2026-08-06)

### Bug Fixes

- Use theme text color for letters without a colored background ([30d066d](https://github.com/GMOD/JBrowseMSA/commit/30d066d4141eb80393460ef86fcc0d2a0c3fa3df))
- Don't let a malformed treeMetadata file take down the view ([bcba029](https://github.com/GMOD/JBrowseMSA/commit/bcba029fbedf803d0777ac8b203f8e2e39f7ecc4))
- Depend on @jbrowse/core from npm, not the vendored tarball path ([322bca6](https://github.com/GMOD/JBrowseMSA/commit/322bca6547a5a062eda60b4a215199d43f430807))
- Commit the clustal-js/typescript bumps the lockfile already has ([4d2354c](https://github.com/GMOD/JBrowseMSA/commit/4d2354c9a35919ae9b58affa6df7acb4cfcdfe54))
- Pass theme through to renderAllTracks ([97d80f3](https://github.com/GMOD/JBrowseMSA/commit/97d80f3ede50b06ce1f45c9fabaaf30ef278d97f))
- Import BaseTooltip from its own module, plus oxfmt import ordering ([434381c](https://github.com/GMOD/JBrowseMSA/commit/434381c2253bf1f08c8c6cb9499460c55113f2a2))

### Chores

- Switch to oxlint + oxfmt, drop ESLint ([a1244fd](https://github.com/GMOD/JBrowseMSA/commit/a1244fd7586cf8c43ec2e4532419f020a2b661e6))

### Features

- Add live Nextstrain pathogens example ([40251df](https://github.com/GMOD/JBrowseMSA/commit/40251dfd2c9084629c17bfe92f13d23a0f8d7b1d))

### Other Changes

- Mobx 7, mobx-react 10, mst 6, react 19.2.8, MUI-9 @jbrowse/core ([4dcffad](https://github.com/GMOD/JBrowseMSA/commit/4dcffadc3a0cf913e4f2e738ae7be09a9cd86c53))

## [5.6.3](https://github.com/GMOD/JBrowseMSA/compare/v5.6.2...v5.6.3) (2026-07-30)

### Bug Fixes

- Export ColumnCounts, DomainBand, TidyDomainAnnotation ([cc34b0a](https://github.com/GMOD/JBrowseMSA/commit/cc34b0a931ab0323c5e8205ef1709051f42c6f50))

## [5.6.2](https://github.com/GMOD/JBrowseMSA/compare/v5.6.1...v5.6.2) (2026-07-30)

### Bug Fixes

- Degrade to types.optional where the host mst lacks stripDefault ([fa11446](https://github.com/GMOD/JBrowseMSA/commit/fa1144662c28f1e77d9c81695f0a22bfa9f05d88))

### Chores

- Disable setup-node auto pnpm-cache under Corepack ([0a3d59e](https://github.com/GMOD/JBrowseMSA/commit/0a3d59e1b07baf8d9621eaf51b2d786d689370c7))
- Provision pnpm via Corepack in CI and publish workflows ([d9d26c0](https://github.com/GMOD/JBrowseMSA/commit/d9d26c0399d523ff0cd9bce872e99efb3bcc5df3))

### Documentation

- Feature JBrowse integration as top-level Demo ([1604e19](https://github.com/GMOD/JBrowseMSA/commit/1604e19da3e01959d997944a54fffb1a51c2c643))
- Prune completed handoffs, consolidate notes into agent-docs ([729fc44](https://github.com/GMOD/JBrowseMSA/commit/729fc44399eaecf83a2207d3def604f5eeb1262e))
- Regenerate figures ([28a36cb](https://github.com/GMOD/JBrowseMSA/commit/28a36cb0a72c6eab32c5643b9f8b2a1577e81495))

### Features

- Multi-species gene explorer (NCBI + GenArk + UniProt + EBI) ([55bdc32](https://github.com/GMOD/JBrowseMSA/commit/55bdc32c53721a2450d3be6eb07d4a3dc1eb0138))

### Performance Improvements

- Fix quadratic tree/overlay hot paths, tally columns in typed arrays ([0700ee6](https://github.com/GMOD/JBrowseMSA/commit/0700ee633e8b11d7fa68a2dc4c14ec10da26bce7))

## [5.6.1](https://github.com/GMOD/JBrowseMSA/compare/v5.6.0...v5.6.1) (2026-07-24)

### Bug Fixes

- Resolve typecheck error and prettier formatting failures ([d1cff75](https://github.com/GMOD/JBrowseMSA/commit/d1cff75c9b59d34e35b12158e2e8ceda5d7f2015))

### Chores

- Provision pnpm via Corepack instead of pnpm/action-setup ([987fdc8](https://github.com/GMOD/JBrowseMSA/commit/987fdc84b63183a94c7a61e81e9adcda8946e566))

## [5.6.0](https://github.com/GMOD/JBrowseMSA/compare/v5.5.0...v5.6.0) (2026-07-24)

### Chores

- Drop duplicate --github-actions flag from hyperlink args ([e621794](https://github.com/GMOD/JBrowseMSA/commit/e621794680bf6493fa557d6ac1d90520bb83bdb5))
- Enforce prettier formatting; guard color-scheme docs against drift ([3f4911b](https://github.com/GMOD/JBrowseMSA/commit/3f4911b3c3e204bb31ba7b633275b31a87a3d4f4))
- Bump actions off deprecated Node 20 runtime ([e41318b](https://github.com/GMOD/JBrowseMSA/commit/e41318b0b7476e5de90c46e5f9c84930658d29ed))

### Documentation

- Fix broken links, document all CLI commands, add hyperlink CI check ([b24d815](https://github.com/GMOD/JBrowseMSA/commit/b24d815b48042b81a4799313ca15b96f856f8c3d))
- Fix invalid color-scheme names in R package docs ([aff9045](https://github.com/GMOD/JBrowseMSA/commit/aff9045091c798cc13c8b2609f14dd218f668da4))
- Polish copy, fix gene-explorer state leaks and clipboard feedback ([96775f9](https://github.com/GMOD/JBrowseMSA/commit/96775f9b9e29aab38dd15de8b9d81cacf12f2b3f))

### Features

- Label header icons, add mobile nav, fix site label drift ([a41c675](https://github.com/GMOD/JBrowseMSA/commit/a41c675c86be1d39c10d6a1be083765dfb95d94e))
- Group header nav into dropdowns, move STL into details dialog ([ac974d8](https://github.com/GMOD/JBrowseMSA/commit/ac974d81f58322cbb769e483933fe43973896324))
- Add APG keyboard interaction to header nav dropdowns ([89891b6](https://github.com/GMOD/JBrowseMSA/commit/89891b657bf3269834eb39411e516b7a38ebc0a8))

### Other Changes

- Fix website import paths broken by the repo-root move ([fc80afc](https://github.com/GMOD/JBrowseMSA/commit/fc80afc1e73d5254d68fe4591fb50838bf0a663b))
- Allowlist "colinear" for typos; drop redundant gallery example ([b77c292](https://github.com/GMOD/JBrowseMSA/commit/b77c2924617db91aa3507728613b878fd96d1aa6))
- Render gallery figures at native resolution ([b16fdd9](https://github.com/GMOD/JBrowseMSA/commit/b16fdd95886b72c22683967549eea9041cf58962))
- Curate gallery around unique viewer capabilities ([37d340b](https://github.com/GMOD/JBrowseMSA/commit/37d340bb8e77ea52ca2eed253d4f61710816fb51))
- Lint gene-explorer, debounce type-ahead, parallelize gene load ([b0703fa](https://github.com/GMOD/JBrowseMSA/commit/b0703fa62d060318602c089df86a4062700486e6))
- Migrate to MUI v9 ([5f385e6](https://github.com/GMOD/JBrowseMSA/commit/5f385e6789b3ea8d4112ec4f59b4fc96d5bce626))
- Vendor local MUI-v9 @jbrowse/core tarballs ([febb7e9](https://github.com/GMOD/JBrowseMSA/commit/febb7e98c762ded6b6aaa39b699b672f67e92018))
- Gene explorer: 3D structure for any gene; misc cleanup ([612b438](https://github.com/GMOD/JBrowseMSA/commit/612b438e253b433899dc1c661b7f662c0d70ddc7))
- Note the any-gene 3D path (UniProt-sourced protein sequence) ([c62502a](https://github.com/GMOD/JBrowseMSA/commit/c62502a6781ae6291cd74f9fec92f0bda6f2e568))
- Prune shipped items, keep only open work + reference ([a5c025b](https://github.com/GMOD/JBrowseMSA/commit/a5c025b485ce7158f9269bceabe13e300618a5f4))
- Gene explorer: fix stuck spinner, collapse fetch to one race-safe effect ([87e5ccb](https://github.com/GMOD/JBrowseMSA/commit/87e5ccb70990450590dc45a381cdcd992355ec6d))
- Disable Astro compressHTML so inter-element whitespace is preserved ([c610e98](https://github.com/GMOD/JBrowseMSA/commit/c610e98a76e4acf48ea39863ca3f9d57f36c2a2b))
- Drop now-redundant {' '} spacers from .astro files ([5f60413](https://github.com/GMOD/JBrowseMSA/commit/5f604133ae4d5b7177895a3e217f952a75b24ec0))
- Gene explorer: fix stale type-ahead suggestions, dedupe FASTA parse ([b6c426e](https://github.com/GMOD/JBrowseMSA/commit/b6c426ee22238807b01568e765e9aa7fa8951b7c))
- Simplify header: remove duplicated "More settings" dialog and scroll-zoom checkbox ([bcc4877](https://github.com/GMOD/JBrowseMSA/commit/bcc487767085f85cb0a99bc11c232d891e8cf0b9))
- Use @jbrowse/core/util/tss-react ([2c996e5](https://github.com/GMOD/JBrowseMSA/commit/2c996e5cc8d7f4eeefe08e7e503dc9e3d55ffa2e))
- Fix README page-import path, dedupe social image, tidy geneExplorer ([3033b5f](https://github.com/GMOD/JBrowseMSA/commit/3033b5fc154638bfdeaa1a3782bad19c721e3acd))
- Gene explorer: extract effects into hooks, derive busy, add tests ([d3565a1](https://github.com/GMOD/JBrowseMSA/commit/d3565a1c94e9c7810da1213bc5be8d4d9c0930de))
- Add per-column stats tooltip and property-conservation track ([53a9c5b](https://github.com/GMOD/JBrowseMSA/commit/53a9c5ba48e9d5dc7d42735ce6ea46f73a2894e2))
- Dedup canvas-block rendering boilerplate in packages/lib ([f56be47](https://github.com/GMOD/JBrowseMSA/commit/f56be4737c2d001a051f9d076f24ddcff01cb13f))
- Lint ([2711f20](https://github.com/GMOD/JBrowseMSA/commit/2711f20dccbe67de0417d32e38fa501fffe0a993))
- Updates ([a878076](https://github.com/GMOD/JBrowseMSA/commit/a878076d93dd12b5e1f0d4bdb3196622887a3ed8))
- Sync search box to URL gene, extract UI helpers ([fcda42d](https://github.com/GMOD/JBrowseMSA/commit/fcda42d4e913aa084ab81a1fceb30a9a42265a06))
- Trim geneExplorer public surface, drop dead JBrowseFigure title ([61a8bc3](https://github.com/GMOD/JBrowseMSA/commit/61a8bc3bf69f04d4dce9f22ef366245dc37a08b2))
- Bump deps ([2a9c99f](https://github.com/GMOD/JBrowseMSA/commit/2a9c99fe75118271415ff52882a7279f9f607327))
- Add minimumReleaseAge of 3 days as supply-chain safeguard ([dcf3da7](https://github.com/GMOD/JBrowseMSA/commit/dcf3da78c5c5825d5734739a842e86efb4cf5963))
- Test GeneExplorer state machine (busy, race-safety, clear, error) ([76a92e3](https://github.com/GMOD/JBrowseMSA/commit/76a92e3eadd77e41f61946f5d3dc4960024964ea))
- Group sidebar by category, share shell, highlight source ([7973844](https://github.com/GMOD/JBrowseMSA/commit/7973844704d640c9609632097a56d47d73581dba))
- Exempt recently-bumped toolchain deps from minimumReleaseAge ([11fd2ce](https://github.com/GMOD/JBrowseMSA/commit/11fd2ce43f1cd8420e01a135a7ddb1dd28f4100a))
- Gene explorer: add 3D-print STL download of the AlphaFold structure ([9c0344d](https://github.com/GMOD/JBrowseMSA/commit/9c0344dd439431ce4d5674e3fbad0ea83d9f872b))

### Performance Improvements

- Don't load the live viewer bundle on mobile ([61d4c09](https://github.com/GMOD/JBrowseMSA/commit/61d4c09fa7102321df2b6a800f595958b0154304))

### Refactoring

- Use types.stripDefault to minimize snapshots, drop hand-rolled postProcessSnapshot ([3cffa45](https://github.com/GMOD/JBrowseMSA/commit/3cffa450cf3fd1c57c2384beabb47b11fb23c8ca))

### Styling

- Prettier reflow on r-msaview README and colorSchemes docs test ([3dc7bf9](https://github.com/GMOD/JBrowseMSA/commit/3dc7bf9000b37736751cf4704a7c5570bbb68b55))

## [5.5.0](https://github.com/GMOD/JBrowseMSA/compare/v5.4.1...v5.5.0) (2026-06-28)

### Other Changes

- Annotate F12 figure: red-box correspondence + Screenshot label ([006e032](https://github.com/GMOD/JBrowseMSA/commit/006e032d37a062407061bf088754c8e29bb40be8))
- Interlink docs pages; add CLI website page; fill autogen overview/descriptions ([7626418](https://github.com/GMOD/JBrowseMSA/commit/76264189563152f54d994ae2e376b65fdd50142c))
- Add protein↔genome linked genome-browser examples (SRC, BRAF, TP53) ([9f7adc1](https://github.com/GMOD/JBrowseMSA/commit/9f7adc155338a4af085411bebf055b716ccec152))
- Screenshots ([f33d694](https://github.com/GMOD/JBrowseMSA/commit/f33d694f36c3f9b0a90eb4c04a52e9429d035d7d))
- Update deps to latest (Babel 8, Astro 7, @astrojs/react 6) ([7412b48](https://github.com/GMOD/JBrowseMSA/commit/7412b486e593e429af744fe1686a5895813c7920))
- Deep-linkable docs headings and examples gallery ([8bdfc46](https://github.com/GMOD/JBrowseMSA/commit/8bdfc46d7e3476095e6c86e6430d3cab169149c6))
- Trim genome-browser page prose ([94ea27d](https://github.com/GMOD/JBrowseMSA/commit/94ea27d956b48868dc1940a92695af6cbfb8518d))
- Migrate to @eslint-react/eslint-plugin; fix alignment-selector key; refactor SVG export ([5f02c70](https://github.com/GMOD/JBrowseMSA/commit/5f02c703c1bd41b65a6563f95e0ef05c67a6c387))
- Dedup and trim docs prose ([632d0c0](https://github.com/GMOD/JBrowseMSA/commit/632d0c07da390d215ea18ac5f0384e5cae3aeaad))
- Genome-browser examples: canonical MANE transcript, ClinVar, autogen figures ([92ffd24](https://github.com/GMOD/JBrowseMSA/commit/92ffd24ab573db8d6ac729e75ce9ad5f9309d482))
- Embed the genome-browser screenshots as live-link figures ([799cfb6](https://github.com/GMOD/JBrowseMSA/commit/799cfb605ca83f0c16ff6894b26841059594bdee))
- Flagship genome + alignment + 3D-structure example ([8c19a9b](https://github.com/GMOD/JBrowseMSA/commit/8c19a9b38dc36bc493f527191dd383c63fbba1cf))
- Genome-browser 3D example: highlight a motif, make the MSA band visible ([46b5998](https://github.com/GMOD/JBrowseMSA/commit/46b599828d80de2cbcaa212339aed80c51bf127b))
- Lead with the 3D example, downplay the rest ([ada5687](https://github.com/GMOD/JBrowseMSA/commit/ada56878dd5c581704eabf0a0520d94a0a8a466b))
- Gene explorer: any-gene → collapsed-intron + 100-way MSA + AlphaFold ([d7cf331](https://github.com/GMOD/JBrowseMSA/commit/d7cf33119745431e3f5463ead2b3802768203b86))
- Gene explorer: name-indexed bgzip MSA (by gene symbol) replacing tabix-by-locus ([ee437dd](https://github.com/GMOD/JBrowseMSA/commit/ee437ddd91caa6c22605b270163517b1b432e779))
- Fix typos CI: ignore species-id data files + whitelist prose tokens ([decf965](https://github.com/GMOD/JBrowseMSA/commit/decf965413a085318743a708dcdf4835ab8fc2bf))
- Gene explorer: curated example genes with on-click descriptions ([6a1db1e](https://github.com/GMOD/JBrowseMSA/commit/6a1db1e622040ef33e425c47bdb62ca9fbf1fc8a))
- Whitelist ALS (disease) in typos config ([daa9712](https://github.com/GMOD/JBrowseMSA/commit/daa97129ac14e2070b5b088c7504d84299d6da3b))
- Gene explorer: race fix, URL deep-linking, session-JSON view, doc links ([faccc17](https://github.com/GMOD/JBrowseMSA/commit/faccc1796b89831ec36dbd581f1d265ab997c1ae))
- Gene explorer: knownCanonical CDS model for coordinate-consistent linkage ([91fd0ec](https://github.com/GMOD/JBrowseMSA/commit/91fd0ecc654a89bcde1c96d36c6771de26f6141b))
- Gene explorer: collapse-introns checkbox + 40bp exon window ([93d23f8](https://github.com/GMOD/JBrowseMSA/commit/93d23f858274a8b505a8370949325fc5cdfdf48c))
- Gene explorer: live 3D->LGV puppeteer test + page robustness fixes ([1863aab](https://github.com/GMOD/JBrowseMSA/commit/1863aab0211af6fdb5abd9f5ff6966bfccbdba79))
- Trim JBrowse-integration page, add gallery, drop genome-browser tab ([b4120b1](https://github.com/GMOD/JBrowseMSA/commit/b4120b1ce73b4ed7f932e099548e8bd746989c48))
- Apply JBrowse navy theme to React islands and site accent ([6382daa](https://github.com/GMOD/JBrowseMSA/commit/6382daa718e3210176791ee92f0b1e2a688a4a73))
- Drop metadata chips for plain MUI Typography in gene explorer ([f0f865b](https://github.com/GMOD/JBrowseMSA/commit/f0f865b52212f06eb098e85b38f6d24e954ecbbf))
- Gene explorer: emit canonical refnames in the JBrowse session ([bdf274a](https://github.com/GMOD/JBrowseMSA/commit/bdf274a0dac1232155ade4401f9af34ce42fb038))
- Add gene-explorer three-way linkage figure (3D→genome→alignment) ([b371272](https://github.com/GMOD/JBrowseMSA/commit/b3712724d97d5a871a197dfaa0d348b9c86a55c6))
- Honor "color letters instead of background" toggle for all color schemes ([4b231c7](https://github.com/GMOD/JBrowseMSA/commit/4b231c7ec6d80ebb5952237e4a5211d72082fddf))
- Gene explorer: use percent_identity_dynamic MSA coloring ([5e8a00d](https://github.com/GMOD/JBrowseMSA/commit/5e8a00d0b71aa1fd37c7830b3d55b5efcb8ffcb8))
- Gene explorer: remove embedded react-msaview live preview ([797a87a](https://github.com/GMOD/JBrowseMSA/commit/797a87a7c4bf4f23eaf1824bedf58d12edb2d0f9))
- Fix JSX-whitespace dropped spaces around links; add prettier-plugin-astro ([a1ae446](https://github.com/GMOD/JBrowseMSA/commit/a1ae446f0f2634f54649f0a3d177d2beff7ac3bc))
- Gene explorer: encode the JBrowse session in the URL hash to fix HTTP 414 ([dcb0bf6](https://github.com/GMOD/JBrowseMSA/commit/dcb0bf6ee4e229b09c6c608c9ec7bf5f3d6b96b1))
- Gene explorer: redesign form into a card with a single help modal ([998163a](https://github.com/GMOD/JBrowseMSA/commit/998163a7065bfb1c5dbff18a533c477054a94017))
- Add F12 cetacean gene-loss DNA example + genestructure CLI ([a580a1d](https://github.com/GMOD/JBrowseMSA/commit/a580a1d083063a6b394d49ee428138bf7383166e))
- MSA domains: hover tooltips, color-key legend, and SVG legend export ([dbe2d8a](https://github.com/GMOD/JBrowseMSA/commit/dbe2d8a674cc84fc576e23d2a7178bca5de2121a))
- Add gene arrow maps ([923fe8e](https://github.com/GMOD/JBrowseMSA/commit/923fe8e06d3ead55ed9c354ca4893282cef1d4ae))
- Initial work on combined figure ([cc78b4b](https://github.com/GMOD/JBrowseMSA/commit/cc78b4b27ec2a8c257dcf337e3cbf637e1b35132))
- F12 combined figure: publication-grade local-build render + gallery section ([2733f55](https://github.com/GMOD/JBrowseMSA/commit/2733f5524f939f60ff507093a65fbaffa4715df1))
- Build UMD with esbuild, drop webpack/babel toolchain ([6370020](https://github.com/GMOD/JBrowseMSA/commit/6370020bf3ef02279e1bc1a426bedec5efd4727f))
- Gene explorer: plain example list, side-by-side layout, details dialog ([2f863fe](https://github.com/GMOD/JBrowseMSA/commit/2f863fe3f77ea5e4ee83d654db063e02348c162d))
- Move website package to repo root ([3cca73b](https://github.com/GMOD/JBrowseMSA/commit/3cca73b9fd68cc5cc9fc8d7576d1b7752e340d4d))
- Fix broken GitHub link, og:image, tabindex, mobile header, gallery CLS, GeneExplorer URL sync ([70dbe48](https://github.com/GMOD/JBrowseMSA/commit/70dbe4852c2f623ad845bd7f652b32bf6b713cfa))
- Drop picked state, fix prose figure CLS, clean double blank line ([83c05ec](https://github.com/GMOD/JBrowseMSA/commit/83c05ec8fa70c51cdafa803c35b91ffe172ce800))
- Fix lint errors in geneExplorer.ts, drop intermediate span vars ([6f25d17](https://github.com/GMOD/JBrowseMSA/commit/6f25d175ceb88e64482ee90bbc81ab3fae20036c))
- MSA feature overlay: arrow beyond boundary, no legend title, smaller track label ([ac8b65f](https://github.com/GMOD/JBrowseMSA/commit/ac8b65fce3e2bf40e033a5eaf385f3d33514511e))
- Simplify feature-overlay and legend rendering ([ba81e1b](https://github.com/GMOD/JBrowseMSA/commit/ba81e1b6d5b927d92934ffe38548e7398eda6402))
- Gene-model exon overlay; simplify+reorganize gallery ([c77ba89](https://github.com/GMOD/JBrowseMSA/commit/c77ba893c1376ae2b88de1f09768647a1ad843cb))

### Tests

- Assert the LGV actually renders the highlight overlay (DOM), not just the model getter ([93eb931](https://github.com/GMOD/JBrowseMSA/commit/93eb931ad06e20cb51e10ed632e2d4e66ced3800))

## [5.4.1](https://github.com/GMOD/JBrowseMSA/compare/v5.4.0...v5.4.1) (2026-06-27)

### Other Changes

- Update deps ([1ad30ed](https://github.com/GMOD/JBrowseMSA/commit/1ad30ed2d3d514501a9c5711db1ee5b6a8c69e0d))
- Bump autogen docs ([50b6ede](https://github.com/GMOD/JBrowseMSA/commit/50b6edea99dbe5740d4181e96a61663a904c1c51))
- Remove apidocs check ([c448fb3](https://github.com/GMOD/JBrowseMSA/commit/c448fb38e571e638c20d012e4cd00f2522bdc99c))
- Updates ([d45feff](https://github.com/GMOD/JBrowseMSA/commit/d45feff5ee38097a2da07f206f4acc5f5d76d1d1))
- Fix gap-stripping, tree NaN, row ordering; dedup parser/model code ([f44bc15](https://github.com/GMOD/JBrowseMSA/commit/f44bc15d516346a15e314e5c1de7f93e38dc8fd8))
- Misc refactors ([3409b9a](https://github.com/GMOD/JBrowseMSA/commit/3409b9af794f3fd8a67ab81e3bb7f57a751ba919))
- Add genome-browser docs page + declarative MSA column highlight ([5cdd1f0](https://github.com/GMOD/JBrowseMSA/commit/5cdd1f026a5514100b5658c45955d4040306eaaa))

## [5.4.0](https://github.com/GMOD/JBrowseMSA/compare/v5.3.0...v5.4.0) (2026-06-20)

### Other Changes

- Widen website max-width from 960px to 1400px ([cdd2da0](https://github.com/GMOD/JBrowseMSA/commit/cdd2da0b3d72a4f7cccb854d56097a2069f3525d))
- Scope 1400px max-width to homepage only ([9018412](https://github.com/GMOD/JBrowseMSA/commit/901841258ca67db06e90565b68755c6a0b933b7d))
- Render user guide screenshots as captioned figures ([3d6233a](https://github.com/GMOD/JBrowseMSA/commit/3d6233aaa1b0abe29fd0b7909e1b5e0c28948bdc))
- Remove orphaned doc images, regenerate guide screenshots ([f569d4d](https://github.com/GMOD/JBrowseMSA/commit/f569d4df801060583878506b6c80c0a83e0c6efd))
- Add progress and cancel support to index file downloads ([188a4a0](https://github.com/GMOD/JBrowseMSA/commit/188a4a04aa55cd3f855df531d8dfb599a0b6d13d))
- Simplify download progress: drop redundant generation guards and trim tests ([6524080](https://github.com/GMOD/JBrowseMSA/commit/652408049b5173b992d6177af54f4b56920e965d))
- Add Rfam Lysine riboswitch (RF00168) Stockholm example data ([7e06c03](https://github.com/GMOD/JBrowseMSA/commit/7e06c0317c176e7d27f8ff3ea5a097c102fb9fb0))
- Add real-data examples: Src-family kinase domains and Lysine riboswitch tree ([df797d5](https://github.com/GMOD/JBrowseMSA/commit/df797d5872f0d92a6741fcdfaa5a1163883cce6c))
- Make examples page full-width via fullBleed layout prop ([b321aeb](https://github.com/GMOD/JBrowseMSA/commit/b321aeb66670e533392b7770d108918fb1295e44))
- Rewrite user guide, link figures to live app, upgrade screenshot tooling ([918b4f5](https://github.com/GMOD/JBrowseMSA/commit/918b4f522534c6f936d190404dd60fb1e88aad8c))
- Fit examples app between header and footer (no clip/double-scroll) ([c6130c2](https://github.com/GMOD/JBrowseMSA/commit/c6130c20bfc8cdb266d0f6c70a69f188183615e2))
- Draw collapsed clades as triangles with tip counts ([442c6f9](https://github.com/GMOD/JBrowseMSA/commit/442c6f94fbee53753c606b39254c1cff53babaeb))
- Commit sequence snapshots for deterministic, offline regen ([5b67994](https://github.com/GMOD/JBrowseMSA/commit/5b67994066b830c7c7a228417e2a7d5c1698807e))
- Regenerate collapse figure: triangle + tip count, no internal node label ([5bf45bf](https://github.com/GMOD/JBrowseMSA/commit/5bf45bf697708338b5025815cf392d7e66d8db91))
- Make collapsed-clade triangles clickable and hoverable ([feccdaf](https://github.com/GMOD/JBrowseMSA/commit/feccdafc922ee28716b20bf76a58c8be3d826f67))
- Host large example data as files instead of inlining in figure live-links ([1c117dc](https://github.com/GMOD/JBrowseMSA/commit/1c117dc318dd7a3899b3f13e9f02e59c930b4118))
- Document provenance of hosted example data files ([7939488](https://github.com/GMOD/JBrowseMSA/commit/79394888369ac7c3754806a4371997160e60c06e))
- Add 4 more phylogeny examples: histone H4, cytochrome c, prestin, p53 ([18566a6](https://github.com/GMOD/JBrowseMSA/commit/18566a62a74542afe5f70d565809f227e0f23248))
- Add tree-of-life (EF-1a/EF-Tu) and insulin examples ([39859a4](https://github.com/GMOD/JBrowseMSA/commit/39859a40d8efc3ca1fd107c860397680d8782328))
- Add tRNA and hammerhead ribozyme RNA secondary-structure examples ([87bd142](https://github.com/GMOD/JBrowseMSA/commit/87bd1429420b43e0115129b71c7645a651529b90))
- Add InterPro domain overlays + precomputed-InterPro CLI path ([1a0e871](https://github.com/GMOD/JBrowseMSA/commit/1a0e87119282338239bdf97ea055c4893e25e52e))
- Rm todos ([e9380ca](https://github.com/GMOD/JBrowseMSA/commit/e9380ca2c83fa5e0d31c027b4216ca0f3e9c3e34))
- Fix A3M misdetection of soft-masked FASTA; add explicit msaFormat override ([c539c54](https://github.com/GMOD/JBrowseMSA/commit/c539c54a50b623b3c7f08286f4cb0a87e6966ee0))

## [5.3.0](https://github.com/GMOD/JBrowseMSA/compare/v5.2.1...v5.3.0) (2026-06-20)

### Other Changes

- Update release.js ([50dbc64](https://github.com/GMOD/JBrowseMSA/commit/50dbc64c043afd939c61971de89f3a11c0083378))
- Fix release script and pin pnpm 11 via packageManager ([021a2e4](https://github.com/GMOD/JBrowseMSA/commit/021a2e404d1542b32a7370ae311127e2f8dcde4d))

## [5.2.1](https://github.com/GMOD/JBrowseMSA/compare/v5.2.0...v5.2.1) (2026-06-19)

### Other Changes

- Remove completed todo ([4059489](https://github.com/GMOD/JBrowseMSA/commit/405948943c75669d3c2ab7261e6495c0ba6fa495))
- Less docs ([590af18](https://github.com/GMOD/JBrowseMSA/commit/590af1860c3ae144b6f79cab798738f1db4a93f5))
- Less docs ([650ab27](https://github.com/GMOD/JBrowseMSA/commit/650ab2707bf807d723c303f37e386790028a2709))
- Bump deps ([a343331](https://github.com/GMOD/JBrowseMSA/commit/a343331ed1175e0b3e6d0f2cb1dcbc305381d0b9))
- Simplify and optimize MsaView model ([352ef65](https://github.com/GMOD/JBrowseMSA/commit/352ef651a5543466681b99108ec490d357a16691))
- Add smooth scroll-zoom with cursor anchoring and a scroll-zoom toggle ([9d2a2f0](https://github.com/GMOD/JBrowseMSA/commit/9d2a2f0975ff93e26ed8de88a3a908bbaea9058c))
- Tune wheel/pinch zoom with adaptive delta normalization ([e12a344](https://github.com/GMOD/JBrowseMSA/commit/e12a344b35c35570d82408619d570e3525a479cf))
- Bias vertical zoom anchor toward the top ([54eecb6](https://github.com/GMOD/JBrowseMSA/commit/54eecb6f02b1fcda79708ac5f63a2911e7a12ac3))
- Unify zoom bounds; cap stepwise zoom-in ([c89a465](https://github.com/GMOD/JBrowseMSA/commit/c89a465c081e6ad15c0e07157722b1a7365b8adc))
- Remove eslint-plugin-unicorn ([4ed7a16](https://github.com/GMOD/JBrowseMSA/commit/4ed7a16eb762ab790cfc425438d3826721822b66))
- Add examples/figures and fix parser, scroll, and CLI bugs ([b78c953](https://github.com/GMOD/JBrowseMSA/commit/b78c953d3aad6399a5b05e155298c40bd5819beb))
- Reorganize READMEs and add R example figures ([ec8e4ea](https://github.com/GMOD/JBrowseMSA/commit/ec8e4ea4687f1f167a59fc2c3def363ad55a3294))
- Remove outdated hero, make figures deterministic, document gff props ([2d4c700](https://github.com/GMOD/JBrowseMSA/commit/2d4c7002fe717dfdf4a74d56de2ce0205b734fef))
- Make READMEs human-readable with audience-based navigation ([dfba24a](https://github.com/GMOD/JBrowseMSA/commit/dfba24a32adda51503acf80eed2dd1bfbffa9bdd))
- Add puppeteer screenshot system and refresh user-guide images ([07f8d29](https://github.com/GMOD/JBrowseMSA/commit/07f8d294bdf2840a38de2b84485f62f805e16605))
- Port jbrowse-components docgen improvements: auto-detect composition from types.compose() AST, token-aware comment removal, #example support, and section helpers ([9142014](https://github.com/GMOD/JBrowseMSA/commit/91420147dd79a25889ca0bc216a9d903bfd3f498))
- Tighten msa-parsers return types and replace || with ?? ([322af6b](https://github.com/GMOD/JBrowseMSA/commit/322af6b9860cf19994dff0cf166e995d4185ea6b))
- Apply model linter fixes, add #example to MsaView docs, and add CI apidocs freshness check ([83f14a9](https://github.com/GMOD/JBrowseMSA/commit/83f14a97d0611dcbd7b73d12da0b4c82460bc630))
- Add Astro documentation website (unified portal) ([21e54eb](https://github.com/GMOD/JBrowseMSA/commit/21e54eb41a5aebb32b46d417bec008c8fc1bfc53))
- Refactor and clean up model.ts and util.ts ([7319531](https://github.com/GMOD/JBrowseMSA/commit/7319531378aa4be4d3b5bd8cfeb2bf02c860e20f))
- Wire up docs-site deployment (gmod.org/JBrowseMSA + /demo app) ([56a0c53](https://github.com/GMOD/JBrowseMSA/commit/56a0c53f221e686ad64422044a3bf5ab07af2d44))
- Pin Vite 7 within Astro's subtree to silence the version warning ([ea28f45](https://github.com/GMOD/JBrowseMSA/commit/ea28f45fbf0171a539a8a73d5f7e5fd240d6426d))
- Use CSS flexbox middle-ellipsis for long sequence names in header ([a727dc8](https://github.com/GMOD/JBrowseMSA/commit/a727dc8f4ae95d498e51ae2d877276c3fab24a52))
- Fix resize handles: visible, draggable, consistent styling ([c2baa3a](https://github.com/GMOD/JBrowseMSA/commit/c2baa3a3b894470fc5effad30186241190dbb29b))
- Lint and format ([e0aeb53](https://github.com/GMOD/JBrowseMSA/commit/e0aeb53feefc4c4d4b46dc886ce0d5f0dc328883))
- Add GitHub icon to header nav, fix SVG dark mode backgrounds ([a90cc93](https://github.com/GMOD/JBrowseMSA/commit/a90cc9343d379817b77335adcf404cad55268c34))
- Add GitHub icon to header nav, fix SVG dark mode backgrounds ([b67ba86](https://github.com/GMOD/JBrowseMSA/commit/b67ba864995660d56ed89d13b9351748025f4907))
- Updates ([c962673](https://github.com/GMOD/JBrowseMSA/commit/c9626736d974cdf676a57d74168d3ab95070c64e))
- Fix deprecated Astro markdown plugin config ([14fe53b](https://github.com/GMOD/JBrowseMSA/commit/14fe53b05393cb9df3905258aaad25bfdf05a2bf))
- Fix broken Astro markdown config import ([3247fef](https://github.com/GMOD/JBrowseMSA/commit/3247fef145d4001fe66478a91fa8814866156c58))
- - parseAsn1.ts — fixed a latent type error (Object.fromEntries spread losing name/parent types) with ([ac94ff1](https://github.com/GMOD/JBrowseMSA/commit/ac94ff1fe82e4e8f2c1fb767c7b55e8671fb5378))
- Robustness fixes and SVG export simplification (#107) ([81defca](https://github.com/GMOD/JBrowseMSA/commit/81defca186fcc783845468a99a825c0304d34948))

## [5.2.0](https://github.com/GMOD/JBrowseMSA/compare/v5.1.1...v5.2.0) (2026-05-30)

### Other Changes

- Less sidebar text ([b62b723](https://github.com/GMOD/JBrowseMSA/commit/b62b72384b0d63b017086796d57391a3ade4bb76))
- Simplify block rendering, fix blocksY clamp, drop redundant nref redraw ([31b0b90](https://github.com/GMOD/JBrowseMSA/commit/31b0b9048e73e75baf3ec9aec746cebb97c86550))
- Remove dead code, add RenderCtx type, document cross-repo deps ([297de75](https://github.com/GMOD/JBrowseMSA/commit/297de7571bed61777acc58015cf09c15e6630490))
- Bugfixes, type improvements, and || -> ?? cleanups ([216f172](https://github.com/GMOD/JBrowseMSA/commit/216f1722edfb5bd2af6a4abda408b2cacae94901))
- Rendering optimizations: eliminate per-frame allocations and redundant work ([84d7c89](https://github.com/GMOD/JBrowseMSA/commit/84d7c8971422adee967b0b5fd0a8b03781175bf3))
- Clean up renderMSABlock: hoist fillStyle, drop dead params, add early-exit ([024ad26](https://github.com/GMOD/JBrowseMSA/commit/024ad26efc6762d4f1b90592d2568e19d3b76ddf))
- Columns→Map, labelWidthMap pre-computed, darkenForContrast already guarded ([4f7f4d2](https://github.com/GMOD/JBrowseMSA/commit/4f7f4d2cd74e1f834f2046e668fe15d27a07f93c))

## [5.1.1](https://github.com/GMOD/JBrowseMSA/compare/v5.1.0...v5.1.1) (2026-05-29)

### Other Changes

- Downgrade, not working with mui v9 ([69ac2c1](https://github.com/GMOD/JBrowseMSA/commit/69ac2c190128e3858e807871e95e1ef21b81b81d))

## [5.1.0](https://github.com/GMOD/JBrowseMSA/compare/v5.0.16...v5.1.0) (2026-05-29)

### Other Changes

- Add approved builds ([bfbc8eb](https://github.com/GMOD/JBrowseMSA/commit/bfbc8eb6de1084c64cd9e98650b7e5e89741af36))
- Bump deps ([4d17046](https://github.com/GMOD/JBrowseMSA/commit/4d170469d5500577e2fd1d8bbfaa354b820f6ed2))
- Add lightweight Vite examples gallery for react-msaview ([cbf9861](https://github.com/GMOD/JBrowseMSA/commit/cbf986165e06b03271c93b1af87ca4b424d1ae93))
- Simplify lib: fix drag-scroll leaks, dedup hooks/menus, extract ClustalX ([69ded1b](https://github.com/GMOD/JBrowseMSA/commit/69ded1bb97966e7e807ffb430d7db82fc106dc31))
- Abort interpro ([fe5ba1c](https://github.com/GMOD/JBrowseMSA/commit/fe5ba1cd79e4ddbb92331295035d9fee35628b70))
- Pin fflate to 0.8.2 to fix attw CI ([726e107](https://github.com/GMOD/JBrowseMSA/commit/726e107bb9cbd70b598b12cca09bfd572522eedf))
- Fix canvas font bug and optimize tree rendering ([22924e3](https://github.com/GMOD/JBrowseMSA/commit/22924e30cefddda9b76278d4a4a99e8b915ad52b))
- Release storybook ([dade78b](https://github.com/GMOD/JBrowseMSA/commit/dade78b1e06c21b9610eba0bb8f02e1b104accd6))
- Port improved state-model docgen from jbrowse-components ([ce3b4f9](https://github.com/GMOD/JBrowseMSA/commit/ce3b4f92367f2e018ae303d92f7f5e253836fa40))

## [5.0.16](https://github.com/GMOD/JBrowseMSA/compare/v5.0.15...v5.0.16) (2026-05-02)

### Other Changes

- Fix build ([e85229e](https://github.com/GMOD/JBrowseMSA/commit/e85229e49510ec86e4081c81430e08123ef59586))

## [5.0.15](https://github.com/GMOD/JBrowseMSA/compare/v5.0.14...v5.0.15) (2026-05-02)

### Other Changes

- Fix TypeScript type errors ([e04bc68](https://github.com/GMOD/JBrowseMSA/commit/e04bc68ff11d97e9c89cefd7abc4eedd5a9d1dc3))
- Migrate from eslint-plugin-import to eslint-plugin-import-x ([f88ebef](https://github.com/GMOD/JBrowseMSA/commit/f88ebefd25ed58b4d8c5b97b95d360538a10ae82))
- Add documentation explaining cladogram algorithm similarity to ape package ([9366085](https://github.com/GMOD/JBrowseMSA/commit/936608558af3f0ee5e227e7a85847dbf6826f4de))
- Add build artifacts to prettierignore ([c8f7c05](https://github.com/GMOD/JBrowseMSA/commit/c8f7c05428b7caf73bda778b5d653c2b54692c65))

## [5.0.14](https://github.com/GMOD/JBrowseMSA/compare/v5.0.13...v5.0.14) (2026-05-02)

### Other Changes

- Add publishing doc ([289122b](https://github.com/GMOD/JBrowseMSA/commit/289122b69bd6f5c302a403106e8b3bbb2f7e511e))
- Bump deps ([ad4d77f](https://github.com/GMOD/JBrowseMSA/commit/ad4d77f311e44373f27690dc93dfa5ec86114e0c))
- Fix drawing when show branch length off ([567b77c](https://github.com/GMOD/JBrowseMSA/commit/567b77c77eee7c20b909fa5b931d8fe24358744f))
- Fix tree cladogram rendering to match standard phylogenetic layouts ([c6b4508](https://github.com/GMOD/JBrowseMSA/commit/c6b450803a5117970290d9785f7c9aaa97e4fca1))
- Add tests for tree cladogram positioning logic ([6b806f4](https://github.com/GMOD/JBrowseMSA/commit/6b806f4c08bdab4d5af5df5284478cc3596fb229))

## [5.0.13](https://github.com/GMOD/JBrowseMSA/compare/v5.0.12...v5.0.13) (2026-04-16)

### Other Changes

- No need to build locally with trusted publishing ([041fdb4](https://github.com/GMOD/JBrowseMSA/commit/041fdb424688ed584b8f8a9267760b2e7a908e5d))

## [5.0.12](https://github.com/GMOD/JBrowseMSA/compare/v5.0.11...v5.0.12) (2026-04-16)

### Other Changes

- Bump npm ([90f2036](https://github.com/GMOD/JBrowseMSA/commit/90f20367d1df0e0f5e0f46a3fe77fcbb44d939f7))

## [5.0.11](https://github.com/GMOD/JBrowseMSA/compare/v5.0.10...v5.0.11) (2026-04-16)

### Other Changes

- Add provenance ([1214c70](https://github.com/GMOD/JBrowseMSA/commit/1214c70117b05b8c2112907d829718b08893abee))

## [5.0.10](https://github.com/GMOD/JBrowseMSA/compare/v5.0.9...v5.0.10) (2026-04-16)

### Other Changes

- Add repo ([ab070b7](https://github.com/GMOD/JBrowseMSA/commit/ab070b727d363c18d71e4be2170230ccbf34da98))

## [5.0.8](https://github.com/GMOD/JBrowseMSA/compare/v5.0.7...v5.0.8) (2026-04-16)

### Other Changes

- Bump deps ([c15fec6](https://github.com/GMOD/JBrowseMSA/commit/c15fec627c1cb65d577ab5e50a809273c2dbc345))
- Simplify codebase: remove d3 deps, extract shared patterns, compress data, fix ESM workspace setup ([da49be6](https://github.com/GMOD/JBrowseMSA/commit/da49be676339842fc63169924149de0008ef810e))
- Fix build: widen BaseMSA.getRowData return type, cast header to Record, update lockfile ([47652a7](https://github.com/GMOD/JBrowseMSA/commit/47652a7abe3a58e24d357a6a7097a2b922c3d3d9))
- Export HierarchyNode type to fix app build (TS2883) ([8f93107](https://github.com/GMOD/JBrowseMSA/commit/8f93107f7c3930aa61b1b0b0d38b2febbcc9402e))
- Add trusted publishing workflow for npm (#102) ([92fa50e](https://github.com/GMOD/JBrowseMSA/commit/92fa50ee00ed7f6fe9e457d4ec3522448abdd128))
- Add Docker/Singularity container support for CLI; fix EBI API one-seq-at-a-time submission (#104) ([78df348](https://github.com/GMOD/JBrowseMSA/commit/78df348a05c531ccb0c3f709d80f9078420f89bd))
- Simplifications (#105) ([d4a777d](https://github.com/GMOD/JBrowseMSA/commit/d4a777d85ee5fb81190581bd8b16e804111f0599))
- Add msaviewr R package (#103) ([4159aa9](https://github.com/GMOD/JBrowseMSA/commit/4159aa98db15940ac9819909f894dea18cfd0502))
- Domains ([10c2fd1](https://github.com/GMOD/JBrowseMSA/commit/10c2fd140796b6a28ed2d28a46569e21e3012626))
- Domains ([3692d66](https://github.com/GMOD/JBrowseMSA/commit/3692d668b6a9733e80f9b4450cd330b9e7b189ed))

## [5.0.7](https://github.com/GMOD/JBrowseMSA/compare/v5.0.6...v5.0.7) (2026-03-24)

### Other Changes

- Fix colon in sequence names not resolving in newick tree by replacing with underscore  (#101) ([0aec066](https://github.com/GMOD/JBrowseMSA/commit/0aec06624aa991ea729b394084fe7d7714363ca7))

## [5.0.6](https://github.com/GMOD/JBrowseMSA/compare/v5.0.5...v5.0.6) (2026-01-25)

### Other Changes

- Remove unused pako dep ([c92593c](https://github.com/GMOD/JBrowseMSA/commit/c92593c697ed4f30540fba4ed31e90a668e6aa5c))
- Comnservation track resize ([72de929](https://github.com/GMOD/JBrowseMSA/commit/72de9293675e5f876e4abfbde8e59c641eb04202))
- Add a3m ([3b4995d](https://github.com/GMOD/JBrowseMSA/commit/3b4995d5751bec4f83b962c3a00293bb13376bb7))
- Resize direction ([7c7d39f](https://github.com/GMOD/JBrowseMSA/commit/7c7d39f414973318889f0687a8f4c77fe1671c4e))

## [5.0.5](https://github.com/GMOD/JBrowseMSA/compare/v5.0.4...v5.0.5) (2026-01-25)

### Other Changes

- Updates ([fc1f3a4](https://github.com/GMOD/JBrowseMSA/commit/fc1f3a474548b87c9877f9009470d4efa3dd40f6))
- Unified code code conservation bar unification ([64384cc](https://github.com/GMOD/JBrowseMSA/commit/64384cc99a543295df93dc745186720e1d013b84))
- Unify ([915ce9c](https://github.com/GMOD/JBrowseMSA/commit/915ce9cf866680401488d72e1cb586b2d7823eb7))

## [5.0.4](https://github.com/GMOD/JBrowseMSA/compare/v5.0.3...v5.0.4) (2026-01-25)

### Other Changes

- Add deploy ([9c168f8](https://github.com/GMOD/JBrowseMSA/commit/9c168f835efbbf0757448da14c434300268e563a))
- Lint ([3f51974](https://github.com/GMOD/JBrowseMSA/commit/3f51974e675a52896f6aa40327e7940d9e90f3b8))
- Add attw ("are the types wrong") checks (#100) ([38ad3c0](https://github.com/GMOD/JBrowseMSA/commit/38ad3c0ff9cf605451fd1196af76555022ecfe53))
- Use term 'aa' instead of 'bp' for protein letters ([ce7e583](https://github.com/GMOD/JBrowseMSA/commit/ce7e583a3561852d7907aa84c63ec31c8f2fed17))
- Type module ([9852c6c](https://github.com/GMOD/JBrowseMSA/commit/9852c6ce6a4cb6e4c653a85715296578f216940b))
- Rename babel config ([5caf932](https://github.com/GMOD/JBrowseMSA/commit/5caf932917fd176ba7c57dafa55910a425ea826f))

## [5.0.3](https://github.com/GMOD/JBrowseMSA/compare/v5.0.1...v5.0.3) (2026-01-24)

### Other Changes

- ESM refactorings (#99) ([bf1df7f](https://github.com/GMOD/JBrowseMSA/commit/bf1df7f5f6ecd3e9819f61d76264bdf240a07e20))
- CLI package name ([846c952](https://github.com/GMOD/JBrowseMSA/commit/846c952e01c5ca850789b57c633df6f79b3ef0dc))
- Synchronized release ([8581ae2](https://github.com/GMOD/JBrowseMSA/commit/8581ae26f9c1baff346e92467cc361ff05eb8112))

## [5.0.1](https://github.com/GMOD/JBrowseMSA/compare/v4.8.1...v5.0.1) (2026-01-24)

### Other Changes

- Bumps ([de52c47](https://github.com/GMOD/JBrowseMSA/commit/de52c47dfc02d48134714c0e3d8ee25e16e0c4a9))
- Re-order imports ([43affab](https://github.com/GMOD/JBrowseMSA/commit/43affabc5015a84ca6bec90d4c0c3b9e79670895))
- Back to yarn (#97) ([5d88769](https://github.com/GMOD/JBrowseMSA/commit/5d88769dd816b26d8dc9bff60735f4acfdab9129))
- Back to yarn (#97) ([485c0c1](https://github.com/GMOD/JBrowseMSA/commit/485c0c162a3834b46cf34d6a5b489e59a8ebede7))
- Format ([3c75923](https://github.com/GMOD/JBrowseMSA/commit/3c75923ae64d7d68b9024ac578ce8b974f044c93))

## [4.8.1](https://github.com/GMOD/JBrowseMSA/compare/v4.8.0...v4.8.1) (2026-01-09)

### Other Changes

- Externalize parsers ([d360a6e](https://github.com/GMOD/JBrowseMSA/commit/d360a6e6efd7443cf13103b99994a4d5b2b14e5a))

## [4.8.0](https://github.com/GMOD/JBrowseMSA/compare/v4.6.0...v4.8.0) (2026-01-09)

### Other Changes

- Create more utilities to get the 'visible column' which is different from 'global' by including collapsed gappy columns (#95) ([a5160b3](https://github.com/GMOD/JBrowseMSA/commit/a5160b38859debc8808e0d979ed56a50dd6297c3))
- Modularize parsers (#96) ([f0c806c](https://github.com/GMOD/JBrowseMSA/commit/f0c806c2351722cd525791b5478e64c19e9857b9))

## [4.6.0](https://github.com/GMOD/JBrowseMSA/compare/v4.5.0...v4.6.0) (2026-01-08)

### Other Changes

- Better noTree label layout and setHighlightedColumns getter ([f4a0bc0](https://github.com/GMOD/JBrowseMSA/commit/f4a0bc0058499bb2d2ce906df7cb88c8420998f9))

## [4.5.0](https://github.com/GMOD/JBrowseMSA/compare/v4.4.6...v4.5.0) (2026-01-08)

### Other Changes

- Update demo link in README.md ([e09a4d0](https://github.com/GMOD/JBrowseMSA/commit/e09a4d0bb52bd2006debedfdb7cb1740b2e3a307))
- Bump deps ([24d9c69](https://github.com/GMOD/JBrowseMSA/commit/24d9c69ef7f5a30b0e713c99483f28112e9e99bf))
- High priority comments ([3c0a9d7](https://github.com/GMOD/JBrowseMSA/commit/3c0a9d79ef1459dbc2d24382c02a228fc7e76f76))
- Wow ([8f3e225](https://github.com/GMOD/JBrowseMSA/commit/8f3e225163ac08b1ac3766e4983b4744b608761a))
- Better default filtering ([5aebd0e](https://github.com/GMOD/JBrowseMSA/commit/5aebd0e034e1cd461496a23bbb670b6cee4e5d18))
- Speedups ([7ecc971](https://github.com/GMOD/JBrowseMSA/commit/7ecc971af3f344d0748602061f1f7fd47e663d5a))
- Speed up blanks finding ([2835eee](https://github.com/GMOD/JBrowseMSA/commit/2835eeecff1147bb34d76ef4cb48e48872814531))
- HideGaps effective ([b94625d](https://github.com/GMOD/JBrowseMSA/commit/b94625d033b12e3419fd9b2e9e0bd00bf46781a6))
- Add a3m parser, add conservation track, add neighbor joining calculator, svg export fixes (#93) ([0d453ba](https://github.com/GMOD/JBrowseMSA/commit/0d453ba158f2f629256ff03f6d901dfbe42aa0b8))
- ClustalX ([7b15d8c](https://github.com/GMOD/JBrowseMSA/commit/7b15d8c4b56c16f7f0a59e5053ce3e1e9ae0cbfb))
- Fix lint (#94) ([095a9d6](https://github.com/GMOD/JBrowseMSA/commit/095a9d660ba6c69adfb86bbd4cef59fb4846eb2f))
- Update ([123bcb8](https://github.com/GMOD/JBrowseMSA/commit/123bcb8629e8ba7fd09eee1ed89b6659ba08f44e))
- Use yarn instead of npm run ([f90070a](https://github.com/GMOD/JBrowseMSA/commit/f90070a6c5be10b6469875f6db425bb871b6e772))

## [4.4.6](https://github.com/GMOD/JBrowseMSA/compare/v4.4.5...v4.4.6) (2025-10-14)

### Other Changes

- Fix lint ([ef4c44b](https://github.com/GMOD/JBrowseMSA/commit/ef4c44beb132a7a1ef2304b5635baef964923bb7))
- Update coordinate calcs ([4ec3919](https://github.com/GMOD/JBrowseMSA/commit/4ec39193b9c7b4e843142c1500c9d409ce6febf4))

## [4.4.5](https://github.com/GMOD/JBrowseMSA/compare/v4.4.4...v4.4.5) (2025-10-09)

### Other Changes

- Add mouseover on tree nodes (#91) ([2e8efbe](https://github.com/GMOD/JBrowseMSA/commit/2e8efbe0002dd9bb7f8bebddaf1ff61d675febe0))
- Use flatbush ([00d854c](https://github.com/GMOD/JBrowseMSA/commit/00d854cd0fd70d30d1b66595a1a6c76e8112ce0a))

## [4.4.4](https://github.com/GMOD/JBrowseMSA/compare/v4.4.3...v4.4.4) (2025-07-31)

### Other Changes

- Vite 7 ([b97dc72](https://github.com/GMOD/JBrowseMSA/commit/b97dc7244e5920ae8a83daa95040340a8e413f3f))
- Update USAGE ([40390e2](https://github.com/GMOD/JBrowseMSA/commit/40390e27549d93710c24cf5f4b43d869380bc8a9))
- Fix typo ([079fa74](https://github.com/GMOD/JBrowseMSA/commit/079fa747cebc38e920d670a93f51be2fa6022e8e))
- Update Usage ([435ac44](https://github.com/GMOD/JBrowseMSA/commit/435ac4477d2a17485032784c5f799956a296ecde))
- Update USAGE.md ([3fd4ede](https://github.com/GMOD/JBrowseMSA/commit/3fd4ede7c5400e9bda3aeb55a72f7b84243165a3))
- Update USAGE.md ([518d685](https://github.com/GMOD/JBrowseMSA/commit/518d685e6efaf7308cfe4d0d49ea876e40dbcd27))
- Update USAGE.md ([be80a47](https://github.com/GMOD/JBrowseMSA/commit/be80a47a2564475681d733434774e4393999df5e))
- Bump babel ([5af1926](https://github.com/GMOD/JBrowseMSA/commit/5af192689a17faed119093d9d893199db2d90571))
- Pin to v5 mobx-state-tree ([7fdd592](https://github.com/GMOD/JBrowseMSA/commit/7fdd592c15c8b57ed8881418836993f47e60e9ed))

## [4.4.3](https://github.com/GMOD/JBrowseMSA/compare/v4.4.2...v4.4.3) (2025-06-09)

### Other Changes

- Lint ([4cc2371](https://github.com/GMOD/JBrowseMSA/commit/4cc23717fdbac7b453880bc73d1b614cc9f7c53d))
- Add repository ([6e27ee6](https://github.com/GMOD/JBrowseMSA/commit/6e27ee672015d15ab308c342dd8819ac783bcdfd))

## [4.4.2](https://github.com/GMOD/JBrowseMSA/compare/v4.4.1...v4.4.2) (2025-06-06)

### Other Changes

- Simplify colStatsSums ([21b1b86](https://github.com/GMOD/JBrowseMSA/commit/21b1b86c8ef695c95c2441908122148c51efec09))
- Check liveness ([9696699](https://github.com/GMOD/JBrowseMSA/commit/9696699ba8bec4fefb62a713c1137fdb0b0f1ba0))
- Bump deps ([2e1fc74](https://github.com/GMOD/JBrowseMSA/commit/2e1fc74b2b34a6b63cd3128cf51c055ecac6185e))
- Reduce precision ([b9760b8](https://github.com/GMOD/JBrowseMSA/commit/b9760b8199969732d2ee950b6b39b1e96bad887b))
- Redo ([9a44c35](https://github.com/GMOD/JBrowseMSA/commit/9a44c357f81ec52f36835fb6401e4e79a2014a07))

## [4.4.1](https://github.com/GMOD/JBrowseMSA/compare/v4.4.0...v4.4.1) (2025-05-30)

### Other Changes

- Rm settings ([44a171f](https://github.com/GMOD/JBrowseMSA/commit/44a171f99f052c89054d74dc8d13c54ea412d133))
- Rm settings ([b71afbf](https://github.com/GMOD/JBrowseMSA/commit/b71afbfdbd50c41ac26f3f15982088280c85a896))
- More menus ([49521b7](https://github.com/GMOD/JBrowseMSA/commit/49521b7fa68db3bcbea1e0571496b6a1ef05ac15))
- Consistent notion of isBlank ([4b33e51](https://github.com/GMOD/JBrowseMSA/commit/4b33e515b5c0b19702173b2b4af9b8fd4faf3588))
- Bold font when bgColor false ([28fcb61](https://github.com/GMOD/JBrowseMSA/commit/28fcb61b3a5264fe05c0f8337af2f91c0a9d2e91))
- Hot path ([575f737](https://github.com/GMOD/JBrowseMSA/commit/575f737f99765431898da0af6cef768963db16da))
- Fetch and maybe unzip util ([d7470a1](https://github.com/GMOD/JBrowseMSA/commit/d7470a10629b73f048ed04244ce25c290c7a913e))
- Make one-based ([eb60624](https://github.com/GMOD/JBrowseMSA/commit/eb606248867ecdacd0b02611912df2b46069315c))
- Rewrite for readability ([5a72431](https://github.com/GMOD/JBrowseMSA/commit/5a72431895e8f9b7d8e66ed3b3c9e4345cac4bc0))
- Updates ([a34a233](https://github.com/GMOD/JBrowseMSA/commit/a34a2332aa12fc0e706432e92b70efeb33de2432))
- Fix lint ([7b289a1](https://github.com/GMOD/JBrowseMSA/commit/7b289a1ee0da4a02315ccccac5281029bd3318f0))
- More zoom reset ([0c36b91](https://github.com/GMOD/JBrowseMSA/commit/0c36b91c8e7fe5a402272ffc840bb1d116aa0ebc))

## [4.4.0](https://github.com/GMOD/JBrowseMSA/compare/v4.3.0...v4.4.0) (2025-05-29)

### Other Changes

- Close after item click false ([939d4f0](https://github.com/GMOD/JBrowseMSA/commit/939d4f066838d907bf4684d0d6e29e7e30123753))
- Better label ([94bd37a](https://github.com/GMOD/JBrowseMSA/commit/94bd37a887016fd888789576737e8abe35d04ea6))
- Better label ([34323e9](https://github.com/GMOD/JBrowseMSA/commit/34323e91655134673ac22ab0152fb27c897e4901))

## [4.3.0](https://github.com/GMOD/JBrowseMSA/compare/v4.2.0...v4.3.0) (2025-05-26)

### Other Changes

- Update ([b1fb501](https://github.com/GMOD/JBrowseMSA/commit/b1fb50164bc0d2237827a4b9836c59e6eea1efc7))
- Format ([e1b34c3](https://github.com/GMOD/JBrowseMSA/commit/e1b34c36489d4b592df8ac42c9f05e2ed125d4a6))
- Convert vanillajs build from rollup to webpack (#87) ([aa75c5a](https://github.com/GMOD/JBrowseMSA/commit/aa75c5a573e968689c252487bdfec9252dee579e))
- Update USAGE.md ([3dc2b22](https://github.com/GMOD/JBrowseMSA/commit/3dc2b2292954b2cc41d3b7e064eae4958a9484bb))
- Hide gaps true by default ([8d68623](https://github.com/GMOD/JBrowseMSA/commit/8d68623182a636dce60eb0f1248214f8579f19dd))
- Typo ([4956cba](https://github.com/GMOD/JBrowseMSA/commit/4956cba3548d8b75713697d472b7f588561b9cf6))
- Misc ([c60785a](https://github.com/GMOD/JBrowseMSA/commit/c60785a9c3ed3d4e70e44583132eba39a90a7656))
- Open page by default ([90c6f0e](https://github.com/GMOD/JBrowseMSA/commit/90c6f0ed719c76c3ab557ed58319b4ea84f2bebb))
- Replace with textfield select ([8a96a1a](https://github.com/GMOD/JBrowseMSA/commit/8a96a1ad979336a5aeea8236eacf12b3735bbd35))
- No use of drawTreeText ([3231046](https://github.com/GMOD/JBrowseMSA/commit/3231046bc686c104846df85981d7ad28218a8e1a))
- Whitespace ([cc35d85](https://github.com/GMOD/JBrowseMSA/commit/cc35d85364fd2b2f3532fc71e8b113c2325c8518))
- Settings menu ([fd1173b](https://github.com/GMOD/JBrowseMSA/commit/fd1173bd6fe8eee0aea0bf884e6c6e7cf512a0ea))
- Misc ([5ec95b5](https://github.com/GMOD/JBrowseMSA/commit/5ec95b58c81435399f1ae39b2c0f421dba9533ad))

## [4.2.0](https://github.com/GMOD/JBrowseMSA/compare/v4.1.1...v4.2.0) (2025-05-23)

### Other Changes

- Misc ([121f562](https://github.com/GMOD/JBrowseMSA/commit/121f5623b538fef7ac6a651d015e2a1e0c51c066))
- Bumps ([bca18b3](https://github.com/GMOD/JBrowseMSA/commit/bca18b302ce2d0a6e38f8be369b56b43cdcf85e0))
- Refactors ([ffb0957](https://github.com/GMOD/JBrowseMSA/commit/ffb09572bfa196a658e33c5776df88adcda47485))
- Lint ([b46f465](https://github.com/GMOD/JBrowseMSA/commit/b46f46510d1f56712652509ef482f3f2089095f2))
- Rename 'Show entire view' to 'Fit to view' ([53fb565](https://github.com/GMOD/JBrowseMSA/commit/53fb565e4e0a646523cdbde6ed57e9d2b1982a73))
- Show zoom star ([d9bac41](https://github.com/GMOD/JBrowseMSA/commit/d9bac41af64c5ab7802e63dada21e120e5616820))
- Styles on zoom star ([3fa162d](https://github.com/GMOD/JBrowseMSA/commit/3fa162d7a63c640ec6e289cb0829c85587e6f15d))
- Centralize key ([e9348c5](https://github.com/GMOD/JBrowseMSA/commit/e9348c502bb52a8851d90abdeba409d804cb1693))
- Add parseAsn1 ([8fb8a47](https://github.com/GMOD/JBrowseMSA/commit/8fb8a4772e2f025fe19ec9c16ac06cf9b8a744f0))
- Check 0 len tree ([0c47755](https://github.com/GMOD/JBrowseMSA/commit/0c47755b912e8bf3f89d4a3987862c2d7bab4e6b))
- Fix lint ([986d533](https://github.com/GMOD/JBrowseMSA/commit/986d5337cfb4965ee06e5b56838b437f34648d6a))

## [4.1.1](https://github.com/GMOD/JBrowseMSA/compare/v4.1.0...v4.1.1) (2025-05-19)

### Other Changes

- Add postcss ([3bf5401](https://github.com/GMOD/JBrowseMSA/commit/3bf54014ade55c96e6e6d495643569b8f66351a3))
- Misc ([fdeda0c](https://github.com/GMOD/JBrowseMSA/commit/fdeda0c60911ad0f7813e8389d39d401e33a1126))
- Fix high res scaling for retina ([fd80971](https://github.com/GMOD/JBrowseMSA/commit/fd80971677d0ec37e5ea84d3a8f0e3fb748b5adb))
- Fix lint ([eae4f22](https://github.com/GMOD/JBrowseMSA/commit/eae4f2294dcbc5581486e366cb0696754d818b40))

## [4.1.0](https://github.com/GMOD/JBrowseMSA/compare/v4.0.3...v4.1.0) (2025-05-03)

### Other Changes

- React 19 ([b166456](https://github.com/GMOD/JBrowseMSA/commit/b16645622c6b8c4f19192156eeded0cae2a0c400))
- Bump deps ([b0d4fb5](https://github.com/GMOD/JBrowseMSA/commit/b0d4fb5079ecd29d5527706c483823ae3e057e3f))
- Bump deps ([a7483f5](https://github.com/GMOD/JBrowseMSA/commit/a7483f52ec6010736f9052aa30e99e475a2b126b))
- Updates ([a0ef132](https://github.com/GMOD/JBrowseMSA/commit/a0ef13292755d1ab4cabf111f45a09a775384e93))
- Bump deps ([0516c86](https://github.com/GMOD/JBrowseMSA/commit/0516c8613b19e0de1239b933167c2c2999c59bba))
- Update user_guide.md ([b1cc587](https://github.com/GMOD/JBrowseMSA/commit/b1cc5872c0127728fac19d8fafbc48cf0534f5f3))
- Update material 6->7 ([2578100](https://github.com/GMOD/JBrowseMSA/commit/2578100f8f1b14215d7a269abf2044d0833684bf))
- Lint fixes ([6bda054](https://github.com/GMOD/JBrowseMSA/commit/6bda054d0d14ba5bc6053ed3237a4fbd3a02e190))
- No dep on x-data-grid ([7f09e7c](https://github.com/GMOD/JBrowseMSA/commit/7f09e7c95b9f2db1c9559a8c516fc53be20c70ce))
- Rm grid item ([05de495](https://github.com/GMOD/JBrowseMSA/commit/05de495b973207e7a7c36506ed067430c9e18f8a))
- Rm locals ([0616b09](https://github.com/GMOD/JBrowseMSA/commit/0616b094b9ccb3b7512af676d2b0e5efdb187758))
- Deps ([0fb8732](https://github.com/GMOD/JBrowseMSA/commit/0fb8732ae4c6941bb028ec22d98b6b091de8ef05))
- No need for tsx ([8111d75](https://github.com/GMOD/JBrowseMSA/commit/8111d758276ddebcce5ec9bf32371514871708b3))
- Import form formatting ([08f2780](https://github.com/GMOD/JBrowseMSA/commit/08f278098c7a48b4592d28dba0b79d1a928601c4))
- Add postcss rollup ([8905ed5](https://github.com/GMOD/JBrowseMSA/commit/8905ed57608f2d57653de8ebe26cb6bd2fffc260))

## [4.0.3](https://github.com/GMOD/JBrowseMSA/compare/v4.0.2...v4.0.3) (2024-11-04)

### Other Changes

- Bump to rerun ci ([56887bb](https://github.com/GMOD/JBrowseMSA/commit/56887bb518e16655c2122c854afb1c4fa0091363))
- Fix lint ([c38308f](https://github.com/GMOD/JBrowseMSA/commit/c38308f1c60c23df5e96e38a0fcffea3a319aa4f))
- Bump deps ([b71c4a6](https://github.com/GMOD/JBrowseMSA/commit/b71c4a6b14d593f2b9ee56ef6afecd9a10fb59f8))
- Misc ([3ab8c07](https://github.com/GMOD/JBrowseMSA/commit/3ab8c07c745ad85de4bee5825daedbf16a51474c))

## [4.0.2](https://github.com/GMOD/JBrowseMSA/compare/v4.0.1...v4.0.2) (2024-09-16)

### Other Changes

- Add jbrowse_dna ([8257368](https://github.com/GMOD/JBrowseMSA/commit/825736806c29825955294e24acf552a33729acbe))

## [4.0.1](https://github.com/GMOD/JBrowseMSA/compare/v4.0.0...v4.0.1) (2024-09-16)

### Other Changes

- Rm ([1697548](https://github.com/GMOD/JBrowseMSA/commit/1697548147221f8c3af13b17b5cbcc5441511f71))
- Remove errant eslint deps ([eee5ce1](https://github.com/GMOD/JBrowseMSA/commit/eee5ce18491f75fd151d22623a48e9f00221d2f7))
- Misc ([96e7fce](https://github.com/GMOD/JBrowseMSA/commit/96e7fce8feaaf080be919cbd6d7a83713021e6da))

## [4.0.0](https://github.com/GMOD/JBrowseMSA/compare/v3.2.2...v4.0.0) (2024-09-06)

### Other Changes

- Remove treefam app from repo ([cecb3b0](https://github.com/GMOD/JBrowseMSA/commit/cecb3b0e26550e3559a5dd47d020e1cc0cc33992))

## [3.2.2](https://github.com/GMOD/JBrowseMSA/compare/v3.2.1...v3.2.2) (2024-08-31)

### Other Changes

- Create example app of loading data from Ensembl and TreeFam (#83) ([0b526ba](https://github.com/GMOD/JBrowseMSA/commit/0b526baf4faee71e1ada55e190bacd843590b4c9))
- Misc ([e8ccf18](https://github.com/GMOD/JBrowseMSA/commit/e8ccf18d346c320a813585f252f268926396b775))

## [3.2.1](https://github.com/GMOD/JBrowseMSA/compare/v3.2.0...v3.2.1) (2024-08-19)

### Other Changes

- Add tsx ([82710bb](https://github.com/GMOD/JBrowseMSA/commit/82710bb3acd12a50eeaacae743d1a0a0932d078d))
- Misc ([d827168](https://github.com/GMOD/JBrowseMSA/commit/d8271689d7e0d3ca2da235aa8e06679c3c8f0115))
- Linting ([165fe55](https://github.com/GMOD/JBrowseMSA/commit/165fe551b62562ab1ffee07142099c7516a2a5e3))
- Turning off setting applied ([526ba53](https://github.com/GMOD/JBrowseMSA/commit/526ba53dda06292784b63be0d4f1c37e17dc45ce))
- Misc ([8aab1d1](https://github.com/GMOD/JBrowseMSA/commit/8aab1d18094fbcfbe6ca994f6341393565dd9edf))
- Fixed calculations ([3dcd7e1](https://github.com/GMOD/JBrowseMSA/commit/3dcd7e1b4ce78bf2e8309b4023282728c7a74a8d))
- Fixed coordinate calculations, and display currently hovered letter in header bar ([cbe99b5](https://github.com/GMOD/JBrowseMSA/commit/cbe99b5e13176749a05197fd02f356df655074c1))
- Fix tsc ([bf1de37](https://github.com/GMOD/JBrowseMSA/commit/bf1de371bd81148ad0037b2733bf76695ecf4025))
- Updates ([0ff2559](https://github.com/GMOD/JBrowseMSA/commit/0ff25596d0e11bd15dcb8a4d7d1b2063fa67bad5))

## [3.2.0](https://github.com/GMOD/JBrowseMSA/compare/v3.1.12...v3.2.0) (2024-08-09)

### Other Changes

- Add vertical scroll bar, "none" color scheme, hide minimap when viewing small MSA, and other misc (#78) ([ccd2ffa](https://github.com/GMOD/JBrowseMSA/commit/ccd2ffaed214b7221b69cc107351813c0854f3c2))
- Fix rendering of the leaf node, fixes #71 ([b1309a5](https://github.com/GMOD/JBrowseMSA/commit/b1309a5d3c4a34deb228bfa1b3b3c919e24683ed))
- Revert "Fix rendering of the leaf node, fixes #71" ([9f1e71d](https://github.com/GMOD/JBrowseMSA/commit/9f1e71d6081e651c2dd0a905bdd420b95533c6dc))
- Refactor approach for issue #71 ([01b2ff4](https://github.com/GMOD/JBrowseMSA/commit/01b2ff4d7b89f9f4cda37d0ef40cf1ae0656db01))
- Additional improvements to show branch length, and domains ([a19f00b](https://github.com/GMOD/JBrowseMSA/commit/a19f00b431bf8577e70bce740bf6e96c9399df6b))
- Disable domain menu items if unavailable ([af9d380](https://github.com/GMOD/JBrowseMSA/commit/af9d380f771f0192132527d69c5460acca30aad2))
- Move zoom reset button ([c40da75](https://github.com/GMOD/JBrowseMSA/commit/c40da75fc3e0b4ac1ead996e67f7dd6891f30290))
- Add optimizations to the canvas rendering (#80) ([c688964](https://github.com/GMOD/JBrowseMSA/commit/c688964d4d938a1ad046bb492b32da6390d21288))
- Add optimizations to the canvas rendering (#80) ([6210cd7](https://github.com/GMOD/JBrowseMSA/commit/6210cd7670a6f2179a254498139502e1bdf0defe))
- Allow user to configure amount of allowed "gappyness" (#81) ([319b25d](https://github.com/GMOD/JBrowseMSA/commit/319b25dce8acb1334bb917331d5dd647aba6f1de))

## [3.1.12](https://github.com/GMOD/JBrowseMSA/compare/v3.1.11...v3.1.12) (2024-07-16)

### Other Changes

- Modularize ([26ce119](https://github.com/GMOD/JBrowseMSA/commit/26ce119516f11f82dfdb764c95624a7ed7f83d98))
- Renames ([abcf83e](https://github.com/GMOD/JBrowseMSA/commit/abcf83ed1d9fbde78c41864c515db395b1a927e8))
- Better status ([cf86a52](https://github.com/GMOD/JBrowseMSA/commit/cf86a52859e1f9621bcbc9becebb496f7358e542))
- Swatch ([51bf5df](https://github.com/GMOD/JBrowseMSA/commit/51bf5df5fcec6cd4effb1f46d683113191a77517))
- Consolidate menu ([33ac0e2](https://github.com/GMOD/JBrowseMSA/commit/33ac0e277f5fd8b6f65f3be6b0b073279f3a321a))
- Consolidate menu ([969a008](https://github.com/GMOD/JBrowseMSA/commit/969a0084fb799d850ebcc735e90cb54defbed059))
- Consolidate menu ([da3e00e](https://github.com/GMOD/JBrowseMSA/commit/da3e00e34884ddd7d0507bed81de703894a896fd))
- Bump deps ([d62deb5](https://github.com/GMOD/JBrowseMSA/commit/d62deb5ada2bb05e25cb33a821e6a744fc5b3f4c))

## [3.1.11](https://github.com/GMOD/JBrowseMSA/compare/v3.1.10...v3.1.11) (2024-07-09)

### Other Changes

- Bump deps ([0e41c14](https://github.com/GMOD/JBrowseMSA/commit/0e41c14f6ac69132bf07e0a430f0477c93c3922e))
- Remove jest ([f7d0d0b](https://github.com/GMOD/JBrowseMSA/commit/f7d0d0b8ff501e077f562bc86ef3e568c102c21b))
- Couple unused lint ([6001dae](https://github.com/GMOD/JBrowseMSA/commit/6001dae49c43d4b4ecc59dbaab4972eeb93caad3))
- Couple unused lint ([8bb4ae5](https://github.com/GMOD/JBrowseMSA/commit/8bb4ae5fdfb40e1538ee4287e5bcaf5648758a01))
- Add word-wrap:break-word ([fa4755c](https://github.com/GMOD/JBrowseMSA/commit/fa4755cbf3d956e400078630f51e44391be0684b))

## [3.1.10](https://github.com/GMOD/JBrowseMSA/compare/v3.1.9...v3.1.10) (2024-04-18)

### Other Changes

- Export Accession type ([053f8f0](https://github.com/GMOD/JBrowseMSA/commit/053f8f09bdf47031d4cf3cb33bb95d7574e4fd8f))

## [3.1.9](https://github.com/GMOD/JBrowseMSA/compare/v3.1.8...v3.1.9) (2024-04-18)

### Other Changes

- Unneeded deps ([0f0149a](https://github.com/GMOD/JBrowseMSA/commit/0f0149a8bd61252307687e12119f70610cece95c))

## [3.1.8](https://github.com/GMOD/JBrowseMSA/compare/v3.1.7...v3.1.8) (2024-04-18)

### Other Changes

- Wow ([b26a85a](https://github.com/GMOD/JBrowseMSA/commit/b26a85a183a880dd5df34c8521e47b2adec8000a))
- Add sequence to treenodeinfodialog ([406c04b](https://github.com/GMOD/JBrowseMSA/commit/406c04b4f7d133bd2dc9b46d805b96a9e8d36132))
- Add test suite ([0944be1](https://github.com/GMOD/JBrowseMSA/commit/0944be19b9a1be8add8954c4083d9f4f23b7df31))
- Starter kit ([adc0be3](https://github.com/GMOD/JBrowseMSA/commit/adc0be3319de991bc6d4fe9ca7422408baaf2d85))
- Rename some files ([63ce057](https://github.com/GMOD/JBrowseMSA/commit/63ce057de9dece97a2785e7563ed000e227edb89))
- Refactor ([e4c689c](https://github.com/GMOD/JBrowseMSA/commit/e4c689cf1c9eafd23bb5719345ed60ffe9ff2e36))
- Fix drawing labels on MSA only views ([476be74](https://github.com/GMOD/JBrowseMSA/commit/476be74e11dbb3ef71f97f70f357d5fa85031d2a))
- Fix drawing labels on MSA only views ([44510d7](https://github.com/GMOD/JBrowseMSA/commit/44510d7a112e7c942cbaccf49904d80a986ab131))
- Small amount of modularizing ([99d4d04](https://github.com/GMOD/JBrowseMSA/commit/99d4d045ddaf7a597455dbe1ba9d001375f7875c))
- Refactoring ([1cba077](https://github.com/GMOD/JBrowseMSA/commit/1cba07728cfb67b63876fb42bc839962c88a961b))
- Features ([9deb8bc](https://github.com/GMOD/JBrowseMSA/commit/9deb8bc340604ca24fd5db41dc538077f7a00c47))
- Updates ([266126b](https://github.com/GMOD/JBrowseMSA/commit/266126b23552419cf5d025254f909775fa0a42d7))
- Misc ([31e159b](https://github.com/GMOD/JBrowseMSA/commit/31e159b3f399407ce1c26b86a89852114def3778))
- Remove box track concept, it will now be changed to a per row thing ([22df092](https://github.com/GMOD/JBrowseMSA/commit/22df09285c43a186cc22a494c4c5cdffa1976310))
- Misc ([f459f86](https://github.com/GMOD/JBrowseMSA/commit/f459f86159ad1d325d9850af0b78109186d541ea))
- Remove unused ([83478ab](https://github.com/GMOD/JBrowseMSA/commit/83478ab071fd2b9f3861cfe6fc32fb7270164c8a))
- Unused ([eff1d36](https://github.com/GMOD/JBrowseMSA/commit/eff1d36a2331e1a81cb80707a331bbc74efa2d28))
- Render sequence in metadata ([71266bc](https://github.com/GMOD/JBrowseMSA/commit/71266bc5a8c68f17e1e80381ec6367e5634a4f36))
- Copy sequences ([1b1c767](https://github.com/GMOD/JBrowseMSA/commit/1b1c767b6c397d432a2c6a5e5c55c95aab66ae7c))
- Move files around ([aba5847](https://github.com/GMOD/JBrowseMSA/commit/aba584739245f2d3f7346385147b290a75a77016))
- Misc ([c63a4e9](https://github.com/GMOD/JBrowseMSA/commit/c63a4e9e4c265de671a1ee30e82e420247ebaea7))
- Misc ([99bed6c](https://github.com/GMOD/JBrowseMSA/commit/99bed6c40308d7fa247807957b48969480a88a14))
- Lint ([cc7a6c2](https://github.com/GMOD/JBrowseMSA/commit/cc7a6c2964b77f539f82c2b4a54038be9d666742))
- Lint ([c1a9a44](https://github.com/GMOD/JBrowseMSA/commit/c1a9a44699b076bc6a642b1995da3399e39a8dd0))
- Better ability to clear state ([cb790f4](https://github.com/GMOD/JBrowseMSA/commit/cb790f47deed64f0daec2d537a6f9e30c9bc2942))
- Better ability to clear state. Fixes #70 ([a53781a](https://github.com/GMOD/JBrowseMSA/commit/a53781ab4ac7319fbcd82fbf2c070cb12562fe9a))
- Clean up ([3372525](https://github.com/GMOD/JBrowseMSA/commit/33725252cb30d0c0b3341af1b8c17adae78e6f0e))
- Fix links ([f2d8412](https://github.com/GMOD/JBrowseMSA/commit/f2d8412b83586411de3a00319b7571332b6fc9a9))
- Remove console logs ([b426df0](https://github.com/GMOD/JBrowseMSA/commit/b426df08876310ab5b4d831241376e7d85badf16))
- Tidy annotations ([02ba1e7](https://github.com/GMOD/JBrowseMSA/commit/02ba1e7dcac3f984adba6e702f3a365e5768efec))
- Add feature output to svg ([5ed37d6](https://github.com/GMOD/JBrowseMSA/commit/5ed37d606f1ab06b94828aa8cba3e57db680660a))
- Add error message to the errorboundary ([57d36e5](https://github.com/GMOD/JBrowseMSA/commit/57d36e52695e3a160da2d11a9e9fcc82a83bea5d))
- Catch errors in importform ([2854bca](https://github.com/GMOD/JBrowseMSA/commit/2854bca19361bc0c837ce504c2241b06128ae666))
- Add zoom actions ([158fef8](https://github.com/GMOD/JBrowseMSA/commit/158fef82086727d46d21146c4b3dc7e8919e0f72))
- Update docs ([b7bc66c](https://github.com/GMOD/JBrowseMSA/commit/b7bc66c35d3d81692d797762004fc088b5f5a4f5))
- Use black instead of undefined for no palette ([a250fae](https://github.com/GMOD/JBrowseMSA/commit/a250fae04722ca68e4ad442cb3bf9171077c5f72))
- Bump deps ([2bee594](https://github.com/GMOD/JBrowseMSA/commit/2bee5948ed893c11281ed16db8405796537ece4e))

## [3.1.7](https://github.com/GMOD/JBrowseMSA/compare/v3.1.6...v3.1.7) (2024-02-28)

### Other Changes

- Add typos check ([a6fbab1](https://github.com/GMOD/JBrowseMSA/commit/a6fbab1104dd6f58bc76b72980b3564b8045a6ac))
- Fix observability on settings ([d9c96d5](https://github.com/GMOD/JBrowseMSA/commit/d9c96d5a7939ce3cfa5ea390d83c4ce76c5349e3))

## [3.1.6](https://github.com/GMOD/JBrowseMSA/compare/v3.1.5...v3.1.6) (2024-02-27)

### Other Changes

- Add datamodel docs ([6cc9795](https://github.com/GMOD/JBrowseMSA/commit/6cc9795bb2533dda6818e41567bdcf2e78cbfd2d))
- Update lint ([6275bf5](https://github.com/GMOD/JBrowseMSA/commit/6275bf5f89fa1df4b7b53a720647ff88901091b2))
- Modularize selected structures ([e1ccc3f](https://github.com/GMOD/JBrowseMSA/commit/e1ccc3f80861f6511a5cbba34624e80c6a529ee5))
- Lazily export svg ([12636b2](https://github.com/GMOD/JBrowseMSA/commit/12636b26e44dd0985456cd07b52865a000cc0fc6))
- Allow hiding leaf node (#68) ([972091d](https://github.com/GMOD/JBrowseMSA/commit/972091da0b3a0d04e37798a13714660270e56450))
- Add click action ([3fa92ed](https://github.com/GMOD/JBrowseMSA/commit/3fa92ed1cc8ebdcd7dc26a68c7a0982c842df6f6))
- Remove the margin when alignRight ([3b16f4f](https://github.com/GMOD/JBrowseMSA/commit/3b16f4f47db5b84fbf567242dfa83b0a08b5e506))
- Unused dep ([34e98f6](https://github.com/GMOD/JBrowseMSA/commit/34e98f67c4fa6952f516ff83d44b63ee7a7cb800))

## [3.1.5](https://github.com/GMOD/JBrowseMSA/compare/v3.1.4...v3.1.5) (2024-02-24)

### Other Changes

- Restore manual margin calculations for canvas left-side calculations ([dc0ca00](https://github.com/GMOD/JBrowseMSA/commit/dc0ca0004fd989a97cdf2f6b912f96ddfd3efa48))
- Update deps ([66bdead](https://github.com/GMOD/JBrowseMSA/commit/66bdead30369f486e3b3dbdfdd9cde0b7cdc0529))
- Fix lint ([03ddc29](https://github.com/GMOD/JBrowseMSA/commit/03ddc29b9d30396e0325f33eec00c974d61ae613))
- Remove clustal 'track' ([ed6f5ca](https://github.com/GMOD/JBrowseMSA/commit/ed6f5ca60ab2253b4b4365824e843bdd7b4f0e12))

## [3.1.4](https://github.com/GMOD/JBrowseMSA/compare/v3.1.3...v3.1.4) (2024-02-23)

### Other Changes

- Less transpiling ([6e68e7c](https://github.com/GMOD/JBrowseMSA/commit/6e68e7cafd37dd08ab1e70ee99ebef1f367eb77a))
- Console.error ([fccc49f](https://github.com/GMOD/JBrowseMSA/commit/fccc49f8d599e5511d9494857a02079bef76893f))
- Better theme support for dark mode ([853af90](https://github.com/GMOD/JBrowseMSA/commit/853af901a9d64fb5a43ac8071bd617d67b341853))
- Updates ([da1be4d](https://github.com/GMOD/JBrowseMSA/commit/da1be4d11f5462b37bc6c7e733538d88b5773ac7))
- Measure text using canvas ([9693a08](https://github.com/GMOD/JBrowseMSA/commit/9693a08276064aa2d46e5e61d3d869d243bdf115))
- Mouse offset ([df64169](https://github.com/GMOD/JBrowseMSA/commit/df641699108bebeb8e4a69eadc0183a737ab5275))
- Remove unused dep ([52adbd1](https://github.com/GMOD/JBrowseMSA/commit/52adbd12d8760d6668224f552f992d12b254ad40))
- Fix mouseovers ([4bfef43](https://github.com/GMOD/JBrowseMSA/commit/4bfef43b59a8c34e7bbb8230c48ad5c85b26651a))
- Make loading the main component ([9b102dd](https://github.com/GMOD/JBrowseMSA/commit/9b102ddadb7092c7195c62309dce7f9a116c666a))

## v3.1.3

- Add ability to export entire MSA to SVG

## v3.1.2

- Workaround rollup minification bug with canvas tree resizing disappearing

## v3.1.1

- Add minimap to Export SVG header
- Improve block calculations

## v3.1.0

- Add Export SVG function

## v3.0.3

- Fix tree drawing

## v3.0.2

- Bump clustal-js

## v3.0.1

- New settings dialog layout

## v3.0.0

- Removed coordinate system from the header bar, instead uses a slider bar to
  indicate coordinates

## v2.1.4

- Remove type:module as it caused issues in esbuild

## v2.1.3

- Add concept of treeMetadata, for mapping species names to display labels

## v2.1.2

- Add auto-generated API docs
- Convert to postProcessSnapshot, as snapshotProcessor was producing typescript
  errors

## v2.1.1

- Convert to colord for smaller bundle

## v2.1.0

- Use proper typescript types from ngl (currently had a ts-nocheck on
  ProteinPanel)
- Fix crash when changing MSA models with a protein panel still open in the app
- Add zoom in and out buttons
- Add horizontal mouse over
- Fix uniprot track by stripping version number

## v2.0.0

Bump deps to e.g. MUIv5

## v1.3.2

- Fix error clicking msa sources that don't define getRowDetails

## v1.3.1

- Avoid a console.error undefined

## v1.3.0

- Add ability to use a UMD bundle

## v1.2.11

- Make links use event.preventDefault()

## v1.2.10

- Remove dependency on @gmod/gff to avoid need to polyfill nodejs streams

## v1.2.9

- Use react instead of react-jsx transform

## v1.2.8

- Remove obsolete module field from react-msaview

## v1.2.7

- Add bugfix for data while loading

## v1.2.6

- Fix collapsing of annotations
- Fix mouseover of protein panel highlighting the right bases in MSA panel
- Add clustalX dynamic coloring scheme
- Add percent identity dynamic coloring scheme

## v1.2.5

- Make the mouseover cross annotation tracks
- Allow click and drag on ruler to create basic annotations

## v1.2.4

- Fix inability to close tracks due to some confusion about model IDs

## v1.2.3

- Add "Get info" about tracks
- Fix coordinate shifting on collapsed nodes with box tracks using bpToPx

## v1.2.2

- Improve the clickmap for tree nodes
- Create template for adding annotation tracks, including feature-style glyphs
  from genome browsers
- Fix colormap for secondary structure tracks from stockholm files
- Add ability to download tracks from uniprot

## v1.2.1

- Fix blocks not displaying properly in the v1.2.0 release

## v1.2.0

- Add ability to integrate with a 3D viewer based on "selecting" a structure
- Add easy ability to copy a node name from the tree to the clipboard
- Add demo integration with the NGL (https://nglviewer.github.io/) library in
  the app folder
- Add click and drag scrolling behavior

## v1.1.2

- Fix scrolling of area width

## v1.1.1

- Add drag handle
- Add basic ruler

## v1.1.0

- Botched release process, please ignore

## v1.0.15

- Remove some console logs

## v1.0.14

- Rename to react-msaview, split out from jbrowse plugin

## v1.0.13

- Fix nodes with the same score being collapsed together (#21)

## v1.0.12

- Avoid scrolling too far right

## v1.0.11

- Add version number from package.json to about panel

## v1.0.10

- Fix scrolling for large MSA that loads after tree

## v1.0.9

- Fix for MSA loading bar when tree only is displayed

## v1.0.8

- Fix for side scrolling half rendered letters in MSA
- drawNodeBubbles option

## v1.0.7

- Move npm run build script to prepare script in package.jsom

## v1.0.6

- Use postversion to run build so that the accurate version is encoded into the
  release binary

## v1.0.5

- Add prebuild clean

## v1.0.4

- Fix running build before release

## v1.0.3

- Re-release

## v1.0.2

- Ensure clean build with prebuild rm -rf dist

## v1.0.1

- Fix for making demo config on unpkg

## v1.0.0

### Features

- Vertical virtualized scrolling of phylogenetic tree
- Vertical and horizontal virtualized scrolling of multiple sequence alignment
  as a newick tree embedded in stockholm metadata
- View metadata about alignment from MSA headers (e.g. stockholm)
- Collapse subtrees with click action on branches
- The collapse subtree action hides gaps that were introduced by that subtree in
  the rest of the alignment
- Allows "zooming out" by setting tiny rowHeight/colWidth settings
- Allows changing color schemes, with jalview, clustal, and other color schemes
- Allows toggling the branch length rendering for the phylogenetic tree
- Can share sessions with other users which will send relevant settings and
  links to files to automatically open your results
- The tree or the MSA panel can be loaded separately from each other

### File format supports

- FASTA formatted for MSA (e.g. gaps already inserted)
- Stockholm files (e.g. .stock file, with or without embedded newick tree, uses
  stockholm-js parser. also supports "multi-stockholm" files with multiple
  alignments embedded in a single file)
- Clustal files (e.g. .aln file, uses clustal-js parser)
- Newick (tree can be loaded separately as a .nh file)
