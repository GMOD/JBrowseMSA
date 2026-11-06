// A #data= deep link for a snapshot that loads hosted files through its
// *Filehandle props (data/<file>, served at the app root) rather than inlining
// the alignment, so the link stays a few hundred bytes. The uri is relative, so
// it resolves against localhost during capture and gmod.org/JBrowseMSA/demo/
// once deployed.
export function fileSnap(msaview) {
  const snap = { msaview: { type: 'MsaView', ...msaview } }
  return `#data=${encodeURIComponent(JSON.stringify(snap))}`
}

// A color per value as the color object spells it: a `scale` with the values as
// `domain`, in key order, which is legend order, and their colors as `range`
export function domainRange(colors) {
  return {
    scale: { domain: Object.keys(colors), range: Object.values(colors) },
  }
}
