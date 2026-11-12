import { describe, expect, it } from 'vitest'
import { readAiResponse } from '@/lib/ai/read-response'

const encoder = new TextEncoder()
const response = (pieces: string[], fail = false) => new Response(new ReadableStream<Uint8Array>({
    start(controller) {
        for (const piece of pieces) controller.enqueue(encoder.encode(piece))
        if (fail) controller.error(new Error('transport lost'))
        else controller.close()
    },
}), { headers: { 'Content-Type': 'text/event-stream' } })

describe('AI response completion', () => {
    it('accepts split frames only after the done event', async () => {
        const chunks: string[] = []
        await readAiResponse(response(['event: chunk\ndata: "Mer', 'haba"\n\nevent: done\ndata: {}\n\n']), text => chunks.push(text))
        expect(chunks).toEqual(['Merhaba'])
    })

    it('keeps partial text but rejects provider error and premature EOF', async () => {
        for (const tail of ['event: error\ndata: "incomplete"\n\n', '']) {
            const chunks: string[] = []
            await expect(readAiResponse(response(['event: chunk\ndata: "Kısmi"\n\n', tail]), text => chunks.push(text))).rejects.toThrow('AI stream incomplete')
            expect(chunks).toEqual(['Kısmi'])
        }
    })

    it('rejects transport failure and error JSON instead of displaying them as answers', async () => {
        await expect(readAiResponse(response(['event: chunk\ndata: "Kısmi"\n\n'], true), () => {})).rejects.toThrow()
        await expect(readAiResponse(Response.json({ error: 'unavailable' }, { status: 503 }), () => {})).rejects.toThrow('AI request failed')
    })
})
