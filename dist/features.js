import { randomDie } from './dice.js';

export const skins = {
  ruby: { name: 'Ruby', color: [232,44,58], ink: '#fff9f8', shade: '#821d2a', glint: [255,207,213], gloss: .2, swatch: '#d7353b' },
  obsidian: { name: 'Obsidian', color: [54,59,70], ink: '#f5df9b', shade: '#12151c', glint: [210,221,255], gloss: .3, swatch: '#323640' },
  pearl: { name: 'Pearl', color: [243,231,211], ink: '#4d4650', shade: '#b9a38a', glint: [255,255,255], gloss: .12, swatch: '#e7d9c4' },
  jade: { name: 'Jade', color: [37,151,118], ink: '#f2f5d8', shade: '#144d40', glint: [199,255,229], gloss: .26, swatch: '#258a6c' },
  ocean: { name: 'Ocean', color: [45,113,204], ink: '#eff8ff', shade: '#163961', glint: [187,228,255], gloss: .24, swatch: '#3576c7' },
  violet: { name: 'Amethyst', color: [139,75,194], ink: '#ffeecb', shade: '#46235f', glint: [238,203,255], gloss: .26, swatch: '#8a4db7' },
  unicorn: { name: 'Unicorn', theme: 'unicorn', color: [220,192,237], ink: '#5b3d78', shade: '#fff6ff', glint: [255,243,255], gloss: .3, swatch: '#dfb7e9' },
  blockcraft: { name: 'Blockcraft', theme: 'blockcraft', color: [114,141,64], ink: '#fff9d9', shade: '#3c3528', glint: [213,235,159], gloss: .05, swatch: '#78a447' },
  galaxy: { name: 'Galaxy', theme: 'galaxy', color: [58,45,104], ink: '#fff0cc', shade: '#161933', glint: [205,209,255], gloss: .3, swatch: '#533e82' }
};

export const validSetup = r => !!r && Number.isInteger(r.sides) && r.sides>=2 && r.sides<=1000 && Number.isInteger(r.count) && r.count>=1 && r.count<=6 && Number.isInteger(r.modifier) && Math.abs(r.modifier)<=100;
export const setupKey = r => `${r.count}d${r.sides}:${r.modifier}`;
export function cleanFavorites(input) {
  if(!Array.isArray(input)) return [];
  const seen=new Set();
  return input.filter(r=>{
    if(!validSetup(r)||typeof r.name!=='string'||!r.name.trim()||seen.has(setupKey(r)))return false;
    seen.add(setupKey(r));return true;
  }).slice(0,12).map(r=>({sides:r.sides,count:r.count,modifier:r.modifier,name:r.name.trim().slice(0,32)}));
}

export function rollValues(sides,count,previous=[],held=[],sample=randomDie){
  return Array.from({length:count},(_,i)=>held[i]&&Number.isInteger(previous[i])&&previous[i]>=1&&previous[i]<=sides ? previous[i] : sample(sides));
}

// Only freshly rolled D20s can trigger a natural 1 or 20. Modifiers do not count.
export function getMoment(sides,values,held=[]){
  const fresh=values.filter((_,i)=>!held[i]);if(!fresh.length)return null;
  if(sides===20){
    const lucky=fresh.includes(20),unlucky=fresh.includes(1);
    if(lucky&&unlucky)return {kind:'chaos',label:'Fate & chaos',detail:'Natural 20 + natural 1'};
    if(lucky)return {kind:'lucky',label:'Natural 20',detail:'Critical roll'};
    if(unlucky)return {kind:'unlucky',label:'Natural 1',detail:'A twist of fate'};
  }
  if(values.length>1&&values.every(v=>v===sides))return {kind:'lucky',label:sides===6&&values.length===2?'Double six':'Perfect roll',detail:'Every die at its highest'};
  if(values.length>1&&values.every(v=>v===1))return {kind:'unlucky',label:sides===6&&values.length===2?'Snake eyes':'All ones',detail:'Nowhere to go but up'};
  return null;
}
