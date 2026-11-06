import type { Annotation } from '../types.ts'

/**
 * Write annotations as GFF3, one line per annotation, in list order, with
 * optional `#` comment lines after the version directive saying where they came
 * from.
 *
 * An Annotation records no source of its own, so every line takes `source`,
 * `InterProScan` by default, since the viewer reads a precomputed-lookup GFF
 * by the same rules it reads a real InterProScan run's.
 */
export function annotationsToGFF(
  annotations: Annotation[],
  header: string[] = [],
  source = 'InterProScan',
): string {
  return [
    '##gff-version 3',
    ...header.map(line => `# ${line}`),
    ...annotations.map(annotation => {
      const { accession, name, description, featureType } = annotation
      const { id, start, end, strand } = annotation
      return [
        id.replaceAll(/[%\t\n\r]/g, encodeURIComponent),
        source.replaceAll(/[%\t\n\r]/g, encodeURIComponent),
        // GFF-sourced annotations carry their original type; writing every
        // feature back out as protein_match would turn an exon overlay into
        // generic domains on the next read, losing the numbered-segment
        // rendering and the gene arrowheads
        featureType ?? 'protein_match',
        start,
        end,
        '.',
        strand === undefined ? '.' : strand > 0 ? '+' : '-',
        '.',
        [
          `Name=${encodeURIComponent(accession)}`,
          `signature_desc=${encodeURIComponent(name)}`,
          `description=${encodeURIComponent(description)}`,
        ].join(';'),
      ].join('\t')
    }),
  ].join('\n')
}
