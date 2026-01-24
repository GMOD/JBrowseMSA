/**
 * NCBI ASN.1 Parser
 * A simple hand-made parser for NCBI ASN.1 format
 * Was too lazy to figure out how ASN.1 actually worked, and use a dedicated
 * ASN.1 parser (you have to generally pre-defined your schema)
 * Written with help of Claude AI
 */

// Define types for our ASN structure
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

// Parse the fdict section
const remap = {
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
/**
 * Parse NCBI ASN.1 format string into a JavaScript object
 * @param asnString The ASN.1 string to parse
 * @returns Parsed BioTreeContainer object
 */
export function parseAsn1(
  asnString: string,
): { id: number; parent: number; name: string }[] {
  const sections = extractSections(
    asnString
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*::\s*=\s*/g, '::=')
      .replace(/^.*?::=/, ''),
  )

  const dict = Object.fromEntries(
    parseFdict(sections.fdict!).map(r => [
      r.id,
      remap[r.name as keyof typeof remap] || r.name,
    ]),
  )

  return parseNodes(sections.nodes!).map(node => {
    const { features, ...rest } = node
    return {
      ...rest,
      ...Object.fromEntries(
        features!.map(f => [dict[f.featureid], f.value] as const),
      ),
    }
  })
}

/**
 * Extract main sections from the ASN.1 string
 * @param asnString The ASN.1 string without type definition
 * @returns Object with extracted sections
 */
function extractSections(asnString: string): Record<string, string> {
  const sections: Record<string, string> = {}

  // First, let's clean up the string by removing any leading/trailing whitespace
  const cleanedString = asnString.trim()

  // Remove the outer braces if they exist
  const contentString =
    cleanedString.startsWith('{') && cleanedString.endsWith('}')
      ? cleanedString.slice(1, -1).trim()
      : cleanedString

  // Now we'll manually parse the top-level sections
  let currentPos = 0

  while (currentPos < contentString.length) {
    // Skip whitespace
    while (
      currentPos < contentString.length &&
      /\s/.test(contentString[currentPos]!)
    ) {
      currentPos++
    }

    if (currentPos >= contentString.length) {
      break
    }

    // Read section name
    const sectionNameStart = currentPos
    while (
      currentPos < contentString.length &&
      /\w/.test(contentString[currentPos]!)
    ) {
      currentPos++
    }

    if (
      currentPos >= contentString.length ||
      (contentString[currentPos] !== ' ' && contentString[currentPos] !== '{')
    ) {
      // Not a valid section, skip to next comma or end
      while (
        currentPos < contentString.length &&
        contentString[currentPos] !== ','
      ) {
        currentPos++
      }
      if (currentPos < contentString.length) {
        currentPos++
      } // Skip the comma
      continue
    }

    const sectionName = contentString.slice(sectionNameStart, currentPos).trim()

    // Skip whitespace
    while (
      currentPos < contentString.length &&
      /\s/.test(contentString[currentPos]!)
    ) {
      currentPos++
    }

    if (
      currentPos >= contentString.length ||
      contentString[currentPos] !== '{'
    ) {
      // Not a valid section, skip to next comma or end
      while (
        currentPos < contentString.length &&
        contentString[currentPos] !== ','
      ) {
        currentPos++
      }
      if (currentPos < contentString.length) {
        currentPos++
      } // Skip the comma
      continue
    }

    // We found an opening brace, now we need to find the matching closing brace
    const sectionContentStart = currentPos + 1
    let braceCount = 1
    currentPos++

    while (currentPos < contentString.length && braceCount > 0) {
      if (contentString[currentPos] === '{') {
        braceCount++
      } else if (contentString[currentPos] === '}') {
        braceCount--
      }
      currentPos++
    }

    if (braceCount === 0) {
      // We found the matching closing brace
      const sectionContent = contentString
        .slice(sectionContentStart, currentPos - 1)
        .trim()
      sections[sectionName] = sectionContent
    }

    // Skip to next comma or end
    while (
      currentPos < contentString.length &&
      contentString[currentPos] !== ','
    ) {
      currentPos++
    }
    if (currentPos < contentString.length) {
      currentPos++
    } // Skip the comma
  }

  return sections
}

/**
 * Parse the fdict section
 * @param fdictString The fdict section content
 * @returns Array of ASNDictEntry objects
 */
function parseFdict(fdictString: string): ASNDictEntry[] {
  const entries: ASNDictEntry[] = []

  // We need to properly handle nested braces
  let currentPos = 0

  while (currentPos < fdictString.length) {
    // Skip whitespace
    while (
      currentPos < fdictString.length &&
      /\s/.test(fdictString[currentPos]!)
    ) {
      currentPos++
    }

    if (currentPos >= fdictString.length) {
      break
    }

    // Look for opening brace
    if (fdictString[currentPos] === '{') {
      const entryContentStart = currentPos + 1
      let braceCount = 1
      currentPos++

      while (currentPos < fdictString.length && braceCount > 0) {
        if (fdictString[currentPos] === '{') {
          braceCount++
        } else if (fdictString[currentPos] === '}') {
          braceCount--
        }
        currentPos++
      }

      if (braceCount === 0) {
        // We found the matching closing brace
        const entryContent = fdictString
          .slice(entryContentStart, currentPos - 1)
          .trim()
        const entry = parseDictEntry(entryContent)
        if (entry) {
          entries.push(entry)
        }
      }
    } else {
      // Skip to next opening brace
      while (
        currentPos < fdictString.length &&
        fdictString[currentPos] !== '{'
      ) {
        currentPos++
      }
    }
  }

  return entries
}

/**
 * Parse a single dictionary entry
 * @param entryString The entry content
 * @returns ASNDictEntry object or null if parsing fails
 */
function parseDictEntry(entryString: string): ASNDictEntry | null {
  const idMatch = /id\s+(\d+)/.exec(entryString)
  // Handle escaped quotes in strings
  const nameMatch = /name\s+"((?:[^"\\]|\\.)*)"/s.exec(entryString)

  if (idMatch && nameMatch) {
    // Process escaped characters in the string
    const processedName = nameMatch[1]!
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')

    return {
      id: parseInt(idMatch[1]!, 10),
      name: processedName,
    }
  }

  return null
}

/**
 * Parse the nodes section
 * @param nodesString The nodes section content
 * @returns Array of ASNNode objects
 */
function parseNodes(nodesString: string): ASNNode[] {
  const nodes: ASNNode[] = []

  // We need to properly handle nested braces
  let currentPos = 0

  while (currentPos < nodesString.length) {
    // Skip whitespace
    while (
      currentPos < nodesString.length &&
      /\s/.test(nodesString[currentPos]!)
    ) {
      currentPos++
    }

    if (currentPos >= nodesString.length) {
      break
    }

    // Look for opening brace
    if (nodesString[currentPos] === '{') {
      const nodeContentStart = currentPos + 1
      let braceCount = 1
      currentPos++

      while (currentPos < nodesString.length && braceCount > 0) {
        if (nodesString[currentPos] === '{') {
          braceCount++
        } else if (nodesString[currentPos] === '}') {
          braceCount--
        }
        currentPos++
      }

      if (braceCount === 0) {
        // We found the matching closing brace
        const nodeContent = nodesString
          .slice(nodeContentStart, currentPos - 1)
          .trim()
        const node = parseNode(nodeContent)
        if (node) {
          nodes.push(node)
        }
      }
    } else {
      // Skip to next opening brace
      while (
        currentPos < nodesString.length &&
        nodesString[currentPos] !== '{'
      ) {
        currentPos++
      }
    }
  }

  return nodes
}

/**
 * Parse a single node
 * @param nodeString The node content
 * @returns ASNNode object or null if parsing fails
 */
function parseNode(nodeString: string): ASNNode | null {
  const idMatch = /id\s+(\d+)/.exec(nodeString)
  const parentMatch = /parent\s+(\d+)/.exec(nodeString)

  if (idMatch) {
    const node: ASNNode = {
      id: parseInt(idMatch[1]!, 10),
    }

    if (parentMatch) {
      node.parent = parseInt(parentMatch[1]!, 10)
    }

    // Extract features if present
    // First find the features section
    const featuresIndex = nodeString.indexOf('features')
    if (featuresIndex !== -1) {
      // Find the opening brace after "features"
      const openBraceIndex = nodeString.indexOf('{', featuresIndex)
      if (openBraceIndex !== -1) {
        // Now find the matching closing brace
        let braceCount = 1
        let closeBraceIndex = openBraceIndex + 1

        while (closeBraceIndex < nodeString.length && braceCount > 0) {
          if (nodeString[closeBraceIndex] === '{') {
            braceCount++
          } else if (nodeString[closeBraceIndex] === '}') {
            braceCount--
          }
          closeBraceIndex++
        }

        if (braceCount === 0) {
          // We found the matching closing brace
          const featuresContent = nodeString
            .slice(openBraceIndex + 1, closeBraceIndex - 1)
            .trim()
          node.features = parseFeatures(featuresContent)
        }
      }
    }

    return node
  }

  return null
}

/**
 * Parse features section of a node
 * @param featuresString The features section content
 * @returns Array of ASNFeature objects
 */
function parseFeatures(featuresString: string): ASNFeature[] {
  const features: ASNFeature[] = []

  // We need to properly handle nested braces
  let currentPos = 0

  while (currentPos < featuresString.length) {
    // Skip whitespace
    while (
      currentPos < featuresString.length &&
      /\s/.test(featuresString[currentPos]!)
    ) {
      currentPos++
    }

    if (currentPos >= featuresString.length) {
      break
    }

    // Look for opening brace
    if (featuresString[currentPos] === '{') {
      const featureContentStart = currentPos + 1
      let braceCount = 1
      currentPos++

      while (currentPos < featuresString.length && braceCount > 0) {
        if (featuresString[currentPos] === '{') {
          braceCount++
        } else if (featuresString[currentPos] === '}') {
          braceCount--
        }
        currentPos++
      }

      if (braceCount === 0) {
        // We found the matching closing brace
        const featureContent = featuresString
          .slice(featureContentStart, currentPos - 1)
          .trim()
        const feature = parseFeature(featureContent)
        if (feature) {
          features.push(feature)
        }
      }
    } else {
      // Skip to next opening brace
      while (
        currentPos < featuresString.length &&
        featuresString[currentPos] !== '{'
      ) {
        currentPos++
      }
    }
  }

  return features
}

/**
 * Parse a single feature
 * @param featureString The feature content
 * @returns ASNFeature object or null if parsing fails
 */
function parseFeature(featureString: string): ASNFeature | null {
  const featureidMatch = /featureid\s+(\d+)/.exec(featureString)
  // Handle escaped quotes in strings
  const valueMatch = /value\s+"((?:[^"\\]|\\.)*)"/s.exec(featureString)

  if (featureidMatch && valueMatch) {
    // Process escaped characters in the string
    const processedValue = valueMatch[1]!
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')

    return {
      featureid: parseInt(featureidMatch[1]!, 10),
      value: processedValue,
    }
  }

  return null
}
