export { Lobby } from './lobby.js';
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
    env.DB.prepare('CREATE INDEX IF NOT EXISTS s_player ON scores (player, created_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS champions (id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, size INTEGER NOT NULL, name TEXT NOT NULL, country TEXT, created_at INTEGER NOT NULL, player TEXT)')
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
      if (url.pathname === '/api/health') return json({ ok: true, service: '8-Bit Arcade Pack' });
      if (url.pathname === '/api/room/new' && req.method === 'POST') return newRoom();
      const lb = url.pathname.match(/^\/api\/lobby\/(fleet|wallmaze|pool)$/);
      if (lb) return env.LOBBY.get(env.LOBBY.idFromName('lobby-' + lb[1])).fetch(req);
      if (url.pathname === '/api/champions' && req.method === 'GET') return await champions(url, env);
      const m = url.pathname.match(/^\/api\/room\/([A-Z0-9]{5})$/);
      if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
      return site(req, url);
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
  let c = { meta: { changes: 0 } }; try { c = await env.DB.prepare('DELETE FROM champions WHERE player = ?1').bind(player).run(); } catch {}
  return json({ ok: true, deleted: (r.meta ? r.meta.changes : 0) + (c.meta ? c.meta.changes : 0) });
}

/* ---------- the game files, served from the GitHub Pages copy ---------- */
const ORIGIN = 'https://sydgolee.github.io/Arcade-pack';
async function site(req, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'not found' }, 404);
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  let r = await fetch(ORIGIN + path, { cf: { cacheTtl: 120, cacheEverything: true } });
  if (r.status === 404) {
    r = await fetch(ORIGIN + '/404.html', { cf: { cacheTtl: 120, cacheEverything: true } });
    return new Response(r.body, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const h = new Headers(r.headers);
  h.delete('x-github-request-id'); h.delete('via'); h.delete('x-served-by'); h.delete('x-proxy-cache');
  h.set('cache-control', /\.(png|woff2)$/.test(path) ? 'public, max-age=86400' : 'public, max-age=60');
  return new Response(r.body, { status: r.status, headers: h });
}

/* ---------- online rooms: two players, messages relayed, log kept for reconnects ---------- */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newRoom() {
  const b = crypto.getRandomValues(new Uint8Array(5));
  return json({ code: [...b].map(x => CODE_CHARS[x % CODE_CHARS.length]).join('') });
}
const ROOM_GAMES = ['fleet', 'wallmaze', 'pool'];

/* ---------- referee rules ---------- */
// Wall Maze: 9x9, one wall = one square edge. hw: edge under (x,y) x0-8 y0-7; vw: edge right of (x,y) x0-7 y0-8
const WM = {
  init(first) { return { pos: [[4, 8], [4, 0]], walls: [10, 10], hw: Array(72).fill(0), vw: Array(72).fill(0), turn: first }; },
  blocked(s, x, y, nx, ny) { return nx === x ? !!s.hw[Math.min(y, ny) * 9 + x] : !!s.vw[y * 8 + Math.min(x, nx)]; },
  inB: (x, y) => x >= 0 && y >= 0 && x < 9 && y < 9,
  dist(s, pi) {
    const [sx, sy] = s.pos[pi], g = pi === 0 ? 0 : 8, seen = new Set([sx + sy * 9]), q = [[sx, sy, 0]];
    for (let h = 0; h < q.length; h++) { const [x, y, d] = q[h]; if (y === g) return d;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const nx = x + dx, ny = y + dy; if (!WM.inB(nx, ny) || seen.has(nx + ny * 9) || WM.blocked(s, x, y, nx, ny)) continue; seen.add(nx + ny * 9); q.push([nx, ny, d + 1]); } }
    return 999;
  },
  pawnMoves(s, pi) {
    const [x, y] = s.pos[pi], [ox, oy] = s.pos[1 - pi], out = [];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const nx = x + dx, ny = y + dy; if (!WM.inB(nx, ny) || WM.blocked(s, x, y, nx, ny)) continue;
      if (nx === ox && ny === oy) { const jx = ox + dx, jy = oy + dy;
        if (WM.inB(jx, jy) && !WM.blocked(s, ox, oy, jx, jy)) out.push([jx, jy]);
        else for (const [px, py] of dx ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) { const sx = ox + px, sy = oy + py; if (WM.inB(sx, sy) && !WM.blocked(s, ox, oy, sx, sy)) out.push([sx, sy]); } }
      else out.push([nx, ny]); }
    return out;
  },
  legal(s, pi, m) {
    if (s.turn !== pi || WM.winner(s) >= 0 || !m) return false;
    if (m.t === 'p') return WM.pawnMoves(s, pi).some(([a, b]) => a === m.x && b === m.y);
    if (m.t !== 'w' || s.walls[pi] <= 0) return false;
    const h = m.o === 'h', x = m.x | 0, y = m.y | 0;
    if (h ? (x < 0 || x > 8 || y < 0 || y > 7) : (x < 0 || x > 7 || y < 0 || y > 8)) return false;
    const arr = h ? s.hw : s.vw, k = h ? y * 9 + x : y * 8 + x; if (arr[k]) return false;
    arr[k] = 1; const ok = WM.dist(s, 0) < 999 && WM.dist(s, 1) < 999; arr[k] = 0; return ok;
  },
  apply(s, pi, m) { if (m.t === 'p') s.pos[pi] = [m.x, m.y]; else { (m.o === 'h' ? s.hw : s.vw)[m.o === 'h' ? m.y * 9 + m.x : m.y * 8 + m.x] = 1; s.walls[pi]--; } s.turn = 1 - pi; },
  winner: s => s.pos[0][1] === 0 ? 0 : s.pos[1][1] === 8 ? 1 : -1
};
// Fleet Strike: 10x10, ships 5,4,3,3,2
const FLEET = [['CARRIER', 5], ['BATTLESHIP', 4], ['CRUISER', 3], ['SUBMARINE', 3], ['DESTROYER', 2]];
const FS = {
  cells: s => Array.from({ length: s.len }, (_, i) => s.h ? s.x + i + s.y * 10 : s.x + (s.y + i) * 10),
  valid(ships) {
    if (!Array.isArray(ships) || ships.length !== 5) return null;
    const used = new Set(), out = [];
    for (let k = 0; k < 5; k++) { const s = ships[k] || {}, [n, len] = FLEET[k];
      const sh = { n, len, h: !!s.h, x: s.x | 0, y: s.y | 0 };
      if (sh.x < 0 || sh.y < 0 || (sh.h ? sh.x + len > 10 || sh.y > 9 : sh.y + len > 10 || sh.x > 9)) return null;
      for (const c of FS.cells(sh)) { if (used.has(c)) return null; used.add(c); }
      out.push(sh); }
    return out;
  }
};

export class Room {
  constructor(ctx, env) { this.ctx = ctx; }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/verdict')) { const g = (await this.ctx.storage.get('game')) || {}; return json({ winner: g.verdict ?? null }); }
    if (url.pathname.endsWith('/seats')) { const meta = (await this.ctx.storage.get('meta')) || { seats: {} }; const seats = {}; for (const [p, s] of Object.entries(meta.seats)) seats[s] = p; return json({ seats }); }
    if (req.headers.get('upgrade') !== 'websocket') return json({ error: 'websocket only' }, 426);
    const pid = String(url.searchParams.get('pid') || '').slice(0, 64);
    const name = String(url.searchParams.get('name') || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').slice(0, 12) || 'PLAYER';
    const game = String(url.searchParams.get('game') || '');
    if (pid.length < 8 || !ROOM_GAMES.includes(game)) return json({ error: 'bad request' }, 400);
    const st = this.ctx.storage;
    let meta = (await st.get('meta')) || { game, seats: {}, names: {}, first: Math.random() < .5 ? 0 : 1, left: {}, created: Date.now() };
    if (meta.game !== game) return json({ error: 'This invite is for another game.' }, 409);
    if (!(pid in meta.seats)) {
      const used = Object.values(meta.seats);
      if (used.length >= 2) return json({ error: 'This game already has two players.' }, 409);
      meta.seats[pid] = used.includes(0) ? 1 : 0;
    }
    const seat = meta.seats[pid];
    meta.names[seat] = name; delete meta.left[seat];
    await st.put('meta', meta);
    await st.setAlarm(Date.now() + 24 * 3600 * 1000);
    for (const old of this.ctx.getWebSockets(pid)) { try { old.close(4000, 'replaced'); } catch {} }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [pid]);
    server.serializeAttachment({ pid, seat });
    const log = ((await st.get('log')) || []).map(x => this.view(x, seat));
    const online = this.ctx.getWebSockets().map(w => (w.deserializeAttachment() || {}).seat);
    const g = (await st.get('game')) || null;
    server.send(JSON.stringify({ t: 'hello', seat, names: meta.names, online, log, first: g ? g.first : meta.first }));
    this.broadcast({ t: 'peer', seat, name, online }, server);
    return new Response(null, { status: 101, webSocket: client });
  }
  // what one seat may see of a log entry (the other fleet stays secret until the end)
  view(x, seat) { if (x.d && x.d.k === 'fleet' && x.from !== seat) return { from: x.from, d: { k: 'fleet', ready: 1 } }; return x; }
  broadcast(o, except) { const s = JSON.stringify(o); for (const w of this.ctx.getWebSockets()) if (w !== except) { try { w.send(s); } catch {} } }
  async push(log, entry) {
    log.push(entry); if (log.length > 700) log.splice(0, log.length - 700);
    for (const w of this.ctx.getWebSockets()) { const { seat } = w.deserializeAttachment() || {}; try { w.send(JSON.stringify({ t: 'msg', ...this.view(entry, seat) })); } catch {} }
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 16000) return;
    let d; try { d = JSON.parse(raw); } catch { return; }
    if (!d || typeof d !== 'object') return;
    if (d.k === 'ping') { ws.send('{"t":"pong"}'); return; }
    const { seat } = ws.deserializeAttachment() || {};
    const st = this.ctx.storage, meta = await st.get('meta');
    let log = (await st.get('log')) || [];
    let g = (await st.get('game')) || this.newGame(meta, meta.first);
    const reject = why => { try { ws.send(JSON.stringify({ t: 'reject', why })); } catch {} };
    const done = g.verdict != null;

    if (d.k === 'reset') {
      if (!done) return reject('Finish this game first.');
      const first = 1 - g.first; log = []; g = this.newGame(meta, first);
      await this.push(log, { from: seat, d: { k: 'reset', first, br: first } });
    } else if (d.k === 'forfeit') {
      if (done) return;
      g.verdict = 1 - seat; await this.push(log, { from: seat, d: { k: 'forfeit' } });
    } else if (d.k === 'claim') {
      // win when the other player has been gone for 90 seconds
      const opp = 1 - seat, away = meta.left[opp] || (meta.names[opp] ? 0 : meta.created || 0);
      const present = this.ctx.getWebSockets().some(w => (w.deserializeAttachment() || {}).seat === opp);
      if (done || present || !away || Date.now() - away < 88000) { try { ws.send(JSON.stringify({ t: 'reject', claim: 1 })); } catch {} return; }
      g.verdict = seat; await this.push(log, { from: opp, d: { k: 'forfeit', away: 1 } });
    } else if (meta.game === 'wallmaze' && d.k === 'move') {
      const m = d.m || {}; const mv = { t: m.t === 'w' ? 'w' : 'p', x: m.x | 0, y: m.y | 0, o: m.o === 'v' ? 'v' : 'h' };
      if (done || !WM.legal(g.wm, seat, mv)) return reject('That move is not allowed.');
      WM.apply(g.wm, seat, mv); const w = WM.winner(g.wm); if (w >= 0) g.verdict = w;
      await this.push(log, { from: seat, d: { k: 'move', m: mv } });
    } else if (meta.game === 'fleet' && d.k === 'fleet') {
      if (g.fleets[seat]) return reject('Your fleet is already set.');
      const ships = FS.valid(d.ships); if (!ships) return reject('That fleet is not valid.');
      g.fleets[seat] = ships; g.shots[seat] = [];
      await this.push(log, { from: seat, d: { k: 'fleet', ships } });
      if (g.fleets[0] && g.fleets[1]) { g.turn = g.first; await this.push(log, { from: -1, d: { k: 'start', first: g.first } }); }
    } else if (meta.game === 'fleet' && d.k === 'shot') {
      const i = d.i | 0;
      if (done || !g.fleets[0] || !g.fleets[1] || g.turn !== seat || i < 0 || i > 99 || g.shots[seat].includes(i)) return reject('Not your shot.');
      g.shots[seat].push(i);
      const opp = g.fleets[1 - seat], ship = opp.find(s => FS.cells(s).includes(i));
      let sunk = null, win = false;
      if (ship && FS.cells(ship).every(c => g.shots[seat].includes(c))) { sunk = ship; win = opp.every(s => FS.cells(s).every(c => g.shots[seat].includes(c))); }
      g.turn = 1 - seat; if (win) g.verdict = seat;
      await this.push(log, { from: seat, d: { k: 'shot', i, hit: !!ship, sunk, win } });
      if (win) await this.push(log, { from: -1, d: { k: 'end', fleets: g.fleets } });
    } else if (meta.game === 'pool' && (d.k === 'shot' || d.k === 'sync')) {
      if (done) return;
      if (d.k === 'sync' && d.s && d.s.over) g.verdict = d.s.win === 1 ? 1 : 0;
      await this.push(log, { from: seat, d });
    } else return;
    await st.put('game', g); await st.put('log', log);
  }
  newGame(meta, first) {
    return { first, verdict: null, wm: meta.game === 'wallmaze' ? WM.init(first) : null, fleets: [null, null], shots: [[], []], turn: first };
  }
  async webSocketClose(ws) {
    const { seat } = ws.deserializeAttachment() || {};
    const still = this.ctx.getWebSockets().filter(w => w !== ws);
    if (!still.some(w => (w.deserializeAttachment() || {}).seat === seat)) {
      const meta = await this.ctx.storage.get('meta'); if (meta) { meta.left[seat] = Date.now(); await this.ctx.storage.put('meta', meta); }
    }
    this.broadcast({ t: 'left', seat, online: still.map(w => (w.deserializeAttachment() || {}).seat) }, ws);
  }
  async webSocketError(ws) { return this.webSocketClose(ws); }
  async alarm() { await this.ctx.storage.deleteAll(); }
}

async function champions(url, env) {
  const game = url.searchParams.get('game');
  if (!['fleet', 'wallmaze', 'pool'].includes(game)) return json({ error: 'bad request' }, 400);
  const me = String(url.searchParams.get('player') || '');
  const { results } = await env.DB.prepare('SELECT name, country, size, created_at, player FROM champions WHERE game = ?1 ORDER BY created_at DESC LIMIT 30').bind(game).all();
  return json({ rows: results.map(r => ({ n: r.name, c: r.country, size: r.size, t: r.created_at, me: !!me && r.player === me })) }, 200, { 'cache-control': 'private, max-age=20' });
}
