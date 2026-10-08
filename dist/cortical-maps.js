import * as THREE from "three";
export const NETWORKS = {
  dmn: { label: 7, name: "Domyślna · DMN", color: "#d7a58c", nodes: ["posteriorcingulate","precuneus","medialorbitofrontal","inferiorparietal"], desc: "Myślenie o sobie, pamięć autobiograficzna, wyobrażanie przyszłości. Dysfunkcja bywa opisywana m.in. w otępieniach i zaburzeniach nastroju; sama mapa nie rozpoznaje choroby." },
  salience: { label: 4, name: "Istotności / uwagi brzusznej · Yeo", color: "#bf94cd", nodes: ["insula","caudalanteriorcingulate"], desc: "Wykrywanie znaczenia bodźców, kontrola stanu zadania i przełączanie między sieciami. Yeo7 łączy część regionów istotności i uwagi brzusznej; te nazwy nie są całkowicie wymienne." },
  executive: { label: 6, name: "Czołowo-ciemieniowa wykonawcza", color: "#dfb675", nodes: ["rostralmiddlefrontal","caudalmiddlefrontal","inferiorparietal"], desc: "Elastyczna kontrola celu, pamięć robocza i dopasowanie reguł. Zmiany współpracy sieci mogą towarzyszyć różnym trudnościom wykonawczym, bez swoistości diagnostycznej." },
  dorsal: { label: 3, name: "Uwagi grzbietowej", color: "#7fc0a0", nodes: ["superiorparietal","caudalmiddlefrontal"], desc: "Kierowanie uwagi zgodnie z celem oraz orientowanie przestrzenne. Działa wspólnie z sieciami czuciowymi i kontrolnymi." },
  ventral: { label: 0, name: "Uwagi brzusznej · przybliżenie DK", color: "#ed9e8d", nodes: ["supramarginal","superiortemporal","parstriangularis"], desc: "Reorientacja na niespodziewany istotny bodziec, często z przewagą prawej półkuli. Ta osobna warstwa to schemat DK, ponieważ Yeo7 nie wydziela jej jako oddzielnej sieci." },
  motor: { label: 2, name: "Czuciowo-ruchowa", color: "#7ab8d5", nodes: ["precentral","postcentral","paracentral"], desc: "Ruch, informacje somatosensoryczne i integracja czuciowo-ruchowa. Węzły korowe nie wyczerpują pełnego obwodu z jądrami podstawy i móżdżkiem." },
  visual: { label: 1, name: "Wzrokowa", color: "#bc9fcb", nodes: ["pericalcarine","cuneus","lingual","lateraloccipital"], desc: "Przetwarzanie cech wzrokowych oraz współpraca szlaków percepcji i działania. Deficyty zależą od miejsca naruszenia i połączeń, nie od jednego koloru mapy." },
  limbic: { label: 5, name: "Limbiczna · Yeo", color: "#c7c28d", nodes: ["temporalpole","lateralorbitofrontal"], desc: "Orbitalne i przednie skroniowe obszary korowe związane z afektem i oceną. Korowa sieć Yeo nie jest pełnym układem limbicznym i nie zawiera segmentacji hipokampa ani ciała migdałowatego." },
};
export const BA_FIELDS = [
  ["1","#91bbd3","Kora somatosensoryczna · cechy dotyku"], ["2","#82b3c1","Integracja dotyku i propriocepcji"],
  ["3a","#b5c9df","Wejścia proprioceptywne"], ["3b","#93c0e3","Wejścia skórne"],
  ["4a","#d8a97f","Kora ruchowa · część przednia"], ["4p","#c49377","Kora ruchowa · część tylna"],
  ["6","#b7cd94","Obszary przedruchowe i dodatkowe ruchowe"], ["44","#d8a4be","Tylna część zakrętu czołowego dolnego; m.in. sieci języka i działania"],
  ["45","#b99ed0","Część trójkątna; m.in. kontrola przetwarzania językowego"],
];
export function createCorticalMaps(host) {
  const labels = new Map(), colors = { network: [new THREE.Color("#627b6b")], brodmann:[new THREE.Color("#627b6b")] };
  Object.values(NETWORKS).filter(n=>n.label).forEach(n=>colors.network[n.label]=new THREE.Color(n.color));
  BA_FIELDS.forEach((f,i)=>colors.brodmann[i+1]=new THREE.Color(f[1]));
  const state={ready:false,error:""};let pending;
  async function ensure() {
    if(pending)return pending;
    pending=Promise.all(host.surfaces().map(async s=>{
      const detail=s.positions.length/3>20000?"high":"low";
      const response=await fetch(new URL(`./assets/cortical-labels-${detail}-${s.info.hemi}.bin`,import.meta.url));
      if(!response.ok)throw Error("Nie udało się wczytać etykiet kory");
      const data=new Uint8Array(await response.arrayBuffer());
      if(data.length!==s.positions.length/3*2)throw Error("Etykiety nie pasują do siatki");
      labels.set(s.info.hemi,data);
    })).then(()=>{state.ready=true;}).catch(e=>{state.error=e.message;pending=null;});
    return pending;
  }
  function label(hemi,vertex,division) { return labels.get(hemi)?.[vertex*2+(division==="brodmann"?1:0)] || 0; }
  function color(hemi,vertex,division,selected=0) { const id=label(hemi,vertex,division);return colors[division]?.[selected && id!==selected?0:id] || colors.network[0]; }
  return { state, labels, ensure, label, color };
}
