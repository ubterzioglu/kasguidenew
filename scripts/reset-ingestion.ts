import { writeFile } from 'node:fs/promises'

import { getSupabaseAdminClient } from './lib/supabase-admin.ts'

async function main() {
  const client = getSupabaseAdminClient()
  const dryRun = process.argv.includes('--dry-run')

  const targets = [
    { table: 'review_queue', key: 'id' },
    { table: 'place_content', key: 'place_id' },
    { table: 'place_images', key: 'id' },
    { table: 'place_sources', key: 'id' },
    { table: 'places', key: 'id' },
    { table: 'raw_places', key: 'id' },
    { table: 'grid_sweep_cells', key: 'id' },
    { table: 'grid_sweeps', key: 'id' },
  ] as const

  const summary: Array<{ table: string; deleted: number }> = []

  for (const target of targets) {
    const { count, error } = await client
      .from(target.table)
      .select('*', { count: 'exact', head: true })
      .not(target.key, 'is', null)

    if (error) {
      throw new Error(`${target.table} sayimi okunamadi: ${error.message}`)
    }

    const rowCount = count ?? 0

    if (!dryRun && rowCount > 0) {
      const { error: deleteError } = await client
        .from(target.table)
        .delete()
        .not(target.key, 'is', null)

      if (deleteError) {
        throw new Error(`${target.table} temizlenemedi: ${deleteError.message}`)
      }
    }

    summary.push({ table: target.table, deleted: rowCount })
  }

  if (!dryRun) {
    const template = [
      '# Kas Run Report',
      '',
      "Bu dosya grid sweep session'larinin append-only kaydidir.",
      '',
      'Kurallar:',
      '- Her session sonunda yeni bir blok eklenir.',
      '- Eski bloklar silinmez.',
      '- Bir session sadece 1 grid isler.',
      '- Bir sonraki session son bloktaki `next_candidates` listesinden devam eder.',
      '',
      '## Session Template',
      '',
      '```md',
      '## Session YYYY-MM-DD HH:mm',
      '- processed_cell: kas-google-grid-x1-y1',
      '- grid_key: X1Y1',
      '- grid_x: 1',
      '- grid_y: 1',
      '- status: completed',
      '- api_calls: 46',
      '- raw_rows_written: 249',
      '- next_candidates:',
      '  - X2Y1',
      '  - X0Y1',
      '  - X1Y2',
      '  - X1Y0',
      '- note: tek grid islendi, run sonlandirildi',
      '```',
      '',
    ].join('\n')

    await writeFile('docs/kas-run-report.md', template, 'utf8')
  }

  console.log(JSON.stringify({ dryRun, reset: summary }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
