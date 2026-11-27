// 8-Bit Arcade Pack online leaderboards. Cloudflare Worker + D1 (binding: DB).
// Stores: game, mode, player name, random player id, score, short detail, country code, time.
// Never stores IP addresses. Country comes from Cloudflare's request.cf.country.
const GAMES = { dungeon: 300000, wallmaze: 2000, fleet: 2000, pool: 2000, cowboy: 600000, gangster: 600000 };
const NAME = /^[A-Z0-9 _.-]{1,12}$/;
const MODE = /^(main|daily-\d{4}-\d{2}-\d{2})$/;
const BLOCK = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAGG', 'RAPE', 'NAZI', 'HITLER', 'WHORE', 'SLUT', 'PUSSY', 'DICK', 'COCK', 'KKK'];

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
};
const json = (o, status = 200, extra = {}) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...cors, ...extra } });

const SCHEMA = `CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL, mode TEXT NOT NULL, name TEXT NOT NULL, player TEXT NOT NULL,
  score INTEGER NOT NULL, detail TEXT, country TEXT, created_at INTEGER NOT NULL)`;

async function ensure(env) {
  await env.DB.batch([
    env.DB.prepare(SCHEMA),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS s_board ON scores (game, mode, score DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS s_country ON scores (game, mode, country, score DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS s_player ON scores (player, created_at)')
  ]);
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const country = (req.cf && req.cf.country) || 'XX';
    try {
      if (url.pathname === '/top' && req.method === 'GET') return await top(url, env, country);
      if (url.pathname === '/score' && req.method === 'POST') return await score(req, env, country);
      if (url.pathname === '/player' && req.method === 'DELETE') return await forget(url, env);
      if (url.pathname === '/' ) return json({ ok: true, service: '8-Bit Arcade Pack leaderboards' });
      return json({ error: 'not found' }, 404);
    } catch (e) {
      if (String(e).includes('no such table')) { await ensure(env); return json({ error: 'retry' }, 503); }
      return json({ error: 'server' }, 500);
    }
  }
};

async function top(url, env, myCountry) {
  const game = url.searchParams.get('game'), mode = url.searchParams.get('mode') || 'main';
  const scope = url.searchParams.get('scope') === 'country' ? 'country' : 'world';
  if (!(game in GAMES) || !MODE.test(mode)) return json({ error: 'bad request' }, 400);
  let c = (url.searchParams.get('country') || myCountry).toUpperCase().slice(0, 2);
  const where = scope === 'country' ? 'AND country = ?3' : '';
  const binds = scope === 'country' ? [game, mode, c] : [game, mode];
  // best score per player
  const { results } = await env.DB.prepare(
    `SELECT name, MAX(score) AS s, detail, country, created_at FROM scores
     WHERE game = ?1 AND mode = ?2 ${where} GROUP BY player ORDER BY s DESC, created_at ASC LIMIT 20`
  ).bind(...binds).all();
  const rows = results.map(r => ({ n: r.name, s: r.s, d: r.detail, c: r.country, t: r.created_at }));
  return json({ scope, country: c, rows }, 200, { 'cache-control': 'public, max-age=20' });
}

async function score(req, env, country) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const game = String(b.game || ''), mode = String(b.mode || 'main');
  const name = String(b.name || '').toUpperCase().trim();
  const player = String(b.player || '').slice(0, 64);
  const s = Math.round(Number(b.score));
  const detail = String(b.detail || '').replace(/[<>]/g, '').slice(0, 40);
  if (!(game in GAMES) || !MODE.test(mode) || !NAME.test(name) || player.length < 8 ||
      !Number.isFinite(s) || s < 1 || s > GAMES[game]) return json({ error: 'rejected' }, 400);
  const squash = name.replace(/[^A-Z]/g, '');
  if (BLOCK.some(w => squash.includes(w))) return json({ error: 'name not allowed' }, 400);
  const now = Date.now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE player = ?1 AND created_at > ?2')
    .bind(player, now - 10 * 60 * 1000).first();
  if (recent && recent.n >= 20) return json({ error: 'slow down' }, 429);
  // keep the name consistent for this player, and store the score
  await env.DB.batch([
    env.DB.prepare('UPDATE scores SET name = ?1 WHERE player = ?2').bind(name, player),
    env.DB.prepare('INSERT INTO scores (game, mode, name, player, score, detail, country, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)')
      .bind(game, mode, name, player, s, detail, country, now)
  ]);
  const best = await env.DB.prepare('SELECT MAX(score) AS b FROM scores WHERE game=?1 AND mode=?2 AND player=?3').bind(game, mode, player).first();
  const mine = best ? best.b : s;
  const w = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM (SELECT player, MAX(score) AS m FROM scores WHERE game=?1 AND mode=?2 GROUP BY player) WHERE m > ?3'
  ).bind(game, mode, mine).first();
  const k = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM (SELECT player, MAX(score) AS m FROM scores WHERE game=?1 AND mode=?2 AND country=?3 GROUP BY player) WHERE m > ?4'
  ).bind(game, mode, country, mine).first();
  return json({ ok: true, best: mine, world: (w ? w.n : 0) + 1, countryRank: (k ? k.n : 0) + 1, country });
}

async function forget(url, env) {
  const player = String(url.searchParams.get('player') || '').slice(0, 64);
  if (player.length < 8) return json({ error: 'bad request' }, 400);
  const r = await env.DB.prepare('DELETE FROM scores WHERE player = ?1').bind(player).run();
  return json({ ok: true, deleted: r.meta ? r.meta.changes : 0 });
}
