import React, { useState } from 'react'

import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import ArrowRight from '@mui/icons-material/ArrowRight'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem as MuiMenuItem,
  Radio,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import type { MenuItem } from '@jbrowse/core/ui/Menu'

type RadioMenuItem = Extract<MenuItem, { type: 'radio' }>

/**
 * A submenu of radios may name a compact control to render as: `segmented`
 * for a few short choices, `select` for a longer list
 */
export type ChoiceDisplay = 'segmented' | 'select'

function isChoiceDisplay(value: unknown): value is ChoiceDisplay {
  return value === 'segmented' || value === 'select'
}

function labelText(label: React.ReactNode, fallback: string) {
  return typeof label === 'string' || typeof label === 'number'
    ? String(label)
    : fallback
}

function radios(items: MenuItem[]) {
  return items.filter(
    (i): i is RadioMenuItem => 'type' in i && i.type === 'radio',
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ mt: 1, display: 'block' }}
    >
      {children}
    </Typography>
  )
}

function Segmented({
  label,
  options,
}: {
  label: string
  options: RadioMenuItem[]
}) {
  const value = options.findIndex(o => o.checked)
  return (
    <>
      <Caption>{label}</Caption>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        aria-label={label}
        onChange={(_event, i: number | null) => {
          if (i !== null) {
            options[i]?.onClick()
          }
        }}
      >
        {options.map((o, i) => (
          <ToggleButton
            key={labelText(o.label, String(i))}
            value={i}
            disabled={o.disabled}
            title={o.helpText}
            sx={{ textTransform: 'none', py: 0.25 }}
          >
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </>
  )
}

// each option fires its own onClick, so picking the checked one again still
// runs, which reopens a dialog like the custom gap threshold
function Select({
  label,
  options,
}: {
  label: string
  options: RadioMenuItem[]
}) {
  const value = options.findIndex(o => o.checked)
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={label}
      value={value === -1 ? '' : value}
      sx={{ mt: 1.5, '& .MuiInputBase-root': { typography: 'body2' } }}
    >
      {options.map((o, i) => (
        <MuiMenuItem
          key={labelText(o.label, String(i))}
          value={i}
          disabled={o.disabled}
          dense
          onClick={() => {
            o.onClick()
          }}
        >
          {o.label}
        </MuiMenuItem>
      ))}
    </TextField>
  )
}

// a short submenu opens in place under a caption, where every choice shows at
// once; a long one, like the extra color schemes, folds behind a toggle
const inlineUpTo = 8

function SubSection({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false)
  if (!('subMenu' in item) || !Array.isArray(item.subMenu)) {
    return null
  }
  const label = labelText(item.label, '')
  const display =
    'display' in item && isChoiceDisplay(item.display)
      ? item.display
      : undefined
  if (display) {
    const options = radios(item.subMenu)
    const rest = item.subMenu.filter(i => !options.some(o => o === i))
    const Control = display === 'segmented' ? Segmented : Select
    return (
      <>
        <Control label={label} options={options} />
        <MenuItemsForm items={rest} />
      </>
    )
  }
  if (item.subMenu.length <= inlineUpTo) {
    return (
      <>
        <Caption>{label}</Caption>
        <MenuItemsForm items={item.subMenu} />
      </>
    )
  }
  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={open ? <ArrowDropDown /> : <ArrowRight />}
        onClick={() => {
          setOpen(!open)
        }}
        sx={{ textTransform: 'none', justifyContent: 'flex-start', px: 0.5 }}
      >
        {label}
      </Button>
      {open ? (
        <Box sx={{ pl: 2 }}>
          <MenuItemsForm items={item.subMenu} />
        </Box>
      ) : null}
    </>
  )
}

export default function MenuItemsForm({ items }: { items: MenuItem[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => {
        const key =
          'label' in item ? labelText(item.label, String(i)) : String(i)
        if (!('label' in item)) {
          return null
        }
        if ('type' in item && item.type === 'subHeader') {
          return <Caption key={key}>{item.label}</Caption>
        }
        if ('subMenu' in item) {
          return <SubSection key={key} item={item} />
        }
        const onClick = 'onClick' in item ? item.onClick : undefined
        if (
          'type' in item &&
          (item.type === 'checkbox' || item.type === 'radio')
        ) {
          const Control = item.type === 'checkbox' ? Checkbox : Radio
          return (
            <FormControlLabel
              key={key}
              disabled={item.disabled}
              control={
                <Control
                  size="small"
                  checked={item.checked}
                  onChange={() => onClick?.()}
                  sx={{ py: 0.25 }}
                />
              }
              label={item.label}
              slotProps={{ typography: { variant: 'body2' } }}
            />
          )
        }
        return (
          <Button
            key={key}
            size="small"
            disabled={item.disabled}
            onClick={() => onClick?.()}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {item.label}
          </Button>
        )
      })}
    </Box>
  )
}
