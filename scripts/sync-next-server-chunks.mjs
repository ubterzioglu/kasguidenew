import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const serverDir = join(process.cwd(), '.next', 'server')
const chunksDir = join(serverDir, 'chunks')

if (!existsSync(serverDir) || !existsSync(chunksDir)) {
  console.log('Next server chunks klasoru bulunamadi, atlandi.')
  process.exit(0)
}

mkdirSync(serverDir, { recursive: true })

const files = readdirSync(chunksDir).filter((file) => file.endsWith('.js'))

for (const file of files) {
  copyFileSync(join(chunksDir, file), join(serverDir, file))
}

console.log(`Next server chunk senkronizasyonu tamamlandi: ${files.length} dosya`) 