/* 8-Bit Arcade Pack: Quick Match + tournaments (8 or 32 players, single elimination).
   CUP.init({game}) in Fleet Strike, Wall Maze and 8-Ball. Uses NET for human vs human matches
   and the game's own CPU mode (via its [data-lvl] buttons) for matches against CPU players.
   Results are picked up from ARC.submit, which every game already calls when a game ends. */
(function(){
'use strict';
const API=(window.ARC&&ARC.REMOTE&&ARC.REMOTE.url)||'https://arcade-pack.s-golee.workers.dev';
const WS=API.replace(/^http/,'ws');
let game=null,ws=null,retry=0,pingT=0,online=0,cup=null,active=null,searching=false,ov=null,tickT=0,skew=0,hidden=false,lastRound={};
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=c=>c&&c.length===2&&c!=='XX'?String.fromCodePoint(...[...c.toUpperCase()].map(x=>127397+x.charCodeAt())):'';
const me=()=>ARC.playerId();
const T=()=>ARC.GAMES[game].t;

const CSS=`
.cup-ov{position:fixed;inset:0;z-index:2147480500;background:#0b0a12;color:#fff1e8;display:flex;flex-direction:column;font:18px/1.2 "VT323",monospace;padding:max(12px,env(safe-area-inset-top)) 0 env(safe-area-inset-bottom)}
.cup-hd{padding:0 14px;text-align:center}
.cup-hd h2{font:13px/1.6 "Press Start 2P",monospace;color:#ffec27;margin:6px 0 2px}
.cup-hd p{margin:4px 0;color:#d8cfe6}
.cup-big{font:16px/1.5 "Press Start 2P",monospace;color:#00e436;margin:8px 0}
.cup-br{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 14px 18px;display:flex;gap:18px;align-items:stretch}
.cup-cw{display:flex;flex-direction:column;min-width:132px;flex:none}
.cup-cw h4{font:8px/1.4 "Press Start 2P",monospace;color:#9a8fb0;margin:0 0 8px;text-align:center;min-height:12px}
.cup-col{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:8px}
.cup-m{background:#17151f;border:2px solid #2a2535;font-size:17px}
.cup-m.live{border-color:#29adff}.cup-m.mine{border-color:#ffec27;box-shadow:0 0 0 2px rgba(255,236,39,.25)}
.cup-p{display:flex;justify-content:space-between;gap:6px;padding:4px 6px;white-space:nowrap;overflow:hidden}
.cup-p+.cup-p{border-top:1px solid #2a2535}
.cup-p.w{color:#00e436}.cup-p.l{color:#5f574f;text-decoration:line-through}.cup-p.me{color:#ffec27}
.cup-p i{font-style:normal;color:#9a8fb0;font-size:15px}
.cup-ft{display:flex;gap:10px;padding:10px 14px}.cup-ft>*{flex:1}
.cup-dot{display:inline-block;width:8px;height:8px;background:#29adff;margin-right:4px;animation:cupb 1s steps(2) infinite}
@keyframes cupb{50%{opacity:0}}
.cup-list{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0}
.cup-list span{background:#17151f;border:2px solid #2a2535;padding:3px 7px}
.cup-trophy{display:block;margin:6px auto;image-rendering:pixelated}
.cup-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}
.cup-on{font:8px/1.6 "Press Start 2P",monospace;color:#00e436;text-align:center;margin-top:8px}
@media (prefers-reduced-motion:reduce){.cup-dot{animation:none}}
`;
function css(){if(document.getElementById('cup-css'))return;const s=document.createElement('style');s.id='cup-css';s.textContent=CSS;document.head.appendChild(s)}
const cupSVG=(c,size)=>`<svg class="cup-trophy" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" style="shape-rendering:crispEdges"><path fill="${c}" d="M3 2h10v1h2v4h-1v1h-2v1h-1v1H9v2h2v1h1v2H4v-2h1v-1h2v-2H5V9H4V8H2V7H1V3h2zm-1 2v2h1V4zm11 0v2h1V4z"/><path fill="rgba(255,255,255,.45)" d="M5 3h1v4H5z"/><path fill="rgba(0,0,0,.35)" d="M11 3h1v4h-1zM4 13h8v1H4z"/></svg>`;

/* ---------- menu buttons ---------- */
function addButtons(){
 const start=document.getElementById('start');if(!start||start.querySelector('.cup-bar'))return;
 const bar=document.createElement('div');bar.className='cup-bar';
 bar.innerHTML=`<button type="button" class="btn" id="cupQuick" style="background:#00e436;color:#000;box-shadow:0 5px 0 #008751">⚡ QUICK MATCH</button><button type="button" class="btn" id="cupJoin" style="background:#ffa300;color:#000;box-shadow:0 5px 0 #ab5236">🏆 TOURNAMENT</button>`;
 const on=document.createElement('div');on.className='cup-on';on.id='cupOn';
 const anchor=start.querySelector('.net-b')||start.querySelector('.seg')||start.querySelector('h1');anchor.after(bar);bar.after(on);
 bar.querySelector('#cupQuick').onclick=()=>need(quickMatch);
 bar.querySelector('#cupJoin').onclick=()=>need(pickCup);
 showOnline();
}
function need(fn){if(!ARC.name()){const o=ARC.modal(`<h2>YOUR NAME</h2><p>Other players will see this name.</p><input id="cNm" maxlength="12" placeholder="YOUR NAME" autocomplete="nickname" spellcheck="false"><div class="arc-row"><button class="arc-b arc-ghost" data-x>CANCEL</button><button class="arc-b" id="cOk">NEXT</button></div>`);
  const i=o.querySelector('#cNm'),ok=()=>{if(!ARC.setName(i.value)){i.focus();return}o.remove();reconnect();setTimeout(fn,400)};o.querySelector('#cOk').onclick=ok;i.addEventListener('keydown',e=>{if(e.key==='Enter')ok()});return}
 if(!ws||ws.readyState!==1){ARC.toast('CONNECTING…','Check your internet, then try again.','#ff004d');connect();return}
 fn()}
function showOnline(){const el=document.getElementById('cupOn');if(el)el.textContent=online>1?`● ${online} PLAYERS ONLINE NOW`:online===1?'● YOU ARE THE ONLY ONE HERE RIGHT NOW':'';}

/* ---------- connection ---------- */
function connect(){
 if(!window.ARC||!ARC.REMOTE.url)return;
 try{ws&&ws.close()}catch(e){}
 const q=new URLSearchParams({pid:me(),name:ARC.name()||'PLAYER',game});
 ws=new WebSocket(WS+'/api/lobby/'+game+'?'+q);
 ws.onopen=()=>{retry=0;clearInterval(pingT);pingT=setInterval(()=>send({k:'ping'}),20000)};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}handle(m)};
 ws.onclose=()=>{clearInterval(pingT);retry++;setTimeout(connect,Math.min(10000,800*retry))};
}
function reconnect(){retry=0;connect()}
function send(o){if(ws&&ws.readyState===1){ws.send(JSON.stringify(o));return true}return false}
function handle(m){
 if(m.now)skew=m.now-Date.now();
 if(m.t==='hi'){online=m.n;showOnline();if(m.cup&&(m.cup.status!=='done'||Date.now()+skew-(m.cup.now||0)<60000)){cup=m.cup;if(cup.status!=='done')render(true)}return}
 if(m.t==='online'){online=m.n;showOnline();return}
 if(m.t==='queued'){return}
 if(m.t==='match'){searching=false;closeOv();ARC.unlock('quick1');ARC.toast('OPPONENT FOUND',`${flag(m.country)} ${m.opp}`,'#00e436');NET.join(m.code,true,{auto:true,opp:m.opp});return}
 if(m.t==='cup'){if(m.cup&&m.cup.now)skew=m.cup.now-Date.now();const was=cup;cup=m.cup;if(!cup){closeOv();return}afterCup(was);if(!active||cup.status==='done')render(!hidden);return}
 if(m.t==='play'){startMatch(m);return}
}

/* ---------- quick match ---------- */
function quickMatch(){
 searching=true;send({k:'quick'});
 const t0=Date.now();
 ov=ARC.modal(`<h2>QUICK MATCH</h2><p class="arc-big" id="qT">0s</p><p id="qMsg" style="text-align:center">Looking for another ${E(T())} player…</p><div class="arc-row" id="qCpu" hidden><button class="arc-b arc-ghost" id="qPlayCpu">PLAY THE CPU</button></div><div class="arc-row"><button class="arc-b arc-ghost" id="qX">CANCEL</button></div>`);
 const box=ov;clearInterval(tickT);
 tickT=setInterval(()=>{if(!searching||!box.isConnected){clearInterval(tickT);return}const s=Math.floor((Date.now()-t0)/1000);box.querySelector('#qT').textContent=s+'s';
  if(s>=20){box.querySelector('#qCpu').hidden=false;box.querySelector('#qMsg').textContent=online>1?'Nobody else is searching right now. Keep waiting or play the CPU.':'You are the only player online right now. Keep waiting or play the CPU.'}},500);
 box.querySelector('#qX').onclick=()=>{searching=false;send({k:'cancel'});box.remove()};
 box.querySelector('#qPlayCpu').onclick=()=>{searching=false;send({k:'cancel'});box.remove();clickLvl(1)};
}
function closeOv(){if(ov&&ov.isConnected)ov.remove();ov=null}
function clickLvl(l){if(window.NET&&NET.active)NET.leave();const b=document.querySelector(`[data-lvl="${l}"]`);b&&b.click()}

/* ---------- tournaments ---------- */
function pickCup(){
 const o=ARC.modal(`<h2>TOURNAMENT</h2>${cupSVG('#ffec27',64)}<p>Sign up and the cup starts 30 seconds later. Everyone who joins in that time plays in the same bracket. Empty places go to CPU players, who get tougher every round.</p>
 <div class="arc-row"><button class="arc-b" id="c8">8 PLAYERS<br><small style="font-size:8px">3 rounds · about 10 min</small></button></div>
 <div class="arc-row"><button class="arc-b" id="c32" style="background:#ffa300">32 PLAYERS<br><small style="font-size:8px">5 rounds · grand cup</small></button></div>
 <div class="arc-row"><button class="arc-b arc-ghost" data-x>CANCEL</button></div>`);
 o.querySelector('#c8').onclick=()=>{o.remove();hidden=false;send({k:'cup',size:8})};
 o.querySelector('#c32').onclick=()=>{o.remove();hidden=false;send({k:'cup',size:32})};
}
function myIdx(){return cup?cup.players.findIndex(p=>p.pid===me()):-1}
function render(show){
 if(!cup)return;css();
 if(!show&&!(ov&&ov.classList&&ov.classList.contains('cup-ov')))return;
 if(!ov||!ov.isConnected||!ov.classList.contains('cup-ov')){closeOv();ov=document.createElement('div');ov.className='cup-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Tournament');document.body.appendChild(ov);
  ['keydown','keyup'].forEach(t=>ov.addEventListener(t,e=>e.stopPropagation()))}
 const mi=myIdx(),now=Date.now()+skew,size=cup.size;
 let head='',foot='';
 if(cup.status==='signup'){const left=Math.max(0,Math.ceil((cup.deadline-now)/1000)),humans=cup.players.filter(p=>!p.cpu);
  head=`<h2>${size}-PLAYER CUP · ${E(T())}</h2><p>Sign-up closes in</p><p class="cup-big" id="cupCount">${left}s</p><p>${humans.length} player${humans.length===1?'':'s'} joined. ${size-humans.length} CPU player${size-humans.length===1?'':'s'} will fill the rest.</p><div class="cup-list">${humans.map(p=>`<span>${flag(p.c)} ${E(p.name)}${p.pid===me()?' (YOU)':''}</span>`).join('')}</div><p class="arc-small" style="color:#9a8fb0">Share the game link so friends can join this cup.</p>`;
  foot=`<button class="arc-b arc-ghost" id="cupLeave">LEAVE</button><button class="arc-b" id="cupShare">INVITE FRIENDS</button>`}
 else{
  const status=statusLine(mi,now);
  head=`<h2>${size}-PLAYER CUP · ${E(T())}</h2>${cup.status==='done'?champHTML():''}<p id="cupStatus">${status}</p>`;
  foot=cup.status==='done'?`<button class="arc-b arc-ghost" id="cupClose">MENU</button><button class="arc-b" id="cupAgain">NEW CUP</button>`:(mi>=0&&!cup.players[mi].out?`<button class="arc-b arc-ghost" id="cupLeave">QUIT CUP</button><button class="arc-b arc-ghost" id="cupHide">HIDE</button>`:`<button class="arc-b arc-ghost" id="cupClose">LEAVE</button>`);
 }
 const brk=cup.status==='signup'?'':bracketHTML(mi);
 ov.innerHTML=`<div class="cup-hd">${head}</div>${brk?`<div class="cup-br">${brk}</div>`:'<div style="flex:1"></div>'}<div class="cup-ft">${foot}</div>`;
 const q=s=>ov.querySelector(s);
 q('#cupLeave')&&(q('#cupLeave').onclick=()=>{const o=ARC.modal(`<h2>QUIT THE CUP?</h2><p>${cup.status==='signup'?'You will leave the sign-up.':'You will lose your current match and leave the cup.'}</p><div class="arc-row"><button class="arc-b arc-ghost" data-x>STAY</button><button class="arc-b" id="cq">QUIT</button></div>`);o.querySelector('#cq').onclick=()=>{o.remove();send({k:cup.status==='signup'?'cancel':'leave'});active=null;cup=null;closeOv()}});
 q('#cupHide')&&(q('#cupHide').onclick=()=>{hidden=true;closeOv();ARC.toast('CUP CONTINUES','We will call you for your next match.','#ffa300')});
 q('#cupClose')&&(q('#cupClose').onclick=()=>{hidden=true;cup=cup&&cup.status==='done'?null:cup;closeOv()});
 q('#cupAgain')&&(q('#cupAgain').onclick=()=>{const s=cup.size;cup=null;closeOv();hidden=false;send({k:'cup',size:s})});
 q('#cupShare')&&(q('#cupShare').onclick=async()=>{const url=location.href.split('?')[0];const t=`Join my ${T()} tournament in the 8-Bit Arcade Pack! Tap TOURNAMENT in the next 30 seconds:`;try{if(navigator.share){await navigator.share({title:'8-Bit Arcade Pack',text:t,url});return}await navigator.clipboard.writeText(t+' '+url);ARC.toast('LINK COPIED','Paste it in a chat.','#29adff')}catch(e){}});
 const mine=ov.querySelector('.cup-m.mine');if(mine)mine.scrollIntoView({block:'center',inline:'center'});
 clearInterval(tickT);tickT=setInterval(tickUI,500);
}
function tickUI(){if(!ov||!ov.isConnected||!cup){clearInterval(tickT);return}const now=Date.now()+skew;
 if(cup.status==='signup'){const el=ov.querySelector('#cupCount');if(el)el.textContent=Math.max(0,Math.ceil((cup.deadline-now)/1000))+'s'}
 else{const el=ov.querySelector('#cupStatus');if(el)el.innerHTML=statusLine(myIdx(),now)}}
function myMatch(mi){if(mi<0)return null;for(const ms of cup.rounds)for(const m of ms)if((m.a===mi||m.b===mi)&&m.s!=='done')return m;return null}
function statusLine(mi,now){
 if(cup.status==='done')return cup.champion===mi?'You won the cup!':`Champion: ${flag(cup.players[cup.champion].c)} ${E(cup.players[cup.champion].name)}`;
 if(mi<0)return 'Watching';
 const p=cup.players[mi];if(p.out||p.left){const r=cup.rounds.findIndex(ms=>ms.some(m=>(m.a===mi||m.b===mi)&&m.s==='done'&&m.w!==mi));return `You are out${r>=0?' in the '+cup.names[r].toLowerCase():''}. Watch who wins!`}
 const m=myMatch(mi);if(!m){return 'Waiting for the next round…'}
 const r=cup.names[m.r],opp=m.a===mi?m.b:m.a;
 if(opp==null)return `<span class="cup-dot"></span>${r}: waiting to see who you play next…`;
 const O=cup.players[opp];
 if(m.s==='ready'){const s=Math.max(0,Math.ceil((m.at-now)/1000));return `<span class="cup-dot"></span>${r} vs ${flag(O.c)} ${E(O.name)}${O.cpu?' 🤖':''} starts in ${s}s`}
 if(m.s==='live')return `<span class="cup-dot"></span>${r} vs ${flag(O.c)} ${E(O.name)} is on`;
 return r}
function bracketHTML(mi){
 return cup.rounds.map((ms,r)=>`<div class="cup-cw"><h4>${cup.names[r]}</h4><div class="cup-col">${ms.map(m=>{
  const row=s=>{if(s==null)return `<div class="cup-p"><span style="color:#5f574f">…</span></div>`;const p=cup.players[s];const cls=m.s==='done'?(m.w===s?'w':'l'):'';return `<div class="cup-p ${cls} ${s===mi?'me':''}"><span>${flag(p.c)} ${E(p.name)}${p.cpu?' <i>CPU</i>':''}</span>${m.s==='done'&&m.w===s?'<span>✓</span>':''}</div>`};
  const mine=(m.a===mi||m.b===mi)&&mi>=0&&m.s!=='done';
  return `<div class="cup-m ${m.s==='live'?'live':''} ${mine?'mine':''}">${row(m.a)}${row(m.b)}</div>`}).join('')}</div></div>`).join('')
  +`<div class="cup-cw" style="min-width:110px"><h4>CHAMPION</h4><div class="cup-col"><div style="text-align:center">${cupSVG(cup.status==='done'?'#ffec27':'#2a2535',48)}<div style="color:#ffec27">${cup.champion!=null?flag(cup.players[cup.champion].c)+' '+E(cup.players[cup.champion].name):'?'}</div></div></div></div>`}
function champHTML(){const mi=myIdx(),won=cup.champion===mi;
 return won?`${cupSVG('#ffec27',96)}<p class="cup-big" style="color:#ffec27">CHAMPION!</p>`:''}

/* ---------- trophies for cups ---------- */
function afterCup(was){
 const mi=myIdx();if(mi<0||!cup||cup.status==='signup')return;
 ARC.unlock('cup1');
 const reached=cup.rounds.reduce((a,ms,r)=>ms.some(m=>m.a===mi||m.b===mi)?r:a,-1),names=cup.names;
 if(names[reached]==='QUARTER-FINAL'||names[reached]==='SEMI-FINAL'||names[reached]==='FINAL')ARC.unlock('cupqf');
 if(names[reached]==='FINAL')ARC.unlock('cupfinal');
 if(cup.status==='done'&&cup.champion===mi&&!(was&&was.status==='done')){
  ARC.unlock(cup.size===32?'cupwin32':'cupwin8');
  try{const k='arc_cupwins',w=JSON.parse(localStorage.getItem(k)||'{}');w[game]=(w[game]||0)+1;localStorage.setItem(k,JSON.stringify(w));if(w.fleet&&w.wallmaze&&w.pool)ARC.unlock('triple')}catch(e){}
  try{const a=new (window.AudioContext||window.webkitAudioContext)(),t=a.currentTime;[523,659,784,1046,784,1046].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.08,t+i*.13);g.gain.exponentialRampToValueAtTime(.001,t+i*.13+.12);o.connect(g);g.connect(a.destination);o.start(t+i*.13);o.stop(t+i*.13+.13)})}catch(e){}
  ARC.buzz([60,60,60,60,200]);
 }
}

/* ---------- playing a cup match ---------- */
function startMatch(m){
 if(!cup||cup.tid!==m.tid)return;
 active={tid:m.tid,match:m.match,vs:m.vs,opp:m.opp};hidden=false;
 render(true);
 ARC.buzz([40,40,40]);ARC.toast(m.round,`vs ${flag(m.country)} ${m.opp}${m.vs==='cpu'?' (CPU)':''}`,'#ffa300');
 setTimeout(()=>{closeOv();
  for(const o of document.querySelectorAll('.ov'))o.classList.remove('on');
  if(m.vs==='cpu')clickLvl(m.lvl);
  else NET.join(m.code,true,{auto:true,opp:m.opp,cup:true});
 },1800);
}
function report(win,score){
 if(!active)return;const a=active;active=null;
 if(a.vs==='human'&&win)ARC.unlock('giant');
 send({k:'result',tid:a.tid,match:a.match,win,score:score||''});
 ARC.toast(win?'YOU GO THROUGH!':'KNOCKED OUT',win?'Next round coming up.':'Good game.',win?'#00e436':'#ff004d');
 setTimeout(()=>{if(a.vs==='human'&&window.NET)NET.leave();for(const o of document.querySelectorAll('.ov'))o.classList.remove('on');hidden=false;render(true)},2600);
}

function init(c){game=c.game;if(!window.ARC||!ARC.REMOTE.url)return;css();addButtons();connect();
 const orig=ARC.submit;ARC.submit=function(g,s,d,x){const r=orig.apply(this,arguments);try{if(active&&g===game&&x&&(x.win===0||x.win===1)&&(active.vs==='cpu'?!x.online:x.online))report(x.win===1,d)}catch(e){}return r};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!ws||ws.readyState>1))reconnect()});
}
window.CUP={init,get active(){return active},get cup(){return cup}};
})();
