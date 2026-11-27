// Lobby Durable Object: one per game (fleet, wallmaze, pool).
// Handles players online, Quick Match pairing and tournaments (8 or 32 players, single elimination).
// Every player keeps one WebSocket to the lobby. Real matches between two humans run in Room objects.
const SIGNUP_MS = 30000;
const CPU_NAMES = ['BYTE', 'PIXEL', 'GLITCH', 'SPRITE', 'CHIP', 'BLIP', 'TURBO', 'NEON', 'ZAPP', 'RETRO', 'BOOP', 'KILO',
  'MEGA', 'GIGA', 'NIBBLE', 'BIT', 'JOY', 'COIN', 'ARCADE', 'BLOCK', 'DOT', 'LASER', 'ROBO', 'VOLT', 'SPARK', 'BEEP', 'DIGI', 'MODEM',
  'FLOPPY', 'CURSOR', 'SYNTH', 'TETRA'];
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => CODE_CHARS[x % CODE_CHARS.length]).join('');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROUND_NAMES = { 32: 'ROUND OF 32', 16: 'ROUND OF 16', 8: 'QUARTER-FINAL', 4: 'SEMI-FINAL', 2: 'FINAL' };
// CPU difficulty by how many players are left in the round
const CPU_LVL = { 32: 0, 16: 0, 8: 1, 4: 1, 2: 2 };

export class Lobby {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async load() {
    this.st = (await this.ctx.storage.get('st')) || { game: null, queue: [], cups: {}, pending: {}, seen: {} };
    return this.st;
  }
  async save() { await this.ctx.storage.put('st', this.st); }

  sockets(pid) { return this.ctx.getWebSockets(pid); }
  sendTo(pid, o) { const s = JSON.stringify(o); for (const w of this.sockets(pid)) { try { w.send(s); } catch {} } }
  online() { return new Set(this.ctx.getWebSockets().map(w => (w.deserializeAttachment() || {}).pid)).size; }
  broadcastOnline() {
    const s = JSON.stringify({ t: 'online', n: this.online() });
    for (const w of this.ctx.getWebSockets()) { try { w.send(s); } catch {} }
  }

  async fetch(req) {
    if (req.headers.get('upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const url = new URL(req.url);
    const pid = String(url.searchParams.get('pid') || '').slice(0, 64);
    const name = String(url.searchParams.get('name') || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 _.-]/g, '').slice(0, 12) || 'PLAYER';
    const game = String(url.searchParams.get('game') || '');
    const country = String((req.cf && req.cf.country) || url.searchParams.get('c') || '').slice(0, 2);
    if (pid.length < 8) return new Response('bad request', { status: 400 });
    const st = await this.load();
    st.game = st.game || game;
    st.seen[pid] = { at: Date.now(), name, country };
    await this.save();
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [pid]);
    server.serializeAttachment({ pid, name, country });
    const mine = Object.values(st.cups).find(c => c.status !== 'done' && c.players.some(p => p.pid === pid))
      || Object.values(st.cups).filter(c => c.players.some(p => p.pid === pid)).sort((a, b) => b.created - a.created)[0];
    server.send(JSON.stringify({ t: 'hi', n: this.online(), cup: mine ? this.pub(mine) : null, now: Date.now() }));
    this.broadcastOnline();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let d; try { d = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment() || {};
    if (d.k === 'ping') { ws.send('{"t":"pong"}'); }
    const st = await this.load();
    st.seen[me.pid] = { at: Date.now(), name: me.name, country: me.country };
    if (d.k === 'quick') this.quick(me);
    else if (d.k === 'cancel') { st.queue = st.queue.filter(q => q.pid !== me.pid); this.leaveSignup(me.pid); }
    else if (d.k === 'cup') this.joinCup(me, d.size === 32 ? 32 : 8);
    else if (d.k === 'result') this.result(me.pid, d);
    else if (d.k === 'leave') this.forfeitAll(me.pid);
    await this.save();
    await this.arm();
  }
  async webSocketClose(ws) {
    const me = ws.deserializeAttachment() || {};
    const st = await this.load();
    if (!this.sockets(me.pid).some(w => w !== ws)) st.queue = st.queue.filter(q => q.pid !== me.pid);
    st.seen[me.pid] = { ...(st.seen[me.pid] || {}), at: Date.now() };
    await this.save();
    this.broadcastOnline();
  }
  async webSocketError(ws) { return this.webSocketClose(ws); }

  /* ---------- quick match ---------- */
  quick(me) {
    const st = this.st;
    st.queue = st.queue.filter(q => q.pid !== me.pid && this.sockets(q.pid).length);
    const other = st.queue.shift();
    if (other) {
      const c = code(5);
      this.sendTo(other.pid, { t: 'match', code: c, opp: me.name, country: me.country });
      this.sendTo(me.pid, { t: 'match', code: c, opp: other.name, country: other.country });
    } else {
      st.queue.push({ pid: me.pid, name: me.name, country: me.country, at: Date.now() });
      this.sendTo(me.pid, { t: 'queued' });
    }
  }

  /* ---------- tournaments ---------- */
  joinCup(me, size) {
    const st = this.st;
    const already = Object.values(st.cups).find(c => c.status !== 'done' && c.players.some(p => p.pid === me.pid && !p.out));
    if (already) { this.sendTo(me.pid, { t: 'cup', cup: this.pub(already) }); return; }
    let cup = st.pending[size] && st.cups[st.pending[size]];
    if (!cup || cup.status !== 'signup') {
      cup = { tid: code(6), size, status: 'signup', created: Date.now(), deadline: Date.now() + SIGNUP_MS, players: [], rounds: [], champion: null };
      st.cups[cup.tid] = cup; st.pending[size] = cup.tid;
    }
    cup.players.push({ pid: me.pid, name: me.name, country: me.country, cpu: false });
    if (cup.players.length >= size) this.startCup(cup);
    this.pushCup(cup);
  }
  leaveSignup(pid) {
    for (const cup of Object.values(this.st.cups)) if (cup.status === 'signup') {
      const n = cup.players.length; cup.players = cup.players.filter(p => p.pid !== pid);
      if (cup.players.length !== n) { this.pushCup(cup); this.sendTo(pid, { t: 'cup', cup: null }); }
    }
  }
  startCup(cup) {
    const names = shuffle(CPU_NAMES.slice());
    while (cup.players.length < cup.size) cup.players.push({ pid: 'cpu-' + cup.players.length, name: names.pop() || 'CPU', country: '', cpu: true });
    // spread the human players across the bracket so they meet as late as possible... unless there are many
    // humans are paired with each other first, so real players meet real players
    const humans = shuffle(cup.players.filter(p => !p.cpu)), cpus = shuffle(cup.players.filter(p => p.cpu));
    const pairs = [];
    for (let i = 0; i < humans.length; i += 2) pairs.push([humans[i], humans[i + 1] || cpus.pop()]);
    while (pairs.length < cup.size / 2) pairs.push([cpus.pop(), cpus.pop()]);
    const order = spreadOrder(cup.size / 2);
    const slots = new Array(cup.size);
    pairs.forEach((p, i) => { slots[order[i] * 2] = p[0]; slots[order[i] * 2 + 1] = p[1]; });
    cup.players = slots;
    cup.status = 'live'; cup.started = Date.now();
    cup.rounds = [];
    for (let left = cup.size, r = 0; left >= 2; left /= 2, r++) {
      const ms = [];
      for (let i = 0; i < left / 2; i++) ms.push({ id: r + '-' + i, r, a: r === 0 ? 2 * i : null, b: r === 0 ? 2 * i + 1 : null, status: 'wait', w: null, score: '' });
      cup.rounds.push(ms);
    }
    if (this.st.pending[cup.size] === cup.tid) delete this.st.pending[cup.size];
  }
  pub(cup) {
    return {
      tid: cup.tid, size: cup.size, status: cup.status, deadline: cup.deadline, champion: cup.champion,
      players: cup.players.map(p => ({ name: p.name, c: p.country, cpu: p.cpu, pid: p.cpu ? null : p.pid })),
      rounds: cup.rounds.map(ms => ms.map(m => ({ id: m.id, r: m.r, a: m.a, b: m.b, s: m.status, w: m.w, sc: m.score, at: m.startAt || 0 }))),
      names: cup.rounds.map(ms => ROUND_NAMES[ms.length * 2]), now: Date.now()
    };
  }
  pushCup(cup) {
    const o = { t: 'cup', cup: this.pub(cup) };
    for (const p of cup.players) if (!p.cpu) this.sendTo(p.pid, o);
  }

  tick() {
    const st = this.st, now = Date.now();
    let busy = false;
    for (const cup of Object.values(st.cups)) {
      if (cup.status === 'signup') {
        busy = true;
        cup.players = cup.players.filter(p => this.sockets(p.pid).length || now - ((st.seen[p.pid] || {}).at || 0) < 15000);
        if (!cup.players.length) { delete st.cups[cup.tid]; if (st.pending[cup.size] === cup.tid) delete st.pending[cup.size]; continue; }
        if (now >= cup.deadline) { this.startCup(cup); this.pushCup(cup); }
        continue;
      }
      if (cup.status !== 'live') { if (now - (cup.ended || 0) > 3 * 3600e3) delete st.cups[cup.tid]; continue; }
      busy = true;
      let changed = false;
      for (const ms of cup.rounds) for (const m of ms) {
        if (m.a == null || m.b == null || m.status === 'done') continue;
        const A = cup.players[m.a], B = cup.players[m.b];
        if (m.status === 'wait') {
          m.status = 'ready'; m.startAt = now + (A.cpu && B.cpu ? 0 : 8000); changed = true;
          if (A.cpu && B.cpu) { m.status = 'live'; m.endAt = now + 3000 + Math.random() * 9000; }
          continue;
        }
        if (m.status === 'ready' && now >= m.startAt) {
          m.status = 'live'; changed = true;
          const lvl = CPU_LVL[ms.length * 2] ?? 1;
          if (!A.cpu && !B.cpu) {
            m.code = code(5); m.deadline = now + 40 * 60e3;
            this.sendTo(A.pid, { t: 'play', tid: cup.tid, match: m.id, vs: 'human', code: m.code, opp: B.name, country: B.country, round: ROUND_NAMES[ms.length * 2] });
            this.sendTo(B.pid, { t: 'play', tid: cup.tid, match: m.id, vs: 'human', code: m.code, opp: A.name, country: A.country, round: ROUND_NAMES[ms.length * 2] });
          } else {
            const H = A.cpu ? B : A, C = A.cpu ? A : B;
            m.deadline = now + 25 * 60e3;
            this.sendTo(H.pid, { t: 'play', tid: cup.tid, match: m.id, vs: 'cpu', lvl, opp: C.name, round: ROUND_NAMES[ms.length * 2] });
          }
          continue;
        }
        if (m.status === 'live') {
          if (A.cpu && B.cpu) { if (now >= m.endAt) { this.win(cup, m, Math.random() < .5 ? m.a : m.b, 'cpu'); changed = true; } continue; }
          // a reported human vs human result waits up to 45 s for the second report
          if (m.rep && m.repAt && now - m.repAt > 45000) { const [pid, win] = Object.entries(m.rep)[0]; this.win(cup, m, this.slotOf(cup, m, pid, win), 'reported'); changed = true; continue; }
          // gone for 90 s, or the match ran past its time limit
          const gone = s => { const p = cup.players[s]; return !p.cpu && !this.sockets(p.pid).length && now - ((st.seen[p.pid] || {}).at || 0) > 90000; };
          const ga = gone(m.a), gb = gone(m.b);
          if (ga || gb || now > m.deadline) {
            let w;
            if (ga && !gb) w = m.b; else if (gb && !ga) w = m.a;
            else if (now > m.deadline) w = A.cpu ? m.a : B.cpu ? m.b : (Math.random() < .5 ? m.a : m.b);
            else w = Math.random() < .5 ? m.a : m.b;
            this.win(cup, m, w, 'forfeit'); changed = true;
          }
        }
      }
      if (changed) this.pushCup(cup);
    }
    for (const [pid, s] of Object.entries(st.seen)) if (now - s.at > 6 * 3600e3) delete st.seen[pid];
    return busy;
  }
  slotOf(cup, m, pid, win) {
    const isA = cup.players[m.a].pid === pid;
    return win ? (isA ? m.a : m.b) : (isA ? m.b : m.a);
  }
  find(cup, id) { for (const ms of cup.rounds) for (const m of ms) if (m.id === id) return m; return null; }
  result(pid, d) {
    const cup = this.st.cups[String(d.tid || '')]; if (!cup || cup.status !== 'live') return;
    const m = this.find(cup, String(d.match || '')); if (!m || m.status !== 'live') return;
    const A = cup.players[m.a], B = cup.players[m.b];
    if (A.pid !== pid && B.pid !== pid) return;
    const win = !!d.win, sc = String(d.score || '').slice(0, 24);
    if (A.cpu || B.cpu) { this.win(cup, m, this.slotOf(cup, m, pid, win), sc); this.pushCup(cup); return; }
    m.rep = m.rep || {}; m.rep[pid] = win; m.repAt = m.repAt || Date.now();
    const vals = Object.entries(m.rep);
    if (vals.length === 2) {
      const [[p1, w1], [p2, w2]] = vals;
      // agree, or trust whoever admits the loss
      const winnerSlot = w1 !== w2 ? this.slotOf(cup, m, p1, w1) : (!w1 ? this.slotOf(cup, m, p2, true) : this.slotOf(cup, m, p1, true));
      this.win(cup, m, winnerSlot, sc);
    } else if (!win) { this.win(cup, m, this.slotOf(cup, m, pid, false), sc); }
    this.pushCup(cup);
  }
  forfeitAll(pid) {
    for (const cup of Object.values(this.st.cups)) {
      if (cup.status === 'signup') { this.leaveSignup(pid); continue; }
      if (cup.status !== 'live') continue;
      for (const ms of cup.rounds) for (const m of ms) {
        if (m.status === 'done' || m.a == null || m.b == null) continue;
        if (cup.players[m.a].pid === pid) this.win(cup, m, m.b, 'forfeit');
        else if (cup.players[m.b].pid === pid) this.win(cup, m, m.a, 'forfeit');
      }
      const p = cup.players.find(p => p.pid === pid); if (p) p.left = true;
      this.pushCup(cup);
    }
  }
  win(cup, m, slot, score) {
    m.status = 'done'; m.w = slot; m.score = score || ''; m.endedAt = Date.now();
    const loser = slot === m.a ? m.b : m.a;
    cup.players[loser].out = true;
    const r = m.r, i = +m.id.split('-')[1];
    if (r + 1 < cup.rounds.length) {
      const nx = cup.rounds[r + 1][i >> 1];
      if (i % 2 === 0) nx.a = slot; else nx.b = slot;
    } else {
      cup.status = 'done'; cup.ended = Date.now();
      const champ = cup.players[slot];
      cup.champion = slot;
      if (!champ.cpu && this.env.DB) {
        this.ctx.waitUntil(this.env.DB.prepare('INSERT INTO champions (game, size, name, country, created_at) VALUES (?1,?2,?3,?4,?5)')
          .bind(this.st.game || '', cup.size, champ.name, champ.country || '', Date.now()).run().catch(() => {}));
      }
    }
  }
  async arm() {
    const busy = this.tick();
    await this.save();
    if (busy) { const a = await this.ctx.storage.getAlarm(); if (!a) await this.ctx.storage.setAlarm(Date.now() + 1500); }
  }
  async alarm() {
    await this.load();
    const busy = this.tick();
    await this.save();
    if (busy) await this.ctx.storage.setAlarm(Date.now() + 1500);
  }
}

// bracket positions that keep the first humans apart (1 and 2 meet only in the final, 1-4 only in the semis...)
function spreadOrder(n) {
  let o = [0];
  while (o.length < n) { const m = o.length * 2; o = o.flatMap(x => [x, m - 1 - x]); }
  return o;
}
