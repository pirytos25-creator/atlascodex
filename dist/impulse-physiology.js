import * as THREE from "three";
import { createMembraneModel, conductionParameters } from "./physiology-model.js";
const $=s=>document.querySelector(s);
const SCENARIOS={ normal:["Prawidłowy akson mielinowy","Mielina ogranicza utratę prądu; potencjał odtwarza się w przewężeniach Ranviera."], demyelination:["Demielinizacja","Utrata izolacji zwiększa upływ i zmienia pojemność błony. W SM przewodzenie może zwolnić lub ulec blokadzie; nasilenie objawów zależy od wielu czynników."], lidocaine:["Blokada Na⁺ · lidokaina","Lidokaina stabilizuje nieprzewodzące stany kanałów Na⁺; blokada zależy m.in. od stężenia i aktywności. Suwak nie odpowiada dawce klinicznej."], ttx:["Blokada Na⁺ · TTX","W scenie blokowana jest populacja kanałów wrażliwych na TTX. TTX blokuje por od zewnątrz; istnieją także izoformy oporne na TTX."], bare:["Akson bez mieliny","Przewodzenie ciągłe w tym schemacie jest wolniejsze przy tej samej umownej średnicy. Porównanie nie jest pomiarem konkretnego nerwu."] };
export function enhanceImpulseLab(lab,host) {
  const state={scope:null,playing:true,speed:1,interval:35,scenario:"demyelination",severity:.5,time:0},model=createMembraneModel();
  const root=new THREE.Group(),neuron=new THREE.Group(),axons=new THREE.Group();root.add(neuron,axons);host.scene.add(root);root.visible=false;
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.55,emissive:color,emissiveIntensity:.08});
  function ball(group,point,radius,color) {const m=new THREE.Mesh(new THREE.SphereGeometry(radius,20,14),mat(color));m.position.set(...point);group.add(m);return m;}
  function tube(group,points,radius,color) {const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,30,radius,8,false),mat(color));group.add(m);return m;}
  const soma=ball(neuron,[0,0,0],.65,"#9ec0ae"),initial=tube(neuron,[[.5,0,0],[1.3,0,0],[3.3,.1,0]],.09,"#d2b880"),synapses=[];
  for(let i=0;i<4;i++){const a=i*1.5-.6,point=[-1.7-Math.cos(a),Math.sin(a)*1.5,Math.cos(a)*.7];tube(neuron,[[0,0,0],[-.9,point[1]*.5,point[2]*.4],point],.045,"#719f88");synapses.push(ball(neuron,point,.13,i===3?"#c59dd9":"#b8efc7"));}
  const sleeves=[],signals=[];
  for(let row=0;row<2;row++){
    const y=row===0?.8:-.8;tube(axons,[[-3,y,0],[0,y,.02],[3,y,0]],.045,"#9cb6ac");
    for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.48,18),mat(row?"#b3aa95":"#abc9b1"));m.rotation.z=Math.PI/2;m.position.set(-2.7+i*.65,y,0);axons.add(m);sleeves.push({m,row,i});}
    signals.push(ball(axons,[-3,y,0],.095,row?"#e5b580":"#b8efc7"));
  }
  const hud=document.createElement("div");hud.className="impulse-hud physiology-hud";hud.hidden=true;hud.innerHTML='<span class="eyebrow"></span><strong></strong><span class="phys-hud-detail"></span>';host.viewport.append(hud);
  const original={enter:lab.enter,exit:lab.exit,update:lab.update,selectRoute:lab.selectRoute,resetView:lab.resetView};const samples=[];let lastDraw=-1,lastSample=0,flashes=[0,0,0,0];const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  function tabs(){return '<div class="lab-tabs"><button data-lab-scope="macro">Drogi mózgu</button><button data-lab-scope="micro">Neuron i synapsa</button><button data-phys-scope="membrane" class="'+(state.scope==='membrane'?'active':'')+'">Potencjał błonowy</button><button data-phys-scope="pathology" class="'+(state.scope==='pathology'?'active':'')+'">Patologia przewodzenia</button></div>';}
  function render(){
    const membrane=state.scope==="membrane";
    $("#mode-panel").innerHTML=`<div class="impulse-panel"><span class="eyebrow">LABORATORIUM POBUDLIWOŚCI</span><h2>${membrane?"Potencjał błonowy":"Patologia przewodzenia"}</h2>${tabs()}${membrane?`<div class="research-chart"><canvas id="membrane-chart" width="520" height="260" aria-label="Napięcie błony w czasie, próg i potencjał spoczynkowy"></canvas></div><label class="lab-field">Próg <output id="membrane-threshold-value">${model.state.threshold} mV</output><input id="membrane-threshold" aria-label="Próg pobudzenia" type="range" min="-60" max="-40" value="${model.state.threshold}"></label><h3>Sumowanie przestrzenne</h3><div class="method-answers">${[0,1,2].map(i=>`<button class="secondary-button" data-phys-epsp="${i}">EPSP · synapsa ${i+1}</button>`).join("")}<button class="secondary-button" data-phys-ipsp>IPSP · synapsa 4</button><button class="primary-button" data-phys-sum>Trzy EPSP jednocześnie</button></div><h3>Sumowanie czasowe</h3><label class="lab-field">Odstęp bodźców · ms<input id="membrane-interval" type="range" aria-label="Odstęp bodźców" min="10" max="500" step="5" value="${state.interval}"><output id="membrane-interval-value">${state.interval} ms</output></label><button class="secondary-button" data-phys-series>Seria sześciu EPSP</button><output id="membrane-result" aria-live="polite"></output>`:`<label class="lab-field">Scenariusz<select id="pathology-scenario">${Object.entries(SCENARIOS).map(([id,[name]])=>`<option value="${id}" ${state.scenario===id?"selected":""}>${name}</option>`).join("")}</select></label><label class="lab-field">Nasilenie / udział blokady<input id="pathology-severity" type="range" min="0" max="100" value="${state.severity*100}" aria-label="Nasilenie zaburzenia przewodzenia"><output id="pathology-severity-value">${Math.round(state.severity*100)}%</output></label><article class="lab-stage"><p>${SCENARIOS[state.scenario][1]}</p><p>Górny akson: wzorzec mielinowy. Dolny: wybrany scenariusz. Sygnały startują równocześnie.</p><output id="pathology-result" aria-live="polite"></output></article>`}<div class="mode-actions"><button class="primary-button" data-phys-play>${state.playing?"Pauza":"Odtwarzaj"}</button><button class="secondary-button" data-phys-reset>Od początku</button></div><label class="lab-field">Tempo ilustracji<input id="phys-speed" type="range" aria-label="Tempo modelu" min=".25" max="2" step=".25" value="${state.speed}"></label><p class="lab-science-note">${membrane?"Model dydaktyczny integrate-and-fire z upływem i narzuconym kształtem AP. Wartości i skala czasu są poglądowe, bez symulacji Hodgkina–Huxleya. IPSP ilustruje hiperpolaryzację, nie wszystkie rodzaje hamowania.":"Model jakościowy. Czasy, prędkości i progi blokady są umowne; procent nie jest dawką ani pomiarem choroby. Tempo animacji jest zwolnione względem podpisów w ms."}</p><a class="source-link" href="${membrane?"https://www.ncbi.nlm.nih.gov/books/NBK26910/":"https://www.ncbi.nlm.nih.gov/books/NBK539881/"}" target="_blank" rel="noopener">Mechanizm · źródło</a></div>`;lastDraw=-1;
  }
  function show(scope){state.scope=scope;lab.state.follow=false;host.controls.enabled=true;lab.suspend();root.visible=true;neuron.visible=scope==="membrane";axons.visible=!neuron.visible;hud.hidden=false;$(".controls").inert=true;document.body.dataset.labScope=scope;host.macroObjects().forEach(m=>m.visible=false);host.moveCamera(new THREE.Vector3(-1,2.5,8),new THREE.Vector3(0,0,0));$(".viewport-title>div").textContent=scope==="membrane"?"Potencjał błonowy · model":"Porównanie przewodzenia";$("#world-scale").textContent="Schemat dydaktyczny · skala umowna";render();}
  function draw(){
    const canvas=$("#membrane-chart");if(!canvas)return;const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,y=v=>h-25-(v+90)/130*(h-45),start=Math.max(0,model.state.time-3000);
    ctx.fillStyle="#102019";ctx.fillRect(0,0,w,h);ctx.font="22px Segoe UI";
    for(const [v,color,name] of [[-70,"#7daba1","Spoczynek -70 mV"],[model.state.threshold,"#dfb578",`Próg ${model.state.threshold} mV`]]){ctx.strokeStyle=color;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(35,y(v));ctx.lineTo(w,y(v));ctx.stroke();ctx.fillStyle=color;ctx.fillText(name,40,y(v)-7);}ctx.setLineDash([]);
    ctx.strokeStyle="#b8efc7";ctx.lineWidth=2;ctx.beginPath();samples.filter(s=>s[0]>=start).forEach(([t,v],i)=>{const x=35+(t-start)/3000*(w-45);i?ctx.lineTo(x,y(v)):ctx.moveTo(x,y(v));});ctx.stroke();ctx.fillStyle="#e5eee7";ctx.fillText("mV",3,18);ctx.fillText(`${(start/1000).toFixed(1)}–${((start+3000)/1000).toFixed(1)} s`,w-145,h-4);
  }
  lab.resetView=()=>{if(state.scope)host.frame(new THREE.Vector3(-1,2.5,8),new THREE.Vector3());else original.resetView();};
  lab.selectRoute=(...args)=>{state.scope=null;root.visible=false;hud.hidden=true;lab.resume();return original.selectRoute(...args);};
  lab.enter=options=>{original.enter(options);if(state.scope)show(state.scope);};
  lab.exit=()=>{root.visible=false;hud.hidden=true;original.exit();};
  lab.update=(dt,t)=>{
    if(!lab.state.active)return;
    if(!state.scope)return original.update(dt,t);
    host.macroObjects().forEach(m=>m.visible=false);
    if(state.playing){if(state.scope==="membrane")model.advance(dt*1000*state.speed, s=>{ if(s.time-lastSample>=2){samples.push([s.time,s.voltage]);lastSample=s.time;if(samples.length>1800)samples.shift();} });else state.time+=dt*60*state.speed;}
    if(state.scope==="membrane"){
      synapses.forEach((m,i)=>{flashes[i]=Math.max(0,flashes[i]-dt);m.material.emissiveIntensity=reduced.matches?.1:flashes[i]*2;});
      initial.material.emissiveIntensity=model.state.time<model.state.refractoryUntil?.7:.08;soma.material.emissiveIntensity=Math.max(.08,(model.state.voltage+70)/110);
    }else{
      const params=conductionParameters(state.scenario,state.severity),period=Math.max(120,params.arrival)+200,time=state.time%period;
      signals.forEach((m,row)=>{const p=Math.min(1,time/(row?params.arrival:120));m.position.x=-3+p*6;m.visible=!row||!params.blocked||p<=params.stop;m.scale.setScalar(row&&params.blocked?Math.max(.05,1-Math.max(0,p-params.stop+.1)*10):1);});
      sleeves.forEach(({m,row,i})=>{m.visible=!row||state.scenario!=="bare";m.material.opacity=row&&state.scenario==="demyelination"&&i>=3&&i<=5?1-state.severity:1;m.material.transparent=m.material.opacity<1;});
    }
    if(t-lastDraw>100){lastDraw=t;hud.querySelector('.eyebrow').textContent=state.scope==="membrane"?"POBUDLIWOŚĆ":"DWA AKSONY";hud.querySelector('strong').textContent=state.scope==="membrane"?`${Math.round(model.state.voltage)} mV`:`${Math.round(state.time)} ms`;
      if(state.scope==="membrane"){draw();$("#membrane-result").textContent=`Potencjały czynnościowe: ${model.state.spikes} · ${model.state.time<model.state.refractoryUntil?"okres refrakcji":"integracja wejść"}`;hud.querySelector('.phys-hud-detail').textContent=`AP: ${model.state.spikes}`;}
      else {const p=conductionParameters(state.scenario,state.severity),q=state.time%(Math.max(120,p.arrival)+200);$("#pathology-result").textContent=`Wzorzec: ${q>=120?"dotarł · 120 ms":"propagacja"}. Scenariusz: ${p.blocked&&q/p.arrival>=p.stop?"blokada · sygnał wygasł":q>=p.arrival?`dotarł · ${Math.round(p.arrival)} ms`:"propagacja"}.`;hud.querySelector('.phys-hud-detail').textContent=p.blocked?"Możliwa blokada przewodzenia":`Czas ilustracyjny: ${Math.round(p.arrival)} ms`;}
    }
  };
  document.addEventListener("click",e=>{
    if(!lab.state.active)return;const b=e.target.closest("button");if(!b)return;
    if(b.dataset.physScope)return show(b.dataset.physScope);
    if(b.dataset.labScope){state.scope=null;root.visible=false;hud.hidden=true;lab.resume();return;}
    if(!state.scope)return;
    if(b.dataset.physEpsp!==undefined){model.stimulus(6);flashes[+b.dataset.physEpsp]=.5;}
    if(b.hasAttribute("data-phys-ipsp")){model.stimulus(-8);flashes[3]=.5;}
    if(b.hasAttribute("data-phys-sum")){model.stimulus(18);flashes=[.5,.5,.5,0];}
    if(b.hasAttribute("data-phys-series")){for(let i=0;i<6;i++)model.stimulus(6,i*state.interval);flashes[0]=.5;}
    if(b.hasAttribute("data-phys-play")){state.playing=!state.playing;render();}
    if(b.hasAttribute("data-phys-reset")){model.reset();samples.length=0;lastSample=0;state.time=0;lastDraw=-1;}
  });
  document.addEventListener("input",e=>{if(!lab.state.active||!state.scope)return;const value=+e.target.value;
    if(e.target.id==="membrane-threshold"){model.state.threshold=value;$("#membrane-threshold-value").textContent=value+" mV";}
    if(e.target.id==="membrane-interval"){state.interval=value;$("#membrane-interval-value").textContent=value+" ms";}
    if(e.target.id==="pathology-severity"){state.severity=value/100;state.time=0;$("#pathology-severity-value").textContent=value+"%";}
    if(e.target.id==="phys-speed")state.speed=value;
  });
  document.addEventListener("change",e=>{if(lab.state.active&&e.target.id==="pathology-scenario"){state.scenario=e.target.value;state.time=0;render();}});
  return lab;
}
