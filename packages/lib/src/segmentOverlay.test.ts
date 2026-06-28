// Verifies that ordinal segment features (exons) from a GFF overlay are treated
// as a numbered gene model — alternating two shades, labeled by number, and
// kept out of the categorical color-key legend — while real domains keep a
// distinct color + legend entry.
import { expect, test } from 'vitest'

import { segmentShades } from './constants.ts'
import MSAModelF from './model.ts'

const msa = `>human
ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY
>mouse
ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY`

// three exons in CDS coordinates plus one real domain, deliberately out of
// start order in the file to prove ordering is by position not file/length
const gff = `##gff-version 3
human	src	exon	41	60	.	.	.	ID=human.exon3;Name=exon-3
human	src	exon	1	20	.	.	.	ID=human.exon1;Name=exon-1
human	src	exon	21	40	.	.	.	ID=human.exon2;Name=exon-2
human	Pfam	protein_match	5	35	.	.	.	Name=PF00069;signature_desc=Kinase`

function makeModel() {
  const model = MSAModelF().create({
    id: 'segment-overlay-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
  })
  model.setWidth(800)
  model.applyGFFText(gff)
  return model
}

test('exons are ordered by sequence position, domains kept separate', () => {
  const model = makeModel()
  expect(model.segmentDomainTypes.map(d => d.accession)).toEqual([
    'exon-1',
    'exon-2',
    'exon-3',
  ])
  expect(model.categoricalDomainTypes.map(d => d.accession)).toEqual([
    'PF00069',
  ])
})

test('exons alternate two shades; domain gets its own color', () => {
  const { fillPalette } = makeModel()
  expect(fillPalette['exon-1']).toBe(segmentShades[0])
  expect(fillPalette['exon-2']).toBe(segmentShades[1])
  expect(fillPalette['exon-3']).toBe(segmentShades[0])
  expect(fillPalette.PF00069).not.toBe(segmentShades[0])
  expect(fillPalette.PF00069).not.toBe(segmentShades[1])
})

test('exons are labeled by their number', () => {
  const { segmentLabels } = makeModel()
  expect(segmentLabels.get('exon-1')).toBe('1')
  expect(segmentLabels.get('exon-2')).toBe('2')
  expect(segmentLabels.get('exon-3')).toBe('3')
})

test('legend lists only categorical domains, not exons', () => {
  const model = makeModel()
  for (const acc of ['exon-1', 'exon-2', 'exon-3', 'PF00069']) {
    model.setFilter(acc, true)
  }
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual(['PF00069'])
})
