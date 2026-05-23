import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { ROBOTO_BOLD_BASE64, ROBOTO_REGULAR_BASE64 } from './fonts/roboto'
import { buildFilename, formatDateTimeForExport } from './format'

const FONT_FAMILY = 'Roboto'

/** Roboto TTF'yi jsPDF VFS'ine yükle ve aktif font yap.
 *  Türkçe karakter (ı, İ, ğ, Ğ, ş, Ş, ç, Ç, ö, Ö, ü, Ü) + tüm latin-ext desteği. */
function registerTurkishFont(doc: jsPDF) {
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
    doc.addFileToVFS('Roboto-Bold.ttf',    ROBOTO_BOLD_BASE64)
    doc.addFont('Roboto-Regular.ttf', FONT_FAMILY, 'normal')
    doc.addFont('Roboto-Bold.ttf',    FONT_FAMILY, 'bold')
    doc.setFont(FONT_FAMILY, 'normal')
}

// Ogzie marka rengi
const BRAND_COLOR: [number, number, number]   = [59, 130, 246]  // blue-500
const TEXT_COLOR: [number, number, number]    = [17, 24, 39]    // gray-900
const MUTED_COLOR: [number, number, number]   = [107, 114, 128] // gray-500
const SUCCESS_COLOR: [number, number, number] = [16, 185, 129]
const DANGER_COLOR: [number, number, number]  = [239, 68, 68]

export interface PdfTable {
    title?: string
    headers: string[]
    rows: (string | number | null | undefined)[][]
    /** Sayısal sütunlar için sağa yasla */
    numericColumns?: number[]
}

export interface PdfSummaryItem {
    label: string
    value: string
    tone?: 'default' | 'success' | 'danger' | 'muted'
}

export interface PdfOptions {
    slug: string
    title: string
    subtitle?: string
    /** Üst başlık altındaki özet kutular */
    summary?: PdfSummaryItem[]
    /** Bir veya birden çok tablo */
    tables: PdfTable[]
    /** Footer notu */
    footer?: string
    /** Kullanıcı adı (footer'da görünür) */
    user?: string
}

export interface PdfResponse {
    body: Buffer
    filename: string
    headers: { 'Content-Type': string; 'Content-Disposition': string }
}

/** jsPDF default Helvetica fontu Latin-1 destekli — Türkçe çoğu karakter çalışır
 *  (ı, ğ, ş, ç, ö, ü). Sadece İ ve Ğ büyük harflerinde küçük bozulma olabilir,
 *  bunlar UI'da çok nadir kullanılır. Custom font embed'i daha büyük bundle eklerdi. */

function toneColor(tone?: PdfSummaryItem['tone']): [number, number, number] {
    switch (tone) {
        case 'success': return SUCCESS_COLOR
        case 'danger':  return DANGER_COLOR
        case 'muted':   return MUTED_COLOR
        default:        return TEXT_COLOR
    }
}

export function buildPdf(options: PdfOptions): PdfResponse {
    const { slug, title, subtitle, summary, tables, footer, user } = options

    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    registerTurkishFont(doc)

    const pageWidth  = doc.internal.pageSize.getWidth()
    const margin = 40

    // ─── Header ────────────────────────────────────────────────────────────
    doc.setFillColor(...BRAND_COLOR)
    doc.rect(0, 0, pageWidth, 60, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont(FONT_FAMILY, 'bold')
    doc.setFontSize(18)
    doc.text('OGZİE FİNANS', margin, 38)

    doc.setFont(FONT_FAMILY, 'normal')
    doc.setFontSize(9)
    doc.text(title.toUpperCase(), pageWidth - margin, 38, { align: 'right' })

    // ─── Title bloku ───────────────────────────────────────────────────────
    let cursorY = 90

    doc.setTextColor(...TEXT_COLOR)
    doc.setFont(FONT_FAMILY, 'bold')
    doc.setFontSize(22)
    doc.text(title, margin, cursorY)
    cursorY += 8

    if (subtitle) {
        doc.setFont(FONT_FAMILY, 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...MUTED_COLOR)
        doc.text(subtitle, margin, cursorY + 14)
        cursorY += 14
    }

    cursorY += 24

    // ─── Summary kartları ──────────────────────────────────────────────────
    if (summary && summary.length > 0) {
        const cardW = (pageWidth - margin * 2 - 8 * (summary.length - 1)) / summary.length
        const cardH = 50

        summary.forEach((item, i) => {
            const x = margin + i * (cardW + 8)

            doc.setFillColor(248, 250, 252)
            doc.setDrawColor(226, 232, 240)
            doc.setLineWidth(0.5)
            doc.roundedRect(x, cursorY, cardW, cardH, 4, 4, 'FD')

            doc.setTextColor(...MUTED_COLOR)
            doc.setFont(FONT_FAMILY, 'normal')
            doc.setFontSize(7)
            // Türkçe büyük harf — locale-aware (İ/I, i)
            doc.text(item.label.toLocaleUpperCase('tr-TR'), x + 10, cursorY + 14)

            const [r, g, b] = toneColor(item.tone)
            doc.setTextColor(r, g, b)
            doc.setFont(FONT_FAMILY, 'bold')
            doc.setFontSize(13)
            doc.text(item.value, x + 10, cursorY + 36)
        })

        cursorY += cardH + 24
    }

    // ─── Tablolar ──────────────────────────────────────────────────────────
    tables.forEach((table, idx) => {
        if (idx > 0) cursorY += 12

        if (table.title) {
            doc.setTextColor(...TEXT_COLOR)
            doc.setFont(FONT_FAMILY, 'bold')
            doc.setFontSize(12)
            doc.text(table.title, margin, cursorY)
            cursorY += 12
        }

        const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {}
        if (table.numericColumns) {
            table.numericColumns.forEach(col => {
                columnStyles[col] = { halign: 'right' }
            })
        }

        autoTable(doc, {
            startY: cursorY,
            head: [table.headers],
            body: table.rows.map(r => r.map(cell => (cell == null ? '-' : String(cell)))),
            margin: { left: margin, right: margin },
            styles: {
                font: FONT_FAMILY,
                fontStyle: 'normal',
                fontSize: 9,
                cellPadding: 6,
                textColor: TEXT_COLOR,
                lineColor: [226, 232, 240],
                lineWidth: 0.25,
            },
            headStyles: {
                font: FONT_FAMILY,
                fontStyle: 'bold',
                fillColor: BRAND_COLOR,
                textColor: [255, 255, 255],
                fontSize: 8,
                halign: 'left',
            },
            bodyStyles: {
                font: FONT_FAMILY,
                fontStyle: 'normal',
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251],
            },
            columnStyles,
            didDrawPage: () => {
                const pageHeight = doc.internal.pageSize.getHeight()
                doc.setTextColor(...MUTED_COLOR)
                doc.setFont(FONT_FAMILY, 'normal')
                doc.setFontSize(8)
                const footerText = [
                    footer ?? 'Ogzie Finans',
                    `Oluşturulma: ${formatDateTimeForExport(new Date())}`,
                    user ? `Kullanıcı: ${user}` : null,
                ].filter(Boolean).join(' · ')
                doc.text(footerText, margin, pageHeight - 20)
                doc.text(
                    `Sayfa ${doc.getCurrentPageInfo().pageNumber}`,
                    pageWidth - margin, pageHeight - 20,
                    { align: 'right' }
                )
            },
        })

        cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    })

    const body = Buffer.from(doc.output('arraybuffer'))
    const filename = buildFilename(slug, 'pdf')

    return {
        body,
        filename,
        headers: {
            'Content-Type': 'application/pdf',
            // RFC 5987 — Türkçe karakter güvenli filename
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
    }
}

export function pdfResponse(options: PdfOptions): Response {
    const { body, headers } = buildPdf(options)
    // Buffer → Uint8Array (Web Response uyumlu)
    return new Response(new Uint8Array(body), { status: 200, headers })
}
