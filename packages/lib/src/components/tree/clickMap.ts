import Flatbush from 'flatbush'

export interface ClickEntry {
  name: string
  id: string
  branch?: boolean
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface Box {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// Spatial index of clickable tree elements (leaf labels, node bubbles,
// collapsed-clade triangles). Entries are collected during a render pass, then
// finish() builds the Flatbush index queried by hit-testing.
export class ClickMapIndex {
  private flatbush: Flatbush | null = null
  private entries: ClickEntry[] = []

  clear() {
    this.flatbush = null
    this.entries = []
  }

  insert(entry: ClickEntry) {
    this.entries.push(entry)
  }

  finish() {
    if (this.entries.length === 0) {
      this.flatbush = null
    } else {
      this.flatbush = new Flatbush(this.entries.length)
      for (const entry of this.entries) {
        this.flatbush.add(entry.minX, entry.minY, entry.maxX, entry.maxY)
      }
      this.flatbush.finish()
    }
  }

  search(box: Box): ClickEntry[] {
    return (
      this.flatbush
        ?.search(box.minX, box.minY, box.maxX, box.maxY)
        .map(i => this.entries[i]!) ?? []
    )
  }
}
