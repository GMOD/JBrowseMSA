# Refactoring Opportunities

## TreeCanvas.tsx

### O(n) leaf lookups could be O(1)

Lines 98-99, 112-113, 130-131 perform `leaves.find()` calls in the autorun:

```typescript
const referenceLeaf = leaves.find(leaf => leaf.data.name === relativeTo)
const matchingLeaf = leaves.find(leaf => leaf.data.name === descendantName)
const matchingLeaf = leaves.find(leaf => leaf.data.name === mouseOverRowName)
```

**Solution**: Add a `leavesMap` getter to the model that returns `Map<string, HierarchyNode>` for O(1) lookups:

```typescript
get leavesMap() {
  return new Map(this.leaves.map(leaf => [leaf.data.name, leaf]))
}
```

## renderTreeCanvas.ts

### O(n) collapsed array lookups could be O(1)

Lines 116, 195-196 use `.includes()` on arrays:

```typescript
ctx.fillStyle = collapsed.includes(id) ? 'black' : 'white'
!collapsed.includes(id) && !collapsedLeaves.includes(id)
```

**Solution**: Add Set getters to the model:

```typescript
get collapsedSet() {
  return new Set(self.collapsed)
}

get collapsedLeavesSet() {
  return new Set(self.collapsedLeaves)
}
```

Then use `.has(id)` instead of `.includes(id)`.

## TreeCanvasBlock.tsx

### Duplicate click map search logic

Lines 145-174 have two nearly identical functions:

```typescript
function hoverBranchClickMap(event: React.MouseEvent) {
  const x = event.nativeEvent.offsetX
  const y = event.nativeEvent.offsetY
  const [entry] = clickMap.current.search({
    minX: x,
    maxX: x + 1,
    minY: y + offsetY,
    maxY: y + 1 + offsetY,
  })
  return entry?.branch ? { ...entry, x: event.clientX, y: event.clientY } : undefined
}

function hoverNameClickMap(event: React.MouseEvent) {
  // ... nearly identical search logic
  return entry && !entry.branch ? { ...entry, x: event.clientX, y: event.clientY } : undefined
}
```

**Solution**: Consolidate into a single helper:

```typescript
function getClickMapEntry(event: React.MouseEvent) {
  const x = event.nativeEvent.offsetX
  const y = event.nativeEvent.offsetY
  const [entry] = clickMap.current.search({
    minX: x,
    maxX: x + 1,
    minY: y + offsetY,
    maxY: y + 1 + offsetY,
  })
  return entry ? { ...entry, x: event.clientX, y: event.clientY } : undefined
}

// Usage:
const entry = getClickMapEntry(event)
const branch = entry?.branch ? entry : undefined
const leaf = entry && !entry.branch ? entry : undefined
```
