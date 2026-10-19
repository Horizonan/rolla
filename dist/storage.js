export const CONSENT_KEY='rolla.consent';
export const OPTIONAL_KEYS=['rolla.history','rolla.sound','rolla.skin','rolla.favorites','rolla.moments'];
export const CONSENT_LIFETIME=180*24*60*60*1000;

// Only the consent choice is read before opt-in. Optional data stays in memory.
export function createStorage(storage,now=()=>Date.now()){
  const read=(key,fallback)=>{try{return JSON.parse(storage?.getItem(key))??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{if(!storage)return false;storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const remove=key=>{try{storage?.removeItem(key);}catch{}};
  const validChoice=previous=>previous?.version===1&&['allow','essential'].includes(previous.choice)&&previous.expires>now()&&previous.expires<=now()+CONSENT_LIFETIME ? previous.choice : null;
  let choice=validChoice(read(CONSENT_KEY,null));
  const purge=()=>OPTIONAL_KEYS.forEach(remove);
  if(choice!=='allow')purge();
  return {
    get choice(){return choice;},
    refresh(){choice=validChoice(read(CONSENT_KEY,null));if(choice!=='allow')purge();return choice;},
    load(key,fallback){return choice==='allow'&&OPTIONAL_KEYS.includes(key)?read(key,fallback):fallback;},
    save(key,value){return choice==='allow'&&OPTIONAL_KEYS.includes(key)?write(key,value):false;},
    choose(value){
      if(!['allow','essential'].includes(value))throw new Error('Invalid storage choice');
      choice=value;if(value!=='allow')purge();
      return write(CONSENT_KEY,{version:1,choice:value,expires:now()+CONSENT_LIFETIME});
    },
    clear(){purge();}
  };
}

let browserStorage;try{browserStorage=globalThis.localStorage;}catch{}
export const storage=createStorage(browserStorage);
