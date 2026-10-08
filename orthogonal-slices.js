import * as THREE from "three";
import { ASEG_IDS } from "./dissection.js";
const planes = {
  axial: { name:"Osiowa", axes:[0,2], fixed:1, signs:[1,-1], orientation:["R","L","A","P"] },
  coronal: { name:"Czołowa", axes:[0,1], fixed:2, signs:[1,1], orientation:["R","L","S","I"] },
  sagittal: { name:"Strzałkowa", axes:[2,1], fixed:0, signs:[-1,1], orientation:["A","P","S","I"] },
};
export function createOrthogonalSlices(host) {
  const root=new THREE.Group();host.scene.add(root);root.visible=false;
  const marker=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:"#b8efc7",depthTest:false}));marker.renderOrder=20;root.add(marker);
  let point=null,key="",world=new THREE.Vector3(),domCanvas=null;
  function html() { return `<section class="orthogonal-slices"><h3>Trzy przekroje 2D</h3><p class="lab-science-note">Konwencja radiologiczna: prawa strona pacjenta jest po lewej obrazu czołowego i osiowego. R/L: prawa/lewa; A/P: przód/tył; S/I: góra/dół.</p>${Object.entries(planes).map(([id,p])=>`<figure><figcaption>${p.name} · kliknij punkt</figcaption><canvas width="256" height="256" data-ortho="${id}" tabindex="0" role="img" aria-label="${p.name}: kliknij lub przesuń celownik strzałkami"></canvas></figure>`).join("")}<output id="ortho-position" aria-live="polite">Wczytywanie wolumenu MRI…</output><p class="lab-science-note">Współrzędne: powierzchniowy RAS fsaverage, mm; nie współrzędne MNI. Szarości pochodzą z MRI, etykiety z aseg.</p></section>`; }
  function data() {return host.volume.getData();}
  function toWorld() { const m=data().meta.voxelToWorld; world.set(...m.slice(0,3).map(row=>row[0]*point[0]+row[1]*point[1]+row[2]*point[2]+row[3])); return world; }
  function follow(plane) {
    host.state.cutPlaying=false;
    host.state.section=plane;
    toWorld();
    const value=plane==="sagittal"?-world.x/.028:plane==="coronal"?world.z/.028:-world.y/.028;
    host.state.slice=Math.max(-100,Math.min(100,value));host.state.renderSlice=host.state.slice;
    host.updateClipping();host.syncControls();host.syncDissection();key="";
  }
  function fromSlice() {
    const {meta}=data(),m=meta.worldToVoxel;
    toWorld();
    if(host.state.section==="sagittal")world.x=-host.state.renderSlice*.028;
    if(host.state.section==="coronal")world.z=host.state.renderSlice*.028;
    if(host.state.section==="axial")world.y=-host.state.renderSlice*.028;
    point=m.slice(0,3).map(row=>Math.round(row[0]*world.x+row[1]*world.y+row[2]*world.z+row[3]));
    point=point.map((v,i)=>Math.max(0,Math.min(meta.size[i]-1,v)));
  }
  function draw() {
    const {bytes,meta}=data(), [nx,ny]=meta.size;
    for(const [id,p] of Object.entries(planes)) {
      const canvas=document.querySelector(`[data-ortho="${id}"]`);if(!canvas)continue;
      const context=canvas.getContext("2d"),[a,b]=p.axes,w=meta.size[a],h=meta.size[b];
      const off=document.createElement("canvas");off.width=w;off.height=h;
      const image=context.createImageData(w,h),voxel=[...point];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
        voxel[a]=p.signs[0]>0?x:w-1-x;voxel[b]=p.signs[1]>0?y:h-1-y;
        const offset=((voxel[2]*ny+voxel[1])*nx+voxel[0])*4,l=bytes[offset+1],gray=Math.max(0,Math.min(255,(bytes[offset]-128)*host.state.sliceContrast+128)),o=(y*w+x)*4;
        const tissue=host.state.sliceStyle==="tissue"?host.volume.tissueColor(l):[gray/255,gray/255,gray/255];
        image.data.set([tissue[0]*255,tissue[1]*255,tissue[2]*255,255],o);
      }
      off.getContext("2d").putImageData(image,0,0);context.drawImage(off,0,0,256,256);
      const cx=((p.signs[0]>0?point[a]:w-1-point[a])+.5)/w*256,cy=((p.signs[1]>0?point[b]:h-1-point[b])+.5)/h*256;
      context.strokeStyle="#b8efc7";context.lineWidth=1;context.beginPath();context.moveTo(cx,0);context.lineTo(cx,256);context.moveTo(0,cy);context.lineTo(256,cy);context.stroke();
      context.font="bold 13px Segoe UI";context.fillStyle="#eaffef";context.textAlign="center";
      [[12,128],[244,128],[128,15],[128,248]].forEach(([x,y],i)=>{context.fillStyle="#06130c";context.fillRect(x-9,y-12,18,18);context.fillStyle="#eaffef";context.fillText(p.orientation[i],x,y);});
    }
    toWorld();const offset=(point[0]+nx*(point[1]+ny*point[2]))*4,item=host.registry.get(ASEG_IDS[bytes[offset+1]]);
    const label=item?`${item.name}${item.hemi?" · "+(item.hemi==="lh"?"lewa":"prawa")+" półkula":""}`:"Tkanka bez osobnej etykiety w spisie";
    const output=document.querySelector("#ortho-position");if(output)output.textContent=`${label} · R ${Math.round(world.x*40)} · A ${Math.round(-world.z*40)} · S ${Math.round(world.y*40)} mm`;
  }
  document.addEventListener("pointerdown",e=>{
    const canvas=e.target.closest("canvas[data-ortho]");if(!canvas||host.state.mode!=="dissection"||!data())return;
    const p=planes[canvas.dataset.ortho],rect=canvas.getBoundingClientRect(),size=data().meta.size;
    point[p.axes[0]]=Math.max(0,Math.min(size[p.axes[0]]-1,Math.floor((e.clientX-rect.left-canvas.clientLeft)/canvas.clientWidth*size[p.axes[0]])));
    point[p.axes[1]]=Math.max(0,Math.min(size[p.axes[1]]-1,Math.floor((e.clientY-rect.top-canvas.clientTop)/canvas.clientHeight*size[p.axes[1]])));
    for(let i=0;i<2;i++)if(p.signs[i]<0)point[p.axes[i]]=size[p.axes[i]]-1-point[p.axes[i]];
    follow(canvas.dataset.ortho);canvas.focus();
  });
  document.addEventListener("keydown",e=>{
    const canvas=e.target.closest("canvas[data-ortho]");if(!canvas||!data()||!e.key.startsWith("Arrow"))return;
    e.preventDefault();const p=planes[canvas.dataset.ortho],axis=e.key==="ArrowLeft"||e.key==="ArrowRight"?p.axes[0]:p.axes[1];point[axis]=Math.max(0,Math.min(data().meta.size[axis]-1,point[axis]+(["ArrowRight","ArrowDown"].includes(e.key)?1:-1)*p.signs[axis===p.axes[0]?0:1]));follow(canvas.dataset.ortho);
  });
  return {root,html,update(){
    root.visible=host.state.mode==="dissection";if(!root.visible)return;
    if(!data()) {host.volume.ensure();return;}
    if(!point)point=data().meta.size.map(n=>Math.floor(n/2));
    if(host.state.section!=="none")fromSlice();
    const next=[...point,host.state.sliceStyle,host.state.sliceContrast,!!document.querySelector("[data-ortho]")].join("|");
    const canvas=document.querySelector("[data-ortho]");
    if(next!==key || domCanvas!==canvas){key=next;domCanvas=canvas;draw();}
    toWorld();marker.position.copy(world);marker.position.x+=world.x<0?-host.state.renderSeparation:host.state.renderSeparation;
  }};
}
