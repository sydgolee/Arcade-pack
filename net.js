/* 8-Bit Arcade Pack: online play with a friend.
   NET.init({game, onStart(info), onMsg(from, d, replay), onStatus(info)})
   A game calls NET.send(obj) for its own moves. The room keeps a log, so a player who reloads
   or loses connection gets every move again (replay=true) and lands in the same spot. */
(function(){
'use strict';
const API=(window.ARC&&ARC.REMOTE&&ARC.REMOTE.url)||'https://arcade-pack.s-golee.workers.dev';
const WS=API.replace(/^http/,'ws');
let goneAt=0,claimT=0,cfg=null,ws=null,info=null,retry=0,want=false,pingT=0,lobby=null,banner=null,opts={},clockT=0,turnStart=0,lastBeep=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const myName=()=>(window.ARC&&ARC.name())||'PLAYER';

function init(c){cfg=c;
 const q=new URLSearchParams(location.search),code=(q.get('room')||'').toUpperCase();
 addButton();
 if(/^[A-Z0-9]{5}$/.test(code))setTimeout(()=>join(code,true),200);
}
function addButton(){
 const start=document.getElementById('start');if(!start||start.querySelector('.net-b'))return;
 const b=document.createElement('button');b.type='button';b.className='btn net-b';b.textContent='▶ PLAY A FRIEND ONLINE';
 b.style.cssText='background:#29adff;color:#000;box-shadow:0 5px 0 #1d2b53';
 b.addEventListener('click',openLobby);
 const anchor=start.querySelector('.seg')||start.querySelector('h1');anchor.after(b);
}

/* ---------- lobby ---------- */
function openLobby(){
 if(!window.ARC)return;
 if(!ARC.name()){askName(openLobby);return}
 lobby=ARC.modal(`<h2>PLAY A FRIEND</h2>
  <p>Make an invite and send the link. Your friend opens it on their phone and you play live.</p>
  <div class="arc-row"><button class="arc-b" id="nCreate">CREATE INVITE</button></div>
  <h3>GOT A CODE?</h3>
  <input id="nCode" maxlength="5" placeholder="ABCDE" autocapitalize="characters" spellcheck="false" aria-label="Invite code">
  <div class="arc-row"><button class="arc-b arc-ghost" data-x>CANCEL</button><button class="arc-b arc-ghost" id="nJoin">JOIN</button></div>`);
 const inp=lobby.querySelector('#nCode');
 lobby.querySelector('#nCreate').onclick=create;
 lobby.querySelector('#nJoin').onclick=()=>{const c=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.length===5)join(c);else inp.focus()};
 inp.addEventListener('keydown',e=>{if(e.key==='Enter')lobby.querySelector('#nJoin').click()});
}
function askName(next){const ov=ARC.modal(`<h2>YOUR NAME</h2><p>Your friend will see this name.</p><input id="nNm" maxlength="12" placeholder="YOUR NAME" autocomplete="nickname" spellcheck="false"><div class="arc-row"><button class="arc-b arc-ghost" data-x>CANCEL</button><button class="arc-b" id="nOk">NEXT</button></div>`);
 const i=ov.querySelector('#nNm'),ok=()=>{if(!ARC.setName(i.value)){i.focus();return}ov.remove();next()};ov.querySelector('#nOk').onclick=ok;i.addEventListener('keydown',e=>{if(e.key==='Enter')ok()})}
async function create(){
 const box=lobby&&lobby.querySelector('.arc-box');if(box)box.innerHTML='<h2>PLAY A FRIEND</h2><p>Making your invite…</p>';
 try{const r=await fetch(API+'/api/room/new',{method:'POST'});const j=await r.json();if(!j.code)throw 0;join(j.code)}
 catch(e){if(box)box.innerHTML='<h2>NO CONNECTION</h2><p>Could not reach the game server. Check your internet and try again.</p><div class="arc-row"><button class="arc-b" data-x>OK</button></div>'}
}
function link(code){const u=new URL(location.href);u.search='?room='+code;u.hash='';return u.toString()}
function waiting(code){
 if(!lobby||!lobby.isConnected)lobby=ARC.modal('');
 const box=lobby.querySelector('.arc-box'),url=link(code);
 box.innerHTML=`<h2>INVITE READY</h2><p>Send this link to your friend:</p>
  <p class="arc-big" style="letter-spacing:6px">${code}</p>
  <div class="arc-row"><button class="arc-b" id="nShare">SEND INVITE ▶</button></div>
  <p style="text-align:center;margin-top:14px" id="nWait">Waiting for your friend to join…</p>
  <div class="arc-row"><button class="arc-b arc-ghost" id="nLeave">CANCEL</button></div>`;
 box.querySelector('#nShare').onclick=async()=>{const t=`Play ${GAME_T()} with me! Code ${code}`;try{if(navigator.share){await navigator.share({title:'8-Bit Arcade Pack',text:t,url});return}await navigator.clipboard.writeText(t+' '+url);ARC.toast('INVITE COPIED','Paste it in a chat.','#29adff')}catch(e){if(e&&e.name!=='AbortError')ARC.toast('SEND THIS LINK',url,'#29adff')}};
 box.querySelector('#nLeave').onclick=()=>{leave();lobby.remove();lobby=null};
}
const GAME_T=()=>(window.ARC&&ARC.GAMES[cfg.game]?ARC.GAMES[cfg.game].t:'a game');

/* ---------- connection ---------- */
function join(code,fromLink,o){
 opts=o||{};want=true;info={code,seat:null,names:{},online:[],started:false};
 if(window.ARC&&!ARC.name()){askName(()=>join(code,fromLink,o));return}
 if(lobby&&lobby.isConnected){const box=lobby.querySelector('.arc-box');box.innerHTML='<h2>CONNECTING…</h2><p>Joining game '+code+'.</p>'}
 else if(fromLink){lobby=ARC.modal(opts.auto?`<h2>CONNECTING…</h2><p>Getting your match against ${esc(opts.opp||'your opponent')} ready.</p>`:'<h2>CONNECTING…</h2><p>Joining your friend\'s game '+code+'.</p>')}
 connect();
}
function connect(){
 if(!want||!info)return;
 try{ws&&ws.close()}catch(e){}
 const q=new URLSearchParams({game:cfg.game,pid:ARC.playerId(),name:myName()});
 ws=new WebSocket(WS+'/api/room/'+info.code+'?'+q);
 ws.onopen=()=>{retry=0;clearInterval(pingT);pingT=setInterval(()=>{try{ws.send('{"k":"ping"}')}catch(e){}},25000)};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}handle(m)};
 ws.onclose=e=>{clearInterval(pingT);if(!want)return;
  if(e.code===4000)return;
  if(info&&info.seat==null&&retry>1){fail('Could not join. The invite may be full, old, or for another game.');return}
  status();retry++;setTimeout(connect,Math.min(8000,600*retry))};
}
function fail(msg){want=false;info=null;if(!lobby||!lobby.isConnected)lobby=ARC.modal('');lobby.querySelector('.arc-box').innerHTML=`<h2>CAN'T JOIN</h2><p>${esc(msg)}</p><div class="arc-row"><button class="arc-b" data-x>OK</button></div>`;history.replaceState(null,'',location.pathname)}
function handle(m){
 if(m.t==='hello'){info.seat=m.seat;info.first=m.first||0;info.names=m.names||{};info.online=m.online||[];goneAt=info.online.includes(1-m.seat)?0:(m.log&&m.log.length?Date.now():0);
  history.replaceState(null,'',location.pathname+'?room='+info.code);
  const both=info.online.includes(0)&&info.online.includes(1);
  if(!both&&!info.started&&!(m.log&&m.log.length)){if(opts.auto){if(!lobby||!lobby.isConnected)lobby=ARC.modal('');lobby.querySelector('.arc-box').innerHTML=`<h2>GET READY</h2><p style="text-align:center">Waiting for ${esc(opts.opp||'your opponent')} to connect…</p>${opts.cup?'':'<div class="arc-row"><button class="arc-b arc-ghost" id="nGiveUp">CANCEL</button></div>'}`;const gu=lobby.querySelector('#nGiveUp');gu&&(gu.onclick=()=>{leave();lobby.remove();lobby=null})}else waiting(info.code)}
  else begin(m.log||[]);
  status();return}
 if(m.t==='reject'){if(m.claim)return;ARC.toast('MOVE NOT ACCEPTED',m.why||'','#ff004d');cfg.onReject&&cfg.onReject(m.why);return}
 if(m.t==='peer'){goneAt=0;info.names[m.seat]=m.name;info.online=m.online||info.online;if(!info.started)begin([]);else ARC.toast('FRIEND IS BACK',m.name,'#00e436');status();return}
 if(m.t==='left'){info.online=m.online||[];if(m.seat!==info.seat&&!goneAt)goneAt=Date.now();status();if(info.started)ARC.toast('FRIEND DISCONNECTED','Waiting for them to come back…','#ff004d');return}
 if(m.t==='msg'){cfg.onMsg&&cfg.onMsg(m.from,m.d,false);return}
}
function begin(log){
 if(lobby&&lobby.isConnected){lobby.remove();lobby=null}
 info.started=true;clock();
 cfg.onStart&&cfg.onStart({seat:info.seat,first:info.first,me:myName(),them:them(),code:info.code});
 for(const x of log)cfg.onMsg&&cfg.onMsg(x.from,x.d,true);
 if(cfg.onReplayDone)cfg.onReplayDone();
 status();
}
const them=()=>info?(info.names[1-info.seat]||'FRIEND'):'FRIEND';
function send(d){if(ws&&ws.readyState===1){ws.send(JSON.stringify(d));return true}ARC.toast('NOT CONNECTED','Your move will not reach your friend. Reconnecting…','#ff004d');return false}
function leave(){try{if(info&&info.started&&ws&&ws.readyState===1&&cfg&&cfg.inProgress&&cfg.inProgress())ws.send(JSON.stringify({k:'forfeit'}))}catch(e){}goneAt=0;want=false;info=null;clearInterval(clockT);turnStart=0;try{ws&&ws.close()}catch(e){}ws=null;status();history.replaceState(null,'',location.pathname)}

/* ---------- connection banner ---------- */
function clock(){
 clearInterval(clockT);clockT=setInterval(()=>{
  if(!info||!info.started||!cfg||!cfg.myTurn){turnStart=0;return}
  const live=ws&&ws.readyState===1,friend=info.online.includes(1-info.seat),lim=cfg.myTurn();
  if(live&&!friend&&goneAt&&cfg.inProgress&&cfg.inProgress()){const w=Math.ceil(90-(Date.now()-goneAt)/1000);if(banner){banner.textContent=w>0?`${them()} LEFT · YOU WIN IN ${w}s`:'CLAIMING THE WIN…';banner.style.background='#ab5236'}
   if(w<=0&&Date.now()-claimT>8000){claimT=Date.now();try{ws.send('{"k":"claim"}')}catch(e){}}return}
  if(!lim||!live||!friend){if(turnStart){turnStart=0;status()}return}
  if(!turnStart)turnStart=Date.now();
  const left=Math.ceil(lim-(Date.now()-turnStart)/1000);
  if(banner){banner.textContent=`YOUR MOVE · ${Math.max(0,left)}s`;banner.style.background=left<=10?'#7e2553':'#1d2b53'}
  if(left<=10&&left>0&&left!==lastBeep){lastBeep=left;try{const a=new(window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime;o.type='square';o.frequency.value=left<=3?880:660;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.07)}catch(e){}}
  if(left<=0){turnStart=0;cfg.onTimeout&&cfg.onTimeout()}
 },250)}
function status(){
 const on=!!(info&&info.started);
 if(!on){banner&&banner.remove();banner=null;cfg&&cfg.onStatus&&cfg.onStatus(null);return}
 if(!banner){banner=document.createElement('div');banner.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:60;font:9px/1.4 "Press Start 2P",monospace;text-align:center;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:#1d2b53;color:#fff1e8;pointer-events:none';document.body.appendChild(banner)}
 const live=ws&&ws.readyState===1,friend=info.online.includes(1-info.seat);
 banner.style.background=!live?'#7e2553':friend?'#1d2b53':'#ab5236';
 banner.textContent=!live?'RECONNECTING…':friend?`ONLINE VS ${them()}`:`${them()} DISCONNECTED · WAITING`;
 cfg&&cfg.onStatus&&cfg.onStatus({live,friend,seat:info.seat,them:them()});
}

window.NET={init,send,leave,join,resetClock:()=>{turnStart=0},get active(){return !!(info&&info.started)},get seat(){return info?info.seat:null},get them(){return them()},openLobby};
})();
