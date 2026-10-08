import * as THREE from "three";
import { NETWORKS, BA_FIELDS } from "./cortical-maps.js";
import { LOBES, SOURCES } from "./data.js";
import { createWorldAnnotations } from "./world-annotations.js";
const $ = (s) => document.querySelector(s),
  V = (a) => new THREE.Vector3(...a);
const LAYERS = [
  [
    "I",
    "Drobinowa",
    "Przewaga wypustek i kontaktów synaptycznych; niewiele ciał neuronów.",
  ],
  ["II", "Ziarnista zewnętrzna", "Małe komórki i lokalne połączenia korowe."],
  [
    "III",
    "Piramidowa zewnętrzna",
    "Neurony piramidowe i liczne połączenia korowo-korowe.",
  ],
  [
    "IV",
    "Ziarnista wewnętrzna",
    "W wielu obszarach odbiera wejścia wzgórzowo-korowe.",
  ],
  [
    "V",
    "Piramidowa wewnętrzna",
    "Duże neurony projekcyjne i wyjścia do struktur podkorowych.",
  ],
  [
    "VI",
    "Wielokształtna",
    "Zróżnicowane komórki; m.in. projekcje korowo-wzgórzowe.",
  ],
];
const mat = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.63 });
export function createDetailedAnatomy(host) {
  const state = {
    active: false,
    lobe: "frontal",
    hemi: "lh",
    level: 1,
    gap: 0,
    layer: 0,
    selected: null,
    note: "anatomy",
    context: 0.22,
    division: "dk",
    mapSelected: 0,
  };
  const root = new THREE.Group(),
    patches = new THREE.Group(),
    column = new THREE.Group();
  root.name = "Szczegółowy atlas kory";
  root.add(patches, column);
  host.scene.add(root);
  root.visible = false;
  let patchKey = "",
    meshes = [],
    layoutKey = "",
    colorRefs = [];
  const layers = [];
  const pins = createWorldAnnotations({
    ...host,
    onSelect: (item) =>
      item.layer !== undefined
        ? chooseLayer(item.layer)
        : inspect(item.id, { focus: true }),
  });
  function filament(a, b, radius, color) {
    const curve = new THREE.CatmullRomCurve3([
      a,
      a
        .clone()
        .lerp(b, 0.5)
        .add(V([0.035, 0, 0.025])),
      b,
    ]);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 10, radius, 5, false),
      mat(color),
    );
    column.add(mesh);
  }
  for (let i = 0; i < 6; i++) {
    const y = 1.6 - i * 0.55,
      g = new THREE.BoxGeometry(2.5, 0.46, 1.15, 12, 1, 4),
      p = g.getAttribute("position");
    for (let j = 0; j < p.count; j++)
      p.setY(j, p.getY(j) + p.getX(j) ** 2 * 0.045);
    g.computeVertexNormals();
    const slab = new THREE.Mesh(
      g,
      mat(
        ["#c8b6a5", "#bdab97", "#c5ab98", "#b3a189", "#bda68f", "#ac9684"][i],
      ),
    );
    slab.position.y = y;
    slab.material.transparent = true;
    slab.material.opacity = i === state.layer ? 0.27 : 0.14;
    slab.material.depthWrite = false;
    column.add(slab);
    layers.push(slab);
    for (let n = 0; n < (i === 0 ? 2 : 9); n++) {
      const x = -1.02 + (n % 5) * 0.49,
        z = (n % 2 ? 1 : -1) * 0.29,
        origin = V([x, y, z]);
      const cell = new THREE.Mesh(
        i === 2 || i === 4
          ? new THREE.ConeGeometry(0.065, 0.16, 5)
          : new THREE.SphereGeometry(0.045, 12, 9),
        mat("#e6cbb0"),
      );
      cell.position.copy(origin);
      column.add(cell);
      filament(
        origin,
        origin.clone().add(V([0.06, 0.62, 0])),
        0.008,
        "#d9bfa3",
      );
      for (let b = 0; b < 3; b++) {
        const tip = origin.clone().add(V([0.06, 0.3 + b * 0.12, 0]));
        filament(
          tip,
          tip.clone().add(V([b % 2 ? 0.19 : -0.19, 0.16, 0.06])),
          0.005,
          "#cbb697",
        );
      }
      filament(
        origin,
        origin.clone().add(V([0.1, -0.62, 0.03])),
        0.005,
        "#8faea5",
      );
    }
  }
  const white = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.32, 1.15),
    mat("#d8c9ae"),
  );
  white.position.y = -1.66;
  column.add(white);
  function items() {
    return [...host.registry.values()].filter(
      (r) =>
        r.kind === "cortex" && r.lobe === state.lobe && r.hemi === state.hemi,
    );
  }
  function selected() {
    return host.registry.get(state.selected);
  }
  function build() {
    const key = state.hemi + ":" + state.lobe;
    if (key === patchKey) return;
    patchKey = key;
    for (const m of meshes) {
      m.geometry.dispose();
      m.material.dispose();
      patches.remove(m);
    }
    meshes = [];
    colorRefs = [];
    const source = host.surfaces().find((s) => s.info.hemi === state.hemi),
      normal = source.mesh.geometry.getAttribute("normal").array;
    for (const item of items()) {
      const map = new Map(),
        positions = [],
        normals = [],
        indices = [],
        originals = [];
      for (let j = 0; j < source.indices.length; j += 3) {
        const face = [
          source.indices[j],
          source.indices[j + 1],
          source.indices[j + 2],
        ];
        if (face.filter((k) => source.labels[k] === item.index).length < 2)
          continue;
        for (const k of face) {
          if (!map.has(k)) {
            map.set(k, map.size);
            positions.push(...source.positions.subarray(k * 3, k * 3 + 3));
            normals.push(...normal.subarray(k * 3, k * 3 + 3));
            originals.push(k);
          }
          indices.push(map.get(k));
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      g.setIndex(indices);
      g.computeBoundsTree?.();
      const m = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.63,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      m.userData.item = item;
      m.userData.originals = originals;
      patches.add(m);
      meshes.push(m);
    }
    syncColors();
    layoutKey = "";
  }
  function syncColors() {
    const source = host.surfaces().find((s) => s.info.hemi === state.hemi),
      colors = source.mesh.geometry.getAttribute("color");
    const mapReady = host.corticalMaps.state.ready;
    if (colorRefs[0] === colors && colorRefs[1] === state.division && colorRefs[2] === mapReady && colorRefs[3] === state.mapSelected) return;
    colorRefs = [colors, state.division, mapReady, state.mapSelected];
    for (const m of meshes) {
      const values = new Float32Array(m.userData.originals.length * 3);
      m.userData.originals.forEach((id, i) => {
        if (state.division === "dk") values.set(colors.array.subarray(id*3,id*3+3),i*3);
        else { const c = host.corticalMaps.color(state.hemi,id,state.division,state.mapSelected); values.set([c.r,c.g,c.b],i*3); }
      });
      m.geometry.setAttribute("color", new THREE.BufferAttribute(values, 3));
    }
  }
  function sync() {
    if (!state.active) return;
    // Global visibility controls can repaint materials without changing the layout.
    if (state.level === 3) {
      host.macroObjects().forEach((m) => (m.visible = false));
      return;
    }
    for (const s of host.surfaces()) {
      s.mesh.material.transparent = true;
      s.mesh.material.opacity = state.context;
      s.mesh.material.depthWrite = false;
    }
    const key = [
      state.gap,
      host.state.renderSeparation,
      host.state.section,
      host.state.renderSlice,
      host.state.left,
      host.state.right,
      state.selected,
      state.level,
      state.context,
    ].join("|");
    if (key === layoutKey) return;
    layoutKey = key;
    if (host.state.section !== "none" && state.gap) {
      state.gap = 0;
      $("#detail-gap") && ($("#detail-gap").value = 0);
    }
    const list = items(),
      mean = new THREE.Vector3();
    list.forEach((r) => mean.add(V(r.centroid)));
    mean.divideScalar(Math.max(1, list.length));
    const source = host.surfaces().find((s) => s.info.hemi === state.hemi),
      offset = source.mesh.position.x;
    for (const m of meshes) {
      const direction = V(m.userData.item.centroid).sub(mean);
      if (direction.length() < 0.05)
        direction.set(state.hemi === "lh" ? -1 : 1, 0.2, 0);
      m.position.copy(
        direction.normalize().multiplyScalar(state.level === 2 ? state.gap : 0),
      );
      m.position.x += offset;
      m.visible = state.hemi === "lh" ? host.state.left : host.state.right;
      m.material.clippingPlanes = source.mesh.material.clippingPlanes;
      m.material.emissive.set(
        m.userData.item.id === state.selected ? "#314a39" : "#000000",
      );
      m.material.emissiveIntensity =
        m.userData.item.id === state.selected ? 0.24 : 0;
    }
    for (const s of host.surfaces()) {
      s.mesh.material.transparent = true;
      s.mesh.material.opacity = state.context;
      s.mesh.material.depthWrite = false;
    }
  }
  function setPins() {
    if (state.level === 3) {
      pins.set(
        LAYERS.map((l, i) => ({
          layer: i,
          name: l[0] + " · " + l[1],
          point: [1.3, 1.6 - i * 0.55, 0.55],
        })),
      );
      return;
    }
    const list = items(),
      active = selected(),
      shown = [
        active,
        ...list.filter((r) => r.id !== active?.id).slice(0, 3),
      ].filter(Boolean);
    pins.set(
      shown.map((r) => ({
        id: r.id,
        name: r.name,
        point: () => {
          const mesh = meshes.find((m) => m.userData.item.id === r.id);
          return V(r.anchor).add(mesh?.position || V([0, 0, 0]));
        },
      })),
    );
  }
  function show({ focus = true } = {}) {
    build();
    column.visible = state.level === 3;
    patches.visible = state.level !== 3;
    host.updateVisibility();
    layoutKey = "";
    sync();
    setPins();
    $(".controls").inert = state.level === 3;
    $(".viewport-title>div").innerHTML =
      (state.level === 3 ? "Warstwy kory" : "Atlas szczegółowy") +
      " <span>3D</span>";
    $("#world-scale").textContent =
      state.level === 3
        ? "Schemat kory nowej · skala umowna"
        : "Rzeczywiste parcele DK · rozsunięcie umowne";
    if (focus)
      host.moveCamera(
        V(
          state.level === 3
            ? [4, 2.2, 6]
            : state.hemi === "lh"
              ? [-8, 2, 1]
              : [8, 2, 1],
        ).multiplyScalar(
          Math.max(
            1,
            1.22 /
              (host.canvasHost.clientWidth /
                Math.max(1, host.canvasHost.clientHeight)),
          ),
        ),
        V([0, 0, 0.2]),
      );
    render();
  }
  function mapPanel() {
    const map = host.corticalMaps;
    const entries = state.division === "brodmann" ? BA_FIELDS.map((f,i)=>[i+1,"BA "+f[0],f[1],f[2]]) : Object.values(NETWORKS).filter(n=>n.label).map(n=>[n.label,n.name,n.color,n.desc]);
    return `<label class="lab-field">Podział powierzchni<select id="detail-division"><option value="dk" ${state.division==="dk"?"selected":""}>Desikan–Killiany</option><option value="brodmann" ${state.division==="brodmann"?"selected":""}>Wybrane pola Brodmanna · dane ex vivo</option><option value="network" ${state.division==="network"?"selected":""}>Sieci Yeo · 7 sieci</option></select></label>${state.division!=="dk"?`<p class="lab-science-note">${!map.state.ready ? map.state.error || "Wczytywanie etykiet powierzchni…" : state.division==="brodmann" ? "Dziewięć progowanych etykiet ex vivo FreeSurfer. Szarość oznacza brak etykiety, nie inne pole. To częściowa mapa cytoarchitektoniczna na fsaverage; nakładki pokrywają wierzchołki, nie całe parcele DK." : "Rzeczywiste adnotacje Yeo2011 na fsaverage. Sieci uśrednione grupowo, nie aktywność konkretnej osoby. SD: zagnieżdżone indeksy wierzchołków, z odchyleniem powierzchni około 1 mm."}</p><div class="map-legend"><button class="secondary-button" data-detail-mapid="0">Wszystkie etykiety</button>${entries.map(([id,name,color])=>`<button class="secondary-button" data-detail-mapid="${id}" aria-pressed="${state.mapSelected===id}"><i style="background:${color}"></i>${name}</button>`).join("")}</div>${state.mapSelected?`<p>${entries.find(e=>e[0]===state.mapSelected)?.[3] || ""}</p>`:""}`:""}`;
  }
  function render() {
    const list = items(),
      r = selected(),
      source = SOURCES[r?.source] || SOURCES.atlas;
    $("#mode-panel").innerHTML =
      `<div class="detail-panel"><span class="eyebrow">ATLAS SZCZEGÓŁOWY · ${state.hemi === "lh" ? "LEWA" : "PRAWA"} PÓŁKULA</span><h2>${state.level === 3 ? "Warstwy kory" : LOBES[state.lobe].name}</h2>${mapPanel()}<label class="lab-field">Płat<select id="detail-lobe">${["frontal", "parietal", "temporal", "occipital", "limbic", "insula"].map((k) => `<option value="${k}" ${state.lobe === k ? "selected" : ""}>${LOBES[k].name}</option>`).join("")}</select></label><div class="lab-tabs"><button data-detail-hemi="lh" class="${state.hemi === "lh" ? "active" : ""}">Lewa półkula</button><button data-detail-hemi="rh" class="${state.hemi === "rh" ? "active" : ""}">Prawa półkula</button></div><div class="detail-levels">${[
        ["1", "Płat"],
        ["2", "Zakręty"],
        ["3", "Warstwy"],
      ]
        .map(
          ([n, t]) =>
            `<button data-detail-level="${n}" class="${state.level === +n ? "active" : ""}">${n} · ${t}</button>`,
        )
        .join("")}</div>${
        state.level === 3
          ? `<p class="research-caption">Typowa kora nowa. Grubości i rozmieszczenie neuronów są poglądowe. Schemat nie dotyczy allocortex hipokampa.</p><div class="layer-list">${LAYERS.map((l, i) => `<button data-detail-layer="${i}" class="detail-layer ${state.layer === i ? "active" : ""}"><b>${l[0]}</b>${l[1]}</button>`).join("")}</div><div class="lab-stage"><strong>${LAYERS[state.layer][0]} · ${LAYERS[state.layer][1]}</strong><p>${LAYERS[state.layer][2]}</p></div>`
          : `<p class="research-caption">${list.length} parcel atlasu DK. Kliknij zakręt w modelu lub przypis, aby poznać anatomię, funkcję i profil kliniczny.</p>${state.level === 1 ? '<button class="primary-button" data-detail-level="2">Poznaj zakręty płata</button>' : `<label class="lab-field">Rozsuń zakręty<input id="detail-gap" type="range" min="0" max="100" value="${Math.round((state.gap / 1.2) * 100)}" aria-label="Rozsunięcie zakrętów"></label>`}<label class="lab-field">Widoczność otoczenia<input id="detail-context" type="range" min="0" max="80" value="${state.context * 100}" aria-label="Widoczność pozostałej kory"></label><div class="detail-region-list">${list.map((item) => `<button class="structure-item ${item.id === r?.id ? "active" : ""}" data-detail-region="${item.id}">${item.name}</button>`).join("")}</div>${
              r
                ? `<article class="detail-description"><span class="eyebrow">WYBRANA STRUKTURA</span><h3>${r.name}</h3><span class="latin">${r.latin}</span><div class="note-tabs">${[
                    ["anatomy", "Anatomia"],
                    ["func", "Funkcja"],
                    ["clinical", "Klinika"],
                  ]
                    .map(
                      ([key, name]) =>
                        `<button data-detail-note="${key}" class="${state.note === key ? "active" : ""}">${name}</button>`,
                    )
                    .join(
                      "",
                    )}</div><p>${r[state.note]}</p>${state.note === "clinical" ? `<span class="micro-heading">RÓŻNICOWANIE</span><p>${r.assessment}</p>` : ""}<div class="mode-actions"><button class="primary-button" data-detail-focus>Zbliż strukturę</button><button class="secondary-button" data-detail-more>Pełny opis</button></div><a class="source-link" href="${source[1]}" target="_blank" rel="noopener">${source[0]}</a></article>`
                : ""
            }`
      }<p class="lab-science-note">Granice DK, pola Brodmanna i warstwy kory opisują różne poziomy organizacji. Rozsunięcie jest umowne. Przekrój automatycznie łączy parcele.</p></div>`;
  }
  // Keep the shared selection (status bar, highlight, sidebar) in step with the lab.
  function choose(id) {
    state.selected = id;
    if (id && host.registry.get(id)) {
      host.state.selected = id;
      host.state.hemi = state.hemi;
      const status = document.querySelector("#selection-status"),
        item = host.registry.get(id);
      if (status)
        status.textContent = `${item.name} · ${state.hemi === "lh" ? "Lewa" : "Prawa"} półkula`;
    }
  }
  function mirrorOf(id) {
    const r = host.registry.get(id);
    if (!r || r.kind !== "cortex" || r.lobe !== state.lobe) return null;
    const twin = `${state.hemi}-${r.key}`;
    return host.registry.has(twin) ? twin : null;
  }
  function chooseLayer(i) {
    state.layer = i;
    layers.forEach((m, n) => {
      m.material.emissive.set(n === i ? "#426649" : "#000000");
      m.material.emissiveIntensity = n === i ? 0.35 : 0;
      m.material.opacity = n === i ? 0.27 : 0.14;
    });
    render();
    host.revealPanel?.(".lab-stage");
  }
  function inspect(id, { focus = false } = {}) {
    const r = host.registry.get(id);
    if (!r) return;
    if (r.kind !== "cortex") {
      state.selected = id;
      host.state.selected = id;
      state.note = "anatomy";
      render();
      host.revealPanel?.(".detail-description");
      if (focus) host.focus(r);
      return;
    }
    state.lobe = r.lobe;
    state.hemi = r.hemi;
    state.selected = r.id;
    state.level = 2;
    state.note = "anatomy";
    host.state.hemi = r.hemi;
    host.state.selected = r.id;
    host.state.left = r.hemi === "lh";
    host.state.right = r.hemi === "rh";
    show({ focus: false });
    if (focus) host.focus(r);
    host.revealPanel?.(".detail-description");
  }
  function enter() {
    state.active = true;
    root.visible = true;
    host.state.left = state.hemi === "lh";
    host.state.right = state.hemi === "rh";
    host.state.tracts = false;
    show();
  }
  function exit() {
    state.active = false;
    root.visible = false;
    pins.hide();
    $(".controls").inert = false;
  }
  function pick(e) {
    if (!state.active || state.level === 3) return null;
    const rect = host.canvasHost.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      host.camera,
    );
    const hit = ray
      .intersectObjects(
        meshes.filter((m) => m.visible),
        false,
      )
      .find(
        (h) =>
          !h.object.material.clippingPlanes?.some(
            (p) => p.distanceToPoint(h.point) < 0,
          ),
      );
    return hit?.object.userData.item || null;
  }
  document.addEventListener("click", (e) => {
    if (!state.active) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.detailMapid !== undefined) { state.mapSelected = +b.dataset.detailMapid; syncColors(); render(); }
    if (b.dataset.detailLevel) {
      state.level = +b.dataset.detailLevel;
      show();
    }
    if (b.dataset.detailHemi) {
      state.hemi = b.dataset.detailHemi;
      host.state.left = state.hemi === "lh";
      host.state.right = state.hemi === "rh";
      choose(mirrorOf(state.selected) || items()[0]?.id);
      show();
    }
    if (b.dataset.detailLayer !== undefined)
      chooseLayer(+b.dataset.detailLayer);
    if (b.dataset.detailRegion)
      inspect(b.dataset.detailRegion, { focus: false });
    if (b.dataset.detailNote) {
      state.note = b.dataset.detailNote;
      render();
      host.revealPanel?.();
    }
    if (b.hasAttribute("data-detail-focus")) host.focus(selected());
    if (b.hasAttribute("data-detail-more")) host.describe(state.selected);
  });
  document.addEventListener("change", (e) => {
    if (state.active && e.target.id === "detail-division") {
      state.division=e.target.value;state.mapSelected=0;syncColors();render();
      if(state.division!=="dk") host.corticalMaps.ensure().then(()=>{ if(state.active) {syncColors();render();} });
    }
    if (state.active && e.target.id === "detail-lobe") {
      state.lobe = e.target.value;
      choose(items()[0]?.id);
      show();
    }
  });
  document.addEventListener("input", (e) => {
    if (!state.active) return;
    if (e.target.id === "detail-gap") {
      if (host.state.section !== "none") {
        e.target.value = 0;
        host.toast(
          "Przy włączonym przekroju zakręty pozostają połączone. Wybierz „Cały mózg”, aby je rozsunąć.",
        );
        return;
      }
      state.gap = (+e.target.value / 100) * 1.2;
      sync();
    }
    if (e.target.id === "detail-context") {
      state.context = +e.target.value / 100;
      sync();
    }
  });
  return {
    root,
    state,
    enter,
    exit,
    inspect,
    resetView() { state.selected = null; host.state.selected = null; state.mapSelected = 0; show(); },
    clearSelection() { state.selected = null; host.state.selected = null; show(); },
    pick,
    sync,
    update() {
      if (!state.active) return;
      syncColors();
      sync();
      pins.update(true, host.state.labels);
    },
  };
}
