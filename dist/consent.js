import {storage,CONSENT_KEY} from './storage.js';
const banner=document.getElementById('cookie-banner'),dialog=document.getElementById('cookie-dialog');
const update=()=>{if(banner)banner.hidden=storage.choice!==null;const status=document.getElementById('storage-status');if(status)status.textContent=storage.choice==='allow'?'Current choice: saving allowed.':'Current choice: essential only.';};
document.querySelectorAll('[data-cookie-settings]').forEach(button=>button.addEventListener('click',()=>{update();dialog?.showModal();}));
document.querySelectorAll('[data-consent]').forEach(button=>button.addEventListener('click',()=>{
  const persisted=storage.choose(button.dataset.consent);update();dialog?.close();
  window.dispatchEvent(new CustomEvent('rolla:consent',{detail:{choice:storage.choice,persisted}}));
}));
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
update();
window.addEventListener('storage',e=>{if(e.key!==CONSENT_KEY&&e.key!==null)return;storage.refresh();update();window.dispatchEvent(new CustomEvent('rolla:consent',{detail:{choice:storage.choice,persisted:true,remote:true}}));});
