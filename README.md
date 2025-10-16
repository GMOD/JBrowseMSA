# react-msaview

A multiple sequence alignment viewer

## Docs

See [user guide](docs/user_guide.md)

## Demo

See http://gmod.org/JBrowseMSA/

This page is a deployment of the `app` directory in this repo, which uses the
`react-msaview` NPM package, and additionally adds the 3-D structure viewer

## Developers

The lib folder contains the NPM package, and the `app` folder contains an
example usage with additional wiring to use with a 3-D protein structure viewer

```bash
git clone https://github.com/GMOD/react-msaview
cd react-msaview
```

In one window, start a watcher for the library

```bash
cd lib
yarn tsc --watch
```

In another window, start the app

```bash
cd app
yarn dev
```

## Programmatic usage, embedding, downloading from NPM

To install as a NPM package or CDN style bundle, see [USAGE.md](USAGE.md)

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a jbrowse 2 plugin for viewing MSAs

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react)
