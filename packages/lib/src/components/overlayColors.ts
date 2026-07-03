// Shared highlight colors for the MSA/tree hover and selection overlay canvases.
// Kept in one place so the reference-row color (drawn identically over both the
// tree and the alignment) can't drift between the two surfaces.

// reference (relativeTo) row, drawn over both the tree and the alignment
export const referenceColor = 'rgba(0,128,255,0.3)'

// tree-node descendant rows highlighted on hover. The alpha differs by surface
// intentionally: the tree background is plain so it can take a stronger wash,
// while the alignment cells are already colored so a lighter wash reads better.
export const treeHoverColor = 'rgba(255,165,0,0.2)'
export const multiRowHoverColor = 'rgba(255,165,0,0.15)'
