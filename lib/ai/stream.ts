type OpenAIUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }

// A provider EOF is only a complete answer after its explicit [DONE] marker.
// Frame the downstream stream so a browser can also distinguish completion.
export function createAiEventStream(
    openaiStream: ReadableStream<Uint8Array>,
    onUsage?: (usage: OpenAIUsage) => Promise<void>,
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    return new ReadableStream({
        async start(controller) {
            const reader = openaiStream.getReader()
            let buffer = ''
            let capturedUsage: OpenAIUsage | null = null
            let completed = false
            let failed = false

            const consumeLine = (line: string) => {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data: ')) return
                const data = trimmed.slice(6)
                if (data === '[DONE]') {
                    completed = true
                    return
                }
                if (completed) throw new Error('Provider sent data after completion')
                const parsed = JSON.parse(data)
                if (parsed.usage) capturedUsage = parsed.usage
                const content = parsed.choices?.[0]?.delta?.content
                if (typeof content === 'string' && content) {
                    controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(content)}\n\n`))
                }
            }

            try {
                while (!completed) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? ''
                    for (const line of lines) consumeLine(line)
                }
                if (!completed) consumeLine(buffer + decoder.decode())
                if (!completed) failed = true
            } catch {
                failed = true
                console.error('ai.stream_incomplete')
            } finally {
                if (capturedUsage && onUsage) {
                    try { await onUsage(capturedUsage) } catch { console.error('ai.usage_unavailable') }
                }
                try { await reader.cancel() } catch { /* the provider may already have failed */ }
                reader.releaseLock()
                try {
                    controller.enqueue(encoder.encode(failed ? 'event: error\ndata: "incomplete"\n\n' : 'event: done\ndata: {}\n\n'))
                    controller.close()
                } catch { /* the downstream request was canceled */ }
            }
        },
    })
}
