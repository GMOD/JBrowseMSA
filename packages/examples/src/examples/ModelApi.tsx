import { useState } from 'react'

import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// For full control over viewer state, create the model yourself with MSAModelF
// and render it with MSAView. This is what MSAViewer does internally, but here
// you hold the model instance and can read/write any of its properties.
const ModelApi = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 550,
      colWidth: 16,
      rowHeight: 20,
      data: {
        msa: proteinMSA,
        tree: proteinTree,
      },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div ref={ref}>
      <MSAView model={model} />
    </div>
  )
})

export default ModelApi
