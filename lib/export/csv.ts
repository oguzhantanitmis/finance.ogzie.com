import Papa from 'papaparse'

import { buildFilename } from './format'

export interface CsvOptions {
    /** Sayfa/modül slug'ı — dosya adı için */
    slug: string
    /** Sütun başlıkları */
    headers: string[]
    /** Satır verileri */
    rows: (string | number | null | undefined)[][]
    /** Excel UTF-8 BOM ekle (default true — TR karakterleri Excel'de doğru görünür) */
    bom?: boolean
}

export interface CsvResponse {
    body: string
    filename: string
    headers: { 'Content-Type': string; 'Content-Disposition': string }
}

/** CSV'yi serialize eder, Excel-uyumlu UTF-8 BOM ile birlikte */
export function buildCsv(options: CsvOptions): CsvResponse {
    const { slug, headers, rows, bom = true } = options

    const data = [
        headers,
        ...rows.map(r => r.map(cell => (cell == null ? '' : String(cell)))),
    ]

    const csv = Papa.unparse(data, {
        quotes: true,        // Tüm hücreleri çift tırnak içinde — Türkçe ve özel karakter güvenliği
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ';',      // Türkçe Excel için noktalı virgül (TR locale virgülü ondalık ayırıcı kabul eder)
        newline: '\r\n',
    })

    // Excel'in CSV'yi UTF-8 + locale-aware açabilmesi için:
    // 1. BOM (Byte Order Mark) — UTF-8 işareti
    // 2. "sep=;" header (Microsoft Excel uyumluluğu)
    const prefix = bom ? '﻿sep=;\r\n' : 'sep=;\r\n'
    const body = prefix + csv
    const filename = buildFilename(slug, 'csv')

    return {
        body,
        filename,
        headers: {
            // RFC 5987 — Türkçe karakterli dosya adı için filename*=UTF-8''<encoded>
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
    }
}

/** Next.js Response objesi olarak döndürür */
export function csvResponse(options: CsvOptions): Response {
    const { body, headers } = buildCsv(options)
    return new Response(body, { status: 200, headers })
}
