// POST streams use explicit SSE events so an early EOF is never a successful answer.
export async function readAiResponse(response: Response, onChunk: (text: string) => void): Promise<void> {
    if (!response.ok) throw new Error('AI request failed')

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
        const data = await response.json()
        if (typeof data.text !== 'string') throw new Error('Invalid AI response')
        onChunk(data.text)
        return
    }
    if (!contentType.includes('text/event-stream') || !response.body) throw new Error('Invalid AI stream')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completed = false

    const consume = (frame: string) => {
        let event = ''
        const data: string[] = []
        for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7)
            if (line.startsWith('data: ')) data.push(line.slice(6))
        }
        if (event === 'chunk') {
            if (completed) throw new Error('AI data after completion')
            const text: unknown = JSON.parse(data.join('\n'))
            if (typeof text !== 'string') throw new Error('Invalid AI chunk')
            onChunk(text)
        } else if (event === 'done') {
            completed = true
        } else if (event === 'error') {
            throw new Error('AI stream incomplete')
        }
    }

    try {
        while (!completed) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')
            let end = buffer.indexOf('\n\n')
            while (end !== -1) {
                consume(buffer.slice(0, end))
                buffer = buffer.slice(end + 2)
                end = buffer.indexOf('\n\n')
            }
        }
        if (!completed) throw new Error('AI stream incomplete')
    } finally {
        try { await reader.cancel() } catch { /* the transport may already have failed */ }
        reader.releaseLock()
    }
}
