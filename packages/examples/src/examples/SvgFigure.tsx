import { useState } from 'react'

import Typography from '@mui/material/Typography'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView, useMsaSvgFigure } from 'react-msaview'

import { p53MSA, p53Tree } from './data'
import useWidthSetter from './useWidthSetter'

// The live viewer on top, and below it an SVG figure of whatever the viewer
// shows. useMsaSvgFigure runs the viewer's own SVG export after each scroll or
// zoom settles and returns the markup.
//
// The figure is part of the page. Its row names and letters are text, so the
// browser's find locates "Zebrafish" in it, a reader can select a run of
// residues and paste it, and a print stylesheet applies to it. The figure
// redraws a few thousand nodes on each settle, so the canvas above is the view
// to pan with.
const SvgFigure = observer(function SvgFigure() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 300,
      colWidth: 14,
      rowHeight: 16,
      colorSchemeName: 'clustalx_protein_dynamic',
      relativeTo: 'Human',
      scrollX: -236 * 14,
      highlights: [
        { row: 'Human', start: 248, end: 248, label: 'R248' },
        { row: 'Human', start: 273, end: 273, label: 'R273' },
      ],
      data: { msa: p53MSA, tree: p53Tree },
    }),
  )
  const ref = useWidthSetter(model)
  const { svg, error } = useMsaSvgFigure(model)
  return (
    <div ref={ref}>
      <MSAView model={model} />
      <Typography variant="body2" sx={{ my: 1 }}>
        {error
          ? `The figure failed to draw: ${String(error)}`
          : 'SVG figure of the view above. Scroll or zoom the viewer and it redraws.'}
      </Typography>
      {svg ? (
        <div
          style={{ overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}
    </div>
  )
})

export default SvgFigure
