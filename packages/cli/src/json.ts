import type { InterProScanResponse } from 'msa-parsers'
import type { MSAViewerProps, MsaSpec } from 'react-msaview'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isRecordArray(
  value: unknown,
): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord)
}

export function readJson<T>(
  text: string,
  isValue: (value: unknown) => value is T,
  what: string,
) {
  const value: unknown = JSON.parse(text)
  if (!isValue(value)) {
    throw new Error(`${what} does not hold the JSON expected`)
  }
  return value
}

export function isInterProScanResponse(
  value: unknown,
): value is InterProScanResponse {
  return isRecord(value) && isRecordArray(value.results)
}

function holdsStrings(value: Record<string, unknown>, keys: string[]) {
  return keys.every(
    key => value[key] === undefined || typeof value[key] === 'string',
  )
}

function holdsArrays(value: Record<string, unknown>, keys: string[]) {
  return keys.every(
    key => value[key] === undefined || Array.isArray(value[key]),
  )
}

export function isMsaSpec(value: unknown): value is MsaSpec {
  return (
    isRecord(value) &&
    holdsStrings(value, ['query', 'msa', 'tree']) &&
    holdsArrays(value, ['highlights', 'columnTracks']) &&
    (value.region === undefined ||
      typeof value.region === 'string' ||
      isRecord(value.region))
  )
}

export function isViewerProps(value: unknown): value is MSAViewerProps {
  return (
    isRecord(value) &&
    holdsStrings(value, [
      'msa',
      'tree',
      'gff',
      'msaUrl',
      'treeUrl',
      'gffUrl',
    ]) &&
    (value.theme === undefined ||
      value.theme === 'light' ||
      value.theme === 'dark')
  )
}
