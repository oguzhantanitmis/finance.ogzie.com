import { describe, expect, it } from 'vitest'

import {
    buildInsert,
    convertValueForPostgres,
    orderedTables,
    quotePostgresIdentifier,
} from '../../scripts/postgres-migration-lib.mjs'

describe('PostgreSQL migration helpers', () => {
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
        expect(convertValueForPostgres('{"ok":true}', 'jsonb')).toBe('{"ok":true}')
        expect(convertValueForPostgres(['one', 'two'], 'jsonb')).toBe('["one","two"]')
        expect(convertValueForPostgres(Buffer.from('{"from":"mariadb"}'), 'json')).toBe('{"from":"mariadb"}')
    })
})
