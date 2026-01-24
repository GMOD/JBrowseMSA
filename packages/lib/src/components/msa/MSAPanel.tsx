import React from 'react'

import { observer } from 'mobx-react'

import MSACanvas from './MSACanvas.tsx'
import MSAMouseoverCanvas from './MSAMouseoverCanvas.tsx'

// types
import type { MsaViewModel } from '../../model.ts'

const MSAPanel = observer(function ({ model }: { model: MsaViewModel }) {
  return (
    <div style={{ position: 'relative' }}>
      <MSACanvas model={model} />
      <MSAMouseoverCanvas model={model} />
    </div>
  )
})

export default MSAPanel
