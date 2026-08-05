import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'
import { createGzip } from 'node:zlib'

const sourceUrl = process.env.MARIADB_DATABASE_URL
const backupDir = process.env.MARIADB_BACKUP_DIR || '/backups'
const keepLatest = Number(process.env.MARIADB_BACKUP_KEEP_LATEST || 3)

if (!sourceUrl) {
    console.error('MARIADB_DATABASE_URL gerekli.')
    process.exit(2)
}
if (!Number.isSafeInteger(keepLatest) || keepLatest < 1 || keepLatest > 30) {
    console.error('MARIADB_BACKUP_KEEP_LATEST 1-30 arasında olmalı.')
    process.exit(2)
}

const url = new URL(sourceUrl)
const database = decodeURIComponent(url.pathname.slice(1))
if (!database) {
    console.error('MariaDB veritabanı adı bulunamadı.')
    process.exit(2)
}

const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '')
const filename = `finance-mariadb-${timestamp}.sql.gz`
const target = join(backupDir, filename)
await mkdir(backupDir, { recursive: true })

const dump = spawn('mariadb-dump', [
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    '--host', url.hostname,
    '--port', url.port || '3306',
    '--user', decodeURIComponent(url.username),
    database,
], {
    env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
    stdio: ['ignore', 'pipe', 'pipe'],
})

let stderr = ''
dump.stderr.setEncoding('utf8')
dump.stderr.on('data', (chunk) => { stderr += chunk })
const exit = new Promise((resolve, reject) => {
    dump.once('error', reject)
    dump.once('close', resolve)
})

try {
    await pipeline(dump.stdout, createGzip({ level: 9 }), createWriteStream(target, { mode: 0o600 }))
    const code = await exit
    if (code !== 0) throw new Error(stderr.trim() || `mariadb-dump exit ${code}`)

    const hash = createHash('sha256')
    await pipeline(createReadStream(target), hash)
    const checksum = hash.digest('hex')
    await writeFile(`${target}.sha256`, `${checksum}  ${filename}\n`, { mode: 0o600 })

    const files = (await readdir(backupDir))
        .filter((name) => /^finance-mariadb-.*\.sql\.gz$/.test(name))
        .sort()
        .reverse()
    for (const old of files.slice(keepLatest)) {
        await Promise.allSettled([
            rm(join(backupDir, old)),
            rm(join(backupDir, `${old}.sha256`)),
        ])
    }

    const info = await stat(target)
    const writtenChecksum = await readFile(`${target}.sha256`, 'utf8')
    if (!writtenChecksum.startsWith(checksum)) throw new Error('backup_checksum_write_failed')
    console.log(`MariaDB yedeği hazır: ${filename} (${info.size} bayt, SHA-256 doğrulandı)`)
} catch (error) {
    await Promise.allSettled([rm(target), rm(`${target}.sha256`)])
    console.error(`MariaDB yedeği alınamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`)
    process.exitCode = 1
}
