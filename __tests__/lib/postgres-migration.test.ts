import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
    buildInsert,
    convertValueForPostgres,
    orderedTables,
    quotePostgresIdentifier,
} from '../../scripts/postgres-migration-lib.mjs'

describe('PostgreSQL migration helpers', () => {
    it('keeps the staged schema identical except for the datasource provider', () => {
        const root = process.cwd()
        const mysqlSchema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
        const postgresSchema = readFileSync(join(root, 'prisma/postgresql/schema.prisma'), 'utf8')
        expect(postgresSchema).toBe(mysqlSchema.replace('provider = "mysql"', 'provider = "postgresql"'))
    })

    it('quotes identifiers and parameterizes inserts', () => {
        expect(quotePostgresIdentifier('OgzieCommand')).toBe('"OgzieCommand"')
        expect(buildInsert('User', ['id', 'email'], 2)).toBe(
            'INSERT INTO "User" ("id", "email") VALUES ($1, $2), ($3, $4)',
        )
    })

    it('orders parent tables before children', () => {
        const dependencies = new Map([
            ['Transaction', new Set(['User', 'Account'])],
            ['Account', new Set(['User'])],
        ])
        expect(orderedTables(['Transaction', 'User', 'Account'], dependencies)).toEqual([
            'User', 'Account', 'Transaction',
        ])
    })

    it('converts MariaDB boolean and JSON values', () => {
        expect(convertValueForPostgres(1, 'boolean')).toBe(true)
        expect(convertValueForPostgres(0, 'boolean')).toBe(false)
        expect(convertValueForPostgres('{"ok":true}', 'jsonb')).toEqual({ ok: true })
        expect(convertValueForPostgres(Buffer.from('{"from":"mariadb"}'), 'json')).toEqual({ from: 'mariadb' })
    })
})
