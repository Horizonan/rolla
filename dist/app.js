import { DiceRenderer } from './dice.js';
import {skins,cleanFavorites,setupKey,rollValues,getMoment} from './features.js';
import {storage} from './storage.js';
import {MomentEffects} from './moments.js';

const $=id=>document.getElementById(id);
const icons={
  4:'<path d="m12 2 10 18H2Z"/><path d="m12 2 0 12m-10 6 10-6 10 6"/>',
  6:'<path d="m12 2 9 5v11l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5m-9 5v11"/><path d="m8 6 4-2 4 2-4 2Z"/>',
  8:'<path d="m12 1 10 11-10 11L2 12Z"/><path d="m12 1 5 11-5 11-5-11Zm-10 11h20"/>',
  10:'<path d="m12 1 10 10-6 11H8L2 11Z"/><path d="m12 1-4 10 4 12 4-12Zm-10 10h20"/>',
  12:'<path d="m12 1 9 6 2 11-11 5L1 18 2 7Z"/><path d="m12 5 7 5-3 8H8l-3-8Zm0-4v4m9 2-2 3m4 8-7 0m-4 5-4-5m-7 0 4-8M2 7l3 3"/>',
  20:'<path d="m12 1 10 6v12l-10 4L2 19V7Z"/><path d="m12 1-5 7 10 0Zm-10 6 5 1-5 11 10-3L7 8m10 0 5-1m0 12-5-11-5 8 10 3m-10-3v7"/>',
  100:'<path d="m12 1 10 10-6 11H8L2 11Z"/><path d="m12 1-4 10 4 12 4-12Zm-10 10h20"/>',
  custom:'<path d="m12 2 9 5v11l-9 5-9-5V7Z"/><path d="M8 12h8m-4-4v8"/>'
};

const load=(key,fallback)=>storage.load(key,fallback);
const save=(key,value)=>storage.save(key,value);
const validHistory=r=>r&&Number.isInteger(r.sides)&&r.sides>=2&&r.sides<=1000&&Number.isInteger(r.count)&&r.count>=1&&r.count<=6&&Array.isArray(r.values)&&r.values.length===r.count&&r.values.every(v=>Number.isInteger(v)&&v>=1&&v<=r.sides)&&Number.isInteger(r.modifier)&&Math.abs(r.modifier)<=100&&Number.isFinite(r.time)&&r.total===r.values.reduce((a,b)=>a+b,0)+r.modifier;
const stored=load('rolla.history',[]);
const storedSkin=load('rolla.skin','ruby');
const state={type:6,sides:6,count:1,modifier:0,rolling:false,sound:load('rolla.sound',false)===true,history:Array.isArray(stored)?stored.filter(validHistory).slice(0,30):[],favorites:cleanFavorites(load('rolla.favorites',[])),skin:Object.hasOwn(skins,storedSkin)?storedSkin:'ruby',moments:load('rolla.moments',true)!==false,values:[],held:[]};
let renderer,audioContext,toastTimeout;
try{renderer=new DiceRenderer($('dice-canvas'));}catch{$('canvas-fallback').hidden=false;}
const effects=new MomentEffects($('moments-canvas'),$('moment-badge'));

const notation=(s=state)=>`${s.count}d${s.sides}${s.modifier>0?' + '+s.modifier:s.modifier<0?' − '+Math.abs(s.modifier):''}`;
const integer=(raw,min,max,fallback)=>{if(String(raw).trim()==='')return fallback;const n=Number(raw);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback;};

function renderOptions(){
  $('dice-options').setAttribute('role','radiogroup');$('dice-options').setAttribute('aria-label','Die type');
  $('dice-options').innerHTML=Object.entries(icons).map(([key,path])=>`<button class="die-option" role="radio" aria-checked="${String(state.type)===key}" data-type="${key}" aria-label="${key==='custom'?'Custom number of sides':key+'-sided die'}" tabindex="${String(state.type)===key?0:-1}"><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg><span>${key==='custom'?'Custom':'D'+key}</span></button>`).join('');
}

function sync({reset=true}={}){
  $('sides-caption').textContent=`${state.sides} sides`;
  $('custom-sides-wrap').hidden=state.type!=='custom';
  $('dice-count').value=state.count;$('count-range').value=state.count;$('modifier').value=state.modifier;
  $('count-range').style.background=`linear-gradient(to right,var(--red) ${(state.count-1)*20}%,var(--line) ${(state.count-1)*20}%)`;
  $('count-minus').disabled=state.count===1;$('count-plus').disabled=state.count===6;
  $('modifier-minus').disabled=state.modifier===-100;$('modifier-plus').disabled=state.modifier===100;
  $('roll-notation').textContent=notation();
  $('possible-range').textContent=`Range: ${state.count+state.modifier}–${state.count*state.sides+state.modifier}`;
  $('roll-button-label').textContent='Roll';
  if(reset){state.values=[];state.held=[];effects.clear();renderer?.set(state.sides,state.count);$('result-content').className='';$('result-content').textContent='';$('table-status').textContent='Ready';$('dice-canvas').setAttribute('aria-label',`${state.count} ${skins[state.skin].name} 3D ${state.sides}-sided ${state.count===1?'die':'dice'} on the table, ready to roll`);}
  syncFavoriteButton();renderHolds();
}

function selectType(type){
  if(state.rolling)return;
  state.type=type==='custom'?'custom':Number(type);state.sides=type==='custom'?integer($('custom-sides').value,2,1000,30):Number(type);
  renderOptions();sync();
}
$('dice-options').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)selectType(b.dataset.type);});
$('dice-options').addEventListener('keydown',e=>{
  const keys=['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'];if(!keys.includes(e.key)||state.rolling)return;e.preventDefault();
  const types=Object.keys(icons),index=types.indexOf(String(state.type));const next=e.key==='Home'?0:e.key==='End'?types.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+types.length)%types.length;
  selectType(types[next]);document.querySelector(`[data-type="${types[next]}"]`).focus();
});

function updateCount(value){if(state.rolling)return;state.count=integer(value,1,6,state.count);sync();}
function updateModifier(value){if(state.rolling)return;state.modifier=integer(value,-100,100,state.modifier);sync();}
$('count-minus').onclick=()=>updateCount(state.count-1);$('count-plus').onclick=()=>updateCount(state.count+1);
$('dice-count').addEventListener('change',e=>updateCount(e.target.value));$('count-range').addEventListener('input',e=>updateCount(e.target.value));
$('dice-count').addEventListener('input',e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isInteger(n)&&n>=1&&n<=6)updateCount(n);});
$('modifier-minus').onclick=()=>updateModifier(state.modifier-1);$('modifier-plus').onclick=()=>updateModifier(state.modifier+1);$('modifier').addEventListener('change',e=>updateModifier(e.target.value));
$('modifier').addEventListener('input',e=>{const n=Number(e.target.value);if(e.target.value!==''&&Number.isInteger(n)&&n>=-100&&n<=100)updateModifier(n);});
$('custom-sides').addEventListener('change',e=>{if(state.rolling)return;state.sides=integer(e.target.value,2,1000,state.sides);e.target.value=state.sides;sync();});
$('custom-sides').addEventListener('input',e=>{const n=Number(e.target.value);if(!state.rolling&&Number.isInteger(n)&&n>=2&&n<=1000){state.sides=n;sync();}});

function toast(message){clearTimeout(toastTimeout);$('toast').textContent=message;$('toast').classList.add('visible');toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),2400);}

function prepareAudio(){if(!state.sound)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});}catch{state.sound=false;syncSound();toast('Sound is unavailable in this browser.');}}
function impact(strength=.5){
  if(!state.sound||!audioContext)return;
  const ctx=audioContext,now=ctx.currentTime,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.07),ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.008));
  const source=ctx.createBufferSource();source.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1500+strength*2000;const gain=ctx.createGain();gain.gain.setValueAtTime(.09+strength*.13,now);gain.gain.exponentialRampToValueAtTime(.001,now+.07);source.connect(filter).connect(gain).connect(ctx.destination);source.start(now);
}
function syncSound(){const b=$('sound-button');b.setAttribute('aria-pressed',state.sound);b.setAttribute('aria-label',`Turn sound ${state.sound?'off':'on'}`);b.title=`Turn sound ${state.sound?'off':'on'}`;b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4Z"/>${state.sound?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;}
$('sound-button').onclick=()=>{state.sound=!state.sound;save('rolla.sound',state.sound);syncSound();if(state.sound){prepareAudio();impact(.4);}};

function displayResult(record){
  $('result-content').innerHTML=`<span class="sr-only">Total: </span><span class="result-total">${record.total}</span>${record.count>1||record.modifier!==0?`<span class="result-breakdown">${record.values.map(v=>`<span class="rolled-value">${v}</span>`).join(' + ')}${record.modifier>0?' + '+record.modifier:record.modifier<0?' − '+Math.abs(record.modifier):''}</span>`:''}`;
  $('result-content').className='result-complete';
  $('table-status').textContent='Rolled';
  $('dice-canvas').setAttribute('aria-label',`${record.count} ${record.sides}-sided ${record.count===1?'die':'dice'} showing ${record.values.join(', ')}. Total ${record.total}${record.modifier!==0?', including modifier '+record.modifier:''}.`);
  if(!renderer)$('canvas-fallback').innerHTML=`<span>${record.values.join(' · ')}</span><p>Your ${record.sides}-sided ${record.count===1?'die':'dice'}</p>`;
}

async function roll(){
  if(state.rolling||document.querySelector('dialog[open]')||state.held.length===state.count&&state.held.every(Boolean))return;
  state.count=integer($('dice-count').value,1,6,state.count);state.modifier=integer($('modifier').value,-100,100,state.modifier);if(state.type==='custom'){state.sides=integer($('custom-sides').value,2,1000,state.sides);$('custom-sides').value=state.sides;}sync({reset:false});
  let values;try{values=rollValues(state.sides,state.count,state.values,state.held);}catch{toast('Secure randomness is unavailable. Please use a modern browser over HTTPS.');return;}
  effects.clear();const held=[...state.held];
  state.rolling=true;prepareAudio();$('roll-button').disabled=true;$('roll-button-label').textContent='Rolling…';
  $('hold-controls').inert=true;$('favorites-list').inert=true;
  document.querySelector('.controls').classList.add('is-rolling');document.querySelector('.controls').inert=true;
  $('table').classList.add('rolling');$('table-status').textContent='Rolling…';$('table-status').classList.add('rolling');
  $('result-content').className='';$('result-content').textContent='';
  if(renderer){try{if(renderer.count!==state.count||renderer.sides!==state.sides)renderer.set(state.sides,state.count);await renderer.animate(values,impact,held);}catch{renderer=null;$('dice-canvas').hidden=true;$('canvas-fallback').hidden=false;}}
  const record={sides:state.sides,count:state.count,modifier:state.modifier,values,total:values.reduce((a,b)=>a+b,0)+state.modifier,time:Date.now(),held};
  state.values=values;state.held=Array.from({length:state.count},(_,i)=>!!held[i]);
  state.history.unshift(record);state.history=state.history.slice(0,30);save('rolla.history',state.history);displayResult(record);renderHistory();
  state.rolling=false;$('roll-button').disabled=false;document.querySelector('.controls').classList.remove('is-rolling');document.querySelector('.controls').inert=false;$('table').classList.remove('rolling');$('table-status').classList.remove('rolling');$('roll-button-label').textContent='Roll again';
  $('hold-controls').inert=false;$('favorites-list').inert=false;renderHolds();
  if(state.moments){const moment=getMoment(state.sides,values,held);effects.play(moment);if(moment)momentSound(moment.kind);}
}
$('roll-button').onclick=roll;$('dice-canvas').onclick=e=>{if(state.rolling)return;if(!state.values.length){void roll();return;}const r=e.currentTarget.getBoundingClientRect(),index=renderer?.hitTest(e.clientX-r.left,e.clientY-r.top);if(index>=0)toggleHold(index);};
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,button,a,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;if(e.code==='Space'||e.key.toLowerCase()==='r'){e.preventDefault();void roll();}});

const timeLabel=time=>new Date(time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
function renderHistory(){
  $('history-count').textContent=state.history.length;document.querySelector('.history-section').hidden=!state.history.length;
  if(!state.history.length){$('history-list').textContent='';return;}
  $('history-list').innerHTML=state.history.map((r,i)=>`<button class="history-card ${i===0?'latest':''}" data-history="${i}" title="Use this ${notation(r)} setup again" aria-label="${notation(r)}, result ${r.total}. Use this setup again."><div class="history-card-top"><span class="history-notation">${notation(r)}</span><time class="history-time" datetime="${new Date(r.time).toISOString()}">${timeLabel(r.time)}</time></div><div class="history-total">${r.total}</div><div class="history-values">${r.values.join(' + ')}${r.modifier?' '+(r.modifier>0?'+':'−')+' '+Math.abs(r.modifier):''}${r.count===1&&!r.modifier?' · '+r.sides+' sides':''}</div></button>`).join('');
}
$('history-list').addEventListener('click',e=>{const card=e.target.closest('[data-history]');if(!card||state.rolling)return;const r=state.history[Number(card.dataset.history)];state.sides=r.sides;state.count=r.count;state.modifier=r.modifier;state.type=Object.hasOwn(icons,r.sides)?r.sides:'custom';if(state.type==='custom')$('custom-sides').value=r.sides;renderOptions();sync();toast(`${notation()} is ready to roll.`);});
$('clear-history').onclick=()=>{state.history=[];save('rolla.history',[]);renderHistory();toast('History cleared.');};
$('help-button').onclick=()=>$('help-dialog').showModal();

function toggleHold(index){
  if(state.rolling||!state.values.length)return;
  state.held[index]=!state.held[index];renderer?.setHeld(state.held);renderHolds();
}
function renderHolds(){
  const container=$('hold-controls');container.hidden=!state.values.length;container.replaceChildren();
  state.values.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.className='hold-die';b.setAttribute('aria-pressed',String(!!state.held[i]));b.setAttribute('aria-label',`${state.held[i]?'Release':'Hold'} die ${i+1}, rolled ${v}`);b.title=`${state.held[i]?'Release':'Hold'} die ${i+1}`;b.innerHTML=`<span class="hold-index">${i+1}</span><strong>${v}</strong><span class="hold-icon" aria-hidden="true">${state.held[i]?'◆':'◇'}</span>`;b.onclick=()=>toggleHold(i);container.append(b);});
  if(state.values.length){const hint=document.createElement('span');hint.className='hold-hint';hint.textContent=state.held.some(Boolean)?'Tap to release':'Tap a die to hold';container.append(hint);}
  if(!state.rolling){const all=state.values.length&&state.held.every(Boolean);$('roll-button').disabled=!!all;const n=state.held.filter(Boolean).length;$('roll-button-label').textContent=all?'Release a die to roll':n?`Roll ${state.count-n} ${state.count-n===1?'die':'dice'}`:state.values.length?'Roll again':'Roll';}
}

function syncSkin(){
  renderer?.setSkin(skins[state.skin]);$('active-skin-name').textContent=skins[state.skin].name;$('active-skin-dot').style.background=skins[state.skin].swatch;
  $('skin-button').setAttribute('aria-label',`Dice skin: ${skins[state.skin].name}. Change skin`);
  $('skin-options').replaceChildren();
  for(const [key,skin]of Object.entries(skins)){const b=document.createElement('button');b.className='skin-option';b.setAttribute('aria-pressed',String(state.skin===key));b.setAttribute('aria-label',skin.name);const sample=document.createElement('span');sample.className='skin-sample';sample.style.setProperty('--skin',skin.swatch);sample.style.setProperty('--pip',skin.ink);sample.innerHTML='<i></i><i></i><i></i>';const label=document.createElement('span');label.textContent=skin.name;b.append(sample,label);b.onclick=()=>{state.skin=key;save('rolla.skin',key);syncSkin();$('skin-dialog').close();};$('skin-options').append(b);}
}
$('skin-button').onclick=()=>$('skin-dialog').showModal();
function syncMoments(){const b=$('moments-button');b.setAttribute('aria-pressed',String(state.moments));b.setAttribute('aria-label',`Turn lucky and unlucky effects ${state.moments?'off':'on'}`);}
$('moments-button').onclick=()=>{state.moments=!state.moments;save('rolla.moments',state.moments);syncMoments();if(!state.moments)effects.clear();};

function syncFavoriteButton(){const saved=state.favorites.some(f=>setupKey(f)===setupKey(state));$('save-favorite').textContent=saved?'★':'☆';$('save-favorite').classList.toggle('is-saved',saved);$('save-favorite').setAttribute('aria-label',saved?'Edit this favorite':'Save this roll as a favorite');}
function openFavorite(){
  if(state.rolling)return;const f=state.favorites.find(f=>setupKey(f)===setupKey(state));
  if(!f&&state.favorites.length>=12){toast('You can save up to 12 favorites. Remove one to add another.');return;}
  $('favorite-title').textContent=f?'Edit favorite':'Save a favorite';$('favorite-name').value=f?.name||notation();$('favorite-notation').textContent=notation();
  $('favorite-storage-note').textContent=storage.choice==='allow'?'Saved on this device.':'Session only. Allow saving in Cookie settings to keep it.';
  $('favorite-dialog').showModal();$('favorite-name').focus();$('favorite-name').select();
}
$('save-favorite').onclick=openFavorite;
$('favorite-form').onsubmit=e=>{
  e.preventDefault();const name=$('favorite-name').value.trim().slice(0,32);if(!name){$('favorite-name').focus();return;}
  const favorite={name,sides:state.sides,count:state.count,modifier:state.modifier},index=state.favorites.findIndex(f=>setupKey(f)===setupKey(state));
  if(index>=0)state.favorites[index]=favorite;else state.favorites.push(favorite);
  const saved=save('rolla.favorites',state.favorites);renderFavorites();syncFavoriteButton();$('favorite-dialog').close();toast(saved?'Favorite saved.':'Favorite added for this session.');
};
function renderFavorites(){
  $('favorites-count').textContent=state.favorites.length;$('favorites-storage').textContent=storage.choice==='allow'?'On this device':'This session';$('favorites-list').replaceChildren();
  if(!state.favorites.length){const b=document.createElement('button');b.className='favorite-empty';b.textContent='☆ Save your first roll';b.onclick=openFavorite;$('favorites-list').append(b);return;}
  state.favorites.forEach((f,i)=>{const card=document.createElement('div');card.className='favorite-card';const use=document.createElement('button');use.className='favorite-use';use.setAttribute('aria-label',`Use favorite ${f.name}, ${notation(f)}`);const name=document.createElement('strong'),setup=document.createElement('span');name.textContent=f.name;setup.textContent=notation(f);use.append(name,setup);use.onclick=()=>{if(state.rolling)return;Object.assign(state,{sides:f.sides,count:f.count,modifier:f.modifier,type:Object.hasOwn(icons,f.sides)?f.sides:'custom'});$('custom-sides').value=f.sides;renderOptions();sync();};const remove=document.createElement('button');remove.className='favorite-remove';remove.textContent='×';remove.setAttribute('aria-label',`Remove favorite ${f.name}`);remove.onclick=()=>{if(state.rolling)return;state.favorites.splice(i,1);save('rolla.favorites',state.favorites);renderFavorites();syncFavoriteButton();};card.append(use,remove);$('favorites-list').append(card);});
}
window.addEventListener('rolla:consent',e=>{
  if(e.detail.choice==='allow'&&!e.detail.remote){save('rolla.history',state.history);save('rolla.favorites',state.favorites);save('rolla.skin',state.skin);save('rolla.sound',state.sound);save('rolla.moments',state.moments);}
  renderFavorites();toast(!e.detail.persisted?'Browser storage is unavailable. Your choices apply for this session.':e.detail.choice==='allow'?'Saving on this device is enabled.':'Saved data removed. Session-only mode is active.');
});
function momentSound(kind){
  if(!state.sound||!audioContext)return;
  const notes=kind==='unlucky'?[220,174,130]:kind==='chaos'?[330,440,277]:[523,659,784];
  notes.forEach((hz,i)=>{const t=audioContext.currentTime+i*.11,o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g).connect(audioContext.destination);o.start(t);o.stop(t+.36);});
}
renderOptions();sync();syncSound();syncSkin();syncMoments();renderHistory();renderFavorites();
