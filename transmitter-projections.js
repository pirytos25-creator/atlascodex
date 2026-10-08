import * as THREE from "three";
import { createWorldAnnotations } from "./world-annotations.js";
import { createCorticalOverlays } from "./cortical-overlays.js";
export const PROJECTIONS = {
  dopamine: { color: "#dbb37b", sources: [["Istota czarna", [0,-.9,.25]], ["VTA", [0,-.85,.04]]], targets: ["lh-putamen","rh-putamen","lh-caudate","rh-caudate","lh-accumbens","rh-accumbens","lh-rostralmiddlefrontal","rh-rostralmiddlefrontal"], desc: "Układ nigrostriatalny wiąże się z ruchem; projekcje VTA do obszarów limbicznych i przedczołowych z uczeniem, motywacją i kontrolą zachowania. Pominięto układ guzowo-lejkowy." },
  serotonin: { color: "#bf9bd4", sources: [["Jądra szwu · rostralne", [0,-1.05,.32]]], targets: ["lh-superiorfrontal","rh-superiorfrontal","lh-hippocampus","rh-hippocampus","lh-amygdala","rh-amygdala","lh-superiorparietal","rh-superiorparietal"], desc: "Rostralne jądra szwu wysyłają rozległe projekcje do przodomózgowia. Modulacja stanu sieci zależy od receptora i obwodu; wybrane cele nie wyczerpują układu." },
  noradrenaline: { color: "#86c6d5", sources: [["Miejsce sinawe · L", [-.12,-1.16,.55]], ["Miejsce sinawe · P", [.12,-1.16,.55]]], targets: ["lh-superiorfrontal","rh-superiorfrontal","lh-superiorparietal","rh-superiorparietal","lh-hippocampus","rh-hippocampus"], desc: "Miejsce sinawe w grzbietowej części mostu moduluje czuwanie, uwagę i odpowiedź na istotne bodźce poprzez szerokie projekcje." },
  acetylcholine: { color: "#b4d398", sources: [["Jądro podstawne Meynerta", [-.28,-.64,-.55]], ["Przegroda przyśrodkowa", [0,-.45,-.65]], ["Jądra cholinergiczne pnia", [.1,-1.02,.35]]], targets: ["lh-superiorfrontal","rh-superiorfrontal","lh-superiortemporal","rh-superiortemporal","lh-hippocampus","rh-hippocampus","lh-thalamus","rh-thalamus"], desc: "Przodomózgowie podstawne unerwia korę; przegroda przyśrodkowa i pasmo przekątne docierają do hipokampa. Jądra pnia rzutują m.in. do wzgórza." },
};
export function createTransmitterProjections(host, parent) {
  const root = new THREE.Group(); parent.add(root); root.visible = false;
  const overlay = createCorticalOverlays(host, root), paths = new THREE.Group(); root.add(paths);
  const pins = createWorldAnnotations({ ...host, onSelect: item => item.id ? host.describe(item.id) : host.openDialog("UKŁAD PROJEKCYJNY", `<h2>${item.name}</h2><p>Znacznik przybliża położenie grupy jąder niesegmentowanych w szablonie.</p>`) });
  let key = "", dots = [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = host.canvasHost.querySelector('canvas'), raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart;
  canvas.addEventListener('pointerdown', e => { if(root.visible)pointerStart=[e.clientX,e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if(!host.isCanvasClick(e) || !root.visible || !parent.visible || !pointerStart || Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;
    pointerStart=null;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,host.camera);
    const hit=raycaster.intersectObjects([...overlay.entries.values()].filter(v=>v.mesh.visible).map(v=>v.mesh),false)[0];if(hit)host.describe(hit.object.userData.id);
  });
  function set(next) {
    const config = PROJECTIONS[next]; if (!config) return;
    root.visible = true;
    Object.assign(host.state,{ left:true, right:true, deep:true, tracts:false, section:"none", separation:0, renderSeparation:0 });
    host.setOpacity(.85);
    if (next !== key) {
      paths.traverse(m => { m.geometry?.dispose(); m.material?.dispose(); }); paths.clear(); dots = []; key = next;
      overlay.set(config.targets.map(id=>({id,color:config.color,opacity:.65}))); overlay.root.visible = true;
      for (const [sourceName, point] of config.sources) {
        const source = new THREE.Vector3(...point), marker = new THREE.Mesh(new THREE.SphereGeometry(.08,16,12), new THREE.MeshStandardMaterial({color:config.color, emissive:config.color, emissiveIntensity:.25}));
        marker.position.copy(source); paths.add(marker);
        const targets = config.targets.filter(id => next !== "dopamine" || (sourceName === "Istota czarna" ? /putamen|caudate/.test(id) : !/putamen|caudate/.test(id))).filter(id => next !== "acetylcholine" || (sourceName.includes("Przegroda") ? /hippocampus/.test(id) : sourceName.includes("pnia") ? /thalamus/.test(id) : !/hippocampus|thalamus/.test(id)));
        for (const id of targets) {
          const item = host.registry.get(id); if (!item) continue;
          const target = new THREE.Vector3(...item.centroid), middle = source.clone().lerp(target,.5); middle.y += .35;
          const curve = new THREE.CatmullRomCurve3([source,middle,target]);
          const tube = new THREE.Mesh(new THREE.TubeGeometry(curve,32,.018,6,false),new THREE.MeshStandardMaterial({color:config.color,transparent:true,opacity:.55,roughness:.6})); paths.add(tube);
          const dot = new THREE.Mesh(new THREE.SphereGeometry(.036,10,8),new THREE.MeshBasicMaterial({color:config.color})); paths.add(dot); dots.push({dot,curve});
        }
      }
      pins.set([...config.sources.map(([name,point])=>({name,point})),...config.targets.slice(-2).map(id=>({id,name:host.registry.get(id).name,point:host.registry.get(id).anchor}))]);
    }
    host.moveCamera(new THREE.Vector3(-7,3,6),new THREE.Vector3(0,-.1,0));
  }
  return { root, set, hide() { root.visible=false; pins.hide(); }, update(time) {
    if (!root.visible) return;
    overlay.sync(); pins.update(true,host.state.labels);
    dots.forEach(({dot,curve},i)=>curve.getPointAt(reduced.matches ? .5 : (time/5+i*.11)%1,dot.position));
  } };
}
