import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { getSession } from '@jbrowse/core/util'
import { Button, DialogActions, DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'
import { getUngappedSequence } from 'msa-parsers'

import { launchInterProScan } from '../../launchInterProScan.ts'

import type { MsaViewModel } from '../../model.ts'

const FAMILIES = 'Families, domains, sites & repeats'
const FEATURES = 'Other sequence features'
const STRUCTURAL = 'Structural domains'
const OTHER = 'Other category'

// The analyses the EBI iprscan5 endpoint accepts, all on by default. Static, so
// it lives out here rather than being rebuilt on every render of the dialog.
const interProScanPrograms = [
  {
    name: 'NCBIfam',
    category: FAMILIES,
    description: 'NCBI RefSeq FAMs including TIGRFAMs',
  },
  {
    name: 'SFLD',
    category: FAMILIES,
    description: 'Structure function linkage database',
  },
  {
    name: 'Phobius',
    category: FEATURES,
    description:
      'A combined transmembrane topology and signal peptide predictor',
  },
  { name: 'SignalP', category: FEATURES },
  { name: 'SignalP_EUK', category: OTHER },
  { name: 'SignalP_GRAM_POSITIVE', category: OTHER },
  { name: 'SignalP_GRAM_NEGATIVE', category: OTHER },
  { name: 'SuperFamily', category: STRUCTURAL },
  { name: 'Panther', category: FAMILIES },
  { name: 'Gene3d', category: STRUCTURAL },
  { name: 'HAMAP', category: FAMILIES },
  { name: 'PrositeProfiles', category: FAMILIES },
  { name: 'PrositePatterns', category: FAMILIES },
  { name: 'Coils', category: FEATURES },
  { name: 'SMART', category: FAMILIES },
  {
    name: 'CDD',
    category: FAMILIES,
    description: 'Conserved Domains Database',
  },
  { name: 'PRINTS', category: FAMILIES },
  { name: 'PfamA', category: FAMILIES },
  { name: 'MobiDBLite', category: FEATURES },
  { name: 'PIRSF', category: OTHER },
  { name: 'TMHMM', category: FEATURES },
  { name: 'AntiFam', category: OTHER },
  { name: 'FunFam', category: OTHER },
  { name: 'PIRSR', category: FAMILIES },
].map(program => ({ ...program, checked: true }))

const InterProScanDialog = observer(function ({
  handleClose,
  model,
}: {
  handleClose: () => void
  model: MsaViewModel
}) {
  const [vals, setVals] = useState(interProScanPrograms)

  const programs = vals.filter(e => e.checked).map(e => e.name)
  const [show, setShow] = useState(false)

  return (
    <Dialog
      maxWidth="xl"
      title="Query InterProScan API for domains"
      onClose={() => {
        handleClose()
      }}
      open
    >
      <DialogContent>
        <Typography>
          This will run InterProScan via the InterProScan API on all rows of the
          current MSA
        </Typography>
        <Button
          onClick={() => {
            setShow(!show)
          }}
        >
          {show ? 'Hide' : 'Show'} advanced options
        </Button>
        {show ? (
          <div>
            <Typography>Select algorithms for InterProScan to run</Typography>
            <div>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setVals(vals.map(v => ({ ...v, checked: false })))
                }}
              >
                Select none
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setVals(vals.map(v => ({ ...v, checked: true })))
                }}
              >
                Select all
              </Button>
            </div>
            <table>
              <tbody>
                {vals
                  .toSorted((a, b) => a.category.localeCompare(b.category))
                  .map(({ name, checked, category, description }) => (
                    <tr key={name}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setVals(
                              vals.map(e =>
                                e.name === name
                                  ? { ...e, checked: !e.checked }
                                  : e,
                              ),
                            )
                          }}
                        />
                      </td>
                      <td title={description}>{name}</td>
                      <td>{category}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            handleClose()
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            const controller = new AbortController()
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ;(async () => {
              try {
                const { rows } = model
                if (rows.length > 140) {
                  throw new Error(
                    'Too many sequences, please run InterProScan offline',
                  )
                }
                await launchInterProScan({
                  algorithm: 'interproscan',
                  programs: programs,
                  seq: rows
                    .map(row => [row[0], getUngappedSequence(row[1])])
                    .filter(f => !!f[1])
                    .map(row => `>${row[0]}\n${row[1]}`)
                    .join('\n'),
                  onProgress: arg => {
                    model.setStatus(
                      arg
                        ? {
                            ...arg,
                            onCancel: () => {
                              controller.abort()
                            },
                          }
                        : undefined,
                    )
                  },
                  model,
                  signal: controller.signal,
                })
              } catch (e) {
                console.error(e)
                getSession(model).notifyError(`${e}`, e)
              } finally {
                model.setStatus()
              }
            })()
            handleClose()
          }}
        >
          Send sequences to InterProScan
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default InterProScanDialog
