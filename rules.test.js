import test from 'node:test';
import assert from 'node:assert/strict';
import * as r from './rules.js';

test('cemetery rules', () => {
  assert.equal(r.parseRepo('https://github.com/foo/bar.git'), 'foo/bar');
  assert.equal(r.parseRepo(' foo/my.repo '), 'foo/my.repo');
  assert.equal(r.parseRepo('../user'), null);
  assert.equal(r.parseRepo('not a repo'), null);

  const link = '<https://api.github.com/repositories/1/commits?per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=1&page=57>; rel="last"';
  assert.equal(r.lastPage(link), 57);
  assert.equal(r.lastPage(null), 1);

  assert.equal(r.status({ diedAt: null, lastCommit: '2026-01-01' }), 'hospice');
  assert.equal(r.status({ diedAt: '2026-02-01', lastCommit: '2026-01-01' }), 'dead');
  assert.equal(r.status({ diedAt: '2026-02-01', lastCommit: '2026-03-01' }), 'zombie');

  const now = Date.parse('2026-11-12');
  assert.equal(r.isDead('2026-08-01', now), true);
  assert.equal(r.isDead('2026-09-01', now), false); // 72 days: still hospice

  assert.equal(r.tomb(1, 0), 'cross');
  assert.equal(r.tomb(10, 0), 'stone');
  assert.equal(r.tomb(80, 3), 'marble');
  assert.equal(r.tomb(80, 120), 'mausoleum');
});

test('plots', () => {
  assert.equal(r.rowsFor([]), 4);
  assert.equal(r.rowsFor([47]), 5); // a grave in row 4 opens a fresh empty row
  assert.equal(r.isValidPlot(47, []), true);
  assert.equal(r.isValidPlot(48, []), false);
  assert.equal(r.isValidPlot(5, [5]), false);
  assert.equal(r.isValidPlot(1.5, []), false);

  const front = Array.from({ length: 35 }, (_, i) => i); // 0..34 taken, 35 is the last free front plot
  assert.equal(r.randomPlot(front), 35);
  const fullFront = [...front, 35];
  const p = r.randomPlot(fullFront);
  assert.ok(p >= 36 && p < 48, `falls back to the back row, got ${p}`);
  const some = front.slice(0, 10);
  for (let i = 0; i < 50; i++) { const q = r.randomPlot(some); assert.ok(!some.includes(q) && q < 36, `got ${q}`); }
});

test('private graves are masked', () => {
  const g = { full: 'me/secret', name: 'secret', url: 'https://github.com/me/secret', owner: 'me', lastWords: 'fix prod creds', by: { me: ['f'] } };
  assert.deepEqual(r.publicView(g), { full: 'me/secret', name: 'secret', url: 'https://github.com/me/secret', owner: 'me', lastWords: 'fix prod creds' });
  const p = r.publicView({ ...g, private: true, showName: false, showLastWords: false });
  assert.equal(p.url, null);
  assert.equal(p.name, 'Unknown project');
  assert.ok(!JSON.stringify(p).includes('secret'), 'name leaks');
  assert.ok(!JSON.stringify(p).includes('creds'), 'last words leak');
  assert.equal('by' in p, false);
  const shown = r.publicView({ ...g, private: true, showName: true, showLastWords: true });
  assert.equal(shown.full, 'me/secret');
  assert.equal(shown.lastWords, 'fix prod creds');
  assert.equal(shown.url, null);
});
