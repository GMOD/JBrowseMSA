import { expect, test } from 'vitest'

import { MSAModelF } from './index.ts'

const stockholm = `# STOCKHOLM 1.0
#=GC SS_cons <<..>>
#=GC RF      xxxxxx
#=GR a SS    <<..>>
a  ACGTAC
b  ACGTAC
//
`

test('a Stockholm #=GC track shows, a #=GR track waits to be asked for', () => {
  const model = MSAModelF().create({
    id: 'x',
    type: 'MsaView',
    data: { msa: stockholm },
  })
  const ids = model.tracks.map(t => t.model.id)
  expect(ids).toContain('gc-RF')
  expect(ids).toContain('gr-a-SS')
  const on = model.turnedOnTracks.map(t => t.model.id)
  expect(on).toContain('gc-RF')
  expect(on).not.toContain('gr-a-SS')
  model.toggleTrack('gr-a-SS')
  expect(model.turnedOnTracks.map(t => t.model.id)).toContain('gr-a-SS')
  model.toggleTrack('gr-a-SS')
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain('gr-a-SS')
})
