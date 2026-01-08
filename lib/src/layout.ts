import Flatbush from 'flatbush'

export default class Layout {
  public rectangles: Map<
    string,
    {
      minY: number
      maxY: number
      minX: number
      maxX: number
      id: string
      data: unknown
    }
  >

  public maxHeightReached = false

  private maxHeight: number

  private flatbush: Flatbush | null = null

  private indexToId: string[] = []

  private pTotalHeight: number

  constructor({
    maxHeight = 10000,
  }: {
    maxHeight?: number
  } = {}) {
    this.rectangles = new Map()
    this.maxHeight = Math.ceil(maxHeight)
    this.pTotalHeight = 0 // total height, in units of bitmap squares (px/pitchY)
  }

  private rebuildIndex() {
    // Rebuild the spatial index with current rectangles
    const rects = Array.from(this.rectangles.values())
    if (rects.length === 0) {
      this.flatbush = null
      this.indexToId = []
      return
    }

    this.flatbush = new Flatbush(rects.length)
    this.indexToId = []

    for (const rect of rects) {
      this.flatbush.add(rect.minX, rect.minY, rect.maxX, rect.maxY)
      this.indexToId.push(rect.id)
    }

    this.flatbush.finish()
  }

  private collides(box: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }): boolean {
    if (!this.flatbush) {
      return false
    }

    const results = this.flatbush.search(box.minX, box.minY, box.maxX, box.maxY)

    return results.length > 0
  }

  /**
   * @returns top position for the rect, or Null if laying
   *  out the rect would exceed maxHeighe
   */
  addRect(
    id: string,
    left: number,
    right: number,
    height: number,
    data: unknown,
  ): number | null {
    // add to flatbush
    const existingRecord = this.rectangles.get(id)
    if (existingRecord) {
      return existingRecord.minY
    }

    let currHeight = 0
    while (
      this.collides({
        minX: left,
        minY: currHeight,
        maxX: right,
        maxY: currHeight + height,
      }) &&
      currHeight <= this.maxHeight
    ) {
      currHeight += 1
    }

    const record = {
      minX: left,
      minY: currHeight,
      maxX: right,
      maxY: currHeight + height,
      id,
      data,
    }
    this.rectangles.set(id, record)
    this.rebuildIndex()
    this.pTotalHeight = Math.max(this.pTotalHeight, currHeight)
    return currHeight
  }

  get totalHeight() {
    return this.pTotalHeight
  }
}
