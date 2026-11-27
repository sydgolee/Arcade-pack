/* 8-Bit Arcade Pack: shared layer for every page.
   Settings, sound volume, haptics, on-screen control options, player name,
   local leaderboards, awards, play stats, toasts. Everything stays on this device. */
(function(){
'use strict';
const VERSION='1.3.0';
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DEF={online:true,vol:80,sound:true,haptics:true,fx:true,fps:false,touch:'auto',ctl:'m',lefty:false};
let S=Object.assign({},DEF,LS.get('arc_settings',{}));

const GAMES={
 dungeon:{t:'DUNGEON OF ONE ROOM',f:'dungeon.html',c:'#ffec27',unit:'score',
  keys:[['Move','WASD'],['Aim and shoot','Arrow keys'],['Auto-aim','Space'],['Pause','P / Esc']],
  touch:'Left pad moves. Hold FIRE and it aims for you.'},
 wallmaze:{t:'WALL MAZE',f:'wallmaze.html',c:'#29adff',unit:'points',
  keys:[['Move pawn','Arrow keys or tap a square'],['Wall mode','W'],['Move mode','M'],['Rotate wall','R']],
  touch:'Tap a glowing square to move. Tap WALL, then tap the board to place a wall.'},
 fleet:{t:'FLEET STRIKE',f:'fleet.html',c:'#c2c3c7',unit:'points',
  keys:[['Aim','Arrow keys'],['Fire','Space / Enter'],['Rotate ship','R']],
  touch:'Drag ships to place them. Tap enemy water to fire.'},
 cowboy:{t:'HIGH NOON RIDER',f:'cowboy.html',c:'#ffa300',unit:'score',
  keys:[['Move','A / D'],['Aim up','W'],['Duck','S'],['Jump','Space'],['Fire','hold J'],['Enter saloon','E / Enter'],['Pause','P / Esc']],
  touch:'Stick moves, push up to aim up. AUTO fires for you, or hold FIRE. Tap JUMP.'},
 gangster:{t:'TOMMY GUN ALLEY',f:'gangster.html',c:'#ff77a8',unit:'score',
  keys:[['Move','A / D'],['Aim up','W'],['Duck','S'],['Jump','Space'],['Fire','hold J'],['Enter hideout','E / Enter'],['Pause','P / Esc']],
  touch:'Stick moves, push up to aim up. AUTO fires for you, or hold FIRE. Tap JUMP.'},
 pool:{t:'8-BALL',f:'billiards.html',c:'#00e436',unit:'points',
  keys:[['Aim','Mouse, or Left / Right for fine aim'],['Power','Drag back from the cue ball'],['Shoot','Release']],
  touch:'Drag anywhere to aim, pull back for power, let go to shoot. Use the fine-aim arrows for small turns.'}
};
const page=(location.pathname.split('/').pop()||'index.html');
const GAME=Object.keys(GAMES).find(k=>GAMES[k].f===page)||null;

/* ---------- trophies ---------- */
const TIER={b:{n:'BRONZE',c:'#d27d2c',p:15},s:{n:'SILVER',c:'#c2c3c7',p:30},g:{n:'GOLD',c:'#ffec27',p:90},p:{n:'PLATINUM',c:'#7ee8fa',p:300}};
const AWARDS=[
 ['first','b','INSERT COIN','Finish your first game in the pack.'],
 ['named','b','NAME IN LIGHTS','Put your name on a leaderboard.'],
 ['sport','b','GOOD SPORT','Lose 5 games and keep playing.'],
 ['d5','b','DOOR OPENER','Reach room 5 in Dungeon of One Room.'],
 ['w0','b','FIRST WALL','Beat the Easy CPU in Wall Maze.'],
 ['f0','b','CADET','Beat the Cadet in Fleet Strike.'],
 ['p0','b','CHALK UP','Beat the Rookie at 8-Ball.'],
 ['c500','b','SADDLE UP','Ride 500m in High Noon Rider.'],
 ['g500','b','NEW IN TOWN','Run 500m in Tommy Gun Alley.'],
 ['online1','b','FRIEND OR FOE','Win an online game against a friend.'],
 ['quick1','b','QUICK DRAW','Play a Quick Match against another player.'],
 ['cup1','b','CONTENDER','Play in a tournament.'],
 ['cupqf','s','LAST EIGHT','Reach a tournament quarter-final, semi or final.'],
 ['giant','s','GIANT KILLER','Knock a real player out of a tournament.'],
 ['cupfinal','s','FINALIST','Reach a tournament final.'],
 ['cupwin8','g','CUP WINNER','Win an 8-player tournament.'],
 ['cupwin32','p','GRAND CHAMPION','Win a 32-player tournament.'],
 ['triple','p','TRIPLE CROWN','Win a tournament in Fleet Strike, Wall Maze and 8-Ball.'],
 ['d10','s','DEEP DIVER','Reach room 10 in Dungeon of One Room.'],
 ['w1','s','WALL BUILDER','Beat the Normal CPU in Wall Maze.'],
 ['f1','s','CAPTAIN','Beat the Captain in Fleet Strike.'],
 ['p1','s','HUSTLED','Beat the Hustler at 8-Ball.'],
 ['c1k','s','TRAIL BLAZER','Ride 1000m in High Noon Rider.'],
 ['g1k','s','MADE MAN','Run 1000m in Tommy Gun Alley.'],
 ['all6','s','COLLECTOR','Play all six games.'],
 ['streak3','s','HAT TRICK','Win 3 games in a row against the CPU.'],
 ['f45','s','SHARPSHOOTER','Win Fleet Strike in 45 shots or fewer.'],
 ['wall10','s','NO WALLS NEEDED','Win Wall Maze without placing a single wall.'],
 ['d25','g','INTO THE ABYSS','Reach room 25 in Dungeon of One Room.'],
 ['w2','g','GRANDMASTER','Beat the Hard CPU in Wall Maze.'],
 ['f2','g','ADMIRAL SLAYER','Beat the Admiral in Fleet Strike.'],
 ['p2','g','SHARK BAIT','Beat the Shark at 8-Ball.'],
 ['c3k','g','LEGEND OF THE WEST','Ride 3000m in High Noon Rider.'],
 ['g3k','g','KINGPIN','Run 3000m in Tommy Gun Alley.'],
 ['hour','g','ARCADE RAT','Play for one hour in total.'],
 ['world','g','WORLD CLASS','Reach the global top 10 in any game.'],
 ['plat','p','HALL OF FAME','Win every other trophy.']
];
function trophyPoints(){const got=LS.get('arc_awards',{});return AWARDS.reduce((a,x)=>a+(got[x[0]]?TIER[x[1]].p:0),0)}
function unlock(id){const got=LS.get('arc_awards',{});if(got[id])return;got[id]=Date.now();LS.set('arc_awards',got);const a=AWARDS.find(x=>x[0]===id);if(!a)return;const t=TIER[a[1]];toast(t.n+' TROPHY','🏆 '+a[2],t.c);buzz([20,40,20]);
 if(id!=='plat'&&AWARDS.every(x=>x[0]==='plat'||got[x[0]]))setTimeout(()=>unlock('plat'),3000)}
function checkAwards(game,x){
 unlock('first');
 const h=LS.get('arc_streak',{w:0,l:0});
 if(x.win===1){h.w++;if(h.w>=3)unlock('streak3')}else if(x.win===0){h.w=0;h.l=(h.l||0)+1;if(h.l>=5)unlock('sport')}
 LS.set('arc_streak',h);
 if(game==='dungeon'){if(x.room>=5)unlock('d5');if(x.room>=10)unlock('d10');if(x.room>=25)unlock('d25')}
 if(x.online&&x.win===1){unlock('online1');return}
 if(x.win===1){const k={wallmaze:'w',fleet:'f',pool:'p'}[game];if(k){unlock(k+'0');if(x.lvl>=1)unlock(k+'1');if(x.lvl>=2)unlock(k+'2')}}
 if(game==='fleet'&&x.win===1&&x.shots<=45)unlock('f45');
 if(game==='wallmaze'&&x.win===1&&x.walls===10)unlock('wall10');
 if(game==='cowboy'){if(x.m>=500)unlock('c500');if(x.m>=1000)unlock('c1k');if(x.m>=3000)unlock('c3k')}
 if(game==='gangster'){if(x.m>=500)unlock('g500');if(x.m>=1000)unlock('g1k');if(x.m>=3000)unlock('g3k')}
}

/* ---------- stats ---------- */
const stats=()=>LS.get('arc_stats',{first:Date.now(),g:{}});
function bump(fn){const s=stats();fn(s);LS.set('arc_stats',s)}
if(GAME){
 bump(s=>{const g=s.g[GAME]=s.g[GAME]||{plays:0,time:0};g.plays++;g.last=Date.now()});
 if(Object.keys(stats().g).length>=6)setTimeout(()=>unlock('all6'),800);
 setInterval(()=>{if(document.hidden)return;bump(s=>{s.g[GAME].time=(s.g[GAME].time||0)+5});const t=Object.values(stats().g).reduce((a,g)=>a+(g.time||0),0);if(t>=3600)unlock('hour')},5000);
}

/* ---------- results, history and leaderboards ---------- */
const REMOTE={url:'https://arcade-pack.s-golee.workers.dev'}; // online leaderboard API (Cloudflare Worker); empty = this device only
function playerId(){let id=LS.get('arc_pid','');if(!id){id=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());LS.set('arc_pid',id)}return id}
const lbKey=(g,m)=>'arc_lb_'+g+(m&&m!=='main'?'_'+m:'');
function board(g,m){return LS.get(lbKey(g,m),[])}
function history(g){return LS.get('arc_hist_'+g,[])}
function record(g){const h=history(g);return {w:h.filter(r=>r.w===1).length,l:h.filter(r=>r.w===0).length,n:LS.get('arc_rec_'+g,null)}}
function submit(game,score,detail,x){
 x=x||{};score=Math.max(0,Math.round(score||0));
 try{checkAwards(game,x)}catch(e){}
 const t=Date.now(),mode=x.mode||'main';
 const h=history(game);h.unshift({s:score,d:detail||'',w:x.win===undefined?null:x.win,l:x.lvl,t});LS.set('arc_hist_'+game,h.slice(0,30));
 if(x.win===1||x.win===0){const r=LS.get('arc_rec_'+game,{w:0,l:0});x.win?r.w++:r.l++;LS.set('arc_rec_'+game,r)}
 if(!score){if(x.win===0)setTimeout(()=>toast('RESULT SAVED','Loss recorded. See SCORES.','#9a8fb0'),600);return 0}
 const list=board(game,mode),e={n:name()||'',s:score,d:detail||'',t,w:x.win};
 list.push(e);list.sort((a,b)=>b.s-a.s||a.t-b.t);const top=list.slice(0,10),rank=top.indexOf(e)+1;
 LS.set(lbKey(game,mode),top);
 const send=()=>sendRemote(game,mode,score,detail);
 if(rank&&!name())setTimeout(()=>askName(rank,score,game,mode,t,send),700);
 else{if(rank)setTimeout(()=>toast(rank===1?'NEW HIGH SCORE!':'THIS DEVICE #'+rank,score+' '+(GAMES[game]?.unit||''),'#00e436'),700);else if(x.win===0)setTimeout(()=>toast('RESULT SAVED',score+' '+(GAMES[game]?.unit||'')+' · see SCORES','#9a8fb0'),600);send()}
 return rank;
}
function sendRemote(game,mode,score,detail){
 if(!REMOTE.url||!name()||!S.online)return;
 fetch(REMOTE.url+'/score',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game,mode,name:name(),score,detail:String(detail||'').slice(0,40),player:playerId(),v:VERSION})})
  .then(r=>r.ok?r.json():null).then(j=>{if(!j)return;if(j.world&&j.world<=10){unlock('world')}if(j.world)setTimeout(()=>toast('WORLD RANK #'+j.world,(j.country?j.country+' RANK #'+j.countryRank+' · ':'')+score,'#29adff'),2600)}).catch(()=>{});
}
async function remoteTop(game,mode,scope,period){
 if(!REMOTE.url)return null;
 const q=new URLSearchParams({game,mode:mode||'main',scope,period:period||'all'});
 const r=await fetch(REMOTE.url+'/top?'+q,{cache:'no-store'});if(!r.ok)throw new Error('offline');return r.json();
}

/* ---------- player name ---------- */
function name(){return (LS.get('arc_name','')||'').slice(0,12)}
const clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9 _.-]/g,'').trim().slice(0,12);
function setName(v){v=clean(v);LS.set('arc_name',v);if(v)setTimeout(()=>unlock('named'),300);return v}
function askName(rank,score,game,mode,t,after){
 const ov=modal(`<h2>${rank===1?'NEW HIGH SCORE!':'YOU MADE THE BOARD'}</h2><p class="arc-big">#${rank} · ${score}</p><p>Enter your name for the leaderboard.</p>
  <input id="arcNameIn" maxlength="12" autocomplete="nickname" autocapitalize="characters" spellcheck="false" placeholder="YOUR NAME" aria-label="Your name">
  <p style="font-size:16px;color:#9a8fb0">Your name and score also go on the online boards. You can turn that off in Settings.</p><div class="arc-row"><button class="arc-b arc-ghost" data-x>SKIP</button><button class="arc-b" id="arcNameOk">SAVE</button></div>`);
 const inp=ov.querySelector('#arcNameIn');setTimeout(()=>inp.focus(),50);
 const ok=()=>{const n=setName(inp.value);if(n){const k=lbKey(game,mode),l=LS.get(k,[]);for(const r of l)if(!r.n&&r.t===t)r.n=n;LS.set(k,l);unlock('named')}close(ov);after&&after()};
 ov.querySelector('#arcNameOk').onclick=ok;inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')ok()});
}

/* ---------- sound: master volume for every WebAudio sound ---------- */
const masters=new Map();
const AN=window.AudioNode&&AudioNode.prototype;
if(AN&&AN.connect&&!AN.__arc){
 const oc=AN.connect;AN.__arc=1;
 AN.connect=function(dest,...a){
  if(window.AudioDestinationNode&&dest instanceof AudioDestinationNode){
   const ctx=dest.context;let g=masters.get(ctx);
   if(!g){g=ctx.createGain();oc.call(g,dest);masters.set(ctx,g);applyVol()}
   if(this!==g){oc.call(this,g,...a);return dest}
  }
  return oc.call(this,dest,...a);
 };
}
/* one shared sound engine for the whole page. iPhone only plays sound from an engine that was
   unlocked inside a tap, so every game gets this same engine and the first tap unlocks it. */
const ctxs=new Set();let shared=null;const RealAC=window.AudioContext||window.webkitAudioContext;
function engine(){if(!shared&&RealAC){shared=new RealAC();ctxs.add(shared)}return shared}
if(RealAC&&!RealAC.__arc){const W=function(){return engine()};W.prototype=RealAC.prototype;W.__arc=1;try{Object.setPrototypeOf(W,RealAC)}catch(e){}
 window.AudioContext=W;if(window.webkitAudioContext)window.webkitAudioContext=W;
 try{RealAC.prototype.close=function(){return Promise.resolve()}}catch(e){}}
/* iPhone: play sound even when the ring/silent switch is on silent */
try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
let keepAlive=null;
function silentLoop(){if(keepAlive)return;try{
 const sr=8000,n=sr/2,b=new Uint8Array(44+n),v=new DataView(b.buffer),w=(o,s)=>[...s].forEach((c,i)=>b[o+i]=c.charCodeAt(0));
 w(0,'RIFF');v.setUint32(4,36+n,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,'data');v.setUint32(40,n,true);b.fill(128,44);
 keepAlive=new Audio(URL.createObjectURL(new Blob([b],{type:'audio/wav'})));keepAlive.loop=true;keepAlive.setAttribute('playsinline','');keepAlive.play().catch(()=>{keepAlive=null})}catch(e){}}
let unlocked=false;
function wake(){if(!S.sound||document.hidden)return;silentLoop();const c=engine();if(!c)return;
 try{if(c.state!=='running')c.resume()}catch(e){}
 if(!unlocked){try{const b=c.createBuffer(1,1,22050),src=c.createBufferSource();src.buffer=b;src.connect(c.destination);src.start(0);unlocked=true}catch(e){}}}
['touchend','pointerup','click','keydown','pointerdown'].forEach(t=>addEventListener(t,wake,{capture:true,passive:true}));
function testSound(){wake();const c=engine();if(!c)return 'This browser has no web audio.';
 const t=c.currentTime+.02;[523,659,784,1046].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.12,t+i*.11);g.gain.exponentialRampToValueAtTime(.0001,t+i*.11+.1);o.connect(g);g.connect(c.destination);o.start(t+i*.11);o.stop(t+i*.11+.11)});
 return c.state}
function applyVol(){const boost=['fleet','wallmaze','pool'].includes(GAME)?2.6:1.15,v=S.sound?Math.pow(S.vol/100,1.6)*boost:0;for(const g of masters.values())try{g.gain.value=v}catch(e){}}
const wasRunning=new Set();
document.addEventListener('visibilitychange',()=>{try{if(keepAlive){document.hidden?keepAlive.pause():S.sound&&keepAlive.play().catch(()=>{})}}catch(e){}for(const ctx of masters.keys()){try{if(document.hidden){if(ctx.state==='running'){wasRunning.add(ctx);ctx.suspend()}}else if(wasRunning.has(ctx)){wasRunning.delete(ctx);ctx.resume()}}catch(e){}}});

/* ---------- haptics ---------- */
function buzz(p){if(S.haptics&&navigator.vibrate)try{navigator.vibrate(p||8)}catch(e){}}
document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('button,.btn,a,#fire,#fireB,#jumpB,#enterB'))buzz(8)},{capture:true,passive:true});

/* ---------- apply settings to the page ---------- */
function apply(){
 const h=document.documentElement;
 h.classList.toggle('arc-lefty',!!S.lefty);
 for(const z of['s','m','l'])h.classList.toggle('arc-ctl-'+z,S.ctl===z);
 h.classList.toggle('arc-touch-on',S.touch==='on');h.classList.toggle('arc-touch-off',S.touch==='off');
 h.style.setProperty('--arc-ctl',{s:.8,m:1,l:1.22}[S.ctl]||1);
 applyVol();fpsOn(S.fps);if(!S.sound&&keepAlive)try{keepAlive.pause()}catch(e){}
}
function set(k,v){S[k]=v;LS.set('arc_settings',S);apply();try{dispatchEvent(new CustomEvent('arcsettings',{detail:S}))}catch(e){}}
const fx=n=>S.fx?n:0;

/* ---------- FPS counter ---------- */
let fpsEl=null,fpsRaf=0;
function fpsOn(on){
 if(!on){if(fpsEl){fpsEl.remove();fpsEl=null;cancelAnimationFrame(fpsRaf)}return}
 if(fpsEl||!document.body)return;fpsEl=document.createElement('div');fpsEl.className='arc-fps';document.body.appendChild(fpsEl);
 let n=0,t0=performance.now();const tick=t=>{n++;if(t-t0>=500){fpsEl.textContent=Math.round(n*1000/(t-t0))+' FPS';n=0;t0=t}fpsRaf=requestAnimationFrame(tick)};fpsRaf=requestAnimationFrame(tick);
}

/* ---------- UI: styles, toasts, modals ---------- */
const css=`
.arc-toast{position:fixed;left:50%;top:max(14px,env(safe-area-inset-top));transform:translate(-50%,-140%);z-index:2147483000;background:#0b0a12;border:3px solid var(--arc-tc,#ffec27);box-shadow:0 5px 0 #000;padding:10px 14px;min-width:220px;max-width:92vw;text-align:center;pointer-events:none;transition:transform .25s steps(5)}
.arc-toast.on{transform:translate(-50%,0)}
.arc-toast b{display:block;font:10px/1.6 "Press Start 2P",monospace;color:var(--arc-tc,#ffec27)}
.arc-toast span{display:block;font:20px/1.1 "VT323",monospace;color:#fff1e8}
.arc-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(5,4,10,.86);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}
.arc-box{background:#17151f;border:3px solid #ffec27;box-shadow:0 7px 0 #000;width:min(460px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:18px;color:#fff1e8;font:19px/1.25 "VT323",monospace;text-align:left}
.arc-box h2{font:13px/1.6 "Press Start 2P",monospace;color:#ffec27;margin:0 0 10px;text-align:center}
.arc-box h3{font:10px/1.6 "Press Start 2P",monospace;color:#29adff;margin:16px 0 6px;border-top:2px solid #2a2535;padding-top:12px}
.arc-box p{margin:6px 0;color:#d8cfe6}
.arc-big{font:20px "Press Start 2P",monospace!important;color:#00e436!important;text-align:center}
.arc-box input[type=text],.arc-box input:not([type]){width:100%;font:16px "Press Start 2P",monospace;background:#000;color:#ffec27;border:3px solid #5f574f;padding:10px;text-transform:uppercase;margin:6px 0}
.arc-box input:focus{outline:none;border-color:#ffec27}
.arc-row{display:flex;gap:10px;margin-top:12px}.arc-row>*{flex:1}
.arc-b{font:11px/1.4 "Press Start 2P",monospace;background:#ffec27;color:#000;border:0;box-shadow:0 5px 0 #ab5236;padding:12px 10px;min-height:44px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;text-align:center}
.arc-b:active{transform:translateY(4px);box-shadow:0 1px 0 #ab5236}
.arc-ghost{background:#2a2535;color:#fff1e8;box-shadow:0 5px 0 #000}
.arc-b:focus-visible,.arc-seg button:focus-visible{outline:3px solid #29adff;outline-offset:2px}
.arc-set{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;min-height:44px}
.arc-set label{flex:1}.arc-set small{display:block;color:#9a8fb0;font-size:16px}
.arc-sw{appearance:none;-webkit-appearance:none;width:56px;height:30px;background:#2a2535;border:3px solid #5f574f;position:relative;cursor:pointer;flex:none;margin:0}
.arc-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;background:#9a8fb0;transition:left .12s steps(3)}
.arc-sw:checked{background:#008751;border-color:#00e436}.arc-sw:checked::after{left:29px;background:#fff1e8}
.arc-sw:focus-visible{outline:3px solid #29adff;outline-offset:2px}
.arc-range{flex:none;width:46%;accent-color:#ffec27;height:30px}
.arc-seg{display:flex;flex:none}.arc-seg button{font:9px "Press Start 2P",monospace;background:#2a2535;color:#9a8fb0;border:2px solid #5f574f;min-height:40px;min-width:46px;padding:0 8px;cursor:pointer}
.arc-seg button+button{border-left:0}.arc-seg button[aria-pressed=true]{background:#ffec27;color:#000;border-color:#ffec27}
.arc-keys{width:100%;border-collapse:collapse}.arc-keys td{padding:3px 0;border-bottom:1px dashed #2a2535;vertical-align:top}.arc-keys td+td{text-align:right;color:#ffec27}
.arc-fps{position:fixed;right:6px;bottom:max(6px,env(safe-area-inset-bottom));z-index:2147481000;font:9px "Press Start 2P",monospace;color:#00e436;background:rgba(0,0,0,.6);padding:4px 6px;pointer-events:none}
.arc-gear{margin-top:10px}
html.arc-touch-on #controls{display:block!important}
html.arc-touch-off #controls{display:none!important}
#base,#fire,#fireB,#jumpB,#enterB{scale:var(--arc-ctl,1)}
html.arc-lefty #stick{left:auto!important;right:0!important}
html.arc-lefty #fireB{right:auto!important;left:4%!important}
html.arc-lefty #jumpB{right:auto!important;left:calc(4% + 104px)!important}
html.arc-lefty #fire{right:auto!important;left:6%!important}
@media (prefers-reduced-motion:reduce){.arc-toast{transition:none}}
`;
function injectCSS(){if(document.getElementById('arc-css'))return;const s=document.createElement('style');s.id='arc-css';s.textContent=css;(document.head||document.documentElement).appendChild(s)}
injectCSS();

let toastQ=[],toastOn=false;
function toast(title,sub,color){toastQ.push([title,sub,color]);if(!toastOn)nextToast()}
function nextToast(){const t=toastQ.shift();if(!t){toastOn=false;return}toastOn=true;if(!document.body){setTimeout(nextToast,300);toastQ.unshift(t);return}
 const el=document.createElement('div');el.className='arc-toast';el.setAttribute('role','status');el.style.setProperty('--arc-tc',t[2]||'#ffec27');el.innerHTML=`<b>${esc(t[0])}</b>${t[1]?`<span>${esc(t[1])}</span>`:''}`;document.body.appendChild(el);
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));setTimeout(()=>{el.classList.remove('on');setTimeout(()=>{el.remove();nextToast()},300)},2600)}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let lastFocus=null;
function modal(html){lastFocus=document.activeElement;const ov=document.createElement('div');ov.className='arc-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.innerHTML=`<div class="arc-box">${html}</div>`;
 ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))close(ov)});
 ov.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close(ov)});
 ['keyup','keypress'].forEach(t=>ov.addEventListener(t,e=>e.stopPropagation()));
 document.body.appendChild(ov);const f=ov.querySelector('button,input');f&&f.focus({preventScroll:true});return ov}
function close(ov){ov.remove();lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})}

/* ---------- settings panel (used in games and on the settings page) ---------- */
function sw(k,label,hint){return `<div class="arc-set"><label for="arc_${k}">${label}${hint?`<small>${hint}</small>`:''}</label><input type="checkbox" class="arc-sw" id="arc_${k}" data-k="${k}" ${S[k]?'checked':''}></div>`}
function seg(k,label,opts,hint){return `<div class="arc-set"><span>${label}${hint?`<small>${hint}</small>`:''}</span><div class="arc-seg" role="group" aria-label="${label}">${opts.map(([v,t])=>`<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${S[k]===v}">${t}</button>`).join('')}</div></div>`}
function keysTable(g){const G=GAMES[g];return `<p style="color:${G.c};font:9px/1.6 'Press Start 2P',monospace;margin-top:10px">${G.t}</p><table class="arc-keys">${G.keys.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table><p><small style="color:#9a8fb0">Touch: ${G.touch}</small></p>`}
function settingsHTML(opts){opts=opts||{};const games=GAME?[GAME]:Object.keys(GAMES);
 return `<h3 style="border:0;margin-top:0;padding-top:0">GAME</h3>
 <div class="arc-set"><label for="arc_vol">Volume<small id="arcVolV">${S.vol}%</small></label><input type="range" class="arc-range" id="arc_vol" min="0" max="100" step="5" value="${S.vol}"></div>
 ${sw('sound','Sound','All sound effects and music.')}
 <div class="arc-row" style="margin-top:4px"><button class="arc-b arc-ghost" type="button" id="arcTest">♪ TEST SOUND</button></div><p id="arcTestR" style="font-size:16px;color:#9a8fb0;margin:4px 0 0"></p>
 ${sw('haptics','Vibration','Short buzz on taps and awards (Android).')}
 ${sw('fx','Screen shake and flashes','Turn off if motion bothers you.')}
 ${sw('fps','Show FPS','Frame counter in the corner.')}
 <h3>CONTROLS</h3>
 ${seg('touch','On-screen buttons',[['auto','AUTO'],['on','ON'],['off','OFF']],'AUTO shows them on touch screens.')}
 ${seg('ctl','Button size',[['s','S'],['m','M'],['l','L']])}
 ${sw('lefty','Left-handed','Swap the stick and the fire buttons.')}
 <details style="margin-top:6px"><summary style="cursor:pointer;color:#ffec27;min-height:36px">${GAME?'Keys for this game':'Keys for every game'}</summary>${games.map(keysTable).join('')}</details>
 <h3>PLAYER</h3>
 <div class="arc-set"><label for="arcName">Leaderboard name<small>Up to 12 letters or numbers.</small></label></div>
 <input id="arcName" maxlength="12" value="${esc(name())}" placeholder="YOUR NAME" autocomplete="nickname" spellcheck="false">
 ${sw('online','Online leaderboards','Send your name and scores to the world and country boards.')}
 ${opts.full?`<h3>DATA</h3><p>Progress and saves live on this device. Online scores are only sent when you have a name and online leaderboards are on.</p>${REMOTE.url?`<div class="arc-row"><button class="arc-b arc-ghost" id="arcForget" type="button">DELETE MY ONLINE SCORES</button></div>`:''}<div class="arc-row"><button class="arc-b arc-ghost" id="arcReset" type="button">RESET ALL PROGRESS</button></div><p style="font-size:16px"><a href="privacy.html" style="color:#9a8fb0">Privacy policy</a></p>`:''}
 <p style="color:#5f574f;text-align:center;margin-top:14px">8-Bit Arcade Pack v${VERSION}</p>`}
function bindSettings(root){
 root.querySelectorAll('.arc-sw').forEach(i=>i.addEventListener('change',()=>set(i.dataset.k,i.checked)));
 root.querySelectorAll('.arc-seg button').forEach(b=>b.addEventListener('click',()=>{set(b.dataset.k,b.dataset.v);root.querySelectorAll(`.arc-seg button[data-k="${b.dataset.k}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b))}));
 const ts=root.querySelector('#arcTest');ts&&ts.addEventListener('click',()=>{if(!S.sound)set('sound',true),root.querySelector('#arc_sound')&&(root.querySelector('#arc_sound').checked=true);const st=testSound();setTimeout(()=>{root.querySelector('#arcTestR').textContent=(shared&&shared.state==='running')?'You should hear 4 beeps. No sound? Turn up the volume buttons and check the phone is not on Bluetooth headphones.':'Sound is blocked ('+st+'). Tap the button again.'},500)});
 const r=root.querySelector('#arc_vol');r&&r.addEventListener('input',()=>{set('vol',+r.value);root.querySelector('#arcVolV').textContent=r.value+'%'});
 const n=root.querySelector('#arcName');n&&n.addEventListener('change',()=>{n.value=setName(n.value)});n&&['keydown','keyup'].forEach(t=>n.addEventListener(t,e=>e.stopPropagation()));
 const fg=root.querySelector('#arcForget');fg&&fg.addEventListener('click',()=>{const ov=modal(`<h2>DELETE ONLINE SCORES?</h2><p>This removes every score this device sent to the world and country boards. Scores on this device stay.</p><div class="arc-row"><button class="arc-b arc-ghost" data-x>KEEP</button><button class="arc-b" id="arcFYes">DELETE</button></div>`);ov.querySelector('#arcFYes').onclick=()=>{fetch(REMOTE.url+'/player?player='+encodeURIComponent(playerId()),{method:'DELETE'}).then(r=>r.json()).then(j=>{close(ov);toast('ONLINE SCORES DELETED',(j.deleted||0)+' removed','#29adff')}).catch(()=>{close(ov);toast('NO CONNECTION','Try again when you are online.','#ff004d')})}});
 const rs=root.querySelector('#arcReset');rs&&rs.addEventListener('click',()=>{
  const ov=modal(`<h2>RESET EVERYTHING?</h2><p>This deletes all saves, records, leaderboards, awards and settings on this device. It cannot be undone.</p><div class="arc-row"><button class="arc-b arc-ghost" data-x>KEEP</button><button class="arc-b" id="arcRYes" style="background:#ff004d;color:#fff1e8;box-shadow:0 5px 0 #7e2553">DELETE</button></div>`);
  ov.querySelector('#arcRYes').onclick=()=>{try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^(arc_|door_|cowboy_|gangster_|quor_|bs_|pool_|run_)/.test(k))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()}});
}
function openSettings(){const ov=modal(`<h2>SETTINGS</h2>${settingsHTML()}<div class="arc-row"><button class="arc-b" data-x>DONE</button></div>`);bindSettings(ov)}

/* add a SETTINGS button next to every in-game "BACK TO PACK" button */
function addGear(){document.querySelectorAll('a[href="index.html"]').forEach(a=>{if(!/BACK TO PACK/.test(a.textContent)||a.nextElementSibling?.classList.contains('arc-gear-b'))return;
 const b=document.createElement('button');b.type='button';b.className=a.className+' arc-gear-b';b.setAttribute('style',a.getAttribute('style')||'');b.style.marginTop='8px';b.textContent='⚙ SETTINGS';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openSettings()});a.after(b)})}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
ready(()=>{apply();if(GAME)addGear()});

window.ARC={audioCtxs:()=>[...ctxs].map(c=>c.state),testSound,VERSION,GAMES,GAME,AWARDS,TIER,trophyPoints,history,record,remoteTop,REMOTE,playerId,settings:()=>Object.assign({},S),set,fx,buzz,toast,submit,board,name,setName,stats,awards:()=>LS.get('arc_awards',{}),unlock,openSettings,settingsHTML,bindSettings,modal,esc};
})();
