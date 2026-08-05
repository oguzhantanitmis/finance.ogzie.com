export function quotePostgresIdentifier(value) {
    if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
        throw new Error('invalid_postgres_identifier')
    }
    return `"${value.replaceAll('"', '""')}"`
}

export function orderedTables(tables, dependencies) {
    const remaining = new Map(tables.map((table) => [table, new Set(dependencies.get(table) ?? [])]))
    const result = []

    while (remaining.size > 0) {
        const ready = [...remaining.entries()]
            .filter(([, parents]) => [...parents].every((parent) => !remaining.has(parent)))
            .map(([table]) => table)
            .sort()

        if (ready.length === 0) return [...result, ...[...remaining.keys()].sort()]
        for (const table of ready) {
            result.push(table)
            remaining.delete(table)
        }
    }
    return result
}

export function convertValueForPostgres(value, dataType) {
    if (value === null || value === undefined) return null
    if (dataType === 'boolean') return value === true || value === 1 || value === '1'
    if (dataType === 'json' || dataType === 'jsonb') {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            value = Buffer.from(value).toString('utf8')
        }
        if (typeof value !== 'string') return value
        try { return JSON.parse(value) } catch { throw new Error('invalid_json_value') }
    }
    return value
}

export function buildInsert(table, columns, rowCount) {
    if (!Number.isSafeInteger(rowCount) || rowCount < 1) throw new Error('invalid_row_count')
    const quotedColumns = columns.map(quotePostgresIdentifier)
    const values = Array.from({ length: rowCount }, (_, rowIndex) =>
        `(${columns.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(', ')})`,
    )
    return `INSERT INTO ${quotePostgresIdentifier(table)} (${quotedColumns.join(', ')}) VALUES ${values.join(', ')}`
}
