/* Bottom tab bar + pixel icons for the launcher and info pages. */
(function(){
const P={
 games:'M3 6h18v12H3zM6 10h2v2h2v2H8v2H6v-2H4v-2h2zM15 10h2v2h-2zM17 12h2v2h-2z',
 scores:'M7 3h10v2h3v5h-2v2h-2v2h-2v2h2v3H8v-3h2v-2H8v-2H6v-2H4V5h3zM6 7v2h1V7zm11 0v2h1V7z',
 awards:'M10 2h4v2h2v2h2v4h-2v2h-2v2h-1v3h3v4H8v-4h3v-3h-1v-2H8v-2H6V6h2V4h2z',
 settings:'M10 2h4v3h2V3h2v2h2v2h-2v2h3v4h-3v2h2v2h-2v2h-2v-2h-2v3h-4v-3H8v2H6v-2H4v-2h2v-2H3V9h3V7H4V5h2V3h2v2h2zm0 8v4h4v-4z',
 about:'M10 3h4v4h-4zM8 9h6v9h2v3H8v-3h2v-6H8z'
};
const T=[['index.html','GAMES','games'],['scores.html','SCORES','scores'],['trophies.html','TROPHIES','awards'],['settings.html','SETTINGS','settings'],['about.html','ABOUT','about']];
const here=location.pathname.split('/').pop()||'index.html';
const nav=document.createElement('nav');nav.className='tabs';nav.setAttribute('aria-label','Main');
nav.innerHTML=T.map(([f,t,i])=>`<a href="${f}"${f===here?' aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${P[i]}"/></svg>${t}</a>`).join('');
document.body.appendChild(nav);
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
