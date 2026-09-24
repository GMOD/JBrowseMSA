// A #data= deep link for a snapshot that loads hosted files through its
// *Filehandle props (data/<file>, served at the app root) rather than inlining
// the alignment, so the link stays a few hundred bytes. The uri is relative, so
// it resolves against localhost during capture and gmod.org/JBrowseMSA/demo/
// once deployed.
export function fileSnap(msaview) {
  const snap = { msaview: { type: 'MsaView', ...msaview } }
  return `#data=${encodeURIComponent(JSON.stringify(snap))}`
}
