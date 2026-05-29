export async function myfetch(url: string, args?: RequestInit) {
  const response = await fetch(url, args)

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${url} ${await response.text()}`,
    )
  }

  return response
}

export async function textfetch(url: string, args?: RequestInit) {
  const response = await myfetch(url, args)
  return response.text()
}

export async function jsonfetch<T>(url: string, args?: RequestInit) {
  const response = await myfetch(url, args)
  return response.json() as T
}

export function timeout(time: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
    } else {
      const id = setTimeout(resolve, time)
      signal?.addEventListener('abort', () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }
  })
}

export function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === 'AbortError'
}
