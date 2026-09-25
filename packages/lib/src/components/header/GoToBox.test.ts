import { expect, test } from 'vitest'

import { labelledInput } from './GoToBox.tsx'

import type { AutocompleteRenderInputParams } from '@mui/material'

const base = { id: 'go', disabled: false, fullWidth: false, size: undefined }

test('labels the input through slotProps on MUI 9', () => {
  const params = {
    ...base,
    slotProps: { inputLabel: {}, input: {}, htmlInput: { value: 'x' } },
  } as unknown as AutocompleteRenderInputParams
  expect(labelledInput(params)).toMatchObject({
    slotProps: {
      htmlInput: { value: 'x', 'aria-label': 'Go to row or column' },
    },
  })
})

test('labels the input through inputProps on the MUI 7 released hosts serve', () => {
  const params = {
    ...base,
    InputProps: {},
    inputProps: { value: 'x' },
  } as unknown as AutocompleteRenderInputParams
  expect(labelledInput(params)).toEqual({
    inputProps: { value: 'x', 'aria-label': 'Go to row or column' },
  })
})
