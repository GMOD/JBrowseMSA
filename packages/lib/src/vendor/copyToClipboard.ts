export default function copy(text: string) {
  navigator.clipboard.writeText(text).catch(e => {
    console.error('Failed to copy to clipboard:', e)
  })
}
