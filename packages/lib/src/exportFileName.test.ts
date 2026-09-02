import { expect, test } from 'vitest'

import { exportFileName } from './exportFileName.ts'

test('takes the alignment file name and swaps the extension', () => {
  expect(
    exportFileName(
      {
        uri: 'https://example.org/data/PF00069.stock?dl=1',
        locationType: 'UriLocation',
      },
      'svg',
    ),
  ).toBe('PF00069.svg')
  expect(
    exportFileName(
      {
        localPath: 'C:\\aligns\\hemoglobin.fa',
        locationType: 'LocalPathLocation',
      },
      'svg',
    ),
  ).toBe('hemoglobin.svg')
  expect(
    exportFileName(
      { blobId: 'b1', name: 'pasted.aln', locationType: 'BlobLocation' },
      'svg',
    ),
  ).toBe('pasted.svg')
})

test('falls back to a plain name without a file', () => {
  expect(exportFileName(undefined, 'svg')).toBe('image.svg')
  expect(
    exportFileName(
      { uri: 'https://example.org/', locationType: 'UriLocation' },
      'svg',
    ),
  ).toBe('image.svg')
})
