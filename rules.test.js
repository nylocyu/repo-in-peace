import test from 'node:test';
import assert from 'node:assert/strict';
import * as r from './rules.js';

test('cemetery rules', () => {
  const link = '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=57>; rel="last"';
  assert.equal(r.lastPage(link), 57);
  assert.equal(r.lastPage(null), 1);

  assert.equal(r.status({ diedAt: null, lastCommit: '2026-01-01' }), 'hospice');
  assert.equal(r.status({ diedAt: '2026-02-01', lastCommit: '2026-01-01' }), 'dead');
  assert.equal(r.status({ diedAt: '2026-02-01', lastCommit: '2026-03-01' }), 'zombie');

  assert.equal(r.tomb(1, 0), 'cross');
  assert.equal(r.tomb(10, 0), 'stone');
  assert.equal(r.tomb(80, 3), 'marble');
  assert.equal(r.tomb(80, 120), 'mausoleum');
});

test('settle: alive -> hospice -> dead -> zombie -> dead', () => {
  const now = Date.parse('2026-11-12');
  assert.equal(r.settle({ diedAt: null, lastCommit: '2026-11-01' }, now), false); // 11 days: alive

  const g = { diedAt: null, lastCommit: '2026-09-01' }; // 72 days
  assert.equal(r.settle(g, now), true);
  assert.equal(r.status(g), 'hospice');

  const old = { diedAt: null, lastCommit: '2026-08-01' }; // 103 days
  r.settle(old, now);
  assert.equal(r.status(old), 'dead');
  assert.equal(old.diedAt, new Date(now).toISOString());

  old.lastCommit = '2026-11-20'; // risen after the funeral
  assert.equal(r.settle(old, Date.parse('2026-11-25')), true, 'zombies stay in the cemetery');
  assert.equal(r.status(old), 'zombie');
  const later = Date.parse('2027-02-20'); // 92 quiet days later
  r.settle(old, later);
  assert.equal(r.status(old), 'dead');

  g.lastCommit = '2026-11-11'; // hospice patient recovered
  assert.equal(r.settle(g, now), false);
});

test('plots', () => {
  assert.equal(r.rowsFor([]), 4);
  assert.equal(r.rowsFor([47]), 5); // a grave in row 4 opens a fresh empty row
  const front = Array.from({ length: 35 }, (_, i) => i); // 0..34 taken, 35 is the last free front plot
  assert.equal(r.randomPlot(front), 35);
  const p = r.randomPlot([...front, 35]);
  assert.ok(p >= 36 && p < 48, `falls back to the back row, got ${p}`);
});
