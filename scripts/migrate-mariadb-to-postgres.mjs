import mysql from 'mysql2/promise'
import pg from 'pg'

import {
    buildInsert,
    convertValueForPostgres,
    orderedTables,
    quotePostgresIdentifier,
} from './postgres-migration-lib.mjs'

const { Client } = pg
const apply = process.argv.includes('--apply')
const verifyOnly = process.argv.includes('--verify') || !apply
const sourceUrl = process.env.MARIADB_DATABASE_URL
const targetUrl = process.env.POSTGRES_DATABASE_URL
const batchSize = Number(process.env.POSTGRES_MIGRATION_BATCH_SIZE || 250)

if (!sourceUrl || !targetUrl) {
    console.error('MARIADB_DATABASE_URL ve POSTGRES_DATABASE_URL gerekli.')
    process.exit(2)
}
if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    console.error('POSTGRES_MIGRATION_BATCH_SIZE 1-1000 arasında olmalı.')
    process.exit(2)
}

const source = await mysql.createConnection({ uri: sourceUrl, dateStrings: false })
const target = new Client({ connectionString: targetUrl })
await target.connect()

async function sourceTables() {
    const [rows] = await source.query(`
        SELECT TABLE_NAME AS tableName
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME <> '_prisma_migrations'
        ORDER BY TABLE_NAME
    `)
    return rows.map((row) => row.tableName)
}

async function targetTables() {
    const result = await target.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
          AND table_name <> '_prisma_migrations'
        ORDER BY table_name
    `)
    return result.rows.map((row) => row.table_name)
}

async function dependencies() {
    const [rows] = await source.query(`
        SELECT TABLE_NAME AS childTable, REFERENCED_TABLE_NAME AS parentTable
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
    `)
    const result = new Map()
    for (const row of rows) {
        if (!result.has(row.childTable)) result.set(row.childTable, new Set())
        result.get(row.childTable).add(row.parentTable)
    }
    return result
}

async function pgColumns(table) {
    const result = await target.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1
        ORDER BY ordinal_position
    `, [table])
    return new Map(result.rows.map((row) => [row.column_name, row.data_type]))
}

async function counts(tables) {
    const result = []
    for (const table of tables) {
        const [[sourceCount]] = await source.query(`SELECT COUNT(*) AS count FROM ${mysql.escapeId(table)}`)
        const targetCount = await target.query(`SELECT COUNT(*)::bigint AS count FROM ${quotePostgresIdentifier(table)}`)
        result.push({ table, source: Number(sourceCount.count), target: Number(targetCount.rows[0].count) })
    }
    return result
}

try {
    const mariaTables = await sourceTables()
    const postgresTables = await targetTables()
    const missing = mariaTables.filter((table) => !postgresTables.includes(table))
    if (missing.length) throw new Error(`PostgreSQL şemasında eksik tablo var: ${missing.join(', ')}`)

    if (apply) {
        const expectedDatabase = new URL(targetUrl).pathname.slice(1)
        if (!expectedDatabase || process.env.CONFIRM_POSTGRES_RESET !== expectedDatabase) {
            throw new Error('Hedefi sıfırlamak için CONFIRM_POSTGRES_RESET hedef veritabanı adıyla aynı olmalı')
        }

        const tableOrder = orderedTables(mariaTables, await dependencies())
        await target.query('BEGIN')
        try {
            await target.query('SET LOCAL session_replication_role = replica')
            const truncateList = postgresTables.map(quotePostgresIdentifier).join(', ')
            if (truncateList) await target.query(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`)

            for (const table of tableOrder) {
                const typeMap = await pgColumns(table)
                const columns = [...typeMap.keys()]
                let offset = 0
                let copied = 0
                while (true) {
                    const [rows] = await source.query(
                        `SELECT * FROM ${mysql.escapeId(table)} LIMIT ? OFFSET ?`,
                        [batchSize, offset],
                    )
                    if (!rows.length) break
                    const statement = buildInsert(table, columns, rows.length)
                    const values = rows.flatMap((row) => columns.map((column) =>
                        convertValueForPostgres(row[column], typeMap.get(column)),
                    ))
                    await target.query(statement, values)
                    offset += rows.length
                    copied += rows.length
                }
                console.log(`${table}: ${copied} satır kopyalandı`)
            }
            await target.query('COMMIT')
        } catch (error) {
            await target.query('ROLLBACK')
            throw error
        }
    }

    if (verifyOnly || apply) {
        const comparison = await counts(mariaTables)
        const mismatches = comparison.filter((item) => item.source !== item.target)
        for (const item of comparison) console.log(`${item.table}: MariaDB=${item.source}, PostgreSQL=${item.target}`)
        if (mismatches.length) throw new Error(`${mismatches.length} tabloda satır sayısı uyuşmuyor`)
        console.log(`${comparison.length} tablo doğrulandı; satır sayıları eşleşiyor.`)
    }
} catch (error) {
    console.error(`Taşıma başarısız: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`)
    process.exitCode = 1
} finally {
    await Promise.allSettled([source.end(), target.end()])
}
