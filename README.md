# react-msaview (JBrowseMSA)

A multiple sequence alignment viewer, also known as JBrowseMSA.

## Docs

See [user guide](docs/user_guide.md)

## Demo

See [ProteinBrowser](https://github.com/GMOD/proteinbrowser) for a full suite of
protein analysis tools.

## Packages

- [lib](lib/) - Main react-msaview React component
- [app](app/) - Demo application (deployed at https://gmod.org/JBrowseMSA)
- [cli](cli/) - Command-line tools (InterProScan batch processing)
- [msa-parsers](msa-parsers/) - MSA file format parsers

## Developers

```bash
git clone https://github.com/GMOD/react-msaview
cd react-msaview
```

```bash
# Start lib watcher in one terminal
cd lib && yarn tsc --watch

# Start app in another terminal
cd app && yarn dev
```

## Programmatic usage, embedding, downloading from NPM

To install as a NPM package or CDN style bundle, see [USAGE.md](USAGE.md)

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a jbrowse 2 plugin for viewing MSAs

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react)
