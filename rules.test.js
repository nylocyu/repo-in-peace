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

test('cemetery access and invites', () => {
  const cem = { ...r.defaultCemetery('Alice'), guests: ['bob'], inviteToken: 'tok123' };
  assert.equal(cem.loginRequired, true, 'sign-in required by default');
  assert.equal(r.canEnter(null, undefined), true, 'Zentralfriedhof is open to everyone');
  assert.equal(r.canEnter(cem, 'alice'), true);
  assert.equal(r.canEnter(cem, 'ALICE'), true, 'logins are case-insensitive');
  assert.equal(r.canEnter(cem, 'Bob'), true);
  assert.equal(r.canEnter(cem, 'eve'), false);
  assert.equal(r.canEnter(cem, undefined), false);
  assert.equal(r.canEnter(cem, undefined, 'tok123'), false, 'sign-in required: the link alone is not enough');

  const open = { ...cem, loginRequired: false };
  assert.equal(r.canEnter(open, undefined, 'tok123'), true, 'no sign-in: the link is enough');
  assert.equal(r.canEnter(open, 'eve', 'tok123'), true);
  assert.equal(r.canEnter(open, undefined, 'tok124'), false);
  assert.equal(r.canEnter(open, undefined), false, 'no link, no entry');
  assert.equal(r.canEnter({ ...open, inviteToken: 'new456' }, undefined, 'tok123'), false, 'resetting the link locks old holders out');
  assert.equal(r.canEnter({ ...open, inviteToken: null }, undefined, null), false);

  assert.equal(r.inviteOk({ ...cem, inviteToken: null }, 'anything'), false, 'no link, no entry');
  assert.equal(r.inviteOk(cem, 'tok123'), true);
  assert.equal(r.inviteOk(cem, 'tok124'), false);
  assert.equal(r.inviteOk(cem, 'tok'), false);
  assert.equal(r.inviteOk(cem, undefined), false);
  assert.equal(r.inviteOk(cem, ['tok123']), false);
});

test('private repos never leak out of their cemetery', () => {
  const base = { owner: 'Alice', cemetery: 'alice', commits: 3, stars: 0, lastCommit: '2026-01-01', diedAt: '2026-05-01', epitaph: 'rip' };
  const pub = { ...base, id: '1', plot: 0, centralPlot: 7, name: 'open', full: 'alice/open' };
  const priv = { ...base, id: '2', plot: 1, centralPlot: 8, // centralPlot should be impossible (DB check), the view must still hold
    name: 'topsecret', full: 'alice/topsecret', url: 'https://github.com/alice/topsecret', lastWords: 'leak creds',
    epitaph: 'topsecret obituary', private: true, showName: true, showLastWords: true };
  const other = { ...base, id: '3', plot: 0, centralPlot: null, owner: 'carol', cemetery: 'carol', name: 'carols', full: 'carol/carols' };
  const all = [pub, priv, other];
  const cem = { ...r.defaultCemetery('alice'), guests: ['bob'], inviteToken: 'tok123' };
  const leaks = v => /topsecret|leak creds|"2"/.test(JSON.stringify(v));

  const central = r.cemeteryView(all, null, 'eve');
  assert.deepEqual(central.graves.map(g => g.id), ['1']);
  assert.equal(central.graves[0].plot, 7, 'central placement keeps its own plot');
  assert.equal(central.graves[0].central, true);
  assert.ok(!leaks(central), 'private repo leaks onto the Zentralfriedhof');
  assert.ok(!leaks(r.cemeteryView(all, null, 'alice')), 'not even for the owner');
  assert.ok(!leaks(r.cemeteryView(all, null, undefined, 'tok123')), 'not even with the invite token');

  assert.equal(r.cemeteryView(all, cem, 'eve'), null, 'strangers get nothing');
  assert.equal(r.cemeteryView(all, cem, undefined), null);
  assert.equal(r.cemeteryView(all, cem, undefined, 'tok123'), null, 'sign-in required: token alone gets nothing');
  assert.equal(r.cemeteryView(all, { ...cem, loginRequired: false }, undefined, 'wrong'), null);

  const viewers = [['alice'], ['bob'], [undefined, 'tok123', { loginRequired: false }]];
  for (const [who, token, extra] of viewers) {
    const v = r.cemeteryView(all, { ...cem, ...extra }, who, token);
    assert.deepEqual(v.graves.map(g => g.id).sort(), ['1', '2'], `${who || 'link holder'} sees the private grave`);
    assert.equal(v.graves.find(g => g.id === '2').url, null, 'still never a link');
    assert.equal(v.graves.find(g => g.id === '1').plot, 0, 'own placement uses the own plot');
    assert.ok(!JSON.stringify(v).includes('carols'), 'other cemeteries stay out');
    assert.ok(v.graves.every(g => !('cemetery' in g) && !('centralPlot' in g)));
  }

  // A public repo that turned private drops off the Zentralfriedhof by itself
  assert.equal(r.cemeteryView([{ ...pub, private: true }], null, 'eve').graves.length, 0);
  assert.equal(r.mayGoCentral(pub), true);
  assert.equal(r.mayGoCentral(priv), false);
});
