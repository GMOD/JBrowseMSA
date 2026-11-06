export type FetchText = (url: string) => Promise<string>

export async function fetchText(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status}`)
  }
  return res.text()
}
