export const METHOD_RANGES = {
  eeg: { name: "EEG", time: [1, 10], space: [10, 50], color: "#8ec8b0", invasive: "Nieinwazyjne", desc: "Potencjały na skórze głowy; dynamika ERP, rytmy i czas przetwarzania. Lokalizacja źródeł zależy od modelu i problemu odwrotnego." },
  meg: { name: "MEG", time: [1, 10], space: [3, 20], color: "#87b9dc", invasive: "Nieinwazyjne", desc: "Pola magnetyczne prądów neuronalnych. Dobra dynamika, kosztowna aparatura; rozwiązanie problemu odwrotnego pozostaje niejednoznaczne." },
  fmri: { name: "fMRI", time: [1000, 6000], space: [1, 4], color: "#d7b97d", invasive: "Nieinwazyjne bez promieniowania jonizującego", desc: "BOLD: pośredni sygnał hemodynamiczny. Mapowanie sieci i kontrastów zadań; opóźnienie naczyniowe, ruch, brak dowodu konieczności obszaru." },
  pet: { name: "PET", time: [10000, 300000], space: [3, 10], color: "#c29cce", invasive: "Dożylne podanie radioznacznika; promieniowanie", desc: "Metabolizm lub wiązanie zależne od radioznacznika. Niska rozdzielczość czasowa; obraz nie jest bezpośrednim zapisem wyładowań." },
  single: { name: "Neurony", time: [0.1, 1], space: [0.01, 0.1], color: "#eea18f", invasive: "Inwazyjne elektrody", desc: "Wyładowania pojedynczych komórek w lokalnym obszarze. Bardzo wysoka rozdzielczość, ograniczony zasięg i dostępność badania." },
  structural: { name: "sMRI / DWI", color: "#9dba9c", invasive: "Nieinwazyjne", desc: "Struktura i dyfuzja wody, typowo około 0,7–3 mm; akwizycja trwa minuty. Czas akwizycji nie jest rozdzielczością czasową aktywności. Traktografia jest estymacją, nie bezpośrednim pomiarem włókien." },
  tms: { name: "TMS", color: "#dfc8aa", invasive: "Nieinwazyjna stymulacja", desc: "Perturbacja korowa, impuls w skali milisekund, ognisko około 10–30 mm zależnie od cewki i anatomii. Metoda interwencyjna: nie ma jednej rozdzielczości pomiarowej. Efekty rozchodzą się po sieci." },
  lesion: { name: "Uszkodzenia", color: "#b1a9cd", invasive: "Obserwacja naturalnych zmian", desc: "Badanie zależności objaw–uszkodzenie pozwala wnioskować o konieczności struktur. Rozmiar i czas zmian są zmienne; diaschiza, reorganizacja i etiologia utrudniają lokalizację." },
};
const CASES = [
  ["Czy latencja N400 różni się między grupami osób dwujęzycznych?", "eeg", "ERP pozwala mierzyć latencję odpowiedzi na zdarzenie w milisekundach."],
  ["Które obszary odpowiadają silniej na twarze niż na przedmioty?", "fmri", "Kontrast BOLD porównuje warunki zadania z dobrą rozdzielczością przestrzenną; nie dowodzi konieczności obszaru."],
  ["Czy zaburzenie działania dostępnego obszaru korowego zmienia wykonanie zadania?", "tms", "Czasowa perturbacja TMS wspiera wnioskowanie przyczynowe, z odpowiednimi warunkami kontrolnymi."],
  ["Jak wygląda objętość hipokampa?", "structural", "Strukturalny MRI opisuje anatomię; BOLD nie zastępuje pomiaru objętości."],
  ["Gdzie wiąże się znakowany ligand receptorów dopaminowych?", "pet", "PET z dobranym ligandem bada rozmieszczenie i dostępność miejsc wiązania, zależnie od modelu kinetycznego."],
  ["Jakie wyładowania generuje pojedyncza komórka w doświadczeniu na zwierzęciu?", "single", "Rejestracja jednostkowa mierzy wyładowania komórki lokalnie; jest inwazyjna."],
  ["Które uszkodzenia współwystępują z utratą zdolności rozpoznawania twarzy?", "lesion", "Analiza uszkodzeń z kontrolą czynników zakłócających wiąże utratę funkcji z naruszeniem sieci."],
  ["Jak szybko zmieniają się korowe źródła rytmu po bodźcu w badaniu magnetycznym?", "meg", "MEG rejestruje dynamikę pól magnetycznych w milisekundach; lokalizacja wymaga modelowania."],
];
export function enhanceResearchLab(lab, host) {
  let comparison = false, selected = "eeg", question = 0, answer = null;
  const original = { enter: lab.enter, exit: lab.exit, update: lab.update, resetView: lab.resetView, clearSelection: lab.clearSelection };
  lab.resetView = () => { original.resetView({render:!comparison}); if(comparison)render(); };
  lab.clearSelection = () => { if(!comparison)original.clearSelection(); };
  function chart() {
    const x = n => 45 + (Math.log10(n) + 1) / 7 * 235, y = n => 220 - (Math.log10(n) + 2) / 4 * 190;
    return `<svg viewBox="0 0 320 260" role="img" aria-label="Rozdzielczość czasowa i przestrzenna, skale logarytmiczne">${[1,100,10000,1000000].map(n => `<path d="M${x(n)},25 V220" stroke="#3f5947"/><text x="${x(n)}" y="237" text-anchor="middle">${n >= 1000 ? n/1000 + " s" : n + " ms"}</text>`).join("")}${[.01,.1,1,10,100].map(n => `<path d="M45,${y(n)} H285" stroke="#3f5947"/><text x="40" y="${y(n)+4}" text-anchor="end">${n}</text>`).join("")}${Object.entries(METHOD_RANGES).filter(([,m])=>m.time).map(([key,m]) => `<g data-method-map="${key}" role="button" tabindex="0" aria-label="${m.name}"><rect x="${x(m.time[0])}" y="${y(m.space[1])}" width="${Math.max(12,x(m.time[1])-x(m.time[0]))}" height="${Math.max(15,y(m.space[0])-y(m.space[1]))}" fill="${m.color}" fill-opacity="${key === selected ? .8 : .35}" stroke="${m.color}"/><text x="${x(m.time[0])+3}" y="${y(m.space[1])+12}">${m.name}</text></g>`).join("")}<text x="165" y="256" text-anchor="middle">Czas · większa wartość = wolniejsze</text><text x="12" y="135" transform="rotate(-90 12 135)">Przestrzeń · mm</text></svg>`;
  }
  function render() {
    const m = METHOD_RANGES[selected], c = CASES[question];
    document.querySelector("#mode-panel").innerHTML = `<div class="research-panel"><span class="eyebrow">DOBÓR METOD</span><h2>Co można zmierzyć?</h2><div class="research-methods">${["mri","fmri","eeg","pet"].map(id=>`<button data-research-method="${id}">${id.toUpperCase()}</button>`).join("")}<button class="active" data-research-comparison>Mapa metod</button></div><div class="research-chart method-map">${chart()}</div><p class="lab-science-note">Orientacyjne zakresy typowych badań, nie granice sprzętu. Rozdzielczość źródła EEG/MEG zależy od rekonstrukcji. sMRI, TMS i uszkodzenia wymagają innego opisu czasu, dlatego pokazano je osobno.</p><div class="lab-tabs">${Object.entries(METHOD_RANGES).map(([id,v])=>`<button data-method-map="${id}" aria-pressed="${id===selected}" class="${id===selected?"active":""}">${v.name}</button>`).join("")}</div><article class="lab-stage"><h3>${m.name}</h3><p>${m.desc}</p><strong>${m.invasive}</strong></article><h3>Którą metodę wybrać?</h3><p>${question+1} / ${CASES.length} · ${c[0]}</p><div class="method-answers">${Object.entries(METHOD_RANGES).map(([id,v])=>`<button class="secondary-button" data-method-answer="${id}" ${answer ? "disabled" : ""}>${v.name}</button>`).join("")}</div>${answer ? `<p role="status">${answer===c[1]?"Trafny wybór.":`Lepszy wybór: ${METHOD_RANGES[c[1]].name}.`} ${c[2]}</p><button class="primary-button" data-method-next>Następny przypadek</button>`:""}<a class="source-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3694179/" target="_blank" rel="noopener">Źródło · rozdzielczość metod</a></div>`;
  }
  lab.enter = options => { original.enter(options); if (comparison) { lab.root.visible = false; render(); } };
  lab.exit = () => original.exit();
  lab.update = (dt,t) => { if (lab.state.active && comparison) { lab.root.visible = false; return; } original.update(dt,t); };
  document.addEventListener("click", event => {
    if (!lab.state.active) return;
    const b = event.target.closest("[data-research-comparison],[data-method-map],[data-method-answer],[data-method-next],[data-research-method]");
    if (!b) return;
    if (b.dataset.researchMethod) { comparison = false; lab.root.visible = true; document.querySelector(".research-hud").hidden = false; return; }
    if (b.hasAttribute("data-research-comparison")) { comparison = true; lab.root.visible = false; host.controls.autoRotate = false; lab.suspend(); }
    if (b.dataset.methodMap) selected = b.dataset.methodMap;
    if (b.dataset.methodAnswer) answer = b.dataset.methodAnswer;
    if (b.hasAttribute("data-method-next")) { question = (question+1)%CASES.length; answer = null; }
    render();
  });
  document.addEventListener("keydown", e => { if (lab.state.active && comparison && ["Enter"," "].includes(e.key) && e.target.matches("g[data-method-map]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click",{bubbles:true})); } });
  return lab;
}
