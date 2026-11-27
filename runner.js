/* Shared run-and-gun engine for the Cowboy and Gangster games.
   The page sets window.THEME before loading this file. */
(()=>{
const TH=window.THEME,W=176,H=128,GY=112,GUNH=9;
const C=['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'];

/* ---------- page ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>
:root{color-scheme:dark;--bg:#0b0a12;--stone:#17151f;--ink:#fff1e8;--dim:#9a8fb0;--gold:#ffec27;--red:#ff004d;--accent:${TH.accent};--gw:352px;--gh:256px}
*{box-sizing:border-box;min-width:0;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);overflow:hidden}
body{font:20px/1.15 "VT323",ui-monospace,monospace;touch-action:none;user-select:none;-webkit-user-select:none;background:${TH.pageBg}}
#app{display:flex;flex-direction:column;align-items:center;height:100%;padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))}
#hud{width:var(--gw);display:flex;align-items:center;gap:8px;padding:2px 0 8px;font:9px "Press Start 2P",monospace}
#hud a{color:var(--dim);text-decoration:none;padding:12px 8px;font-size:12px}
#hearts{color:var(--red);font-size:14px;white-space:nowrap}#dist{flex:1;text-align:center;color:var(--gold);white-space:nowrap}#ammo{color:var(--accent);white-space:nowrap}
.ib{font:9px "Press Start 2P",monospace;background:var(--stone);color:var(--ink);border:2px solid #000;box-shadow:inset 0 -3px 0 #000;height:32px;min-width:34px;cursor:pointer}
#stage{position:relative;width:var(--gw);height:var(--gh);background:#000;box-shadow:0 0 0 4px #000,0 0 0 8px #2a2535}
#game{width:100%;height:100%;display:block;image-rendering:pixelated}
#banner{position:absolute;left:0;right:0;top:34%;text-align:center;font:clamp(12px,calc(var(--gw) / 34),26px) "Press Start 2P",monospace;color:var(--gold);text-shadow:2px 2px 0 #000;opacity:0;transition:opacity .25s;pointer-events:none}#banner.on{opacity:1}
#power{width:var(--gw);min-height:26px;padding-top:8px;font:9px "Press Start 2P",monospace;color:var(--accent);text-align:center}
#keys{color:var(--dim);font-size:18px;text-align:center}
#controls{flex:1;width:100%;max-width:520px;position:relative;display:none;min-height:170px}
.touch #controls{display:block}.touch #keys{display:none}
#stick{position:absolute;left:0;top:0;bottom:0;width:46%}
#base{position:absolute;left:50%;top:50%;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:50%;background:rgba(255,241,232,.05);border:3px solid #2a2535}
#knob{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:#2a2535;border:3px solid var(--dim)}
.pb{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;font:10px "Press Start 2P",monospace;color:var(--ink);border:4px solid #000}
#fireB{right:4%;bottom:12%;width:96px;height:96px;background:var(--red);box-shadow:inset 0 -8px 0 #7e2553}
#enterB{left:50%;top:2%;width:84px;height:62px;margin-left:-42px;border-radius:8px;background:var(--gold);color:#000;display:none;text-align:center;line-height:1.5}#enterB.on{display:flex}
#jumpB{right:calc(4% + 104px);bottom:8%;top:auto;width:80px;height:80px;background:#1d2b53;box-shadow:inset 0 -7px 0 #000}
.pb.down{transform:translateY(3px);filter:brightness(1.3)}
.ov{position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:flex-start;background:rgba(11,10,18,.97);text-align:center;padding:20px 16px;overflow:auto;z-index:5}
.ov.on{display:flex}.ov>:first-child{margin-top:auto}.ov>:last-child{margin-bottom:auto}
.ov h1{font:clamp(20px,6vw,32px)/1.35 "Press Start 2P",monospace;color:var(--gold);text-shadow:4px 4px 0 ${TH.titleShadow};margin:0 0 12px}
.ov p{max-width:460px;margin:6px 0}.muted{color:var(--dim)}
.btn{font:12px "Press Start 2P",monospace;background:var(--gold);color:#000;border:0;padding:14px 18px;margin:6px;box-shadow:0 5px 0 #ab5236;cursor:pointer;min-height:46px;min-width:220px}
.btn.ghost{background:var(--stone);color:var(--ink);box-shadow:0 5px 0 #000}.btn:active{transform:translateY(4px)}
.btn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
</style>`);
document.body.innerHTML=`<div id="app">
 <div id="hud"><a href="index.html">◀</a><span id="hearts"></span><span id="dist">0m</span><span id="ammo"></span><button class="ib" id="auto" aria-pressed="false">AUTO</button><button class="ib" id="snd">SND</button><button class="ib" id="pz">II</button></div>
 <div id="stage"><canvas id="game"></canvas><div id="banner"></div></div>
 <div id="power"></div>
 <div id="keys">A/D move · W aim up · S duck · Space jump · J or K fire · E enter door · P pause</div>
 <div id="controls"><div id="stick"><div id="base"><div id="knob"></div></div></div><div class="pb" id="jumpB">JUMP</div><div class="pb" id="enterB">▲<br>ENTER</div><div class="pb" id="fireB">FIRE</div></div>
</div>
<div class="ov on" id="title"><a href="index.html" class="btn ghost" style="min-width:0;text-decoration:none;display:inline-flex;align-items:center;justify-content:center">◀ BACK TO PACK</a><h1>${TH.title}</h1><p>${TH.intro}</p><p class="muted" id="ctl"></p><button class="btn" id="cont" style="display:none">CONTINUE</button><button class="btn" id="play">RIDE OUT</button><p class="muted" id="bestL"></p></div>
<div class="ov" id="pause"><h1 style="font-size:18px">PAUSED</h1><button class="btn" id="res">RESUME</button><button class="btn ghost" id="quit">QUIT</button></div>
<div class="ov" id="dead"><h1>${TH.deadTitle}</h1><p id="dc"></p><p id="db" class="muted"></p><button class="btn" id="again2" style="display:none">CONTINUE FROM SAVE</button><button class="btn" id="again">NEW RUN</button><button class="btn ghost" id="menu">MENU</button></div>`;
document.getElementById('play').textContent=TH.playLabel;
const $=id=>document.getElementById(id);
const cv=$('game');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------- sprites ---------- */
const HUM={
 w1:["..HHHH..",".HHHHHH.","..SSSS..","..SXSX..","..SSSS..","..BRRB..",".BBBBBGG",".SBBBB..","..BBBB..","..LLLL..","..L..L..",".KK..KK."],
 w2:["..HHHH..",".HHHHHH.","..SSSS..","..SXSX..","..SSSS..","..BRRB..",".BBBBBGG",".SBBBB..","..BBBB..","..LLLL..",".L....L.","KK....KK"],
 jp:["..HHHH..",".HHHHHH.","..SSSS..","..SXSX..","..SSSS..","..BRRB..",".BBBBBGG",".SBBBB..","..BBBB..","..LLLL..",".LL..LL.","........"],
 cr:["..HHHH..",".HHHHHH.","..SSSS..","..SXSX..",".BBRRBGG",".SBBBB..",".LLLLLL.","KK....KK"],
 th:["..HHHH..",".HHHHHH.","..SSSS..","..SXSX.S","..SSSS.S",".BBRRBB.",".BBBBBB.",".SBBBB..","..BBBB..","..LLLL..","..L..L..",".KK..KK."]};
if(TH.hum)TH.hum(HUM);
const PL=TH.playerSprites||HUM;
const MOUNT=TH.mount;// rider/car sprite rows (facing right)
const ITEMS={heart:[".88.88.","8888888","8888888",".88888.","..888..","...8..."],
 rapid:["..aa...",".aaaa..","aaaaaaa","...aa..","..aa...",".aa....","aa....."],
 spread:["a.....a",".a...a.","..a.a..","aaaaaaa","..a.a..",".a...a.","a.....a"],
 crate:["4444444444","4999999994","4944444494","4949999494","4944999494","4949499494","4949949494","4944444494","4999999994","4444444444"],
 rock:["...5555...","..566665..",".56666665.","5566666655","5555555555","5555555555"],
 barrel:[".444444.","44999944","49999994","45555554","49999994","49999994","45555554","49999994","44999944",".444444."]};
const cache={};
function spr(rows,map){const k=rows.join('')+JSON.stringify(map||0);if(cache[k])return cache[k];const w=Math.max(...rows.map(r=>r.length)),c=document.createElement('canvas');c.width=w;c.height=rows.length;const x=c.getContext('2d');
 rows.forEach((r,j)=>[...r].forEach((ch,i)=>{if(ch==='.')return;let v=map&&map[ch]!==undefined?map[ch]:ch;if(v==='.')return;const n=parseInt(v,16);if(isNaN(n))return;x.fillStyle=C[n];x.fillRect(i,j,1,1)}));return cache[k]=c}
function blit(rows,map,x,y,flip,sc=1){const c=spr(rows,map),w=c.width*sc,h=c.height*sc,px=Math.round(x-w/2),py=Math.round(y-h);
 if(flip){g.save();g.translate(px+w,py);g.scale(-1,1);g.drawImage(c,0,0,w,h);g.restore()}else g.drawImage(c,px,py,w,h)}
const FONT={A:['.#.','#.#','###','#.#','#.#'],B:['##.','#.#','##.','#.#','##.'],C:['.##','#..','#..','#..','.##'],D:['##.','#.#','#.#','#.#','##.'],E:['###','#..','##.','#..','###'],F:['###','#..','##.','#..','#..'],G:['.##','#..','#.#','#.#','.##'],H:['#.#','#.#','###','#.#','#.#'],I:['###','.#.','.#.','.#.','###'],J:['..#','..#','..#','#.#','.#.'],K:['#.#','#.#','##.','#.#','#.#'],L:['#..','#..','#..','#..','###'],M:['#.#','###','###','#.#','#.#'],N:['##.','#.#','#.#','#.#','#.#'],O:['###','#.#','#.#','#.#','###'],P:['##.','#.#','##.','#..','#..'],R:['##.','#.#','##.','#.#','#.#'],S:['.##','#..','.#.','..#','##.'],T:['###','.#.','.#.','.#.','.#.'],U:['#.#','#.#','#.#','#.#','###'],V:['#.#','#.#','#.#','#.#','.#.'],W:['#.#','#.#','###','###','#.#'],Y:['#.#','#.#','.#.','.#.','.#.'],Z:['###','..#','.#.','#..','###'],'!':['.#.','.#.','.#.','...','.#.'],"'":['.#.','.#.','...','...','...'],'.':['...','...','...','...','.#.'],'0':['###','#.#','#.#','#.#','###'],'1':['.#.','##.','.#.','.#.','###'],'5':['###','#..','##.','..#','##.'],'¢':['.#.','###','#..','###','.#.']};
const PXT=window.PXT=(g,s,x,y,c,sc=1)=>{g.fillStyle=c;x=Math.round(x);y=Math.round(y);let cx=x;for(const ch of s){const f=FONT[ch];if(f)f.forEach((r,j)=>[...r].forEach((v,i)=>{if(v==='#')g.fillRect(cx+i*sc,y+j*sc,sc,sc)}));cx+=4*sc}};
PXT.w=(s,sc=1)=>s.length*4*sc-sc;
const hexN=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const MIX=window.MIX=(a,b,k)=>{const A=hexN(a),B=hexN(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('')};
function skyAt(m){const L=TH.skies,seg=600,i=Math.floor(m/seg)%L.length,j=(i+1)%L.length,f=(m%seg)/seg,k=f>.8?(f-.8)/.2:0,A=L[i],B=L[j],dark=A.dark+(B.dark-A.dark)*k;
 return{top:MIX(A.top,B.top,k),bot:MIX(A.bot,B.bot,k),dark,night:dark>.25,name:k<.5?A.name:B.name,sun:k<.5?A.sun:B.sun,k}}
const RW=TH.rideWin||[300,650];const rideAt=m=>!!TH.ride&&m>=RW[0]&&(m%1000)>=RW[0]&&(m%1000)<RW[1];
const WH={H:'7',S:'7',B:'7',R:'7',L:'7',K:'7',G:'7',X:'7',N:'7',M:'7',W:'7','0':'7','1':'7','4':'7','5':'7','9':'7',c:'7',a:'7'};

/* ---------- audio ---------- */
let ac=null,master=null,muted=!!store.get('run_mute'),voices=0;
function audio(){if(ac)return ac;try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.9;master.connect(ac.createDynamicsCompressor()).connect(ac.destination)}catch(e){ac=null}return ac}
addEventListener('pointerdown',()=>{audio();if(ac&&ac.state==='suspended')ac.resume()});
function tone(f,t,d,type,v,sl){const o=ac.createOscillator(),gn=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn).connect(master);o.start(t);o.stop(t+d+.02);return o}
function beep(f,d=.08,type='square',v=.04,sl=0,prio=1){if(muted||!audio())return;if(prio<2&&voices>8)return;voices++;const o=tone(f*(.96+Math.random()*.08),ac.currentTime,d,type,v,sl);o.onended=()=>voices--}
let nb=null;function noise(d,v,f){if(muted||!audio())return;try{if(!nb){nb=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const a=nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
 const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),gn=ac.createGain(),t=ac.currentTime;s.buffer=nb;fl.type='lowpass';fl.frequency.value=f;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl).connect(gn).connect(master);s.start(t);s.stop(t+d)}catch(e){}}
const sfx={shot:()=>{noise(.06,.09,TH.shotTone);beep(TH.shotPitch,.04,'square',.02,-200,0)},eshot:()=>noise(.05,.05,1800),hit:()=>beep(200,.1,'sawtooth',.05,-80),kill:()=>{beep(520,.08,'square',.04,-300);noise(.08,.06,1200)},
 hurt:()=>{beep(140,.25,'sawtooth',.08,-90,2);noise(.15,.12,2000)},boom:()=>{noise(.4,.22,700);beep(70,.3,'triangle',.08,-30,2)},jump:()=>beep(330,.08,'square',.03,300),
 pick:()=>{beep(784,.08,'square',.05,0,2);setTimeout(()=>beep(1175,.12,'square',.05,0,2),70)},reload:()=>beep(900,.03,'square',.03,0,2),tele:()=>beep(1400,.05,'square',.025,0,2),
 boss:()=>{beep(110,.5,'sawtooth',.07,-20,2);setTimeout(()=>beep(104,.7,'sawtooth',.07,-20,2),280)},death:()=>[392,330,262,196].forEach((f,i)=>setTimeout(()=>beep(f,.22,'square',.06,0,2),i*150))};
let nextN=0,step=0;const midi=n=>440*Math.pow(2,(n-69)/12);
setInterval(()=>{if(!ac||muted||!S||paused||S.mode!=='play')return;const M=TH.music,bpm=M.bpm+Math.min(40,S.d*6),spb=60/bpm/4;if(nextN<ac.currentTime)nextN=ac.currentTime+.05;
 while(nextN<ac.currentTime+.15){const bar=Math.floor(step/16)%4,root=(S.boss?M.bossRoots:M.roots)[bar],b=M.bass[step%16];
  if(b>=0)tone(midi(root+b),nextN,spb*1.6,'triangle',.07);if(M.lead[step%32]>=0&&step%2===0)tone(midi(root+24+M.lead[step%32]),nextN,spb*.9,'square',.011);
  if(step%4===2)tone(2000,nextN,.02,'square',.006);nextN+=spb*(M.swing?(step%2?1-M.swing:1+M.swing):1);step++}},40);

/* ---------- state ---------- */
let S=null,paused=false;
const R=(a,b)=>a+Math.random()*(b-a);
const meters=x=>Math.floor(x/8);
const SAVEK=TH.key+'_save';
function newRun(snap){if(snap&&snap.type)snap=null;S={t:0,mode:'play',cam:0,lockX:null,genX:0,d:0,kills:0,score:0,spawnT:120,bossN:0,nextBoss:TH.bossAt[0],nextSave:1600,boss:null,zone:-1,shake:0,stop:0,flash:0,killer:'',inside:0,swing:0,phase:'',
 p:{x:40,y:GY,vx:0,vy:0,on:true,hp:3,max:3,inv:60,cd:0,face:1,crouch:false,ammo:TH.weapon.mag,reload:0,heat:0,over:0,rapid:0,spread:0,coyote:0,jb:0,ride:false,ub:false},
 en:[],bu:[],pa:[],props:[],plats:[],bld:[],items:[],bombs:[],q:[],decor:[],heartDrop:false};
 if(snap){S.cont=true;const p=S.p;p.x=snap.x;p.hp=snap.hp;p.max=snap.max;S.score=snap.score;S.kills=snap.kills;S.bossN=snap.bossN;S.nextBoss=snap.nextBoss;S.nextSave=snap.nextSave;S.cam=p.x-72;S.genX=S.cam;p.inv=120}
 gen();paused=false;show(null);hud(true);S.zone=Math.floor(meters(S.p.x)/500);banner(snap?'CONTINUING FROM '+meters(S.p.x)+'M':TH.zones[0])}
function doSave(){const p=S.p;p.hp=Math.min(p.max,p.hp+1);store.set(SAVEK,{x:p.x,hp:p.hp,max:p.max,score:S.score,kills:S.kills,bossN:S.bossN,nextBoss:S.nextBoss,nextSave:S.nextSave});banner('GAME SAVED');sfx.pick();hud(true)}

/* world generation: buildings with windows and balconies, crates on the ground */
function gen(){while(S.genX<S.cam+W+80){const x=S.genX,gm=meters(x);
 if(rideAt(gm)){S.genX+=Math.floor(R(26,54));const ks=TH.openDecor;S.decor.push({k:ks[Math.floor(Math.random()*ks.length)],x:x+R(4,20),v:Math.random()});
  if(Math.random()<.35){const k=TH.openProp||'rock';S.props.push({k,x:S.genX-12,w:10,h:k==='rock'?6:10,hp:3})}continue}
 if(x>=S.nextSave&&!rideAt(gm+12)){const b={x,w:72,top:20,wins:[],style:0,save:true,door:x+36,used:false};b.wins.push({x:x+8,y:42,s:null},{x:x+54,y:42,s:null});S.bld.push(b);S.plats.push({x:x+4,y:64,w:64});S.genX+=72;S.nextSave=x+(TH.saveGap||3200);continue}
 if(Math.random()<.78){const w=Math.floor(R(56,84)/4)*4,top=Math.floor(R(18,40)),b={x,w,top,wins:[],style:Math.floor(Math.random()*4)};
  for(let wx=x+8;wx+10<=x+w-6;wx+=20){b.wins.push({x:wx,y:top+14,s:null});if(GY-(top+38)>16)b.wins.push({x:wx,y:top+38,s:null})}
  S.bld.push(b);if(Math.random()<.5&&GY-top>50)S.plats.push({x:x+8,y:top+(GY-top>64?52:40),w:w-16});S.genX+=w}
 else S.genX+=Math.floor(R(20,36));
 if(S.genX>140&&Math.random()<.55){const k=Math.random()<.5?'crate':'barrel',w=k==='crate'?10:8;S.props.push({k,x:S.genX-R(10,30),w,h:10,hp:3})}}}

/* ---------- input ---------- */
const keys={};
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyP'||e.code==='Escape')togglePause()});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(S&&S.mode==='play')togglePause(true)});
let enterReq=false,stick={x:0,y:0,id:null},fireD=false,jumpD=false,autoF=store.get('run_auto')??matchMedia('(pointer:coarse)').matches;
const stickEl=$('stick'),baseEl=$('base'),knob=$('knob');
function sm(e){const b=baseEl.getBoundingClientRect(),dx0=e.clientX-b.left-b.width/2,dy0=e.clientY-b.top-b.height/2,d=Math.hypot(dx0,dy0),m=50;let dx=dx0,dy=dy0;if(d>m){dx=dx/d*m;dy=dy/d*m}
 stick.x=Math.abs(dx)<10?0:dx/m;stick.y=Math.abs(dy)<16?0:dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
stickEl.addEventListener('pointerdown',e=>{stick.id=e.pointerId;stickEl.setPointerCapture(e.pointerId);sm(e)});
stickEl.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)sm(e)});
const su=e=>{if(e.pointerId===stick.id){stick={x:0,y:0,id:null};knob.style.transform=''}};stickEl.addEventListener('pointerup',su);stickEl.addEventListener('pointercancel',su);
$('enterB').addEventListener('pointerdown',e=>{e.stopPropagation();enterReq=true});
for(const[id,set]of[['fireB',v=>fireD=v],['jumpB',v=>jumpD=v]]){const el=$(id);el.addEventListener('pointerdown',e=>{set(true);el.classList.add('down');el.setPointerCapture(e.pointerId)});
 const up=()=>{set(false);el.classList.remove('down')};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}

/* ---------- helpers ---------- */
function puff(x,y,c,n=8,s=1.2,up=0){for(let i=0;i<n;i++){const a=R(0,6.28),v=R(.2,s);S.pa.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-up,life:R(12,26),c,g:.05})}}
function hurt(cause){const p=S.p;if(p.inv>0||S.mode!=='play')return;p.hp--;p.inv=80;S.shake=(window.ARC?ARC.fx(7):7);S.stop=5;S.flash=(window.ARC?ARC.fx(3):3);sfx.hurt();puff(p.x,p.y-6,'#ff004d',12);hud(true);
 if(p.hp<=0){S.killer=cause;S.mode='dying';S.dieT=70;sfx.death()}}
const pRect=()=>{const p=S.p;if(p.ride){const[w,h]=TH.rideRect;return[p.x-w/2,p.y-h,w,h]}const h=p.crouch&&p.on?7:12;return[p.x-3,p.y-h,6,h]};
const inR=(x,y,r)=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];
const eRect=e=>e.k==='mount'?[e.x-8,e.y-12,16,12]:e.k==='boss'?[e.x-8,e.y-24,16,24]:e.k==='sniper'?[e.w.x+1,e.w.y,8,9]:[e.x-3,e.y-12,6,12];
function propAt(x,y){for(const q of S.props){if(q.hp>0&&x>=q.x&&x<=q.x+q.w&&y>=GY-q.h&&y<=GY)return q}return null}
function diff(){return S.d}
function spawn(){const d=diff(),x=S.cam+W+10,r=Math.random();
 const cand=S.p.ride?[['gun',1.2],['thrower',1.4],['mount',2.2]]:[['gun',3]];if(!S.p.ride){if(d>=.05)cand.push(['sniper',2]);if(d>=.25)cand.push(['thrower',1.5]);if(d>=.5)cand.push(['mount',.8+Math.min(1,d*.3)])}
 const tot=cand.reduce((s,c)=>s+c[1],0);let v=r*tot,k='gun';for(const c of cand){v-=c[1];if(v<=0){k=c[0];break}}
 const hp=1+(d>=1?1:0)+Math.floor(d/2.5);
 if(k==='sniper'){const ws=S.bld.flatMap(b=>b.wins).filter(w=>!w.s&&w.x>S.p.x+30&&w.x<S.cam+W-8);if(!ws.length)return spawn2('gun',x,hp);const w=ws[Math.floor(Math.random()*ws.length)];
  const e={k,w,x:w.x+5,y:w.y+12,hp,st:0,t:30,shots:0,face:-1};w.s=e;S.en.push(e);return}
 spawn2(k,x,hp)}
function spawn2(k,x,hp){const e={k,x,y:GY,hp:k==='mount'?hp+1:hp,face:-1,t:R(30,80),stop:R(56,100),anim:0,vx:0};if(k==='mount'){e.vx=-(1.6+Math.min(1,diff()*.2));e.t=40;if(S.p.ride){e.vx=-1.1;e.x+=50;e.t=70;beep(392,.25,'square',.04,0,2);setTimeout(()=>beep(330,.25,'square',.04,0,2),220);banner(TH.mountWarn||'INCOMING!')}}S.en.push(e)}
function spawnBoss(){S.bossN++;const b={k:'boss',x:S.cam+W-26,y:GY,hp:(TH.bossBase??30)+S.bossN*20,mhp:(TH.bossBase??30)+S.bossN*20,face:-1,t:90,pat:0,tele:0,summon:300,vx:0};b.mhp=b.hp;S.en.push(b);S.boss=b;S.lockX=S.cam;S.p.x=Math.min(S.p.x,S.lockX+40);if(S.bossN===1){b.t=260}sfx.boss();banner(TH.bossName+'!')}
function eShoot(x,y,a,sp,src){S.bu.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,o:'e',life:200,src});sfx.eshot()}
const espeed=()=>Math.min(3,1.5+diff()*.3);

/* ---------- update ---------- */
function update(){S.t++;
 if(S.mode==='dying'){if(S.t%3===0)upPa();if(--S.dieT<=0)die();return}
 upPa();if(S.flash>0)S.flash--;for(const a of S.q)if(--a.t<=0){a.done=1;a.fn()}S.q=S.q.filter(a=>!a.done);if(S.shake>0)S.shake--;if(S.stop>0){S.stop--;return}
 const p=S.p,Wp=TH.weapon;
 if(S.swing>0)S.swing--;
 if(S.inside>0){if(--S.inside===0){S.swing=24;doSave();beep(260,.12,'square',.04,-60,2)}return}
 let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+stick.x;ix=Math.max(-1,Math.min(1,ix));
 const up=keys.KeyW||keys.ArrowUp||stick.y<-.55,down=keys.KeyS||keys.ArrowDown||stick.y>.55;
 const jump=keys.Space||jumpD,fire=keys.KeyJ||keys.KeyK||keys.KeyX||fireD||(autoF&&!(Wp.heat&&p.heat>.88&&!fireD));
 const rideNow=rideAt(meters(p.x))&&!S.boss;if(rideNow!==p.ride){p.ride=rideNow;if(!S.boss)banner(rideNow?TH.rideOn:TH.rideOff);puff(p.x,p.y-4,'#c2c3c7',14,1.2,.4);sfx.pick()}
 p.crouch=down&&p.on&&!p.ride;
 const sp=p.ride?2:p.crouch?0:1.25;p.vx=ix*sp;if(ix)p.face=ix>0?1:-1;
 if(p.on)p.coyote=6;else if(p.coyote>0)p.coyote--;
 if(jump&&!p.jb&&p.coyote>0){p.vy=p.ride?TH.rideJump:-3.5;p.on=false;p.coyote=0;sfx.jump()}p.jb=jump;
 if(!jump&&p.vy<-1.4)p.vy=-1.4;
 p.vy=Math.min(4,p.vy+.18);const oy=p.y;p.x+=p.vx;p.y+=p.vy;p.on=false;
 if(p.y>=GY){p.y=GY;p.vy=0;p.on=true}
 if(p.vy>=0&&!down)for(const q of S.plats)if(p.x>q.x&&p.x<q.x+q.w&&oy<=q.y&&p.y>=q.y){p.y=q.y;p.vy=0;p.on=true}
 const hw=p.ride?TH.rideRect[0]/2:3;
 for(const q of S.props)if(q.hp>0&&p.y>GY-q.h&&p.x+hw>q.x&&p.x-hw<q.x+q.w){if(p.ride&&TH.rideSmash){q.hp=0;puff(q.x+q.w/2,GY-5,'#ab5236',14,1.6,.5);noise(.15,.1,800);S.shake=(window.ARC?ARC.fx(4):4);S.score+=5;continue}if(p.vy>=0&&oy<=GY-q.h+.5){p.y=GY-q.h;p.vy=0;p.on=true}else p.x=p.vx>0?q.x-hw:q.x+q.w+hw}
 const door=!p.ride&&!S.boss&&p.on&&p.y===GY?S.bld.find(b=>b.save&&!b.used&&Math.abs(p.x-b.door)<8):null;$('enterB').classList.toggle('on',!!door);
 const upE=keys.KeyE||keys.Enter||enterReq;enterReq=false;if(door&&upE&&!p.ub){door.used=true;S.saveB=door;S.inside=70;S.swing=24;S.bu=S.bu.filter(b=>b.o==='p');S.bombs=[];p.x=door.door;beep(180,.15,'triangle',.05,120,2);p.ub=true;return}p.ub=!!(keys.KeyE||keys.Enter);
 const minX=(S.lockX??S.cam)+4,maxX=S.lockX!==null?S.lockX+W-6:1e9;p.x=Math.max(minX,Math.min(maxX,p.x));
 if(S.lockX===null&&p.x>S.cam+72)S.cam=p.x-72;
 S.d=meters(p.x)/1000;
 if(p.inv>0)p.inv--;if(p.rapid>0)p.rapid--;if(p.spread>0)p.spread--;
 // weapon
 if(p.cd>0)p.cd--;
 if(Wp.mag){if(p.reload>0){if(--p.reload===0){p.ammo=Wp.mag;sfx.reload()}}else if(!fire&&p.ammo<Wp.mag&&p.cd<=0&&S.t%Math.round(Wp.reload/Wp.mag)===0){p.ammo++;}}
 if(Wp.heat){if(p.over>0){p.over--;if(p.over===0)p.heat=.5}else p.heat=Math.max(0,p.heat-Wp.cool);if(p.heat>.7&&S.t%6===0)S.pa.push({x:p.x+p.face*5,y:p.y-11,vx:R(-.2,.2),vy:-.5,life:18,c:'#c2c3c7'})}
 if(fire&&p.cd<=0&&p.reload<=0&&p.over<=0){
  if(Wp.mag&&p.ammo<=0){p.reload=Wp.reload;sfx.reload()}
  else{const gy=p.y-(p.ride?TH.rideGunH:p.crouch?4:GUNH),dir=p.face;let a=up?(dir>0?-.5:Math.PI+.5):(dir>0?0:Math.PI);
   const tg=aimAssist(p.x,gy,dir,up);if(tg!==null)a=tg;
   const n=p.spread>0?3:1,vol=S.t;for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*.18+(Wp.jitter?R(-Wp.jitter,Wp.jitter):0);S.bu.push({x:p.x+dir*4,y:gy,vx:Math.cos(aa)*4,vy:Math.sin(aa)*4,o:'p',life:50,vol})}
   p.cd=Math.round(Wp.delay*(p.rapid>0&&!Wp.heat?.5:1));if(Wp.mag){p.ammo--;if(p.ammo<=0)p.reload=Wp.reload}
   if(Wp.heat){p.heat+=Wp.heatPer*(p.rapid>0?.4:1);if(p.heat>=1){p.over=Wp.overT;banner(TH.overheat)}}
   puff(p.x+dir*6,gy,'#ffec27',2,.6);sfx.shot()}}
 // world
 gen();const d=diff();
 const zi=Math.min(TH.zones.length-1,Math.floor(meters(p.x)/500));if(zi!==S.zone){S.zone=zi;banner(TH.zones[zi])}
 if(!S.heartDrop&&meters(p.x)>=S.nextBoss-25){S.heartDrop=true;S.items.push({k:'heart',x:p.x+40,y:GY-40,vy:0,life:900})}
 if(!S.boss&&meters(p.x)>=S.nextBoss){spawnBoss();S.nextBoss+=TH.bossGap+S.bossN*400;if(rideAt(S.nextBoss))S.nextBoss=Math.floor(S.nextBoss/1000)*1000+RW[1]+30;S.heartDrop=false}
 if(!S.boss){S.spawnT-=1+Math.max(0,p.vx)*.6;if(S.spawnT<=0){spawn();S.spawnT=Math.max(40,125-d*40)*R(.7,1.2)*(S.p.ride?.6:1)}}
 // enemies
 for(const e of S.en){if(e.dead)continue;e.anim++;if(e.flash)e.flash--;
  const dx=p.x-e.x,ad=Math.abs(dx);
  if(e.k==='gun'||e.k==='thrower'){e.face=dx<0?-1:1;const want=e.k==='thrower'?e.stop+20:e.stop;
   if(ad>want+4){const nx=e.x+e.face*(.55+d*.08);if(!propAt(nx+e.face*4,GY-2))e.x=nx}else if(!e.summ&&ad<want-20&&e.x<S.cam+W-6){e.x-=e.face*.4}
   if(e.x<S.cam+W-2&&e.x>S.cam+4&&--e.t<=0){if(e.k==='gun'){if(!e.tele){e.tele=16;sfx.tele()}}else{lob(e);e.t=Math.max(90,170-d*20)}}
   if(e.tele&&--e.tele===0){const gy=e.y-GUNH,elev=p.y<GY-14;eShoot(e.x+e.face*4,gy,elev?Math.atan2(p.y-7-gy,p.x-e.x):(e.face>0?0:Math.PI),espeed(),TH.names.gunShot);e.t=Math.max(40,95-d*12)*R(.8,1.2)}}
  else if(e.k==='sniper'){if(e.st===0){if(--e.t<=0){e.st=1;e.t=34;sfx.tele()}}else if(e.st===1){if(--e.t<=0){const sx=e.w.x+5,sy=e.w.y+7,lead=p.vx*14,a=Math.atan2(p.y-6-sy,p.x+lead-sx);eShoot(sx,sy,a,espeed()*.95,TH.names.sniperShot);e.shots++;e.st=e.shots>=2?2:1;e.t=e.st===2?40:70}}
   else if(--e.t<=0){e.dead=true;e.w.s=null}
   if(e.w.x<S.cam-12){e.dead=true;e.w.s=null}}
  else if(e.k==='mount'){e.x+=e.vx;if(--e.t<=0&&dx<0){for(let i=0;i<3;i++)S.q.push({t:1+i*7,fn:()=>{if(!e.dead)eShoot(e.x-8,e.y-GUNH,Math.PI+R(-.04,.04),espeed()+.6,TH.names.mountShot)}});e.t=60}
   if(e.x<S.cam-30)e.dead=true}
  else if(e.k==='boss')bossAI(e,p,dx);
  if(e.summ&&S.lockX!==null)e.x=Math.max(S.lockX+6,e.x);
  if(e.k!=='sniper'&&!e.summ&&e.x<S.cam-40)e.dead=true;
  if(p.ride&&!e.dead&&(e.k==='gun'||e.k==='thrower')){const r=pRect(),er=eRect(e);if(r[0]<er[0]+er[2]&&r[0]+r[2]>er[0]&&r[1]<er[1]+er[3]){kill(e);S.score+=10;S.shake=(window.ARC?ARC.fx(3):3);continue}}
  if(!e.dead&&e.k!=='sniper'&&(p.ride?(()=>{const r=pRect(),er=eRect(e);return r[0]<er[0]+er[2]&&r[0]+r[2]>er[0]&&r[1]<er[1]+er[3]})():inR(p.x,p.y-4,eRect(e)))&&e.k!=='thrower'&&e.k!=='gun'){hurt(TH.names[e.k]);if(e.k==='boss')p.x=Math.max((S.lockX??S.cam)+4,p.x-16)}}
 // bombs
 for(const b of S.bombs){if(b.fuse===undefined){b.x+=b.vx;b.y+=b.vy;b.vy+=.1;if(b.y>=GY-1){b.y=GY-1;b.vx=0;b.vy=0;b.fuse=34}}
  else if(--b.fuse<=0){b.dead=true;sfx.boom();S.shake=(window.ARC?ARC.fx(6):6);puff(b.x,b.y,'#ffa300',20,1.8,.6);puff(b.x,b.y,'#5f574f',10,1,.8);
   if(Math.abs(p.x-b.x)<(p.ride?20:16)&&p.y>GY-22)hurt(TH.names.bomb);for(const q of S.props)if(Math.abs(q.x+q.w/2-b.x)<18)q.hp=0}}
 S.bombs=S.bombs.filter(b=>!b.dead);
 // bullets
 for(const b of S.bu){b.x+=b.vx;b.y+=b.vy;b.life--;if(b.x<S.cam-8||b.x>S.cam+W+8||b.y<0||b.y>GY+2)b.life=0;if(b.life<=0)continue;
  const q=propAt(b.x,b.y);if(q){b.life=0;q.hp--;puff(b.x,b.y,'#ab5236',4,.8);if(q.hp<=0){puff(q.x+q.w/2,GY-5,'#ab5236',14,1.4,.5);noise(.12,.08,900)}continue}
  if(b.o==='p'){for(const e of S.en){if(e.dead||(e.k==='sniper'&&e.st===0))continue;if(inR(b.x,b.y,eRect(e))){b.life=0;if(e.k==='boss'){if(e.lastVol===b.vol)break;e.lastVol=b.vol}e.hp--;e.flash=5;if(e.k!=='boss'&&e.k!=='mount')e.x+=Math.sign(b.vx)*1.5;
     if(e.hp<=0)kill(e);else sfx.hit();break}}}
  else if(inR(b.x,b.y,pRect())){b.life=0;hurt(b.src)}}
 S.bu=S.bu.filter(b=>b.life>0);
 // items
 for(const it of S.items){it.vy=Math.min(2,it.vy+.12);it.y=Math.min(GY,it.y+it.vy);if(--it.life<=0)it.dead=true;
  if(Math.abs(it.x-p.x)<7&&Math.abs(it.y-p.y)<12){it.dead=true;sfx.pick();if(it.k==='heart'){p.hp=Math.min(p.max,p.hp+1);banner('+1 HEART')}else if(it.k==='rapid'){p.rapid=480;banner(TH.items.rapid)}else{p.spread=480;banner(TH.items.spread)}hud(true)}}
 S.items=S.items.filter(i=>!i.dead);S.en=S.en.filter(e=>!e.dead);
 S.props=S.props.filter(q=>q.x+q.w>S.cam-20&&q.hp>0);S.decor=S.decor.filter(d=>d.x>S.cam-60);
 {const sk=skyAt(meters(S.cam+72));if(sk.name!==S.phase){if(S.phase)banner(sk.name);S.phase=sk.name}}S.plats=S.plats.filter(q=>q.x+q.w>S.cam-20);S.bld=S.bld.filter(b=>b.x+b.w>S.cam-80);
 hud()}
function aimAssist(x,y,dir,up){let best=null,bd=1e9;for(const e of S.en){if(e.dead||(e.k==='sniper'&&e.st===0))continue;if(up&&e.k!=='sniper')continue;const r=eRect(e),tx=r[0]+r[2]/2,ty=r[1]+r[3]/2,dx=tx-x;if(Math.sign(dx)!==dir||Math.abs(dx)>170)continue;
 const base=up?(dir>0?-.5:Math.PI+.5):(dir>0?0:Math.PI),a=Math.atan2(ty-y,dx),off=Math.abs(Math.atan2(Math.sin(a-base),Math.cos(a-base)));if(off>(up?.8:.55))continue;const dd=Math.abs(dx)+off*80;if(dd<bd){bd=dd;best=a}}return best}
function lob(e){const p=S.p,dx=p.x+p.vx*30-e.x,T=52;S.bombs.push({x:e.x,y:e.y-12,vx:dx/T,vy:-2.6,tx:e.x+dx});beep(500,.1,'triangle',.03,-200)}
function bossAI(e,p,dx){e.face=dx<0?-1:1;const lx=S.lockX;if(p.x>e.x-12){p.x=e.x-12}
 if(e.tele>0){if(--e.tele===0){const gy=e.y-18;
   if(e.pat===0)for(const o of[-.35,-.17,0,.17,.35])eShoot(e.x-6,gy,Math.atan2(p.y-6-gy,p.x-e.x)+o,espeed()*.9,TH.names.boss);
   else if(e.pat===3){for(let i=0;i<4;i++)S.q.push({t:1+i*8,fn:()=>{if(!e.dead)eShoot(e.x-6,e.y-GUNH,Math.PI,espeed()+.4,TH.names.boss)}})}
   else if(e.pat===2){lob(e);S.q.push({t:18,fn:()=>{if(!e.dead)lob(e)}})}
   else if(e.pat===1){banner(TH.callMount||'BACKUP!');spawn2('mount',S.lockX+W+12,1+S.bossN)}
   e.pat=(e.pat+1)%4;e.t=S.bossN===1?140:Math.max(60,120-S.bossN*8)}}
 else if(--e.t<=0){e.tele=40;sfx.tele()}
 e.vx=Math.sin(S.t*.02)*.45;e.x=Math.max(lx+W*.55,Math.min(lx+W-12,e.x+e.vx));
 if(S.bossN>1&&--e.summon<=0){if(S.en.filter(x=>x.summ&&!x.dead).length<2){spawn2('gun',lx+6,1);const sm=S.en[S.en.length-1];sm.summ=1;sm.stop=R(24,40)}e.summon=Math.max(220,380-S.bossN*30)}}
function kill(e){e.dead=true;if(e.w)e.w.s=null;S.kills++;const pts={gun:10,sniper:25,thrower:20,mount:40,boss:500}[e.k];S.score+=pts;sfx.kill();S.stop=Math.max(S.stop,e.k==='boss'?16:2);
 const r=eRect(e);puff(r[0]+r[2]/2,r[1]+r[3]/2,TH.blood,e.k==='boss'?40:10,e.k==='boss'?2.2:1.2,.4);
 if(e.k==='boss'){for(const x of S.en)if(x.summ&&!x.dead){x.dead=true;puff(x.x,x.y-6,'#c2c3c7',8)}S.boss=null;S.lockX=null;banner(TH.bossDown);S.p.max=Math.min(6,S.p.max+1);S.p.hp=Math.min(S.p.max,S.p.hp+2);hud(true);S.items.push({k:'rapid',x:e.x,y:e.y-20,vy:-2,life:900})}
 else if(Math.random()<(e.k==='mount'?.5:.13)){const k=S.p.hp<S.p.max&&Math.random()<.45?'heart':Math.random()<.5?'rapid':'spread';S.items.push({k,x:r[0]+r[2]/2,y:r[1],vy:-2,life:600})}}
function upPa(){for(const q of S.pa){q.x+=q.vx;q.y+=q.vy;q.vy+=q.g||0;q.life--}S.pa=S.pa.filter(q=>q.life>0)}

/* ---------- render ---------- */
function render(){const t=S?S.t:performance.now()/16|0,cam=S?S.cam:0,sky=skyAt(S?meters(cam+72):0);
 g.setTransform(1,0,0,1,0,0);TH.drawSky(g,W,H,t,cam,sky);
 const sx=S&&S.shake?Math.round(R(-2,2)):0;g.setTransform(1,0,0,1,sx-Math.round(cam),0);
 if(S){for(const d of S.decor)TH.drawDecor(g,d,GY,t,sky);
  for(const b of S.bld){TH.drawBuilding(g,b,GY,t,sky);if(b.save)TH.drawSaveDoor(g,b,GY,t,sky,S.saveB===b?S.swing:0,b.used)}
  for(const q of S.plats)TH.drawPlat(g,q,sky);
  TH.drawGround(g,cam,W,GY,H,t,sky);
  if(sky.dark>0){g.fillStyle=`rgba(8,8,30,${sky.dark.toFixed(3)})`;g.fillRect(cam-4,0,W+8,H)}
  for(const b of S.bld)for(const w of b.wins){TH.drawWindow(g,w,t,sky);const e=w.s;if(e&&e.st>0){blit(HUM.w1.slice(0,8),e.flash?WH:TH.enemyMap,w.x+5,w.y+10,true);if(e.st===1&&e.t<14&&(t>>1)%2){g.fillStyle='#fff1e8';g.fillRect(w.x+1,w.y+5,2,1)}}}
  if(TH.drawLights)TH.drawLights(g,cam,W,GY,t,sky);
  {const p=S.p,dr=S.bld.find(b=>b.save&&!b.used&&Math.abs(p.x-b.door)<8);if(dr&&!p.ride&&!S.boss&&!S.inside&&(t>>4)%2){const s1=matchMedia('(pointer:coarse)').matches?'ENTER':'E ENTER';PXT(g,s1,dr.door-PXT.w(s1)/2,GY-54,'#ffec27')}}
  for(const q of S.props)blit(ITEMS[q.k],q.hp<2?{'9':'5','4':'0'}:null,q.x+q.w/2,GY);
  for(const it of S.items)if(it.life>120||(t>>2)%2)blit(ITEMS[it.k],{a:'a'},it.x,it.y);
  for(const b of S.bombs){if(b.fuse===undefined&&b.tx!==undefined&&(t>>2)%2){g.fillStyle='#ff004d';g.fillRect(b.tx-3|0,GY-1,7,1);g.fillRect(b.tx|0,GY-3,1,3)}g.fillStyle=TH.bombColor;g.fillRect(b.x-1|0,b.y-3|0,3,3);if(b.fuse!==undefined&&(t>>1)%2){g.fillStyle='#ffec27';g.fillRect(b.x|0,b.y-5|0,1,2)}if(b.fuse!==undefined){g.strokeStyle='rgba(255,0,77,.5)';g.beginPath();g.arc(b.x,b.y,16,Math.PI,0);g.stroke()}}
  for(const e of S.en){if(e.k==='sniper')continue;const fl=e.face<0,map=e.flash||(e.tele&&(t>>1)%2)?WH:e.k==='boss'?TH.bossMap:TH.enemyMap;
   if(e.k==='mount')blit(MOUNT[(e.anim>>3)%2],e.flash?WH:TH.mountMap,e.x,e.y,true);
   else if(e.k==='boss'){blit(HUM[(e.anim>>4)%2?'w1':'w2'],map,e.x,e.y,fl,2);if(e.tele){g.strokeStyle='rgba(255,241,232,.6)';g.strokeRect(e.x-9,e.y-26,18,26)}}
   else blit(HUM[e.k==='thrower'&&e.t<20?'th':((e.anim>>3)%2?'w1':'w2')],map,e.x,e.y,fl)}
  const p=S.p;if(!S.inside&&(!(p.inv>0&&(t>>2)%2)&&S.mode==='play'||S.mode==='dying')){const mp=S.mode==='dying'?WH:TH.playerMap;
   if(p.ride){const fr=(TH.rideSprite||MOUNT)[Math.abs(p.vx)>.1?(t>>2)%2:0];if(TH.playerOutline&&S.mode!=='dying')for(const[ox,oy]of[[-1,0],[1,0],[0,-1]])blit(fr,TH.outlineMap,p.x+ox,p.y+oy,p.face<0);blit(fr,S.mode==='dying'?WH:TH.rideMap,p.x,p.y,p.face<0)}
   else{const fr=!p.on?'jp':p.crouch?'cr':Math.abs(p.vx)>.1?((t>>3)%2?'w1':'w2'):'w1';if(TH.playerOutline&&S.mode!=='dying')for(const[ox,oy]of[[-1,0],[1,0],[0,-1]])blit(PL[fr],TH.outlineMap,p.x+ox,p.y+oy,p.face<0);blit(PL[fr],mp,p.x,p.y,p.face<0)}}
  for(const b of S.bu){if(b.o==='p'){g.fillStyle='#ffec27';g.fillRect(b.x-1|0,b.y|0,3,1)}else{g.fillStyle=TH.eBullet;g.fillRect(b.x-1|0,b.y-1|0,3,3);g.fillStyle='#fff1e8';g.fillRect(b.x|0,b.y|0,1,1)}}
  for(const q of S.pa){g.fillStyle=q.c;g.fillRect(q.x|0,q.y|0,q.life>16?2:1,q.life>16?2:1)}}
 g.setTransform(1,0,0,1,0,0);
 if(S&&TH.overlay)TH.overlay(g,W,H,t,sky);
 if(S&&S.inside){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,W,H);const s2='SAVING...';PXT(g,s2,W/2-PXT.w(s2)/2,40,'#ffec27')}
 if(S&&S.boss){const b=S.boss;g.fillStyle='#000';g.fillRect(30,3,W-60,4);g.fillStyle='#ff004d';g.fillRect(31,4,Math.max(0,(W-62)*b.hp/b.mhp),2)}
 if(S&&TH.weapon.heat&&S.mode==='play'){const p=S.p,hx=4,hy=H-8;g.fillStyle='#000';g.fillRect(hx,hy,42,5);g.fillStyle=p.over>0?((S.t>>2)%2?'#ff004d':'#ffa300'):p.heat>.7?'#ff004d':p.heat>.45?'#ffa300':'#29adff';g.fillRect(hx+1,hy+1,Math.round(40*(p.over>0?1:p.heat)),3)}
 if(S&&S.flash>0){g.fillStyle='rgba(255,241,232,.3)';g.fillRect(0,0,W,H)}}

/* ---------- UI ---------- */
let bt=null;function banner(s){const b=$('banner');b.textContent=s;b.classList.add('on');clearTimeout(bt);bt=setTimeout(()=>b.classList.remove('on'),1300)}
let hk='';function hud(force){if(!S)return;const p=S.p,Wp=TH.weapon,m=meters(p.x),
 am=Wp.mag?(p.reload>0?'RELOAD':'▮'.repeat(p.ammo)+'▯'.repeat(Wp.mag-p.ammo)):(p.over>0?'HOT!':'');
 const k=p.hp+'/'+p.max+m+am+p.rapid+p.spread+S.score;if(k===hk&&!force)return;hk=k;
 $('hearts').textContent='♥'.repeat(Math.max(0,p.hp))+'♡'.repeat(Math.max(0,p.max-p.hp));$('dist').textContent=m+'m · '+(S.score+m);$('ammo').textContent=am;
 $('power').textContent=(p.rapid>0?TH.items.rapid+' '+Math.ceil(p.rapid/60)+'s  ':'')+(p.spread>0?TH.items.spread+' '+Math.ceil(p.spread/60)+'s':'')}
function show(id){for(const o of document.querySelectorAll('.ov'))o.classList.toggle('on',o.id===id)}
function togglePause(force){if(!S||S.mode!=='play')return;paused=force===true?true:!paused;show(paused?'pause':null)}
function die(){S.mode='dead';const m=meters(S.p.x),score=S.score+m,b=store.get(TH.key)||{m:0,s:0},nb=!S.cont&&score>b.s;store.set(TH.key,{m:Math.max(b.m,m),s:S.cont?b.s:Math.max(b.s,score)});if(window.ARC)ARC.submit(TH.key.split('_')[0],S.cont?0:score,m+'m · '+S.kills+' '+TH.killWord,{m});
 $('dc').innerHTML=`<span style="color:var(--gold)">${m}m</span> · ${S.kills} ${TH.killWord} · score ${score}<br>Taken down by <span style="color:var(--gold)">${S.killer}</span>.`;
 $('db').textContent=(S.cont?'Continued run: distance counts, score does not. ':'')+(nb?'NEW BEST SCORE!':`Best: ${b.s} (furthest ${Math.max(b.m,m)}m)`);const sv=store.get(SAVEK);$('again2').style.display=sv?'':'none';if(sv)$('again2').textContent=`CONTINUE FROM ${meters(sv.x)}M`;$('enterB').classList.remove('on');show('dead')}
function menu(){S=null;paused=false;$('enterB').classList.remove('on');const sv=store.get(SAVEK);$('cont').style.display=sv?'':'none';if(sv)$('cont').textContent=`CONTINUE FROM ${meters(sv.x)}M`;const b=store.get(TH.key);$('bestL').textContent=b?`Best score ${b.s} · furthest ${b.m}m`:'';
 $('ctl').textContent=matchMedia('(pointer:coarse)').matches?'Stick moves (push up to aim up, down to duck). AUTO fires for you (tap AUTO in the top bar to switch it off), or hold FIRE. Tap JUMP.':'A/D move · W aim up · S duck · Space jump · hold J to fire';$('hearts').textContent='';$('dist').textContent='';$('ammo').textContent='';$('power').textContent='';show('title')}
$('play').addEventListener('click',()=>newRun());$('again').addEventListener('click',()=>newRun());
const cont=()=>{const sv=store.get(SAVEK);if(sv)newRun(sv)};$('cont').addEventListener('click',cont);$('again2').addEventListener('click',cont);$('menu').addEventListener('click',menu);$('quit').addEventListener('click',menu);$('res').addEventListener('click',()=>togglePause());$('pz').addEventListener('click',()=>togglePause());
const autoUI=()=>{$('auto').style.background=autoF?'var(--accent)':'';$('auto').style.color=autoF?'#000':'';$('auto').setAttribute('aria-pressed',autoF)};autoUI();$('auto').addEventListener('click',()=>{autoF=!autoF;store.set('run_auto',autoF);autoUI();banner(autoF?'AUTO-FIRE ON':'AUTO-FIRE OFF')});
$('snd').textContent=muted?'OFF':'SND';$('snd').addEventListener('click',()=>{muted=!muted;store.set('run_mute',muted);$('snd').textContent=muted?'OFF':'SND'});
function fit(){const touch=matchMedia('(pointer:coarse)').matches;document.body.classList.toggle('touch',touch);const aw=Math.min(innerWidth-24,1100),ah=innerHeight-(touch?300:140);let s=Math.min(aw/W,ah/H);s=s>=2?Math.floor(s):Math.max(1,s);
 document.documentElement.style.setProperty('--gw',Math.floor(W*s)+'px');document.documentElement.style.setProperty('--gh',Math.floor(H*s)+'px')}
addEventListener('resize',fit);fit();menu();
let last=performance.now(),acc=0;(function loop(ts){requestAnimationFrame(loop);if(ts){acc+=Math.min(100,ts-last);last=ts}while(acc>=1000/60){acc-=1000/60;if(S&&!paused&&S.mode!=='dead')update()}render()})();
addEventListener('packsync',()=>{if(!S)menu()});
window.__r={get S(){return S},newRun};
})();
