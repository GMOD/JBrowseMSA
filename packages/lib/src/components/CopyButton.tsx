import React, { useEffect, useRef, useState } from 'react'

import { Button } from '@mui/material'

import copy from '../vendor/copyToClipboard.ts'

/**
 * Copy-to-clipboard button that confirms on the label for a moment. The timer is
 * cleared on unmount, since these live in dialogs the copy itself often closes.
 */
export default function CopyButton({
  text,
  label = 'Copy to clipboard',
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        copy(text)
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          setCopied(false)
        }, 500)
      }}
    >
      {copied ? 'Copied!' : label}
    </Button>
  )
}
