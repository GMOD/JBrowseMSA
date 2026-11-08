import React from 'react'

import { isRecord } from '../MetadataTable.tsx'
import { referenceFieldLabels } from './metadataLabels.ts'

const referenceTags = ['RM', 'RT', 'RA', 'RL', 'RC'] as const

function pubmed(id: string) {
  return /^\d+$/.test(id) ? (
    <a
      href={`https://pubmed.ncbi.nlm.nih.gov/${id}/`}
      target="_blank"
      rel="noreferrer"
    >
      {id}
    </a>
  ) : (
    id
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string')
}

function groupReferences(general: Record<string, unknown>) {
  const numbers = general.RN
  if (!isStringArray(numbers) || numbers.length === 0) {
    return general
  }
  const present = referenceTags.filter(tag => general[tag] != null)
  const columns = present.flatMap(tag => {
    const values = general[tag]
    return isStringArray(values) && values.length === numbers.length
      ? [{ tag, values }]
      : []
  })
  if (columns.length !== present.length) {
    return general
  }
  const rest = Object.fromEntries(
    Object.entries(general).filter(
      ([tag]) =>
        tag !== 'RN' && !(referenceTags as readonly string[]).includes(tag),
    ),
  )
  const references = Object.fromEntries(
    numbers.map((number, i) => [
      number,
      Object.fromEntries(
        columns.map(({ tag, values }) => {
          const value = values[i]!
          return [
            referenceFieldLabels[tag],
            tag === 'RM' ? pubmed(value) : value,
          ]
        }),
      ),
    ]),
  )
  return { ...rest, References: references }
}

export function groupGeneral(general: unknown) {
  return isRecord(general) ? groupReferences(general) : {}
}
