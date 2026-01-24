# Usage

## Using react-msaview NPM package as a React component

Install react-msaview and its peer dependencies:

```sh
npm install react-msaview @jbrowse/core @mui/material react react-dom @emotion/styled @emotion/react
```

## Using the react-msaview NPM component with inline data

```typescript
import { MSAView, MSAModelF } from 'react-msaview';

export default function App() {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: {
      msa: 'string containing stockholm, clustalw, or multi-fasta msa here',
      tree: 'string containing newick formatted tree here',
    },
  });

  // choose MSA width, calculate width of div/rendering area if needed beforehand
  model.setWidth(1800);

  return (
    <div style={{ border: '1px solid black', margin: 20 }}>
      <MSAView model={model} />
    </div>
  );
}
```

Example StackBlitz:
https://stackblitz.com/edit/vitejs-vite-qb9v874k?file=src%2FApp.tsx

## Using the react-msaview NPM component with remote files

```typescript
import { MSAView, MSAModelF } from 'react-msaview';

export default function App() {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: {
      msa: 'https://jbrowse.org/genomes/multiple_sequence_alignments/pfam-cov2.stock',
      locationType: 'UriLocation',
    },
  });

  // choose MSA width, calculate width of div/rendering area if needed beforehand
  model.setWidth(1800);

  return (
    <div style={{ border: '1px solid black', margin: 20 }}>
      <MSAView model={model} />
    </div>
  );
}
```

## Using react-msaview in a plain HTML file with UMD bundle

```html
<html>
  <head>
    <script
      crossorigin
      src="https://unpkg.com/react-msaview/bundle/index.js"
    ></script>
  </head>
  <body>
    <div id="root" />
    <script>
      const { React, createRoot, MSAView, MSAModelF } = window.ReactMSAView
      const model = MSAModelF().create({
        type: 'MsaView',
        msaFilehandle: { uri: 'http://path/to/msa.stock' },
        treeFilehandle: { uri: 'http://path/to/tree.nh' },
      })

      // choose MSA width, calculate width of div/rendering area if needed beforehand
      model.setWidth(1800)
      const root = createRoot(document.getElementById('root'))
      root.render(React.createElement(MSAView, { model }))
    </script>
  </body>
</html>
```

## Using react-msaview with ESM CDN (esm.sh)

See [example/esm-cdn.html](example/esm-cdn.html) for a complete example using
native ES modules with esm.sh.

```html
<script type="module">
  import React from 'https://esm.sh/react@19'
  import { createRoot } from 'https://esm.sh/react-dom@19/client'
  const { MSAView, MSAModelF } =
    await import('https://esm.sh/react-msaview@5?bundle')

  const model = MSAModelF().create()
  model.setWidth(window.innerWidth)
  model.setMSA({
    msa: '>seq1\nACGT\n>seq2\nACGT',
    msaFilehandle: { uri: 'example.fa' },
  })

  createRoot(document.getElementById('root')).render(
    React.createElement(MSAView, { model }),
  )
</script>
```

## API

See here for complete auto-generated API docs for the MSA view model:
https://github.com/GMOD/react-msaview/blob/main/packages/lib/apidocs/MsaView.md

You can also look at `packages/lib/src/model.ts` for the full model source code.

The React-MSAView package uses this 'model' extensively, instead of a 'prop'
based API.

It is helpful to be knowledgeable of the way mobx+react interoperate: you can
write components that "observe" (by wrapping a component with the mobx-react
observe function) the state of the model using React and
@jbrowse/mobx-state-tree.

For example, if you wanted to know what base the user was hovering over. You can
get an intro to basic React and @jbrowse/mobx-state-tree + observer concepts in
this short tutorial, and the concepts will apply to this codebase as well:
https://gist.github.com/cmdcolin/94d1cbc285e6319cc3af4b9a8556f03f
