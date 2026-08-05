export function quotePostgresIdentifier(value: string): string
export function orderedTables(
    tables: string[],
    dependencies: Map<string, Set<string>>,
): string[]
export function convertValueForPostgres(value: unknown, dataType: string): unknown
export function buildInsert(table: string, columns: string[], rowCount: number): string
