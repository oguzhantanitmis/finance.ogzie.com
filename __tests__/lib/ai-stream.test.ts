import { describe, expect, it, vi } from 'vitest'
import { createAiEventStream } from '@/lib/ai/stream'

const encoder = new TextEncoder()
const chunk = (text: string) => encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)

describe('AI provider stream completion', () => {
    it('only completes after [DONE] and records a received usage chunk', async () => {
        const onUsage = vi.fn().mockResolvedValue(undefined)
        const source = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(chunk('Yanıt'))
                controller.enqueue(encoder.encode('data: {"choices":[],"usage":{"total_tokens":3}}\n\ndata: [DONE]\n\n'))
                controller.close()
            },
        })
        await expect(new Response(createAiEventStream(source, onUsage)).text()).resolves.toBe('event: chunk\ndata: "Yanıt"\n\nevent: done\ndata: {}\n\n')
        expect(onUsage).toHaveBeenCalledWith({ total_tokens: 3 })
    })

    it('rejects a partial answer when the provider aborts', async () => {
        let provider!: ReadableStreamDefaultController<Uint8Array>
        const source = new ReadableStream<Uint8Array>({
            start(controller) { provider = controller },
        })
        const reader = createAiEventStream(source).getReader()
        provider.enqueue(chunk('Kısmi yanıt'))
        const first = await reader.read()
        expect(new TextDecoder().decode(first.value)).toBe('event: chunk\ndata: "Kısmi yanıt"\n\n')
        provider.error(new DOMException('Timed out', 'TimeoutError'))
        const remaining = await new Response(new ReadableStream({
            async pull(controller) {
                const next = await reader.read()
                if (next.done) controller.close()
                else controller.enqueue(next.value)
            },
        })).text()
        expect(remaining).toContain('event: error\ndata: "incomplete"')
        expect(remaining).not.toContain('event: done')
    })

    it('rejects a clean EOF without the completion marker', async () => {
        const source = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(chunk('Kısmi yanıt'))
                controller.close()
            },
        })
        await expect(new Response(createAiEventStream(source)).text()).resolves.toContain('event: error\ndata: "incomplete"')
    })
})
