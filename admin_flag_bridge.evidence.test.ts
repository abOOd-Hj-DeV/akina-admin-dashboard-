import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { mapFlag } from './src/services/data'
import { redFlagLabel } from './src/lib/red-flag-label'

const fixturePath = process.env.SAKINA_FLAG_BRIDGE_LOG

test.skipIf(!fixturePath)('Admin maps actor-scoped safety flag JSON emitted by disposable Laravel', () => {
  const line = readFileSync(fixturePath!, 'utf8')
    .split('\n').find(value => value.startsWith('FLAG_BRIDGE:admin:'))!
  const flags = JSON.parse(line.slice('FLAG_BRIDGE:admin:'.length)).data.map(mapFlag)
  const labels = flags.map((flag: ReturnType<typeof mapFlag>) => redFlagLabel(flag.type, flag.source))
  expect(labels).toContain('طلب دعم عاجل من التطبيق')
  expect(labels).toContain('إشارة سلامة من تقييم')
  expect(labels).toContain('بلاغ سلامة يحتاج إلى مراجعة')
  expect(flags.find((flag: ReturnType<typeof mapFlag>) => flag.source === 'manual_support')?.allowedDecisions)
    .toEqual(['reactivate', 'keep_hold'])
})
