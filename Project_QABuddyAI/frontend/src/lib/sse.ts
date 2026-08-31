/**
 * Streams a POST response formatted as Server-Sent Events. Not EventSource
 * (which can't send a POST body) — reads the fetch response body directly
 * and parses `event:`/`data:` blocks separated by blank lines, same wire
 * format QABuddy's backend emits from qabuddy/api/routes.py's `_sse()`.
 */
export async function streamPost<TEvents extends object>(
  url: string,
  body: unknown,
  handlers: Partial<{ [K in keyof TEvents]: (data: TEvents[K]) => void }>,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    throw new Error(`Request failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      const eventMatch = block.match(/^event: (.+)$/m)
      const dataMatch = block.match(/^data: (.+)$/m)
      if (!eventMatch) continue

      const eventName = eventMatch[1] as keyof TEvents
      const data = dataMatch ? JSON.parse(dataMatch[1]) : {}
      handlers[eventName]?.(data)
    }
  }
}
