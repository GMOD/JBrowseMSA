// @vitest-environment jsdom
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import FeatureDialog from './FeatureDialog.tsx'

import type { MsaViewModel } from '../../model.ts'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const msa = '>a\nMKAANSE\n>b\nMKA-NSE'
const gff = `##gff-version 3
a\tPfam\tprotein_match\t1\t3\t.\t+\t.\tName=PF00001;signature_desc=kinase
b\tPfam\tprotein_match\t2\t5\t.\t+\t.\tName=PF00002;signature_desc=SH3 domain
b\tPfam\tprotein_match\t6\t7\t.\t+\t.\tName=PF00003;signature_desc=SH2 domain
`

let container: HTMLDivElement
let root: Root
let model: MsaViewModel

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, gff },
  })
  act(() => {
    root.render(<FeatureDialog model={model} onClose={() => {}} />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function accessions() {
  return [...document.querySelectorAll('tbody tr')].map(
    tr => tr.querySelectorAll('td')[2]!.textContent,
  )
}

function filter(text: string) {
  const input = document.querySelector<HTMLInputElement>('input[type="text"]')!
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function clickButton(label: string) {
  const button = [...document.querySelectorAll('button')].find(
    b => b.textContent === label,
  )!
  act(() => {
    button.click()
  })
}

test('the filter matches accession, name and description', () => {
  expect(accessions()).toEqual(['PF00001', 'PF00002', 'PF00003'])
  filter('sh')
  expect(accessions()).toEqual(['PF00002', 'PF00003'])
  filter('pf00001')
  expect(accessions()).toEqual(['PF00001'])
  filter('')
  expect(accessions()).toHaveLength(3)
})

test('toggling all acts on the filtered rows', () => {
  filter('domain')
  clickButton('Toggle all off')
  expect(model.turnedOffFeatures.get('PF00001')).toBeFalsy()
  expect(model.turnedOffFeatures.get('PF00002')).toBe(true)
  expect(model.turnedOffFeatures.get('PF00003')).toBe(true)
})
