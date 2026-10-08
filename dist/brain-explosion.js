import * as THREE from 'three';
import { LOBES } from './data.js';
import { createCorticalOverlays } from './cortical-overlays.js';
import { createWorldAnnotations } from './world-annotations.js';

export function createBrainExplosion(host) {
  const overlay = createCorticalOverlays(host), state = { active:false, amount:0 };
  const items = [...host.registry.values()].filter(item=>item.kind !== 'tracts');
  const pins = createWorldAnnotations({...host,onSelect:item=>host.select(item.id,{focus:true,reveal:false})});
  const offsets = new Map();
  let built=false, presentation=null, rendered=0, lastSelected, transitionAt=0, transitionFrom=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function build() {
    if(built)return;
    overlay.set(items.map(item=>({id:item.id,color:LOBES[item.lobe]?.color||'#b7c7b4',opacity:1})));
    // A catalogue layout keeps every piece distinct; it is not an anatomical transform.
    items.forEach((item,i)=>{
      const target=new THREE.Vector3((i%10-4.5)*2.5,(4-Math.floor(i/10))*2.5,(i%2-.5)*2);
      offsets.set(item.id,target.sub(new THREE.Vector3(...item.centroid)));
    });
    built=true;
  }
  function frame() {
    host.controls.maxDistance=120;
    const radius=3+state.amount/100*15;
    host.frame(new THREE.Vector3(0,radius*.35,radius*2.2),new THREE.Vector3());
  }
  function setAmount(amount) {
    amount=THREE.MathUtils.clamp(amount,0,100);
    if(amount && !state.amount) {
      presentation=Object.fromEntries(['left','right','deep','tracts','opacity','section','slice','renderSlice','separation','renderSeparation'].map(key=>[key,host.state[key]]));
      Object.assign(host.state,{left:true,right:true,deep:true,tracts:false,section:'none',separation:0,renderSeparation:0,cutPlaying:false});
      build();
    }
    transitionAt=performance.now();transitionFrom=rendered;
    state.amount=amount;document.body.dataset.brainExploded=amount?"true":"false";const tools=document.querySelector(".cut-tools");if(tools)tools.inert=!!amount;document.querySelector('.controls').inert=!!amount;
    if(!amount) {
      state.active=false;overlay.root.visible=false;pins.hide();rendered=0;
      if(presentation)Object.assign(host.state,presentation);
      presentation=null;host.controls.maxDistance=24;host.updateVisibility();
      host.clearSelection({restoreCamera:false});host.setView('left');
    } else {state.active=true;overlay.root.visible=true;host.updateVisibility();frame();}
    const range=document.querySelector('#brain-explosion');if(range)range.value=amount;
    const output=document.querySelector('#brain-explosion-value');if(output)output.textContent=amount+'%';
    const select=document.querySelector('#exploded-select');if(select)select.disabled=!amount;
    host.syncControls();host.updateLabels();
  }
  function html() {
    const chosen=state.amount?host.registry.get(host.state.selected):null;
    return `<section class="brain-breakdown"><h3>Rozłóż cały mózg</h3><p>Oddziel ${items.filter(i=>i.kind==='cortex').length} parcel kory i ${items.filter(i=>i.kind==='deep').length} struktur głębokich.</p><label class="lab-field">Stopień rozłożenia <output id="brain-explosion-value">${state.amount}%</output><input id="brain-explosion" type="range" min="0" max="100" value="${state.amount}" aria-label="Rozłożenie całego mózgu"></label><div class="mode-actions"><button class="primary-button" data-brain-explode>Rozłóż wszystkie części</button><button class="secondary-button" data-brain-fold>Złóż mózg</button></div><label class="lab-field">Znajdź część<select id="exploded-select" ${state.amount?'':'disabled'}><option value="">Wybierz strukturę…</option>${items.map(item=>`<option value="${item.id}" ${item.id===host.state.selected?'selected':''}>${item.name}${item.hemi?' · '+(item.hemi==='lh'?'L':'P'):''}</option>`).join('')}</select></label>${chosen&&chosen.kind!=='tracts'?`<article class="lab-stage"><h3>${chosen.name}</h3><p>${chosen.anatomy}</p><button class="secondary-button" data-brain-more>Pełny opis części</button></article>`:''}<p class="lab-science-note">Rzeczywiste powierzchnie DK / aseg w umownym układzie katalogowym. To dostępne części makroanatomii, bez warstw, jąder i pojedynczych komórek. Przekroje i drogi są schowane podczas rozłożenia.</p></section>`;
  }
  function pick(e) {
    if(!state.active)return null;
    const rect=host.canvasHost.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),host.camera);
    const hit=ray.intersectObjects([...overlay.entries.values()].map(entry=>entry.mesh),false)[0];
    return hit?host.registry.get(hit.object.userData.id):null;
  }
  document.addEventListener('input',e=>{if(host.state.mode==='dissection'&&e.target.id==='brain-explosion')setAmount(+e.target.value);});
  document.addEventListener('change',e=>{if(host.state.mode==='dissection'&&e.target.id==='exploded-select'&&e.target.value)host.select(e.target.value,{focus:true,reveal:false});});
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-brain-explode')){if(host.state.mode!=='dissection')host.setMode('dissection');setAmount(100);}if(b.hasAttribute('data-brain-fold'))setAmount(0);if(b.hasAttribute('data-brain-more'))host.describe(host.state.selected);});
  return {root:overlay.root,state,html,pick,exit(){state.active=false;overlay.root.visible=false;pins.hide();},fold({whole=false}={}){if(state.amount){setAmount(0);if(whole){Object.assign(host.state,{section:'none',slice:0,renderSlice:0});host.updateVisibility();host.syncControls();}}},focusPoint(item){return new THREE.Vector3(...item.centroid).add(overlay.entries.get(item.id)?.mesh.position||new THREE.Vector3());},update(dt){
    state.active=host.state.mode==='dissection'&&state.amount>0;
    overlay.root.visible=state.active;if(!state.active){pins.hide();return;}
    host.controls.maxDistance=120;
    document.querySelector('.controls').inert=true;
    const q=Math.min(1,(performance.now()-transitionAt)/650);
    rendered=reduced.matches?state.amount:THREE.MathUtils.lerp(transitionFrom,state.amount,1-(1-q)**3);
    host.macroObjects().forEach(object=>object.visible=false);
    for(const {mesh,item} of overlay.entries.values()) {mesh.visible=true;mesh.position.copy(offsets.get(item.id)).multiplyScalar(rendered/100);mesh.material.clippingPlanes=[];mesh.material.emissiveIntensity=item.id===host.state.selected ? .45 : .08;}
    if(lastSelected!==host.state.selected){lastSelected=host.state.selected;const item=host.registry.get(lastSelected);pins.set(item?[{id:item.id,name:item.name,point:()=>new THREE.Vector3(...item.anchor).add(overlay.entries.get(item.id).mesh.position)}]:[]);}
    pins.update(true,host.state.labels);
  }};
}
