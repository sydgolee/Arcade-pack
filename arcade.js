/* 8-Bit Arcade Pack: shared layer for every page.
   Settings, sound volume, haptics, on-screen control options, player name,
   local leaderboards, awards, play stats, toasts. Everything stays on this device. */
(function(){
'use strict';
const VERSION='1.0.0';
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DEF={vol:80,sound:true,haptics:true,fx:true,fps:false,touch:'auto',ctl:'m',lefty:false};
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

/* ---------- awards ---------- */
const AWARDS=[
 ['first','INSERT COIN','Finish your first game in the pack.'],
 ['all6','COLLECTOR','Play all six games.'],
 ['hour','ARCADE RAT','Play for one hour in total.'],
 ['d10','DEEP DIVER','Reach room 10 in Dungeon of One Room.'],
 ['d25','INTO THE ABYSS','Reach room 25 in Dungeon of One Room.'],
 ['w1','WALL BUILDER','Win a game of Wall Maze.'],
 ['w3','GRANDMASTER','Beat the Hard CPU in Wall Maze.'],
 ['f1','SEA LEGS','Win a game of Fleet Strike.'],
 ['f3','ADMIRAL SLAYER','Beat the Admiral in Fleet Strike.'],
 ['f45','SHARPSHOOTER','Win Fleet Strike in 45 shots or fewer.'],
 ['p1','CHALK UP','Win a game of 8-Ball.'],
 ['p3','SHARK BAIT','Beat the Shark at 8-Ball.'],
 ['c1k','TRAIL BLAZER','Ride 1000m in High Noon Rider.'],
 ['c3k','LEGEND OF THE WEST','Ride 3000m in High Noon Rider.'],
 ['g1k','MADE MAN','Run 1000m in Tommy Gun Alley.'],
 ['g3k','KINGPIN','Run 3000m in Tommy Gun Alley.']
];
function unlock(id){const got=LS.get('arc_awards',{});if(got[id])return;got[id]=Date.now();LS.set('arc_awards',got);const a=AWARDS.find(x=>x[0]===id);if(a){toast('AWARD UNLOCKED',a[1],'#ffec27');buzz([20,40,20])}}
function checkAwards(game,x){
 unlock('first');
 if(game==='dungeon'){if(x.room>=10)unlock('d10');if(x.room>=25)unlock('d25')}
 if(game==='wallmaze'&&x.win){unlock('w1');if(x.lvl>=2)unlock('w3')}
 if(game==='fleet'&&x.win){unlock('f1');if(x.lvl>=2)unlock('f3');if(x.shots<=45)unlock('f45')}
 if(game==='pool'&&x.win){unlock('p1');if(x.lvl>=2)unlock('p3')}
 if(game==='cowboy'){if(x.m>=1000)unlock('c1k');if(x.m>=3000)unlock('c3k')}
 if(game==='gangster'){if(x.m>=1000)unlock('g1k');if(x.m>=3000)unlock('g3k')}
}

/* ---------- stats ---------- */
const stats=()=>LS.get('arc_stats',{first:Date.now(),g:{}});
function bump(fn){const s=stats();fn(s);LS.set('arc_stats',s)}
if(GAME){
 bump(s=>{const g=s.g[GAME]=s.g[GAME]||{plays:0,time:0};g.plays++;g.last=Date.now()});
 if(Object.keys(stats().g).length>=6)setTimeout(()=>unlock('all6'),800);
 setInterval(()=>{if(document.hidden)return;bump(s=>{s.g[GAME].time=(s.g[GAME].time||0)+5});const t=Object.values(stats().g).reduce((a,g)=>a+(g.time||0),0);if(t>=3600)unlock('hour')},5000);
}

/* ---------- leaderboards (local top 10 per game and mode) ---------- */
const REMOTE=null; // later: {url:'https://<worker>.workers.dev'} for worldwide boards
const lbKey=(g,m)=>'arc_lb_'+g+(m&&m!=='main'?'_'+m:'');
function board(g,m){return LS.get(lbKey(g,m),[])}
function submit(game,score,detail,x){
 x=x||{};score=Math.max(0,Math.round(score||0));
 try{checkAwards(game,x)}catch(e){}
 if(!score)return 0;
 const mode=x.mode||'main',list=board(game,mode),e={n:name()||'',s:score,d:detail||'',t:Date.now()};
 list.push(e);list.sort((a,b)=>b.s-a.s||a.t-b.t);const top=list.slice(0,10),rank=top.indexOf(e)+1;
 LS.set(lbKey(game,mode),top);
 if(rank){
  setTimeout(()=>{if(!name())askName(rank,score,game,mode,e.t);else toast(rank===1?'NEW HIGH SCORE!':'LEADERBOARD #'+rank,score+' '+(GAMES[game]?.unit||''),'#00e436')},700);
 }
 if(REMOTE&&name())try{fetch(REMOTE.url+'/score',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game,mode,name:name(),score,detail,version:VERSION})}).catch(()=>{})}catch(e){}
 return rank;
}

/* ---------- player name ---------- */
function name(){return (LS.get('arc_name','')||'').slice(0,12)}
const clean=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9 _.-]/g,'').trim().slice(0,12);
function setName(v){v=clean(v);LS.set('arc_name',v);return v}
function askName(rank,score,game,mode,t){
 const ov=modal(`<h2>${rank===1?'NEW HIGH SCORE!':'YOU MADE THE BOARD'}</h2><p class="arc-big">#${rank} · ${score}</p><p>Enter your name for the leaderboard.</p>
  <input id="arcNameIn" maxlength="12" autocomplete="nickname" autocapitalize="characters" spellcheck="false" placeholder="YOUR NAME" aria-label="Your name">
  <div class="arc-row"><button class="arc-b arc-ghost" data-x>SKIP</button><button class="arc-b" id="arcNameOk">SAVE</button></div>`);
 const inp=ov.querySelector('#arcNameIn');setTimeout(()=>inp.focus(),50);
 const ok=()=>{const n=setName(inp.value);if(n){const k=lbKey(game,mode),l=LS.get(k,[]);for(const r of l)if(!r.n&&r.t===t)r.n=n;LS.set(k,l)}close(ov)};
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
function applyVol(){const v=S.sound?Math.pow(S.vol/100,1.6):0;for(const g of masters.values())try{g.gain.value=v}catch(e){}}
const wasRunning=new Set();
document.addEventListener('visibilitychange',()=>{for(const ctx of masters.keys()){try{if(document.hidden){if(ctx.state==='running'){wasRunning.add(ctx);ctx.suspend()}}else if(wasRunning.has(ctx)){wasRunning.delete(ctx);ctx.resume()}}catch(e){}}});

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
 applyVol();fpsOn(S.fps);
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
 ${opts.full?`<h3>DATA</h3><p>Progress, saves and scores live only on this device.</p><div class="arc-row"><button class="arc-b arc-ghost" id="arcReset" type="button">RESET ALL PROGRESS</button></div>`:''}
 <p style="color:#5f574f;text-align:center;margin-top:14px">8-Bit Arcade Pack v${VERSION}</p>`}
function bindSettings(root){
 root.querySelectorAll('.arc-sw').forEach(i=>i.addEventListener('change',()=>set(i.dataset.k,i.checked)));
 root.querySelectorAll('.arc-seg button').forEach(b=>b.addEventListener('click',()=>{set(b.dataset.k,b.dataset.v);root.querySelectorAll(`.arc-seg button[data-k="${b.dataset.k}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b))}));
 const r=root.querySelector('#arc_vol');r&&r.addEventListener('input',()=>{set('vol',+r.value);root.querySelector('#arcVolV').textContent=r.value+'%'});
 const n=root.querySelector('#arcName');n&&n.addEventListener('change',()=>{n.value=setName(n.value)});n&&['keydown','keyup'].forEach(t=>n.addEventListener(t,e=>e.stopPropagation()));
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

window.ARC={VERSION,GAMES,GAME,AWARDS,settings:()=>Object.assign({},S),set,fx,buzz,toast,submit,board,name,setName,stats,awards:()=>LS.get('arc_awards',{}),openSettings,settingsHTML,bindSettings,modal,esc};
})();
