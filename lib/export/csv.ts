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
        quotes: true,
        delimiter: ',',
        newline: '\r\n',
    })

    const body = bom ? '﻿' + csv : csv
    const filename = buildFilename(slug, 'csv')

    return {
        body,
        filename,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    }
}

/** Next.js Response objesi olarak döndürür */
export function csvResponse(options: CsvOptions): Response {
    const { body, headers } = buildCsv(options)
    return new Response(body, { status: 200, headers })
}
