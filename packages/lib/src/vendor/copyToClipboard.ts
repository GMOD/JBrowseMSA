export default function copy(text: string) {
  const clip = navigator.clipboard as Clipboard | undefined
  if (clip?.writeText) {
    clip.writeText(text).catch((e: unknown) => {
      console.error('Failed to copy to clipboard:', e)
    })
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
