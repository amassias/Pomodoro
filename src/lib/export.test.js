import { expect, it } from 'vitest';
import { generateCSV } from './export';
it('exports quoted task names and tolerates malformed timestamps and spreadsheet formulas', () => {
  const csv = generateCSV({ '2026-10-14': [{ duration: 25, taskName: '=SUM(1,2)', timestamp: 'bad', completed: true }, { duration: 5, taskName: 'Say "hello"' }] });
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain('"Say ""hello"""');
  expect(csv).toContain('2026-10-14,25,');
});

it('does not label a legacy session with an unknown completion flag as failed', () => {
  expect(generateCSV({ '2026-10-14': [{ duration: 25 }] })).toContain(',Unknown,');
});
