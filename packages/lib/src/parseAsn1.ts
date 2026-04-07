export interface ASNNode {
  id: number
  parent?: number
  features?: ASNFeature[]
}

export interface ASNFeature {
  featureid: number
  value: string
}

export interface ASNDictEntry {
  id: number
  name: string
}

export interface BioTreeContainer {
  fdict: ASNDictEntry[]
  nodes: ASNNode[]
}

const remap: Record<string, string> = {
  $NODE_COLLAPSED: 'collapsed',
  $NODE_COLOR: 'color',
  $LABEL_BG_COLOR: 'color',
  'seq-id': 'seqId',
  'seq-title': 'seqTitle',
  'align-index': 'alignIndex',
  'accession-nbr': 'accessionNbr',
  'blast-name': 'blastName',
  'common-name': 'commonName',
  'leaf-count': 'leafCount',
}

function extractBracedBlocks(str: string): string[] {
  const blocks: string[] = []
  let pos = 0
  while (pos < str.length) {
    pos = str.indexOf('{', pos)
    if (pos === -1) {
      break
    }
    let depth = 1
    const start = pos + 1
    pos++
    while (pos < str.length && depth > 0) {
      if (str[pos] === '{') {
        depth++
      } else if (str[pos] === '}') {
        depth--
      }
      pos++
    }
    if (depth === 0) {
      blocks.push(str.slice(start, pos - 1).trim())
    }
  }
  return blocks
}

function findBracedContent(str: string, after: number) {
  const openIdx = str.indexOf('{', after)
  if (openIdx === -1) {
    return undefined
  }
  let depth = 1
  let pos = openIdx + 1
  while (pos < str.length && depth > 0) {
    if (str[pos] === '{') {
      depth++
    } else if (str[pos] === '}') {
      depth--
    }
    pos++
  }
  return depth === 0 ? str.slice(openIdx + 1, pos - 1).trim() : undefined
}

export function parseAsn1(
  asnString: string,
): { id: number; parent: number; name: string }[] {
  const normalized = asnString
    .replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*::\s*=\s*/g, '::=')
    .replace(/^.*?::=/, '')

  const sections = extractSections(normalized)

  const dict = Object.fromEntries(
    extractBracedBlocks(sections.fdict!).flatMap(block => {
      const entry = parseDictEntry(block)
      return entry ? [[entry.id, remap[entry.name] || entry.name]] : []
    }),
  )

  return extractBracedBlocks(sections.nodes!).flatMap(block => {
    const node = parseNode(block)
    if (!node) {
      return []
    }
    const { features = [], ...rest } = node
    return [
      {
        ...rest,
        ...Object.fromEntries(
          features.map(f => [dict[f.featureid], f.value] as const),
        ),
      },
    ]
  })
}

function extractSections(asnString: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let content = asnString.trim()
  if (content.startsWith('{') && content.endsWith('}')) {
    content = content.slice(1, -1).trim()
  }

  let pos = 0
  while (pos < content.length) {
    while (pos < content.length && /\s/.test(content[pos]!)) {
      pos++
    }
    if (pos >= content.length) {
      break
    }

    const nameStart = pos
    while (pos < content.length && /\w/.test(content[pos]!)) {
      pos++
    }

    if (
      pos >= content.length ||
      (content[pos] !== ' ' && content[pos] !== '{')
    ) {
      pos = content.indexOf(',', pos)
      pos = pos === -1 ? content.length : pos + 1
      continue
    }

    const name = content.slice(nameStart, pos).trim()

    while (pos < content.length && /\s/.test(content[pos]!)) {
      pos++
    }

    if (pos >= content.length || content[pos] !== '{') {
      pos = content.indexOf(',', pos)
      pos = pos === -1 ? content.length : pos + 1
      continue
    }

    let depth = 1
    const start = pos + 1
    pos++
    while (pos < content.length && depth > 0) {
      if (content[pos] === '{') {
        depth++
      } else if (content[pos] === '}') {
        depth--
      }
      pos++
    }
    if (depth === 0) {
      sections[name] = content.slice(start, pos - 1).trim()
    }

    pos = content.indexOf(',', pos)
    pos = pos === -1 ? content.length : pos + 1
  }

  return sections
}

function parseDictEntry(entryString: string): ASNDictEntry | null {
  const idMatch = /id\s+(\d+)/.exec(entryString)
  const nameMatch = /name\s+"((?:[^"\\]|\\.)*)"/s.exec(entryString)
  if (!idMatch || !nameMatch) {
    return null
  }
  return {
    id: parseInt(idMatch[1]!, 10),
    name: nameMatch[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
  }
}

function parseNode(nodeString: string): ASNNode | null {
  const idMatch = /id\s+(\d+)/.exec(nodeString)
  if (!idMatch) {
    return null
  }
  const parentMatch = /parent\s+(\d+)/.exec(nodeString)
  const featuresIdx = nodeString.indexOf('features')
  const featuresContent =
    featuresIdx !== -1 ? findBracedContent(nodeString, featuresIdx) : undefined

  return {
    id: parseInt(idMatch[1]!, 10),
    ...(parentMatch ? { parent: parseInt(parentMatch[1]!, 10) } : {}),
    features: featuresContent
      ? extractBracedBlocks(featuresContent).flatMap(block => {
          const f = parseFeature(block)
          return f ? [f] : []
        })
      : [],
  }
}

function parseFeature(featureString: string): ASNFeature | null {
  const featureidMatch = /featureid\s+(\d+)/.exec(featureString)
  const valueMatch = /value\s+"((?:[^"\\]|\\.)*)"/s.exec(featureString)
  if (!featureidMatch || !valueMatch) {
    return null
  }
  return {
    featureid: parseInt(featureidMatch[1]!, 10),
    value: valueMatch[1]!.replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
  }
}
