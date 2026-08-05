import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'prisma', 'schema.prisma')
const targetDir = join(root, 'prisma', 'postgresql')
const targetPath = join(targetDir, 'schema.prisma')
const migrationDir = join(targetDir, 'migrations', '20260805213000_postgresql_baseline')
const migrationPath = join(migrationDir, 'migration.sql')

const source = await readFile(sourcePath, 'utf8')
const target = source.replace('provider = "mysql"', 'provider = "postgresql"')
if (target === source) throw new Error('MySQL datasource provider bulunamadı')

await mkdir(migrationDir, { recursive: true })
await writeFile(targetPath, target)
await writeFile(join(targetDir, 'migrations', 'migration_lock.toml'), 'provider = "postgresql"\n')

const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js')
const diff = spawnSync(process.execPath, [
    prismaCli,
    'migrate', 'diff',
    '--from-empty',
    '--to-schema-datamodel', targetPath,
    '--script',
], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: 'postgresql://prepare:prepare@127.0.0.1:5432/prepare' },
})

if (diff.status !== 0) {
    process.stderr.write(diff.stderr || 'PostgreSQL baseline üretilemedi.\n')
    process.exit(diff.status || 1)
}
await writeFile(migrationPath, diff.stdout)
console.log('PostgreSQL şeması ve başlangıç migration dosyası hazırlandı.')
