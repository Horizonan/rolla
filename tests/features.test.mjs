import test from 'node:test';
import assert from 'node:assert/strict';
import {rollValues,getMoment,cleanFavorites} from '../dist/features.js';
import {createStorage,CONSENT_KEY,CONSENT_LIFETIME,OPTIONAL_KEYS} from '../dist/storage.js';
import {DiceRenderer} from '../dist/dice.js';

test('The renderer preserves held die orientation and position',async()=>{
  const renderer={values:[6,2],qs:[[0,0,0,1],[0,0,0,1]],positions:[[.15,.1],[-.1,0]],sides:6,count:2,motion:{matches:true},draw(){}};
  const before=structuredClone({q:renderer.qs[0],p:renderer.positions[0]});
  await DiceRenderer.prototype.animate.call(renderer,[6,4],null,[true,false]);
  assert.deepEqual(renderer.qs[0],before.q);assert.deepEqual(renderer.positions[0],before.p);assert.deepEqual(renderer.held,[true,false]);
});

test('Rerolls sample only unlocked dice and preserve held outcomes in place',()=>{
  let calls=0;const result=rollValues(20,4,[20,3,1,7],[true,false,true,false],sides=>{assert.equal(sides,20);return ++calls+10;});
  assert.deepEqual(result,[20,11,1,12]);assert.equal(calls,2);
  assert.deepEqual(rollValues(6,2,[6,1],[true,true],()=>assert.fail('Held dice must not sample')),[6,1]);
  assert.deepEqual(rollValues(6,2,[20,undefined],[true,true],()=>4),[4,4]);
});
test('Natural moments use freshly rolled faces, never modifiers or held criticals',()=>{
  assert.equal(getMoment(20,[20]).kind,'lucky');assert.equal(getMoment(20,[1]).kind,'unlucky');
  assert.equal(getMoment(20,[20,1]).kind,'chaos');assert.equal(getMoment(20,[20,9],[true,false]),null);
  assert.equal(getMoment(20,[20,1],[true,false]).kind,'unlucky');
  assert.equal(getMoment(6,[6,6]).label,'Double six');assert.equal(getMoment(6,[1,1]).label,'Snake eyes');
  assert.equal(getMoment(6,[6,6],[true,true]),null);assert.equal(getMoment(4,[1]),null);assert.equal(getMoment(20,[19]),null);
});
test('Favorites reject malformed settings, deduplicate combinations and bound names/count',()=>{
  const input=[null,{sides:1,count:1,modifier:0,name:'Bad'},{sides:6,count:2,modifier:0,name:'  Party  '},{sides:6,count:2,modifier:0,name:'Duplicate'},...Array.from({length:20},(_,i)=>({sides:i+10,count:1,modifier:-2,name:'x'.repeat(100)}))];
  const cleaned=cleanFavorites(input);assert.equal(cleaned.length,12);assert.deepEqual(cleaned[0],{sides:6,count:2,modifier:0,name:'Party'});assert.equal(cleaned[1].name.length,32);assert.deepEqual(cleanFavorites({}),[]);
});
function fakeStore(initial={}){
  const values=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)])),reads=[],writes=[];
  return {values,reads,writes,getItem(k){reads.push(k);return values.get(k)??null;},setItem(k,v){writes.push(k);values.set(k,v);},removeItem(k){values.delete(k);}};
}
test('No optional storage is read or written before consent; unrelated data survives',()=>{
  const fake=fakeStore({'rolla.history':[{legacy:true}],'another-app.key':42});const store=createStorage(fake,()=>1000);
  assert.equal(store.choice,null);assert.deepEqual(store.load('rolla.history',[]),[]);assert.equal(store.save('rolla.skin','jade'),false);
  assert.deepEqual(fake.reads,[CONSENT_KEY]);assert.deepEqual(fake.writes,[]);assert.equal(fake.values.has('rolla.history'),false);assert.equal(fake.values.has('another-app.key'),true);
});
test('Opt-in survives reload; withdrawal deletes all optional keys while preserving the choice',()=>{
  let now=1000;const fake=fakeStore({'another-app.key':42}),store=createStorage(fake,()=>now);assert.equal(store.choose('allow'),true);
  OPTIONAL_KEYS.forEach(k=>assert.equal(store.save(k,['saved']),true));
  const reloaded=createStorage(fake,()=>1001);assert.equal(reloaded.choice,'allow');assert.deepEqual(reloaded.load('rolla.favorites',[]),['saved']);
  reloaded.choose('essential');for(const key of OPTIONAL_KEYS)assert.equal(fake.values.has(key),false);
  assert.equal(fake.values.has('another-app.key'),true);assert.equal(createStorage(fake,()=>1002).choice,'essential');assert.equal(reloaded.save('other',{}),false);
  now=1002;assert.equal(store.refresh(),'essential');assert.equal(store.save('rolla.sound',true),false);
});
test('Expired choices remove optional data before reading it; blocked storage stays usable',()=>{
  const fake=fakeStore({[CONSENT_KEY]:{version:1,choice:'allow',expires:1000},'rolla.favorites':['old']});const store=createStorage(fake,()=>1000);
  assert.equal(store.choice,null);assert.deepEqual(fake.reads,[CONSENT_KEY]);assert.equal(fake.values.has('rolla.favorites'),false);
  store.choose('allow');assert.equal(JSON.parse(fake.values.get(CONSENT_KEY)).expires,1000+CONSENT_LIFETIME);
  const broken=createStorage({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
  assert.equal(broken.choose('allow'),false);assert.equal(broken.save('rolla.favorites',[]),false);assert.deepEqual(broken.load('rolla.favorites',[]),[]);
});
