import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { getSession } from '@jbrowse/core/util'
import { Button, DialogActions, DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { launchInterProScan } from '../../launchInterProScan.ts'

import type { MsaViewModel } from '../../model.ts'

const InterProScanDialog = observer(function ({
  handleClose,
  model,
}: {
  handleClose: () => void
  model: MsaViewModel
}) {
  const [vals, setVals] = useState([
    {
      name: 'NCBIfam',
      description: 'NCBI RefSeq FAMs including TIGRFAMs',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'SFLD',
      description: 'Structure function linkage database',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'Phobius',
      checked: true,
      description:
        'A combined transmembrane topology and signal peptide predictor',
      category: 'Other sequence features',
    },
    {
      name: 'SignalP',
      checked: true,
      category: 'Other sequence features',
    },
    {
      name: 'SignalP_EUK',
      category: 'Other category',
      checked: true,
    },
    {
      name: 'SignalP_GRAM_POSITIVE',
      category: 'Other category',
      checked: true,
    },
    {
      name: 'SignalP_GRAM_NEGATIVE',
      checked: true,
      category: 'Other category',
    },
    {
      name: 'SuperFamily',
      category: 'Structural domains',
      checked: true,
    },
    {
      name: 'Panther',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'Gene3d',
      category: 'Structural domains',
      checked: true,
    },
    {
      name: 'HAMAP',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'PrositeProfiles',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'PrositePatterns',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'Coils',
      category: 'Other sequence features',
      checked: true,
    },
    {
      name: 'SMART',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'CDD',
      description: 'Conserved Domains Database',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'PRINTS',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'PfamA',
      category: 'Families, domains, sites & repeats',
      checked: true,
    },
    {
      name: 'MobiDBLite',
      checked: true,
      category: 'Other sequence features',
    },
    {
      name: 'PIRSF',
      checked: true,
      category: 'Other category',
    },
    {
      name: 'TMHMM',
      checked: true,
      category: 'Other sequence features',
    },

    {
      name: 'AntiFam',
      checked: true,
      category: 'Other category',
    },
    {
      name: 'FunFam',
      checked: true,
      category: 'Other category',
    },
    {
      name: 'PIRSR',
      checked: true,
      category: 'Families, domains, sites & repeats',
    },
  ])

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
                  .map(({ name, checked, category }) => (
                    <tr key={name}>
                      <td>
                        <input
                          type="checkbox"
                          key={name}
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
                      <td>{name}</td>
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
                    .map(row => [row[0], row[1].replaceAll('-', '')])
                    .filter(f => !!f[1])
                    .map(row => `>${row[0]}\n${row[1]}`)
                    .join('\n'),
                  onProgress: arg => {
                    model.setStatus(arg)
                  },
                  model,
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
