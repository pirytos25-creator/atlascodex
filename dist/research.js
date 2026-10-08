import * as THREE from "three";
import { createWorldAnnotations } from "./world-annotations.js";
const $ = (s) => document.querySelector(s),
  V = (a) => new THREE.Vector3(...a);
const METHODS = {
  mri: {
    title: "MRI · rezonans strukturalny",
    signal: "Magnetyzacja protonów i relaksacja",
    desc: "Pole B₀, impuls RF i gradienty pozwalają zakodować sygnał z tkanek. Rekonstrukcja tworzy obraz zależny od sekwencji i właściwości T₁ / T₂.",
    limit:
      "MRI pokazuje strukturę. Jasność tkanki zależy od sekwencji; nie jest mapą aktywności neuronów.",
    source:
      "https://www.nibib.nih.gov/science-education/science-topics/magnetic-resonance-imaging-mri",
    stages: [
      "Magnetyzacja w polu B₀",
      "Impuls RF — wychylenie magnetyzacji",
      "Relaksacja i odbiór sygnału",
      "Gradienty — kodowanie przestrzenne",
      "Rekonstrukcja obrazu warstwy",
    ],
  },
  fmri: {
    title: "fMRI · odpowiedź BOLD",
    signal: "Pośredni sygnał hemodynamiczny",
    desc: "Zmiana stosunku oksyhemoglobiny i deoksyhemoglobiny wpływa na sygnał MRI. Odpowiedź naczyniowa jest opóźniona wobec zdarzenia neuronalnego.",
    limit:
      "BOLD nie jest zapisem pojedynczych impulsów. Ruch, naczynia i analiza statystyczna wpływają na mapę; sama aktywacja nie dowodzi konieczności obszaru dla funkcji.",
    source: "https://www.ncbi.nlm.nih.gov/books/NBK538909/",
    stages: [
      "Krótki bodziec / zadanie",
      "Aktywność neuronalna — schemat",
      "Odpowiedź naczyniowa i wzrost BOLD",
      "Szczyt odpowiedzi hemodynamicznej",
      "Powrót i poglądowe podbicie ujemne",
    ],
  },
  eeg: {
    title: "EEG · elektroencefalografia",
    signal: "Różnice potencjałów na skórze głowy",
    desc: "Elektrody rejestrują sumaryczne pole elektryczne wielu zsynchronizowanych komórek. Istotnym źródłem są prądy postsynaptyczne w korze.",
    limit:
      "Dobra rozdzielczość czasowa nie oznacza dokładnej lokalizacji źródła. Przewodnictwo objętościowe, odniesienie i artefakty zmieniają zapis.",
    source:
      "https://www.ninds.nih.gov/health-information/disorders/neurological-diagnostic-tests-and-procedures",
    stages: [
      "Aktywność populacji korowej",
      "Przewodnictwo przez tkanki głowy",
      "Elektrody i pomiar różnic napięcia",
      "Wzmacnianie i zapis wielokanałowy",
      "Analiza rytmów i kontekstu zadania",
    ],
  },
  pet: {
    title: "PET · emisja pozytonowa",
    signal: "Rozmieszczenie radioznacznika",
    desc: "Pozyton z rozpadu znacznika anihiluje z elektronem. Para fotonów gamma jest rejestrowana przez detektory; koincydencje wyznaczają linie odpowiedzi.",
    limit:
      "Interpretacja zależy od znacznika. FDG obrazuje procesy związane z wykorzystaniem glukozy; mapa PET nie jest bezpośrednim zapisem wyładowań.",
    source:
      "https://www.nibib.nih.gov/science-education/science-topics/nuclear-medicine",
    stages: [
      "Rozmieszczenie znacznika — schemat",
      "Rozpad i emisja pozytonu",
      "Anihilacja — para fotonów γ",
      "Detekcja koincydencji",
      "Rekonstrukcja rozmieszczenia znacznika",
    ],
  },
};
export function createResearchLab(host) {
  const { scene, controls, camera } = host,
    state = {
      active: false,
      method: "mri",
      playing: true,
      speed: 1,
      time: 0,
      scan: 0.5,
      autoScan: true,
      contrast: 1,
      equipment: 0.6,
      orbit: false,
      signal: 1,
      channel: 2,
      task: "motor",
      probe: true,
      equipmentNote: "",
      structure: null,
    },
    root = new THREE.Group();
  root.visible = false;
  root.name = "Laboratorium badań";
  scene.add(root);
  const scanner = new THREE.Group(),
    eeg = new THREE.Group(),
    pet = new THREE.Group(),
    activity = new THREE.Group();
  root.add(scanner, eeg, pet, activity);
  const material = (color, opacity = 1) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0.12,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity === 1,
      emissive: color,
      emissiveIntensity: 0.05,
    });
  const coils = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.65, 0.095, 12, 96),
      material("#92aaa3", 0.52),
    );
    ring.position.z = -1.7 + i * 1.05;
    scanner.add(ring);
    coils.push(ring);
  }
  const fieldPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 6.5),
    new THREE.MeshBasicMaterial({
      color: "#b1e1cb",
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  fieldPlane.rotation.x = Math.PI / 2;
  fieldPlane.name = "MRI scan plane";
  scanner.add(fieldPlane);
  const spinArrows = [];
  for (let i = 0; i < 28; i++) {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      V([((i % 7) - 3) * 0.65, (Math.floor(i / 7) - 1.5) * 0.9, 0]),
      0.34,
      0x9bbcad,
      0.1,
      0.07,
    );
    arrow.line.material.transparent = arrow.cone.material.transparent = true;
    arrow.line.material.opacity = arrow.cone.material.opacity = 0.48;
    scanner.add(arrow);
    spinArrows.push(arrow);
  }
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(2.35, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshBasicMaterial({
      color: "#9aaea1",
      wireframe: true,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
  );
  cap.scale.set(1, 1.13, 1.31);
  cap.position.set(0, -0.12, 0.12);
  eeg.add(cap);
  const electrodeNames = [
      "Fp1",
      "Fp2",
      "F3",
      "F4",
      "C3",
      "C4",
      "P3",
      "P4",
      "O1",
      "O2",
      "Cz",
      "Fz",
    ],
    electrodes = [];
  const positions = [
    [-0.85, 1.55, -2.05],
    [0.85, 1.55, -2.05],
    [-1.2, 2.1, -1.35],
    [1.2, 2.1, -1.35],
    [-1.6, 2.15, 0.05],
    [1.6, 2.15, 0.05],
    [-1.2, 1.85, 1.65],
    [1.2, 1.85, 1.65],
    [-0.8, 1, 2.55],
    [0.8, 1, 2.55],
    [0, 2.55, 0.12],
    [0, 2.4, -1.1],
  ];
  for (let i = 0; i < positions.length; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      material("#c4d9c7"),
    );
    mesh.position.set(...positions[i]);
    eeg.add(mesh);
    electrodes.push(mesh);
    const wirePoints = [
      V(positions[i]),
      V([
        positions[i][0] * 1.15,
        positions[i][1] + 0.25,
        positions[i][2] + 0.2,
      ]),
      V([2.7, 2.4, 2.7]),
    ];
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(wirePoints),
        20,
        0.008,
        4,
        false,
      ),
      material("#708978", 0.42),
    );
    eeg.add(wire);
  }
  const detectors = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.22, 0.65),
        material("#aeb5a5"),
      );
    mesh.position.set(Math.cos(a) * 3.7, Math.sin(a) * 3.7, 0.05);
    mesh.rotation.z = a;
    pet.add(mesh);
    detectors.push(mesh);
  }
  const events = [];
  for (let i = 0; i < 8; i++) {
    const photons = [0, 1].map(() => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 9),
        new THREE.MeshBasicMaterial({ color: "#e5c38b", toneMapped: false }),
      );
      pet.add(m);
      return m;
    });
    const a = i * 1.13,
      points = [
        V([Math.cos(a) * 3.7, Math.sin(a) * 3.7, 0.05]),
        V([-Math.cos(a) * 3.7, -Math.sin(a) * 3.7, 0.05]),
      ],
      line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: "#bcaa88",
          transparent: true,
          opacity: 0.0,
        }),
      );
    pet.add(line);
    events.push({ photons, line, a });
  }
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(4.12, 4.12, 5.1, 64, 1, true),
    material("#65756e", 0.23),
  );
  housing.rotation.x = Math.PI / 2;
  scanner.add(housing);
  for (const z of [-2.55, 2.55]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(4.12, 0.24, 16, 96),
      material("#a6b6aa", 0.5),
    );
    rim.position.z = z;
    scanner.add(rim);
  }
  const probeTexture = new THREE.DataTexture(
    new Uint8Array(256 * 256 * 4),
    256,
    256,
    THREE.RGBAFormat,
  );
  probeTexture.minFilter = probeTexture.magFilter = THREE.LinearFilter;
  probeTexture.colorSpace = THREE.SRGBColorSpace;
  const probeGeometry = new THREE.PlaneGeometry(6.4, 6.4),
    uv = probeGeometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i));
  const probe = new THREE.Mesh(
    probeGeometry,
    new THREE.MeshBasicMaterial({
      map: probeTexture,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  probe.rotation.x = -Math.PI / 2;
  probe.name = "MRI image plane";
  scanner.add(probe);
  const pins = createWorldAnnotations({
    ...host,
    onSelect: (item) => {
      cameraPreset(item.preset);
      state.equipmentNote = item.name;
      renderPanel();
      host.revealPanel(".lab-stage");
    },
  });
  function equipmentPins() {
    pins.set(
      state.method === "eeg"
        ? [
            {
              name: "Elektroda " + electrodeNames[state.channel],
              point: positions[state.channel],
              preset: "signal",
            },
            {
              name: "Wzmacniacz / przewody",
              point: [2.7, 2.4, 2.7],
              preset: "signal",
            },
          ]
        : state.method === "pet"
          ? [
              {
                name: "Detektory koincydencji",
                point: [3.7, 0, 0.05],
                preset: "signal",
              },
              {
                name: "Linia odpowiedzi",
                point: [0, 1, 0.05],
                preset: "inside",
              },
            ]
          : [
              { name: "Cewka RF", point: [2.8, 1.2, -1.7], preset: "signal" },
              {
                name:
                  state.method === "fmri" ? "Próbkowanie BOLD" : "Warstwa MRI",
                point: () => probe.position.clone(),
                preset: "slice",
              },
            ],
    );
  }
  function cameraPreset(name) {
    state.orbit = false;
    controls.autoRotate = false;
    const poses = {
      overview: [
        [-7, 4, -12],
        [0, 0.1, 0],
      ],
      inside: [
        [0, 0.5, 4.6],
        [0, 0.1, 0],
      ],
      slice: [
        [0.01, 10.5, 0.1],
        [0, 0, 0],
      ],
      signal:
        state.method === "eeg"
          ? [[-3, 5, -2], positions[state.channel]]
          : state.method === "pet"
            ? [
                [6, 2, 4],
                [2.7, 0, 0],
              ]
            : [
                [5, 2, -4],
                [2.2, 0, -1.1],
              ],
    };
    const [position, target] = poses[name] || poses.overview;
    moveCamera(position, target);
  }
  function moveCamera(position, target) {
    const aim = V(target);
    const aspect =
      host.canvasHost.clientWidth / Math.max(1, host.canvasHost.clientHeight);
    const eye = V(position)
      .sub(aim)
      .multiplyScalar(Math.max(1, 1.15 / aspect))
      .add(aim);
    host.moveCamera(eye, aim);
  }
  controls.addEventListener("start", () => {
    if (state.active) {
      state.orbit = false;
      controls.autoRotate = false;
    }
  });
  const overlays = [];
  let previous,
    lastUi = -1;
  let imageCache;
  const hud = document.createElement("div");
  hud.className = "research-hud";
  hud.hidden = true;
  $("#viewport").append(hud);
  function addOverlay(id, color) {
    const item = host.registry.get(id);
    if (!item) return;
    const s = host.surfaces().find((s) => s.info.hemi === item.hemi);
    if (!s) return;
    const indices = [];
    for (let j = 0; j < s.indices.length; j += 3) {
      const f = [s.indices[j], s.indices[j + 1], s.indices[j + 2]];
      if (f.filter((i) => s.labels[i] === item.index).length >= 2)
        indices.push(...f);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(s.positions, 3));
    g.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        s.mesh.geometry.getAttribute("normal").array,
        3,
      ),
    );
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    const m = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.15,
        roughness: 0.63,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        side: THREE.DoubleSide,
      }),
    );
    activity.add(m);
    overlays.push(m);
  }
  function ensureOverlays() {
    if (overlays.length) return;
    for (const [id, c] of [
      ["lh-precentral", "#d89968"],
      ["lh-paracentral", "#d6aa70"],
      ["rh-superiorparietal", "#bb9865"],
      ["lh-superiortemporal", "#bb9a68"],
    ])
      addOverlay(id, c);
  }
  function setMethod(method, { reset = true } = {}) {
    state.equipmentNote = "";
    state.structure = null;
    if (!METHODS[method]) return;
    state.method = method;
    if (reset) state.time = 0;
    scanner.visible = ["mri", "fmri"].includes(method);
    eeg.visible = method === "eeg";
    pet.visible = method === "pet";
    activity.visible = ["fmri", "pet"].includes(method);
    ensureOverlays();
    if (method === "mri") host.volume.ensure();
    moveCamera(method === "eeg" ? [-6, 5, 6] : [-7, 4, -12], [0, 0.05, 0.1]);
    controls.minDistance = 0.3;
    equipmentPins();
    host.setOpacity(method === "mri" && state.probe ? 0.72 : 0);
    renderPanel();
    lastUi = -1;
  }
  function enter() {
    state.active = true;
    previous = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      left: host.state.left,
      right: host.state.right,
      deep: host.state.deep,
      tracts: host.state.tracts,
      section: host.state.section,
      slice: host.state.slice,
      separation: host.state.separation,
      opacity: host.state.opacity,
    };
    Object.assign(host.state, {
      left: true,
      right: true,
      deep: false,
      tracts: false,
      section: "none",
      separation: 0,
      renderSeparation: 0,
    });
    host.setOpacity(0);
    root.visible = true;
    hud.hidden = false;
    $(".controls").inert = true;
    $(".viewport-title>div").innerHTML = "Badania mózgu <span>3D</span>";
    setMethod(state.method, { reset: false });
  }
  function exit() {
    state.active = false;
    root.visible = false;
    pins.hide();
    controls.autoRotate = false;
    hud.hidden = true;
    $(".controls").inert = false;
    $(".viewport-title>div").innerHTML = "Mózg człowieka <span>3D</span>";
    if (previous) {
      Object.assign(host.state, {
        left: previous.left,
        right: previous.right,
        deep: previous.deep,
        tracts: previous.tracts,
        section: previous.section,
        slice: previous.slice,
        separation: previous.separation,
      });
      host.setOpacity(previous.opacity);
      host.moveCamera(previous.position, previous.target);
    }
    host.updateVisibility();
  }
  function renderPanel() {
    const method = METHODS[state.method];
    $("#mode-panel").innerHTML =
      `<div class="research-panel"><span class="eyebrow">LABORATORIUM METOD</span><h2>Jak badamy mózg<span class="accent">?</span></h2><div class="research-methods">${Object.entries(
        METHODS,
      )
        .map(
          ([id, m]) =>
            `<button data-research-method="${id}" class="${id === state.method ? "active" : ""}" aria-pressed="${id === state.method}">${id === "fmri" ? "fMRI" : id.toUpperCase()}</button>`,
        )
        .join(
          "",
        )}<button data-research-comparison>Mapa metod</button></div><h3>${method.title}</h3>${state.structure ? `<article class="lab-stage research-anatomy"><span class="eyebrow">WYBRANA STRUKTURA</span><h3>${state.structure.name}</h3><p>${state.structure.anatomy}</p><button class="source-link" data-research-structure-more>Pełny opis struktury</button></article>` : ""}${state.equipmentNote ? `<div class="lab-stage"><span class="eyebrow">WYBRANA APARATURA</span><strong>${state.equipmentNote}</strong></div>` : ""}<p>${method.desc}</p><div class="research-signal"><span class="eyebrow">CO REJESTRUJEMY</span><strong>${method.signal}</strong></div><div id="research-chart" class="research-chart" aria-label="Poglądowa animacja sygnału badania">${state.method === "mri" ? '<canvas id="research-mri" width="256" height="256" aria-label="Rzeczywista warstwa MRI szablonu fsaverage"></canvas><output id="research-layer-meta" class="research-caption"></output>' : ""}</div><div class="research-stage"><span class="eyebrow">AKTUALNY ETAP</span><strong id="research-stage-title"></strong><p id="research-stage-copy"></p></div><div class="mode-actions"><button class="primary-button" data-research-play>${state.playing ? "Pauza" : "Odtwarzaj"}</button><button class="secondary-button" data-research-reset>Od początku</button></div><label class="lab-field">Tempo ilustracji<input id="research-speed" type="range" min=".25" max="2" step=".25" value="${state.speed}" aria-label="Tempo animacji badania"></label><label class="lab-field">Przebieg badania <output id="research-position"></output><input id="research-seek" type="range" min="0" max="1000" value="${Math.round(((state.time % (state.method === "fmri" ? 24 : 20)) / (state.method === "fmri" ? 24 : 20)) * 1000)}" aria-label="Przewiń animację badania"></label><div class="mode-actions"><button class="secondary-button" data-research-step="-1">Poprzedni etap</button><button class="secondary-button" data-research-step="1">Następny etap</button></div><div class="research-camera-grid"><button data-research-camera="overview">Całe badanie</button><button data-research-camera="inside">Wewnątrz</button><button data-research-camera="signal">Przy aparaturze</button><button data-research-camera="slice">Z góry / warstwa</button></div><button class="secondary-button" data-research-orbit aria-pressed="${state.orbit}">${state.orbit ? "Zatrzymaj orbitę" : "Powolna orbita"}</button>${state.method === "mri" ? `<div class="research-console"><button class="secondary-button" data-research-probe aria-pressed="${state.probe}">${state.probe ? "Ukryj warstwę 3D" : "Pokaż warstwę 3D"}</button><label class="lab-field">Położenie warstwy<input id="research-slice" type="range" min="15" max="85" value="${state.scan * 100}" aria-label="Położenie warstwy MRI"></label><button class="source-link" data-research-scan>${state.autoScan ? "Zatrzymaj skanowanie warstw" : "Automatyczne skanowanie"}</button><label class="lab-field">Kontrast obrazu MRI<input id="research-contrast" type="range" min=".6" max="1.8" step=".05" value="${state.contrast}" aria-label="Kontrast badania MRI"></label></div>` : state.method === "fmri" ? `<label class="lab-field">Przykładowe zadanie<select id="research-task"><option value="motor" ${state.task === "motor" ? "selected" : ""}>Ruch · kora okołocentralna</option><option value="attention" ${state.task === "attention" ? "selected" : ""}>Uwaga przestrzenna · ciemieniowa</option><option value="auditory" ${state.task === "auditory" ? "selected" : ""}>Dźwięk · skroniowa</option></select></label><p class="research-caption">Wyróżnione parcele są przykładem dydaktycznym, a nie kompletną mapą sieci zadania.</p>` : state.method === "eeg" ? `<label class="lab-field">Wybrana elektroda<select id="research-electrode">${electrodeNames.map((n, i) => `<option value="${i}" ${state.channel === i ? "selected" : ""}>${n}</option>`).join("")}</select></label>` : ""}<label class="lab-field">Widoczność aparatury<input id="research-equipment" type="range" min="15" max="100" value="${state.equipment * 100}" aria-label="Widoczność aparatury badania"></label>${state.method !== "mri" ? `<label class="lab-field">Siła sygnału demonstracji<input id="research-signal" type="range" min="40" max="160" value="${state.signal * 100}" aria-label="Siła syntetycznego sygnału"></label>` : ""}<p class="research-limit">${method.limit}</p><button class="source-link" data-research-info>Metoda, ograniczenia i źródło</button><p class="research-caption">Anatomia: fsaverage. Przebiegi EEG, BOLD, PET, urządzenia i pozycje elektrod są schematami. Podgląd MRI pochodzi z danych szablonu.</p></div>`;
  }
  function inspect(id) {
    state.structure = host.registry.get(id) || null;
    renderPanel();
    host.revealPanel(".research-anatomy");
  }
  function bold(t) {
    const gamma = (x, a) => (x > 0 ? Math.pow(x / a, a) * Math.exp(a - x) : 0);
    return gamma(t - 1, 5) - 0.18 * gamma(t - 1, 13);
  }
  function chart() {
    const elapsed = state.time,
      method = state.method;
    if (method === "mri") return;
    if (method === "fmri") {
      const points = Array.from({ length: 180 }, (_, i) => {
          const t = (i / 179) * 24;
          return `${(i / 179) * 280},${100 - bold(t) * 67 * state.signal}`;
        }).join(" "),
        x = ((elapsed % 24) / 24) * 280;
      $("#research-chart").innerHTML =
        `<svg viewBox="0 0 280 140" role="img" aria-label="Schemat opóźnionej odpowiedzi BOLD"><path d="M0 100H280" stroke="#405e4b"/><rect x="12" y="18" width="23" height="82" fill="#afd7bd" opacity=".10"/><polyline points="${points}" fill="none" stroke="#d8ab78" stroke-width="2"/><path d="M${x} 15V120" stroke="#b8efc7" stroke-width="1"/><text x="5" y="135">0</text><text x="233" y="135">24 s*</text><text x="9" y="12">Zadanie → BOLD (opóźnienie)</text></svg>`;
    }
    if (method === "eeg") {
      const paths = Array.from({ length: 6 }, (_, channel) => {
        const electrode =
          channel === 0
            ? state.channel
            : Array.from({ length: 12 }, (_, i) => i).filter(
                (i) => i !== state.channel,
              )[channel - 1];
        const points = Array.from({ length: 260 }, (_, i) => {
          const t = elapsed - 4 + (i / 259) * 4,
            value =
              Math.sin(t * 2 * Math.PI * 10 + electrode * 0.6) *
                7 *
                state.signal +
              Math.sin(t * 2 * Math.PI * 3 + electrode) * 2 +
              Math.sin(t * 2 * Math.PI * 22) * 1.6;
          return `${26 + (i / 259) * 254},${23 + channel * 27 + value}`;
        }).join(" ");
        return `<text x="0" y="${26 + channel * 27}">${electrodeNames[electrode]}</text><polyline points="${points}" fill="none" stroke="${channel === 0 ? "#e9d6ac" : "#96b6ca"}" stroke-width="${channel === 0 ? 2 : 1}"/>`;
      }).join("");
      $("#research-chart").innerHTML =
        `<svg viewBox="0 0 280 185" role="img" aria-label="Syntetyczny zapis EEG, okno czterech sekund">${paths}<text x="210" y="182">4 s*</text></svg>`;
    }
    if (method === "pet") {
      const n = Math.floor(((elapsed % 20) / 20) * 240 * state.signal);
      $("#research-chart").innerHTML =
        `<div class="research-count">${n}<small>koincydencji · schemat</small></div><div class="research-count-track"><span style="width:${Math.min(100, (n / 240) * 100)}%"></span></div><p class="research-mini">2 fotony γ → linia odpowiedzi → obraz znacznika</p>`;
    }
  }
  function image() {
    const canvas = $("#research-mri"),
      data = host.volume.getData();
    if (canvas && !data && canvas.dataset.waiting !== "1") {
      // Volume arrives asynchronously; say so instead of showing an empty frame.
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = "#b8efc7";
      ctx.font = "14px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Wczytywanie danych MRI…", 128, 132);
      canvas.dataset.waiting = "1";
      const readout = $("#research-layer-meta");
      if (readout) readout.textContent = "Pobieranie wolumenu szablonu…";
    }
    if (!canvas || !data) return;
    const { bytes, meta } = data,
      [nx, ny, nz] = meta.size,
      ctx = canvas.getContext("2d"),
      slice = Math.max(0, Math.min(ny - 1, Math.round(state.scan * (ny - 1))));
    const key = `${slice}|${state.contrast}|${ny}`;
    const changed = imageCache?.key !== key;
    const frame = changed ? ctx.createImageData(256, 256) : imageCache.frame;
    if (changed) {
      for (let row = 0; row < 256; row++)
        for (let col = 0; col < 256; col++) {
          const x = Math.min(nx - 1, Math.floor((col / 256) * nx)),
            z = Math.max(0, nz - 1 - Math.floor((row / 256) * nz)),
            i = 4 * (x + nx * (slice + ny * z)),
            j = 4 * (col + row * 256),
            tone = Math.round(
              Math.pow(
                Math.max(
                  0,
                  Math.min(1, (bytes[i] / 255 - 0.5) * state.contrast + 0.5),
                ),
                0.85,
              ) * 255,
            );
          frame.data[j] = frame.data[j + 1] = frame.data[j + 2] = tone;
          frame.data[j + 3] = bytes[i + 3] ? 255 : 0;
        }
      probeTexture.image.data.set(frame.data);
      probeTexture.needsUpdate = true;
    }
    const transform = new THREE.Matrix4()
      .set(...meta.worldToVoxel.flat())
      .invert();
    probe.position.copy(V([nx / 2, slice, nz / 2]).applyMatrix4(transform));
    fieldPlane.position.copy(probe.position);
    // One frame snapshot feeds the bitmap, texture, scanner plane and readout.
    state.mriFrame = { slice, time: state.time % 20, contrast: state.contrast };
    probe.userData.mriFrame = fieldPlane.userData.mriFrame = state.mriFrame;
    canvas.dataset.slice = String(slice);
    canvas.dataset.time = state.mriFrame.time.toFixed(3);
    const readout = $("#research-layer-meta");
    if (readout)
      readout.textContent = `Warstwa ${slice + 1}/${ny} · ${state.mriFrame.time.toFixed(1)} s`;
    if (!changed && imageCache.canvas === canvas) return;
    imageCache = { key, frame, canvas };
    ctx.putImageData(frame, 0, 0);
    ctx.font = "13px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "start";
    ctx.fillStyle = "#b8efc7";
    ctx.fillText("R", 8, 18);
    ctx.fillText("L", 238, 18);
    ctx.fillText("A", 122, 15);
    ctx.fillText("P", 122, 246);
  }
  function update(dt, t) {
    if (!state.active) return;
    if (state.playing) state.time += dt * state.speed;
    const period = state.method === "fmri" ? 24 : 20,
      p = (state.time % period) / period;
    if (state.method === "mri") {
      if (state.autoScan) state.scan = 0.5 + Math.sin(p * Math.PI * 2) * 0.22;
      image();
    }
    probe.visible = state.method === "mri" && state.probe;
    controls.autoRotate = state.orbit && !host.state.fly;
    controls.autoRotateSpeed = 0.35;
    pins.update(true, host.state.labels);
    housing.material.opacity = state.equipment * 0.38;
    coils.forEach((m) => (m.material.opacity = state.equipment * 0.9));
    for (const m of [...detectors, ...eeg.children.filter((o) => o.isMesh)]) {
      if (!m.material.transparent) {
        m.material.transparent = true;
        m.material.depthWrite = false;
        m.material.needsUpdate = true;
      }
      m.material.opacity = state.equipment * (m === cap ? 0.12 : 1);
    }
    coils.forEach(
      (m, i) =>
        (m.material.emissiveIntensity =
          0.05 + Math.pow(Math.sin(state.time * 1.4 - i * 0.7), 4) * 0.1),
    );
    spinArrows.forEach((a, i) => {
      const rf =
        p > 0.15 && p < 0.4 ? Math.sin(((p - 0.15) / 0.25) * Math.PI) * 0.8 : 0;
      a.setDirection(
        V([
          Math.sin(state.time * 3 + i) * rf,
          Math.cos(state.time * 3 + i) * rf,
          1 - rf,
        ]).normalize(),
      );
    });
    overlays.forEach((m, i) => {
      m.visible =
        state.method !== "fmri" ||
        (state.task === "motor"
          ? i < 2
          : state.task === "attention"
            ? i === 2
            : i === 3);
      const level =
        state.method === "fmri"
          ? Math.max(0, bold(state.time % 24) * state.signal)
          : Math.max(0, Math.sin(p * Math.PI));
      m.material.opacity = level * (i < 2 ? 0.48 : 0.24);
      m.material.emissiveIntensity = 0.12 + level * 0.2;
    });
    electrodes.forEach(
      (m, i) =>
        (m.material.emissiveIntensity =
          i === state.channel
            ? 0.5
            : 0.1 + 0.06 * Math.sin(state.time * 1.7 + i)),
    );
    detectors.forEach((m) => (m.material.emissiveIntensity = 0.06));
    events.forEach((e, i) => {
      const q = (state.time * 0.65 + i * 0.13) % 1,
        r = 3.7 * Math.min(1, q * 1.6);
      e.photons.forEach((m, j) => {
        m.visible = q < 0.65;
        m.position.set(
          Math.cos(e.a) * r * (j ? -1 : 1),
          Math.sin(e.a) * r * (j ? -1 : 1),
          0.05,
        );
      });
      e.line.material.opacity = q > 0.55 && q < 0.8 ? 0.22 : 0;
      if (q > 0.59 && q < 0.7) {
        detectors[
          Math.floor(((e.a % (Math.PI * 2)) / (Math.PI * 2)) * 32)
        ].material.emissiveIntensity = 0.8;
      }
    });
    if (t - lastUi > 140) {
      const method = METHODS[state.method],
        step =
          state.method === "fmri"
            ? state.time % 24 < 1
              ? 0
              : state.time % 24 < 3
                ? 1
                : state.time % 24 < 6
                  ? 2
                  : state.time % 24 < 9
                    ? 3
                    : 4
            : Math.min(4, Math.floor(p * 5));
      $("#research-stage-title").textContent = method.stages[step];
      $("#research-stage-copy").textContent =
        state.method === "mri"
          ? "Obraz 2D i warstwa w scenie 3D przedstawiają ten sam przekrój MRI szablonu. Numer warstwy i czas są wspólne; cykl badania jest poglądowy."
          : state.method === "fmri"
            ? `Przykład zadania ${state.task === "motor" ? "ruchowego" : state.task === "attention" ? "uwagi przestrzennej" : "słuchowego"} i opóźnionego BOLD. Kolor obejmuje parcelę atlasu, a nie zmierzoną mapę pacjenta.`
            : state.method === "eeg"
              ? "Fale są generowane dla ilustracji. Rozkład elektrod i skóry głowy jest orientacyjny."
              : "Animacja detekcji par fotonów. Zliczenia i rozmieszczenie znacznika są umowne.";
      hud.innerHTML = `<span class="eyebrow">${state.method.toUpperCase()}</span><strong>${Math.round(p * 100)}<small>% cyklu</small></strong><span>${method.stages[step]}</span>`;
      chart();
      const seek = $("#research-seek");
      if (seek && document.activeElement !== seek)
        seek.value = Math.round(p * 1000);
      const scanInput = $("#research-slice"),
        scanButton = $("[data-research-scan]");
      if (scanInput && document.activeElement !== scanInput)
        scanInput.value = state.scan * 100;
      if (scanButton)
        scanButton.textContent = state.autoScan
          ? "Zatrzymaj skanowanie warstw"
          : "Automatyczne skanowanie";
      $("#research-position").textContent =
        (state.time % period).toFixed(1) + " s · schemat";
      lastUi = t;
    }
  }
  document.addEventListener("click", (e) => {
    if (!state.active) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.researchMethod) setMethod(b.dataset.researchMethod);
    if (b.dataset.researchCamera) cameraPreset(b.dataset.researchCamera);
    if (b.hasAttribute("data-research-structure-more") && state.structure)
      host.describe(state.structure.id);
    if (b.hasAttribute("data-research-orbit")) {
      state.orbit = !state.orbit;
      controls.autoRotate = state.orbit;
      renderPanel();
    }
    if (b.hasAttribute("data-research-probe")) {
      state.probe = !state.probe;
      host.setOpacity(state.probe ? 0.72 : 0);
      renderPanel();
    }
    if (b.hasAttribute("data-research-scan")) {
      state.autoScan = !state.autoScan;
      renderPanel();
    }
    if (b.dataset.researchStep) {
      const steps =
          state.method === "fmri"
            ? [0, 1, 3, 6, 9, 23.8]
            : [0, 4, 8, 12, 16, 19.8],
        period = state.method === "fmri" ? 24 : 20,
        current = state.time % period,
        dir = +b.dataset.researchStep;
      state.time =
        dir > 0
          ? (steps.find((t) => t > current + 0.1) ?? steps[0])
          : ([...steps].reverse().find((t) => t < current - 0.1) ??
            steps.at(-1));
      state.playing = false;
      renderPanel();
      lastUi = -1;
    }
    if (b.hasAttribute("data-research-play")) {
      state.playing = !state.playing;
      renderPanel();
      lastUi = -1;
    }
    if (b.hasAttribute("data-research-reset")) {
      state.time = 0;
      state.playing = true;
      const play = $("[data-research-play]");
      if (play) play.textContent = "Pauza";
      if (state.method === "mri") {
        state.autoScan = true;
        state.scan = 0.5;
      }
      lastUi = -1;
    }
    if (b.hasAttribute("data-research-info")) {
      const m = METHODS[state.method];
      host.openDialog(
        "BADANIA · " + state.method.toUpperCase(),
        `<h2>${m.title}</h2><p>${m.desc}</p><h3>Co z tego wynika?</h3><p>${m.limit}</p><p>Anatomia pochodzi z fsaverage. Sygnały funkcjonalne, urządzenia, elektrofizjologia i radioznacznik są poglądowe; nie są badaniami pacjenta. Sekundy na wykresach oznaczają umowną oś ilustracji. Rozmiary urządzeń nie zachowują skali klinicznej.</p><a href="${m.source}" target="_blank" rel="noopener">Źródło: NIH / NCBI</a>`,
      );
    }
  });
  document.addEventListener("input", (e) => {
    if (!state.active) return;
    const id = e.target.id,
      value = +e.target.value;
    if (id === "research-speed") state.speed = value;
    if (id === "research-seek") {
      state.time = (value / 1000) * (state.method === "fmri" ? 24 : 20);
      state.playing = false;
      lastUi = -1;
      $("[data-research-play]").textContent = "Odtwarzaj";
    }
    if (id === "research-slice") {
      state.autoScan = false;
      state.scan = value / 100;
    }
    if (id === "research-contrast") {
      state.contrast = value;
    }
    if (id === "research-equipment") state.equipment = value / 100;
    if (id === "research-signal") state.signal = value / 100;
  });
  document.addEventListener("change", (e) => {
    if (!state.active) return;
    if (e.target.id === "research-task") {
      state.task = e.target.value;
      lastUi = -1;
    }
    if (e.target.id === "research-electrode") {
      state.channel = +e.target.value;
      equipmentPins();
      lastUi = -1;
    }
  });
  return { root, state, enter, exit, update, inspect,
    clearSelection() { state.orbit = false; state.structure = null; state.equipmentNote = null; renderPanel(); },
    resetView({ render = true } = {}) { state.structure = null; state.equipmentNote = null; cameraPreset("overview"); if(render)renderPanel(); },
    suspend() { pins.hide(); hud.hidden = true; } };
}
