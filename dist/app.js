import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from "./vendor/bvh.module.js";
import { EffectComposer } from "./vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/addons/postprocessing/OutputPass.js";
import { createSceneSessions } from "./scene-session.js";
import { createSceneNavigation } from "./scene-navigation.js";
import { createBrainExplosion } from "./brain-explosion.js";
import { enhanceImpulseLab } from "./impulse-physiology.js";
import { createImpulseLab } from "./impulse.js";
import { createResearchLab } from "./research.js";
import {
  createDetailedAnatomy,
  createNeurotransmitterLab,
  createBiofeedbackLab,
} from "./extended-labs.js";
import { createTestsLab } from "./tests-lab.js";
import { createComparativeLab } from "./comparative-lab.js";
import { createVascularLab } from "./vascular-lab.js";
import { createNetworksLab } from "./networks-lab.js";
import { createCorticalMaps } from "./cortical-maps.js";
import { createOrthogonalSlices } from "./orthogonal-slices.js";
import { createAtlasConnections } from "./atlas-connections.js";
import { enhanceResearchLab } from "./research-comparison.js";
import { DRUGS } from "./pharmacology-data.js";
import { createSliceVolume } from "./dissection.js";
import {
  CORTEX,
  DEEP,
  TRACTS,
  LOBES,
  SOURCES,
  TOURS,
  QUESTIONS,
} from "./data.js";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const highDetail = new URLSearchParams(location.search).get("detail") !== "low";

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 .5-2 1-2 3M12 17v1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
  pin: '<circle cx="12" cy="8" r="4"/><path d="M12 12v10"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',
  mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v7"/>',
  palette:
    '<path d="M12 3a9 9 0 0 0 0 18h2a2 2 0 0 0 1-4l-1-1c-.7-.7-.2-2 1-2h3c4 0 4-11-6-11Z"/><path d="M7 9h.01M11 6h.01M16 8h.01M7 14h.01"/>',
};
function decorate(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || ""}</svg>`;
  });
}
decorate();
const state = {
  category: "cortex",
  hemi: "lh",
  selected: null,
  noteTab: "func",
  mode: "atlas",
  labels: true,
  fly: false,
  left: true,
  right: true,
  deep: true,
  tracts: false,
  colors: false,
  opacity: 0,
  section: "none",
  slice: 0,
  separation: 0,
  sliceStyle: "natural",
  cutFlip: false,
  hemiFace: "medial",
  dissectionVisited: false,
  renderSlice: 0,
  renderSeparation: 0,
  cutPlaying: false,
  cutSpeed: 1,
  cutPhase: 0,
  cutCenter: 0,
  cutAmplitude: 90,
  sliceContrast: 1,
  volumeReady: false,
};
const registry = new Map(),
  surfaces = [],
  deepMeshes = [],
  tractMeshes = [],
  labelNodes = [];
let renderer,
  scene,
  camera,
  controls,
  modelMeta,
  buffer,
  highlight,
  focusTween,
  frameTime = performance.now(),
  hoverTime = 0,
  lastPointer = { x: 0, y: 0 },
  pointerStart,
  flyAngles = new THREE.Euler(0, 0, 0, "YXZ"),
  tourState = null,
  quizState = null,
  toastTimer,
  ready = false,
  composer,
  bloom,
  impulseLab,
  sliceVolume,
  researchLab,
  detailLab,
  transmitterLab,
  biofeedbackLab,
  pendingMode = null,
  sessions,
  atlasConnections,
  orthogonalSlices,
  vascularLab,
  networksLab,
  testsLab,
  comparativeLab,
  navigation,
  brainExplosion;
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2(),
  keyState = new Set();
const v3 = (a) => new THREE.Vector3(...a);
const hemiText = (h) =>
  h === "lh"
    ? "Lewa półkula"
    : h === "rh"
      ? "Prawa półkula"
      : "Struktura nieparzysta";
const shortHemi = (h) => (h === "lh" ? "L" : h === "rh" ? "P" : "M");
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 4000);
}
function toggleButton(id, on) {
  const el = $(id);
  el.classList.toggle("active", on);
  el.setAttribute("aria-pressed", on);
}
function readArray(info) {
  const ctor = {
    float32: Float32Array,
    uint32: Uint32Array,
    int16: Int16Array,
  }[info.dtype];
  return new ctor(buffer, info.offset, info.length);
}
function geometry(positions, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  g.computeBoundsTree();
  return g;
}
function getItem(id = state.selected) {
  return registry.get(id);
}
function sourceLink(key) {
  const s = SOURCES[key] || SOURCES.atlas;
  return `<a class="source-link" href="${s[1]}" target="_blank" rel="noopener noreferrer">${s[0]}</a>`;
}

function initRegistry() {
  for (const surf of modelMeta.surfaces) {
    for (const r of surf.regions) {
      const content = CORTEX[r.key];
      if (content)
        registry.set(`${surf.hemi}-${r.key}`, {
          ...content,
          id: `${surf.hemi}-${r.key}`,
          hemi: surf.hemi,
          index: r.index,
          anchor: r.anchor,
          centroid: r.centroid,
          surf,
        });
    }
  }
  for (const mesh of modelMeta.deep) {
    let hemi = null,
      key = mesh.key;
    if (/^[lr]h-/.test(key)) {
      hemi = key.slice(0, 2);
      key = key.slice(3);
    }
    const content = DEEP[key];
    if (content)
      registry.set(mesh.key, {
        ...content,
        id: mesh.key,
        hemi,
        anchor: mesh.anchor,
        centroid: mesh.anchor,
        model: mesh,
      });
  }
  for (const t of TRACTS)
    registry.set(t.key, {
      ...t,
      id: t.key,
      hemi: null,
      anchor: t.points[Math.floor(t.points.length / 2)],
      centroid: t.points[Math.floor(t.points.length / 2)],
    });
  $("#structure-count").textContent = `${registry.size} struktur i dróg`;
  $(".sidebar-footer small").textContent =
    `${highDetail ? "fsaverage HD" : "fsaverage5"} · Desikan–Killiany`;
  $("#detail-toggle").textContent = highDetail ? "HD" : "SD";
  $("#detail-toggle").setAttribute("aria-pressed", highDetail);
  $("#detail-toggle").title = highDetail
    ? "Pełna siatka HD — przełącz na lżejszą SD"
    : "Lżejsza siatka SD — przełącz na pełną HD";
}
function paintSurfaces() {
  for (const surf of surfaces) {
    const colors = new Float32Array(surf.labels.length * 3);
    const regionMap = new Map(
      surf.info.regions.map((r) => [r.index, CORTEX[r.key]]),
    );
    for (let i = 0; i < surf.labels.length; i++) {
      const region = regionMap.get(surf.labels[i]);
      const c = new THREE.Color(
        state.sliceStyle !== "natural"
          ? "#ffffff"
          : state.colors && region
            ? LOBES[region.lobe].color
            : "#c5a69b",
      );
      let shade = surf.ao
        ? (0.38 + 0.62 * Math.pow(surf.ao[i], 0.75)) *
          (0.95 - 0.08 * Math.tanh(surf.sulc[i] * 0.7))
        : 0.83 - 0.22 * Math.tanh(surf.sulc[i] * 0.7);
      if (!region) shade *= 0.62;
      c.multiplyScalar(shade);
      colors.set(c.toArray(), i * 3);
    }
    surf.mesh.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3),
    );
  }
  for (const mesh of deepMeshes) {
    const item = registry.get(mesh.userData.id),
      color =
        item?.lobe === "fluid"
          ? "#8aa5a3"
          : item?.key === "cerebellum"
            ? "#ad9986"
            : item?.key === "brainstem"
              ? "#b9a791"
              : "#b59b8b";
    mesh.material.color.set(state.sliceStyle === "natural" ? color : "#ffffff");
  }
  sliceVolume?.applyGlobalStyle();
  sliceVolume?.update();
  $("#viewport .legend")?.remove();
  if (state.colors) {
    const el = document.createElement("div");
    el.className = "legend";
    el.innerHTML = Object.entries(LOBES)
      .filter(([k]) => !["deep", "cerebellum", "fluid"].includes(k))
      .map(
        ([k, l]) =>
          `<span><i style="background:${l.color}"></i>${l.name.replace("Płat ", "")}</span>`,
      )
      .join("");
    $("#viewport").append(el);
  }
}
function makeMeshes() {
  for (const info of modelMeta.surfaces) {
    const positions = readArray(info.positions),
      indices = readArray(info.indices),
      sulc = readArray(info.sulc),
      labels = readArray(info.labels),
      ao = info.ao ? readArray(info.ao) : null;
    const g = geometry(positions, indices);
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.63,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.userData = { kind: "cortex", hemi: info.hemi };
    scene.add(mesh);
    surfaces.push({ mesh, info, positions, indices, sulc, labels, ao });
  }
  for (const info of modelMeta.deep) {
    const content = registry.get(info.key);
    if (!content) continue;
    const g = geometry(readArray(info.positions), readArray(info.indices));
    const color =
      content.lobe === "fluid"
        ? "#6cbed1"
        : content.key === "cerebellum"
          ? "#a59582"
          : content.key === "brainstem"
            ? "#c4ad93"
            : content.key === "hippocampus"
              ? "#d5a45d"
              : content.key === "amygdala"
                ? "#c77787"
                : content.key === "thalamus"
                  ? "#93b9c0"
                  : "#b0ba84";
    const mesh = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.63,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: content.lobe === "fluid",
        opacity: content.lobe === "fluid" ? 0.4 : 1,
      }),
    );
    mesh.userData = { kind: "deep", id: info.key, hemi: content.hemi };
    scene.add(mesh);
    deepMeshes.push(mesh);
  }
  for (const tract of TRACTS) {
    const group = new THREE.Group();
    group.userData = { id: tract.key, kind: "tracts" };
    const mirrorable = !["slf", "ilf", "optic", "callosum"].includes(tract.key);
    const strands = tract.key === "callosum" ? 9 : 5;
    for (let i = 0; i < strands; i++) {
      const pts = tract.points.map(
        (p, j) =>
          new THREE.Vector3(
            p[0] + (i - (strands - 1) / 2) * 0.035,
            p[1] + Math.sin(j + i) * 0.028,
            p[2] +
              (tract.key === "callosum"
                ? (i - 4) * 0.15
                : Math.cos(j + i) * 0.025),
          ),
      );
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 75, 0.012, 5, false);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhongMaterial({
          color: tract.color,
          emissive: tract.color,
          emissiveIntensity: 0.12,
          shininess: 50,
        }),
      );
      mesh.userData = { kind: "tracts", id: tract.key };
      group.add(mesh);
      if (mirrorable && tract.key !== "cst") {
        const mirror = new THREE.Mesh(
          geo,
          new THREE.MeshPhongMaterial({
            color: tract.color,
            emissive: tract.color,
            emissiveIntensity: 0.08,
            shininess: 50,
          }),
        );
        mirror.scale.x = -1;
        mirror.userData = { kind: "tracts", id: tract.key };
        group.add(mirror);
      }
    }
    scene.add(group);
    tractMeshes.push(group);
  }
  paintSurfaces();
  updateVisibility();
  $("#mesh-count").textContent =
    `${modelMeta.surfaces.reduce((s, m) => s + m.indices.length / 3, 0).toLocaleString("pl-PL")} trójkątów kory`;
}

function hemiOffset(item) {
  return item?.key === "cerebellum" || item?.kind === "tracts"
    ? 0
    : item?.hemi === "lh"
      ? -state.renderSeparation
      : item?.hemi === "rh"
        ? state.renderSeparation
        : 0;
}
function applySeparation() {
  for (const s of surfaces)
    s.mesh.position.x = hemiOffset({ hemi: s.info.hemi });
  for (const mesh of deepMeshes)
    mesh.position.x = hemiOffset(registry.get(mesh.userData.id));
  if (highlight) highlight.position.x = hemiOffset(getItem());
}
function syncDissection() {
  $("#section").value = state.section;
  $("#slice").value = state.slice;
  const panel = $("#mode-panel");
  if (state.mode !== "dissection") return;
  panel.querySelectorAll("[data-cut-plane]").forEach((b) => {
    const active = b.dataset.cutPlane === state.section;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active);
  });
  panel.querySelectorAll("[data-cut-hemi]").forEach((b) => {
    const active =
      b.dataset.cutHemi ===
      (state.left && state.right
        ? "both"
        : state.left
          ? "lh"
          : state.right
            ? "rh"
            : "none");
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active);
  });
  panel.querySelectorAll("[data-cut-face]").forEach((b) => {
    b.classList.toggle("active", b.dataset.cutFace === state.hemiFace);
  });
  const slider = $("#cut-position");
  if (slider) {
    slider.value = state.slice;
    slider.disabled = state.section === "none";
  }
  if ($("#cut-position-value")) {
    const direction = {
      sagittal: state.slice > 0 ? "w lewo" : "w prawo",
      coronal: state.slice > 0 ? "ku tyłowi" : "ku przodowi",
      axial: state.slice > 0 ? "w dół" : "w górę",
    }[state.section];
    $("#cut-position-value").textContent =
      state.section === "none"
        ? "Cały mózg"
        : state.slice === 0
          ? "Środek modelu"
          : `${Math.round(Math.abs(state.slice) * 1.12)} mm ${direction} od środka modelu`;
  }
  if ($("#cut-separation"))
    $("#cut-separation").value = Math.round((state.separation / 1.8) * 100);
  if ($("#cut-separation-value"))
    $("#cut-separation-value").textContent =
      Math.round((state.separation / 1.8) * 100) + "%";
  if ($("#cut-flip")) {
    $("#cut-flip").classList.toggle("active", state.cutFlip);
    $("#cut-flip").setAttribute("aria-pressed", state.cutFlip);
    $("#cut-flip").disabled = state.section === "none";
  }
  if ($("#cut-style")) $("#cut-style").value = state.sliceStyle;
  if ($("#cut-play")) {
    $("#cut-play").textContent = state.cutPlaying
      ? "Zatrzymaj przekrój"
      : "Animuj przekrój";
    $("#cut-play").classList.toggle("active", state.cutPlaying);
    $("#cut-play").setAttribute("aria-pressed", state.cutPlaying);
    $("#cut-play").disabled = state.section === "none";
  }
  if ($("#cut-speed")) $("#cut-speed").value = state.cutSpeed;
  if ($("#cut-speed-value"))
    $("#cut-speed-value").textContent =
      state.cutSpeed.toFixed(2).replace(/0$/, "") + "×";
  if ($("#cut-contrast")) {
    $("#cut-contrast").value = state.sliceContrast;
    $("#cut-contrast").disabled = state.sliceStyle !== "mri";
  }
  if ($("#cut-data-status") && state.volumeReady)
    $("#cut-data-status").textContent =
      `MRI fsaverage · woksele ${state.volumeResolution} mm · płynne próbkowanie`;

  if ($("#cut-legend"))
    $("#cut-legend").hidden =
      state.sliceStyle !== "tissue" || state.section === "none";
}
function setSection(section, frame = false, oblique = true) {
  state.cutPlaying = false;
  if (
    section === "sagittal" &&
    state.section !== section &&
    state.left !== state.right
  )
    state.cutFlip = state.left;
  state.section = section;
  updateClipping();
  updateLabels();
  syncDissection();
  if (frame && section !== "none") {
    setView(
      {
        sagittal: state.cutFlip ? "right" : "left",
        coronal: state.cutFlip ? "front" : "back",
        axial: state.cutFlip ? "top" : "bottom",
      }[section],
    );
    if (oblique && focusTween)
      focusTween.to.add(
        v3(
          {
            sagittal: [0, 1.2, 2.2],
            coronal: [-4.8, 1.5, 0],
            axial: [2.2, 0, 2.5],
          }[section],
        ),
      );
  }
}
function inspectHemisphere(hemi, face = state.hemiFace) {
  state.left = hemi !== "rh";
  state.right = hemi !== "lh";
  state.hemiFace = face;
  state.section = "none";
  state.cutPlaying = false;
  if (hemi === "both") {
    updateVisibility();
    setView("front");
    syncDissection();
    return;
  }
  state.hemi = hemi;
  renderList();
  updateVisibility();
  const target = new THREE.Vector3(hemiOffset({ hemi }), 0, 0.2),
    medial = face === "medial";
  const direction = new THREE.Vector3(
    (hemi === "lh" ? 1 : -1) * (medial ? 1 : -1),
    0.18,
    0.06,
  ).normalize();
  const aspect =
      $("#canvas-host").clientWidth /
      Math.max(1, $("#canvas-host").clientHeight),
    distance = 7.4 * Math.max(innerWidth < 680 ? 1.4 : 1, 0.85 / aspect);
  focusTween = {
    start: performance.now(),
    from: camera.position.clone(),
    to: target.clone().addScaledVector(direction, distance),
    fromTarget: controls.target.clone(),
    target,
  };
  $("#view-label").textContent =
    `${hemi === "lh" ? "LEWA" : "PRAWA"} PÓŁKULA · ${medial ? "POWIERZCHNIA PRZYŚRODKOWA" : "POWIERZCHNIA BOCZNA"}`;
  syncDissection();
}
function renderDissection() {
  $("#mode-panel").innerHTML =
    `<div class="dissection-panel"><span class="eyebrow">PRACOWNIA ANATOMII</span><h2>Zajrzyj do środka<span class="accent">.</span></h2><p class="cut-intro">Przesuwaj płaszczyznę cięcia lub obejrzyj każdą półkulę osobno.</p>${brainExplosion?.html() || ""}<div class="cut-tools">${orthogonalSlices?.html() || ""}<span class="cut-heading">PŁASZCZYZNA CIĘCIA</span><div class="cut-planes">${[
      ["none", "Cały mózg"],
      ["sagittal", "Strzałkowa"],
      ["coronal", "Czołowa"],
      ["axial", "Poprzeczna"],
    ]
      .map(
        ([id, name]) =>
          `<button data-cut-plane="${id}" aria-pressed="false">${name}</button>`,
      )
      .join(
        "",
      )}</div><div class="mode-actions"><button class="secondary-button" data-cut-camera="oblique">Przekrój 3D</button><button class="secondary-button" data-cut-camera="flat">Na wprost</button></div><label class="lab-field">Położenie cięcia <output id="cut-position-value"></output><input id="cut-position" type="range" min="-100" max="100" value="${state.slice}" aria-label="Przesuń płaszczyznę cięcia"></label><div class="cut-play-row"><button id="cut-play" class="primary-button" aria-pressed="false">Animuj przekrój</button><label>Tempo <output id="cut-speed-value">1.0×</output><input id="cut-speed" type="range" min="0.25" max="2" step="0.25" value="1" aria-label="Tempo animacji przekroju"></label></div><button id="cut-flip" class="secondary-button" aria-pressed="false">Zachowaj drugą stronę</button><label class="lab-field">Wygląd całego mózgu<select id="cut-style"><option value="natural">Tkanki · naturalny materiał</option><option value="tissue">Atlas · kolory tkanek</option><option value="mri">MRI · obraz strukturalny</option></select></label><label class="lab-field cut-contrast-field">Kontrast MRI<input id="cut-contrast" type="range" min="0.65" max="1.7" step="0.05" value="1" aria-label="Kontrast przekroju MRI"></label><div id="cut-legend" class="cut-legend"><span><i style="background:#ae7e74"></i>Istota szara</span><span><i style="background:#dcc9a8"></i>Istota biała</span><span><i style="background:#a3bc95"></i>Struktury głębokie</span><span><i style="background:#30748f"></i>Przestrzenie płynowe</span></div><div class="cut-divider"></div><span class="cut-heading">OBSERWACJA PÓŁKUL</span><div class="cut-hemis">${[
      ["both", "Obie"],
      ["lh", "Lewa"],
      ["rh", "Prawa"],
    ]
      .map(
        ([id, name]) =>
          `<button data-cut-hemi="${id}" aria-pressed="false">${name}</button>`,
      )
      .join(
        "",
      )}</div><div class="cut-faces"><button data-cut-face="lateral">Od zewnątrz</button><button data-cut-face="medial">Od środka</button></div><label class="lab-field">Rozsuń półkule <output id="cut-separation-value"></output><input id="cut-separation" type="range" min="0" max="100" value="0" aria-label="Rozsunięcie półkul"></label><p class="cut-method" id="cut-data-status">MRI fsaverage · woksele ${highDetail ? "1" : "2"} mm · płynne próbkowanie</p><p class="cut-method">Rozsunięcie to układ do nauki. Odstęp między półkulami nie jest odległością anatomiczną. Połączenia ukrywają się w tym układzie.</p><div class="mode-actions"><button class="primary-button" data-cut-reset>Połącz i odsłoń całość</button><button class="secondary-button" data-return-atlas>Opis struktury</button></div></div></div>`;
  syncDissection();
}

function updateVisibility() {
  applySeparation();
  for (const [id, value] of [
    ["#show-left", state.left],
    ["#show-right", state.right],
    ["#deep-toggle", state.deep],
    ["#tract-toggle", state.tracts],
  ])
    toggleButton(id, value);
  for (const s of surfaces) {
    s.mesh.visible = s.info.hemi === "lh" ? state.left : state.right;
    s.mesh.material.transparent = state.opacity > 0;
    s.mesh.material.opacity = 1 - state.opacity;
    s.mesh.material.depthWrite = state.opacity < 0.2;
    s.mesh.material.needsUpdate = true;
  }
  for (const m of deepMeshes) {
    const item = registry.get(m.userData.id);
    m.visible =
      state.deep &&
      !(
        state.section !== "none" &&
        state.sliceStyle === "natural" &&
        item?.lobe === "fluid" &&
        state.selected !== item.id
      ) &&
      (m.userData.hemi === "lh"
        ? state.left
        : m.userData.hemi === "rh"
          ? state.right
          : true);
  }
  for (const g of tractMeshes)
    g.visible = state.tracts && state.separation === 0;
  if (highlight) {
    const item = getItem();
    highlight.visible =
      ["atlas", "dissection", "tours", "quiz"].includes(state.mode) &&
      (item?.hemi === "lh"
        ? state.left
        : item?.hemi === "rh"
          ? state.right
          : true);
  }
  updateClipping();
  updateLabels();
  syncDissection();
}
function updateClipping() {
  const axis = { sagittal: [1, 0, 0], coronal: [0, 0, -1], axial: [0, 1, 0] }[
    state.section
  ];
  for (const mesh of [
    ...surfaces.map((s) => s.mesh),
    ...deepMeshes,
    ...tractMeshes.flatMap((g) => g.children),
    ...(highlight ? [highlight] : []),
  ]) {
    let planes = [];
    if (axis) {
      const normal = v3(axis),
        constant = state.renderSlice * 0.028 - normal.x * mesh.position.x;
      if (state.cutFlip) {
        normal.negate();
        planes = [new THREE.Plane(normal, -constant)];
      } else planes = [new THREE.Plane(normal, constant)];
    }
    mesh.material.clippingPlanes = planes;
    mesh.material.clipShadows = true;
  }
  $("#slice").disabled = state.section === "none";
  sliceVolume?.update();
}
function updateHighlight() {
  if (highlight) {
    scene.remove(highlight);
    highlight.geometry.dispose();
    highlight.material.dispose();
    highlight = null;
  }
  deepMeshes.forEach((m) => {
    m.material.emissive.set("#000000");
    m.material.emissiveIntensity = 0;
    const focused = getItem()?.kind === "deep",
      selected = m.userData.id === state.selected,
      fluid = registry.get(m.userData.id)?.lobe === "fluid";
    m.material.transparent = fluid || (focused && !selected);
    m.material.opacity =
      focused && !selected ? (fluid ? 0.12 : 0.28) : fluid ? 0.55 : 1;
    m.material.depthWrite = !(focused && !selected);
  });
  tractMeshes.forEach((g) =>
    g.children.forEach((m) => (m.material.emissiveIntensity = 0.08)),
  );
  const item = getItem();
  if (!item) return;
  if (item.kind === "cortex") {
    const surf = surfaces.find((s) => s.info.hemi === item.hemi);
    const idx = [];
    for (let j = 0; j < surf.indices.length; j += 3) {
      const a = surf.indices[j],
        b = surf.indices[j + 1],
        c = surf.indices[j + 2];
      const votes = [surf.labels[a], surf.labels[b], surf.labels[c]].filter(
        (l) => l === item.index,
      ).length;
      if (votes >= 2) idx.push(a, b, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(surf.positions, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
    g.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        surf.mesh.geometry.getAttribute("normal").array,
        3,
      ),
    );
    highlight = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color: "#a5eeb9",
        emissive: "#2c663c",
        emissiveIntensity: 0.25,
        roughness: 0.63,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    scene.add(highlight);
  } else if (item.kind === "deep") {
    const m = deepMeshes.find((m) => m.userData.id === item.id);
    if (m) {
      m.material.emissive.set("#71c588");
      m.material.emissiveIntensity = 0.5;
    }
  } else {
    tractMeshes
      .find((g) => g.userData.id === item.id)
      ?.children.forEach((m) => (m.material.emissiveIntensity = 0.6));
  }
  updateVisibility();
}
function renderList() {
  const search = $("#search")
    .value.toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const items = [...registry.values()].filter(
    (r) =>
      (search || r.kind === state.category) &&
      (search || !r.hemi || r.hemi === state.hemi),
  );
  const filtered = items.filter((r) =>
    `${r.name} ${r.latin} ${r.tag} ${r.key}`
      .toLocaleLowerCase("pl-PL")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .includes(search),
  );
  let html = "";
  let n = 0;
  const tractGroup = ["tracts", { name: "Drogi istoty białej", color: "#b8efc7" }];
  const groups =
    state.category === "tracts" && !search
      ? [tractGroup]
      : [...Object.entries(LOBES), tractGroup];
  for (const [key, lobe] of groups) {
    // Tracts carry lobe "deep" only for colouring; list them under their own heading.
    const group = filtered.filter((r) =>
      key === "tracts"
        ? r.kind === "tracts"
        : r.lobe === key && r.kind !== "tracts",
    );
    if (!group.length) continue;
    html += `<div class="group-heading" style="--lobe-color:${lobe.color}"><i></i>${lobe.name}<span>${group.length}</span></div>`;
    for (const item of group) {
      n++;
      html += `<button class="structure-item ${item.id === state.selected ? "active" : ""}" data-select="${item.id}" title="${item.latin}${item.hemi ? " · " + hemiText(item.hemi) : ""}"><span class="item-number">${String(n).padStart(2, "0")}</span>${item.name}${search && item.hemi ? " · " + shortHemi(item.hemi) : ""}</button>`;
    }
  }
  $("#structure-list").innerHTML =
    html ||
    '<p class="empty-list">Nie znaleziono struktury. Spróbuj polskiej lub łacińskiej nazwy.</p>';
  $(".hemis").style.visibility =
    state.category === "tracts" ? "hidden" : "visible";
  $$("[data-category]").forEach((b) =>
    b.classList.toggle("active", b.dataset.category === state.category),
  );
  $$("[data-hemi]").forEach((b) =>
    b.classList.toggle("active", b.dataset.hemi === state.hemi),
  );
}
function renderNote() {
  const item = getItem();
  $("#close-note").disabled = !item;
  $(".annotation-bar .eyebrow").textContent = item ? "WYBRANA STRUKTURA" : "ATLAS 3D";
  if (!item) {
    $("#note-content").innerHTML = '<div class="note-header"><h2>Swobodny podgląd</h2></div><div class="note-body"><p>Kliknij strukturę, aby ją zaznaczyć. Obracaj model lewym przyciskiem, przesuwaj prawym, a kółkiem przybliżaj miejsce pod kursorem.</p><p>Kliknięcie tła, ponowne kliknięcie zaznaczonej struktury lub Esc usuwa zaznaczenie i przywraca poprzedni kadr. „Widok ogólny” pokazuje cały mózg bez zaznaczenia.</p><button class="secondary-button" data-brain-explode>Rozłóż cały mózg</button></div>';
    $("#selection-status").textContent = "Swobodny podgląd · brak zaznaczenia";
    return;
  }
  const clinical = state.noteTab === "clinical",
    anatomy = state.noteTab === "anatomy";
  const body = anatomy ? item.anatomy : clinical ? item.clinical : item.func;
  const extra = clinical
    ? `<span class="micro-heading">JAK RÓŻNICOWAĆ</span><p>${item.assessment}</p>`
    : anatomy
      ? `<span class="micro-heading">RELACJE PRZESTRZENNE</span><p>${item.kind === "tracts" ? "Tory pokazują orientacyjny przebieg. Kolor i grubość nie mierzą liczby włókien ani aktywności." : item.kind === "deep" ? "Odsłoń wnętrze przez przezroczystość lub przekrój. Siatka pokazuje strukturę łącznie, bez granic jej jąder lub subpól." : "Granice wyznacza atlas zakrętowy Desikan–Killiany. Podział ten nie jest mapą pól Brodmanna ani indywidualnej aktywności."}</p>`
      : `<span class="micro-heading">MYŚLENIE KLINICZNE</span><p>${item.clinical}</p>`;
  $("#note-content").innerHTML =
    `<div class="note-header"><span class="note-code">${item.kind === "cortex" ? "DK" : item.kind === "deep" ? "ASEG" : "SZLAK"} / ${item.hemi ? shortHemi(item.hemi) : "M"}</span><h2>${item.name}</h2><div class="latin">${item.latin}</div><div class="note-tags"><span class="tag">${item.hemi ? hemiText(item.hemi) : item.kind === "tracts" ? "Przebieg schematyczny" : "Struktura nieparzysta"}</span><span class="tag">${item.tag}</span></div></div><div class="note-tabs" role="group" aria-label="Zakres opisu"><button data-note-tab="anatomy" class="${anatomy ? "active" : ""}">Anatomia</button><button data-note-tab="func" class="${state.noteTab === "func" ? "active" : ""}">Funkcja</button><button data-note-tab="clinical" class="${clinical ? "active" : ""}">Klinika</button></div><div class="note-body"><p>${body}</p>${extra}<p class="caution">Funkcja wynika ze współpracy sieci. Objawy i testy nie lokalizują samodzielnie uszkodzenia.</p>${sourceLink(item.source)}${state.mode === "atlas" ? atlasConnections?.html(item) || "" : ""}</div><div class="note-actions"><button class="primary-button" id="focus-selected">Zbliż się</button><button class="secondary-button" id="read-more">Pełny opis</button></div>`;
  $("#selection-status").textContent =
    `${item.name}${item.hemi ? " · " + hemiText(item.hemi) : ""}`;
}
function select(id, { focus = false, reveal = true, open = true } = {}) {
  const item = registry.get(id);
  if (!item) return;
  navigation?.rememberSelection();
  state.selected = id;
  if (item.hemi) {
    state.hemi = item.hemi;
    if (item.hemi === "lh") {
      state.left = true;
      toggleButton("#show-left", true);
    } else {
      state.right = true;
      toggleButton("#show-right", true);
    }
  }
  state.category = item.kind;
  if (
    reveal &&
    (item.kind === "deep" ||
      item.kind === "tracts" ||
      ["insula", "transversetemporal", "entorhinal"].includes(item.key))
  ) {
    setOpacity(0.73);
    if (item.kind === "deep") {
      state.deep = true;
      toggleButton("#deep-toggle", true);
    }
    if (item.kind === "tracts") {
      state.tracts = true;
      toggleButton("#tract-toggle", true);
    }
  }
  renderList();
  renderNote();
  updateHighlight();
  if (open && state.mode === "atlas") {
    $("#annotation").hidden = false;
    revealPanel();
  }
  if (focus) focusOnItem(item);
  updateLabels();
  if (open && state.mode === "dissection") {
    state.noteTab = "anatomy";
    renderDissection();
    revealPanel();
  }
}
function setOpacity(value) {
  state.opacity = value;
  $("#opacity").value = Math.round(value * 100);
  $("#opacity-value").value = Math.round(value * 100) + "%";
  if (ready) updateVisibility();
}
// Each tab restores its own presentation state; the shared control bar must follow it.
function syncControls() {
  $("#opacity").value = Math.round(state.opacity * 100);
  $("#opacity-value").value = Math.round(state.opacity * 100) + "%";
  toggleButton("#color-mode", state.colors);
  toggleButton("#labels-toggle", state.labels);
  $("#section").value = state.section;
  $("#slice").value = state.slice;
  $("#slice").disabled = state.section === "none";
}
function clearViewPresets() {
  $$("[data-view]").forEach((b) => b.classList.remove("active"));
}
function updateLabels() {
  for (const l of labelNodes) l.el.remove();
  labelNodes.length = 0;
  if (
    !ready ||
    !state.labels ||
    brainExplosion?.state.active ||
    ["impulse", "research", "detailed", "transmitters", "biofeedback", "vascular", "networks", "tests", "comparative"].includes(
      state.mode,
    ) ||
    (state.mode === "quiz" && !quizState?.answered)
  )
    return;
  const ids = [
    state.selected,
    ...(state.category === "deep"
      ? ["lh-hippocampus", "rh-thalamus", "brainstem"]
      : state.category === "tracts"
        ? []
        : state.hemi === "lh"
          ? ["lh-precentral", "lh-superiorparietal", "lh-superiortemporal"]
          : ["rh-precentral", "rh-superiorparietal", "rh-superiortemporal"]),
  ];
  for (const id of new Set(ids)) {
    const item = registry.get(id);
    if (!item) continue;
    const el = document.createElement("button");
    el.className = "world-label" + (id === state.selected ? " selected" : "");
    el.dataset.select = id;
    el.innerHTML = `<small>${item.hemi ? shortHemi(item.hemi) : "M"}</small>${item.name}`;
    $("#labels-layer").append(el);
    labelNodes.push({
      el,
      item,
      point: v3(item.anchor),
      selected: id === state.selected,
    });
  }
}
function projectLabels() {
  if (!camera) return;
  const host = $("#canvas-host"),
    w = host.clientWidth,
    h = host.clientHeight;
  const used = [];
  for (const label of labelNodes) {
    const item = label.item;
    const visible =
      item.hemi === "lh" ? state.left : item.hemi === "rh" ? state.right : true;
    const point = label.point.clone();
    point.x += hemiOffset(item);
    const p = point.clone().project(camera);
    const x = (p.x * 0.5 + 0.5) * w,
      y = (-p.y * 0.5 + 0.5) * h - 26;
    let occluded = false;
    let hide =
      !visible ||
      p.z > 1 ||
      p.z < -1 ||
      x < 65 ||
      x > w - 65 ||
      y < 72 ||
      y > h - 140;
    if (!hide && state.section !== "none") {
      const mesh =
        item.kind === "cortex"
          ? surfaces.find((s) => s.info.hemi === item.hemi)?.mesh
          : item.kind === "deep"
            ? deepMeshes.find((m) => m.userData.id === item.id)
            : null;
      const plane = mesh?.material.clippingPlanes?.[0];
      if (plane && plane.distanceToPoint(point) < 0) hide = true;
      // Seen from the removed side, the solid cut face covers anchors that lie behind it.
      else if (plane && plane.distanceToPoint(camera.position) < 0) {
        if (label.selected) occluded = true;
        else hide = true;
      }
    }
    if (
      !hide &&
      item.kind === "cortex" &&
      state.opacity < 0.65 &&
      !label.selected
    ) {
      const origin = camera.position.clone();
      const d = point.clone().sub(origin);
      raycaster.set(origin, d.normalize());
      const hit = raycaster
        .intersectObjects(
          surfaces.filter((s) => s.mesh.visible).map((s) => s.mesh),
          false,
        )
        .find(
          (h) =>
            !h.object.material.clippingPlanes?.some(
              (p) => p.distanceToPoint(h.point) < 0,
            ),
        );
      if (hit && hit.distance < origin.distanceTo(point) - 0.08) hide = true;
    }
    if (
      !hide &&
      !label.selected &&
      used.some((o) => Math.abs(o.x - x) < 160 && Math.abs(o.y - y) < 40)
    )
      hide = true;
    // Keep contextual labels clear of the information card.

    label.el.hidden = hide;
    label.el.classList.toggle("occluded", occluded);
    label.el.style.left = x + "px";
    label.el.style.top = y + "px";
    if (!hide) used.push({ x, y });
  }
}
function projectSelectionLeader() {
  const svg = $("#selection-leader"),
    path = svg.querySelector("path"),
    ring = svg.querySelector("circle");
  const active =
    ["atlas", "dissection", "detailed"].includes(state.mode) &&
    state.labels &&
    !document.body.classList.contains("immersive") &&
    performance.now() < beaconUntil;
  svg.hidden = !active;
  if (!active) return;
  const item = getItem();
  if (!item) return;
  const host = $("#canvas-host"),
    p = v3(item.anchor);
  p.x += hemiOffset(item);
  p.project(camera);
  if (p.z < -1 || p.z > 1) {
    svg.hidden = true;
    return;
  }
  const w = host.clientWidth,
    h = host.clientHeight,
    x = (p.x * 0.5 + 0.5) * w,
    y = (-p.y * 0.5 + 0.5) * h;
  const narrow = innerWidth <= 850,
    endX = narrow ? w * 0.5 : w + 12,
    endY = narrow ? h + 12 : Math.max(115, Math.min(h - 85, y));
  path.setAttribute(
    "d",
    `M${x} ${y} C${x + 45} ${y},${endX - 45} ${endY},${endX} ${endY}`,
  );
  ring.setAttribute("cx", x);
  ring.setAttribute("cy", y);
}
function setView(name, animate = true) {
  const positions = {
    left: [-7.7, 2.1, 0.25],
    right: [7.7, 2.1, 0.25],
    front: [0, 1, -8.5],
    back: [0, 1, 8.5],
    top: [0, 9, 0.05],
    bottom: [0, -9, 0.05],
  };
  const pos = v3(positions[name] || positions.left),
    aspect =
      $("#canvas-host").clientWidth /
      Math.max(1, $("#canvas-host").clientHeight);
  pos.multiplyScalar(Math.max(innerWidth < 680 ? 1.6 : 1, 0.9 / aspect));
  const target = new THREE.Vector3(
    state.left !== state.right
      ? state.left
        ? -state.separation
        : state.separation
      : 0,
    -0.05,
    0.25,
  );
  pos
    .multiplyScalar(state.left && state.right ? 1 + state.separation * 0.18 : 1)
    .add(target);
  if (state.fly) stopFly();
  if (animate)
    focusTween = {
      start: performance.now(),
      from: camera.position.clone(),
      to: pos,
      fromTarget: controls.target.clone(),
      target,
    };
  else {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
  }
  $("#view-label").textContent =
    {
      left: "WIDOK LEWY BOCZNY",
      right: "WIDOK PRAWY BOCZNY",
      front: "WIDOK PRZEDNI",
      back: "WIDOK TYLNY",
      top: "WIDOK GÓRNY",
      bottom: "WIDOK DOLNY",
    }[name] || "WIDOK SWOBODNY";
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name),
  );
}
function focusOnItem(item) {
  if (!item) return;
  navigation?.rememberSelection();
  if (state.fly) stopFly();
  const target = brainExplosion?.state.active ? brainExplosion.focusPoint(item) : v3(item.centroid);
  target.x += hemiOffset(item);
  let direction;
  if (
    item.kind === "cortex" &&
    ["limbic", "occipital"].includes(item.lobe) &&
    Math.abs(item.centroid[0]) < 0.8
  ) {
    direction = new THREE.Vector3(item.hemi === "lh" ? 4 : -4, 2, 1);
    if (item.hemi === "lh") {
      state.right = false;
      toggleButton("#show-right", false);
    } else {
      state.left = false;
      toggleButton("#show-left", false);
    }
    updateVisibility();
  } else
    direction = camera.position
      .clone()
      .sub(controls.target)
      .normalize()
      .multiplyScalar(innerWidth < 680 ? 6.5 : 4.6);
  const pos = target.clone().add(direction);
  focusTween = {
    start: performance.now(),
    from: camera.position.clone(),
    to: pos,
    fromTarget: controls.target.clone(),
    target,
  };
  $("#view-label").textContent = "WIDOK WYBRANEJ STRUKTURY";
  $$("[data-view]").forEach((b) => b.classList.remove("active"));
}
function resize() {
  if (!renderer || !camera) return;
  const host = $("#canvas-host"),
    w = Math.max(1, host.clientWidth),
    h = Math.max(1, host.clientHeight);
  renderer.setSize(w, h);
  composer?.setSize(w, h);
  camera.aspect = w / h;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
async function init() {
  try {
    const prefix = highDetail ? "brain-hd" : "brain-low",
      compressed = highDetail && typeof DecompressionStream !== "undefined";
    const responses = await Promise.all([
      fetch(new URL(`./assets/${prefix}.json`, import.meta.url)),
      fetch(
        new URL(`./assets/${prefix}.bin${compressed ? ".gz" : ""}`, import.meta.url),
      ),
    ]);
    if (responses.some((r) => !r.ok))
      throw new Error("Nie udało się pobrać danych atlasu.");
    modelMeta = await responses[0].json();
    buffer = await responses[1].arrayBuffer();
    if (
      compressed &&
      new Uint8Array(buffer)[0] === 31 &&
      new Uint8Array(buffer)[1] === 139
    ) {
      buffer = await new Response(
        new Blob([buffer])
          .stream()
          .pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer();
    }
    initRegistry();
    renderList();
    renderNote();
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#14231b");
    camera = new THREE.PerspectiveCamera(40, 1, 0.015, 150);
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    $("#canvas-host").append(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xdce9de, 0.45));
    const key = new THREE.DirectionalLight(0xffeee0, 2.5);
    key.position.set(-4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9d1c3, 1.2);
    fill.position.set(5, 1, -3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xd4ead4, 1.3);
    rim.position.set(0, -3, -5);
    scene.add(rim);
    const grid = new THREE.GridHelper(16, 32, 0x3b5440, 0x283e2e);
    grid.name = "atlas-grid";
    grid.position.y = -2.65;
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    scene.add(grid);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 1.3;
    controls.maxDistance = 24;
    controls.enablePan = true;
    controls.zoomToCursor = true;
    controls.rotateSpeed = 0.6;
    controls.addEventListener("start", () => (focusTween = null));
    controls.addEventListener("change", () => {
      if (!focusTween && !state.fly) {
        $("#view-label").textContent = "WIDOK SWOBODNY";
        clearViewPresets();
      }
    });
    makeMeshes();
    sliceVolume = createSliceVolume({
      scene,
      state,
      highDetail,
      onStatus: (message) => {
        if ($("#cut-data-status")) $("#cut-data-status").textContent = message;
      },
    });
    sliceVolume.registerMeshes([...surfaces.map((s) => s.mesh), ...deepMeshes]);
    ready = true;
    setView("left", false);
    const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
    });
    renderTarget.samples = 4;
    composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.15, 0.5, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    resize();
    updateHighlight();
    updateLabels();
    impulseLab = createImpulseLab({
      scene,
      camera,
      controls,
      renderer,
      state,
      registry,
      select,
      setOpacity,
      resize,
      updateVisibility,
      openDialog,
      moveCamera: (position, target) => {
        $("#view-label").textContent = "WIDOK SWOBODNY";
        clearViewPresets();
        focusTween = {
          start: performance.now(),
          from: camera.position.clone(),
          to: position.clone(),
          fromTarget: controls.target.clone(),
          target: target.clone(),
        };
      },
      stopTransitions: () => {
        focusTween = null;
        if (state.fly) stopFly();
      },
      macroObjects: () => [
        ...surfaces.map((s) => s.mesh),
        ...deepMeshes,
        ...tractMeshes,
        ...(highlight ? [highlight] : []),
        sliceVolume.root,
        grid,
      ],
    });
    const laboratoryHost = {
      scene,
      camera,
      controls,
      state,
      registry,
      volume: sliceVolume,
      surfaces: () => surfaces,
      frame: (position, target) => navigation.frame(position, target),
      isCanvasClick,
      setMode, setView, updateLabels,
      clearSelection: options => navigation.clearSelection(options),
      select,
      syncControls,
      syncDissection,
      tractObjects: () => tractMeshes,
      setOpacity,
      updateVisibility,
      openDialog,
      describe: fullDescription,
      revealPanel,
      toast,
      canvasHost: $("#canvas-host"),
      viewport: $("#viewport"),
      focus: focusOnItem,
      updateClipping,
      moveCamera: (position, target) => {
        $("#view-label").textContent = "WIDOK SWOBODNY";
        clearViewPresets();
        focusTween = {
          start: performance.now(),
          from: camera.position.clone(),
          to: position.clone(),
          fromTarget: controls.target.clone(),
          target: target.clone(),
        };
      },
      macroObjects: () => [
        ...surfaces.map((s) => s.mesh),
        ...deepMeshes,
        ...tractMeshes,
        ...(highlight ? [highlight] : []),
        sliceVolume.root,
        grid,
      ],
    };
    impulseLab = enhanceImpulseLab(impulseLab, laboratoryHost);
    laboratoryHost.corticalMaps = createCorticalMaps(laboratoryHost);
    orthogonalSlices = createOrthogonalSlices(laboratoryHost);
    atlasConnections = createAtlasConnections(laboratoryHost);
    renderNote();
    researchLab = enhanceResearchLab(createResearchLab(laboratoryHost), laboratoryHost);
    detailLab = createDetailedAnatomy(laboratoryHost);
    transmitterLab = createNeurotransmitterLab(laboratoryHost);
    biofeedbackLab = createBiofeedbackLab(laboratoryHost);
    vascularLab = createVascularLab(laboratoryHost);
    networksLab = createNetworksLab(laboratoryHost);
    testsLab = createTestsLab(laboratoryHost);
    comparativeLab = createComparativeLab(laboratoryHost);
    navigation = createSceneNavigation({
      state, camera, controls, canvas: renderer.domElement,
      ready: () => ready,
      transition: () => focusTween,
      cancelCamera: () => { focusTween = null; },
      stopConnections: () => atlasConnections.stop(),
      stopFly: () => { if (state.fly) stopFly(); },
      releaseFollow: () => impulseLab.releaseCamera(),
      moveCamera: laboratoryHost.moveCamera,
      setView, lab: currentLab, syncControls, foldBrain: () => brainExplosion?.fold({whole:true}),
      hideHover: () => { $("#hover-name").hidden = true; },
      repaint: () => { renderList(); renderNote(); updateHighlight(); updateVisibility(); if(state.mode === "dissection")renderDissection(); syncControls(); },
      resetAtlas: () => {
        $("#search").value = "";
        Object.assign(state, { selected: null, category: "cortex", hemi: "lh", left: true, right: true, deep: true, tracts: false,
          section: "none", slice: 0, renderSlice: 0, separation: 0, renderSeparation: 0,
          cutFlip: false, cutPlaying: false, sliceStyle: "natural", colors: false, opacity: 0 });
        paintSurfaces(); renderList(); renderNote(); updateHighlight(); updateVisibility();
      },
    });
    brainExplosion = createBrainExplosion(laboratoryHost);
    sessions = createSceneSessions({
      state,
      scene,
      camera,
      controls,
      search: $("#search"),
      labs: () => [
        impulseLab,
        researchLab,
        detailLab,
        transmitterLab,
        biofeedbackLab,
        vascularLab,
        networksLab,
        testsLab,
        comparativeLab,
        brainExplosion,
      ],
      transition: () => focusTween,
      cancelCamera: () => {
        focusTween = null;
        if (state.fly) stopFly();
      },
      repaint: () => {
        paintSurfaces();
        renderList();
        renderNote();
        updateHighlight();
      },
    });
    if (pendingMode) {
      const requested = pendingMode;
      pendingMode = null;
      setMode(requested);
    }
    $("#loading").hidden = true;
    bindCanvas();
    requestAnimationFrame(frame);
    new ResizeObserver(resize).observe($("#canvas-host"));
  } catch (err) {
    $("#loading").innerHTML =
      `<strong>Atlas 3D jest niedostępny</strong><span>${err.message.includes("WebGL") ? "Przeglądarka nie udostępnia grafiki WebGL. Opisy struktur pozostają dostępne w spisie." : err.message}</span><button class="primary-button" id="retry-model">Spróbuj ponownie</button>`;
    $("#retry-model")?.addEventListener("click", () => location.reload());
    console.error(err);
  }
}
function pick(e) {
  if(brainExplosion?.state.active)return brainExplosion.pick(e);
  const detailedHit = state.mode === "detailed" ? detailLab?.pick?.(e) : null;
  if (detailedHit) return detailedHit;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    (-(e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const objects = [
    ...surfaces
      .filter((s) => s.mesh.visible && state.opacity < 0.7)
      .map((s) => s.mesh),
    ...deepMeshes.filter((m) => m.visible),
    ...tractMeshes.filter((g) => g.visible).flatMap((g) => g.children),
    ...sliceVolume.meshes(),
  ];
  const hits = raycaster.intersectObjects(objects, false);
  for (const hit of hits) {
    const planes = hit.object.material.clippingPlanes;
    if (planes?.some((p) => p.distanceToPoint(hit.point) < 0)) continue;
    const info = hit.object.userData;
    if (info.kind === "slice") {
      const id = sliceVolume.itemAt(hit.object, hit.point);
      if (id) return registry.get(id);
      continue;
    }
    if (info.kind === "cortex") {
      const s = surfaces.find((s) => s.info.hemi === info.hemi);
      const ids = [hit.face.a, hit.face.b, hit.face.c].map((i) => s.labels[i]);
      const index =
        ids.find((v) => ids.filter((j) => j === v).length >= 2) ?? ids[0];
      const r = s.info.regions.find((r) => r.index === index);
      const item = registry.get(`${info.hemi}-${r?.key}`);
      if (item) return item;
    } else return registry.get(info.id);
  }
  return null;
}
function bindCanvas() {
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", () => {
    if (impulseLab?.state.follow) impulseLab.releaseCamera();
  }, { capture: true });
  canvas.addEventListener("wheel", () => {
    if (impulseLab?.state.follow) impulseLab.releaseCamera();
  }, { capture: true, passive: true });
  canvas.addEventListener("pointerdown", (e) => {
    pointerStart = e.isPrimary ? { x: e.clientX, y: e.clientY, time: performance.now(), moved: false } : null;
    lastPointer = { x: e.clientX, y: e.clientY };
    if (state.fly && !document.pointerLockElement)
      canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    const gesture = pointerStart;
    setTimeout(() => { if (pointerStart === gesture) pointerStart = null; }, 0);
    if (
      state.fly ||
      ["impulse", "transmitters", "biofeedback", "tests", "comparative"].includes(state.mode)
    )
      return;
    if (
      isCanvasClick(e)
    ) {
      const item = pick(e);
      if (item) {
        if (state.mode === "research") {
          researchLab.inspect(item.id);
        } else if (["vascular", "networks"].includes(state.mode)) {
          fullDescription(item.id);
        } else if (state.mode === "detailed") {
          detailLab.inspect(item.id, { focus: false });
        } else {
          if (!["atlas", "dissection"].includes(state.mode)) setMode("atlas");
          if (["atlas", "dissection"].includes(state.mode) && state.selected === item.id)
            navigation.clearCurrentSelection();
          else select(item.id, { reveal: false });
        }
      } else if (["atlas", "dissection", "detailed", "research"].includes(state.mode)) {
        navigation.clearCurrentSelection();
      }
    }
  });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; });
  canvas.addEventListener("dblclick", (e) => {
    if (e.button !== 0 || state.mode === "tests") return;
    if (!sceneHit(e)) navigation.overview();
    else if (["atlas", "dissection"].includes(state.mode)) {
      const item = pick(e);
      if (item) select(item.id, { focus: true, reveal: false });
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointerStart && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) >= 5)
      pointerStart.moved = true;
    if (state.fly) {
      if (document.pointerLockElement === canvas || e.buttons === 1) {
        const dx = document.pointerLockElement
            ? e.movementX
            : e.clientX - lastPointer.x,
          dy = document.pointerLockElement
            ? e.movementY
            : e.clientY - lastPointer.y;
        flyAngles.y -= dx * 0.002;
        flyAngles.x = THREE.MathUtils.clamp(
          flyAngles.x - dy * 0.002,
          -1.5,
          1.5,
        );
        camera.quaternion.setFromEuler(flyAngles);
      }
      lastPointer = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.buttons || performance.now() - hoverTime < 65) return;
    hoverTime = performance.now();
    const item = pick(e);
    const el = $("#hover-name");
    el.hidden = !item;
    canvas.style.cursor = item ? "pointer" : "grab";
    if (item) {
      el.textContent = item.name;
      const rect = $("#viewport").getBoundingClientRect();
      el.style.left =
        Math.min(e.clientX - rect.left + 13, rect.width - 225) + "px";
      el.style.top = e.clientY - rect.top + 13 + "px";
    }
  });
  canvas.addEventListener(
    "pointerleave",
    () => ($("#hover-name").hidden = true),
  );
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    toast(
      "Przerwano renderowanie 3D. Odśwież stronę, aby ponownie uruchomić atlas.",
    );
  });
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement && state.fly) stopFly();
  });
}
function isCanvasClick(e) {
  return e.button === 0 && pointerStart && !pointerStart.moved &&
    Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) < 5 &&
    performance.now() - pointerStart.time < 500;
}
function sceneHit(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const meshes = [];
  scene.traverseVisible(object => {
    if (object.isMesh && object.material.visible !== false && object.material.opacity > .02) meshes.push(object);
  });
  return raycaster.intersectObjects(meshes, false).some(hit =>
    !hit.object.material.clippingPlanes?.some(plane => plane.distanceToPoint(hit.point) < 0));
}
function currentLab(mode = state.mode) {
  return { impulse: impulseLab, research: researchLab, detailed: detailLab,
    transmitters: transmitterLab, biofeedback: biofeedbackLab, vascular: vascularLab,
    networks: networksLab, tests: testsLab, comparative: comparativeLab }[mode];
}
function startFly() {
  if (!ready) return;
  focusTween = null;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  state.fly = true;
  controls.enabled = false;
  flyAngles.setFromQuaternion(camera.quaternion, "YXZ");
  toggleButton("#fly", true);
  $("#crosshair").hidden = false;
  $("#hover-name").hidden = true;
  $("#canvas-hint").innerHTML =
    "<span>W A S D — ruch · Q / E — góra / dół · Shift — szybciej · Esc — powrót</span>";
  if (innerWidth < 680) {
    const pad = document.createElement("div");
    pad.id = "fly-pad";
    pad.className = "fly-pad";
    pad.innerHTML =
      '<button data-fly-key="w" aria-label="Leć do przodu">Przód</button><button data-fly-key="s" aria-label="Leć do tyłu">Tył</button><button data-fly-key="q" aria-label="Leć w górę">Góra</button><button data-fly-key="e" aria-label="Leć w dół">Dół</button>';
    $("#viewport").append(pad);
    pad.querySelectorAll("button").forEach((b) => {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        keyState.add(b.dataset.flyKey);
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
        b.addEventListener(type, () => keyState.delete(b.dataset.flyKey)),
      );
    });
  } else
    renderer.domElement
      .requestPointerLock?.()
      ?.catch(() =>
        toast("Przeciągaj, aby rozglądać się. W A S D służą do lotu."),
      );
  $("#view-label").textContent = "SWOBODNY LOT";
}
function stopFly() {
  state.fly = false;
  keyState.clear();
  resize();
  if (document.pointerLockElement) document.exitPointerLock();
  controls.enabled = true;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  controls.target.copy(camera.position).add(direction.multiplyScalar(2.5));
  toggleButton("#fly", false);
  $("#crosshair").hidden = true;
  $("#fly-pad")?.remove();
  $("#canvas-hint").innerHTML =
    "<span>Przeciągnij, aby obracać</span><span>Scroll: przybliżenie</span><span>Kliknij strukturę</span>";
}
let cutHudTime = 0;
function advanceDissection(dt, t) {
  if (state.mode === "dissection" && state.cutPlaying && state.volumeReady) {
    state.cutPhase += dt * 0.17 * state.cutSpeed;
    state.slice =
      state.cutCenter + Math.sin(state.cutPhase) * state.cutAmplitude;
  }
  let moved = false;
  for (const [render, target] of [
    ["renderSlice", "slice"],
    ["renderSeparation", "separation"],
  ]) {
    const delta = state[target] - state[render];
    if (Math.abs(delta) > 0.00005) {
      state[render] += delta * (1 - Math.exp(-dt * 12));
      if (Math.abs(state[target] - state[render]) < 0.00005)
        state[render] = state[target];
      moved = true;
    }
  }
  if (moved) {
    applySeparation();
    updateClipping();
    for (const g of tractMeshes)
      g.visible = state.tracts && state.renderSeparation < 0.0001;
  }
  if (state.cutPlaying && t - cutHudTime > 140) {
    syncDissection();
    cutHudTime = t;
  }
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min((t - frameTime) / 1000, 0.04));
  frameTime = t;
  if (state.mode !== "impulse") advanceDissection(dt, t);
  if (focusTween) {
    const f = focusTween,
      p = Math.min((t - f.start) / 850, 1),
      ease = 1 - Math.pow(1 - p, 3);
    camera.position.lerpVectors(f.from, f.to, ease);
    controls.target.lerpVectors(f.fromTarget, f.target, ease);
    if (p === 1) focusTween = null;
  }
  if (state.fly) {
    const speed = (keyState.has("shift") ? 3 : 1.1) * dt;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();
    if (keyState.has("w") || keyState.has("arrowup"))
      camera.position.addScaledVector(forward, speed);
    if (keyState.has("s") || keyState.has("arrowdown"))
      camera.position.addScaledVector(forward, -speed);
    if (keyState.has("a") || keyState.has("arrowleft"))
      camera.position.addScaledVector(right, -speed);
    if (keyState.has("d") || keyState.has("arrowright"))
      camera.position.addScaledVector(right, speed);
    if (keyState.has("q")) camera.position.y += speed;
    if (keyState.has("e")) camera.position.y -= speed;
  } else if (!impulseLab?.state.follow) controls.update();
  impulseLab?.update(dt, t);
  orthogonalSlices?.update(dt, t);
  atlasConnections?.update(dt, t);
  researchLab?.update(dt, t);
  detailLab?.update(dt, t);
  transmitterLab?.update(dt, t);
  biofeedbackLab?.update(dt, t);
  vascularLab?.update(dt, t);
  networksLab?.update(dt, t);
  testsLab?.update(dt, t);
  comparativeLab?.update(dt, t);
  brainExplosion?.update(dt);
  if (bloom) bloom.strength = reducedMotion.matches ? 0 : state.mode === "impulse" ? 0.7 : 0.12;
  if (composer) composer.render();
  else renderer.render(scene, camera);
  projectLabels();
  projectSelectionLeader();
  if (state.mode !== "impulse") {
    const inverse = camera.quaternion.clone().invert();
    for (const [axis, vector] of [
      ["R", [1, 0, 0]],
      ["A", [0, 0, -1]],
      ["S", [0, 1, 0]],
    ]) {
      const d = v3(vector).applyQuaternion(inverse),
        x = 30 + d.x * 20,
        y = 30 - d.y * 20,
        group = $(`[data-axis="${axis}"]`);
      group.querySelector("line").setAttribute("x2", x);
      group.querySelector("line").setAttribute("y2", y);
      const text = group.querySelector("text");
      text.setAttribute("x", x + 4);
      text.setAttribute("y", y - 3);
      group.style.opacity = d.z < -0.2 ? 0.55 : 1;
    }
  }
}

function openDialog(eyebrow, html) {
  if (state.fly) stopFly();
  $("#dialog-eyebrow").textContent = eyebrow;
  $("#dialog-content").innerHTML = html;
  $("#dialog").showModal();
}
function fullDescription(id = state.selected) {
  const item = registry.get(id);
  if (!item) return;
  openDialog(
    "ATLAS / " + (item.hemi ? hemiText(item.hemi) : "POŁĄCZENIA I STRUKTURY"),
    `<h2>${item.name}</h2><p><em>${item.latin}</em></p><h3>Anatomia i relacje przestrzenne</h3><p>${item.anatomy}</p><h3>Funkcja w sieci</h3><p>${item.func}</p><h3>Uszkodzenie i profil neuropsychologiczny</h3><p>${item.clinical}</p><h3>Różnicowanie w badaniu</h3><p>${item.assessment}</p><p><small>Opis jest materiałem dydaktycznym. Zależność struktura–funkcja jest sieciowa, zmienna osobniczo i zależna od kontekstu. Nie jest to narzędzie diagnozy ani lokalizacji uszkodzenia u pacjenta.</small></p>${sourceLink(item.source)} · ${sourceLink("dk")}`,
  );
}
function showSources() {
  openDialog(
    "METODA I LITERATURA",
    `<h2>Model, który ma swoje granice.</h2><p>Powierzchnie kory pochodzą z rzeczywistego szablonu <strong>FreeSurfer fsaverage</strong>. Tryb HD obejmuje 163 842 wierzchołki i 327 680 trójkątów na półkulę; tryb SD korzysta z fsaverage5 (10 242 wierzchołki na półkulę). To uśredniona geometria, a nie skan konkretnej osoby.</p><h3>Parcellacja i wnętrze</h3><p>68 obszarów kory oznaczono atlasem zakrętowym Desikan–Killiany. Adnotacje HD pochodzą z dystrybucji FreeSurfer, a adnotacje SD z projektu brainmontageplot. Cieniowanie zagłębień siatki HD obliczono w Blenderze 5.2 metodą ambient occlusion, bez zmiany położenia wierzchołków. Materiał powierzchni jest wizualizacją, nie fotograficzną teksturą preparatu. Struktury głębokie odtworzono z segmentacji <em>aseg</em> szablonu fsaverage, przekształconej do tego samego układu powierzchniowego RAS. Powierzchnie struktur głębokich są wygładzone i uproszczone do wizualizacji.</p><p>Model nie rozdziela subpól hipokampa, jąder wzgórza, jąder pnia, warstw kory ani płacików móżdżku. Atlasowe granice zakrętów nie są granicami pól Brodmanna lub sieci funkcjonalnych. Przekroje łączą odcięcie siatki z obrazem strukturalnym brain.mgz i etykietami aseg tego samego szablonu, w rozdzielczości 1 mm w trybie HD lub 2 mm w SD. Obraz MRI i kolory tkanek są interpolowane trójliniowo na GPU, dzięki czemu ruch płaszczyzny jest ciągły. Etykiety struktur są odczytywane z segmentacji bez interpolacji numerów obszarów. Naturalny materiał jest umowną wizualizacją tkanek PBR. Wybrany styl obejmuje cały model, struktury głębokie i przekroje. Kolory atlasu są umowne; można przełączyć na obraz MRI. Płaszczyzna nie obrazuje warstw kory. Rozsunięcie półkul zmienia wyłącznie układ prezentacji; odległość w szczelinie jest umowna. Pień, móżdżek i struktury pośrodkowe pozostają na miejscu.</p><h3>Połączenia</h3><p>Dziesięć dróg pokazano jako <strong>schematy przestrzenne</strong>. Krzywe nie powstały z DWI ani traktografii; nie pokazują dokładnego zasięgu, liczby włókien, kierunku sygnału ani indywidualnej łączności. Kolory służą rozróżnieniu. Nie przedstawiono kompletnego konektomu.</p><h3>Animacja neurofizjologii</h3><p>W widoku dróg świecące markery oznaczają falę sygnału w schematycznym pęczku. W widoku neuronu pokazano umowny model dwóch komórek: mielinizację, Ca²⁺ i uwalnianie transmitera, receptory AMPA, GABA-A, GPCR oraz połączenie szczelinowe. Rozmiary, czasy i napięcia są poglądowe. To animacja mechanizmu, a nie model Hodgkina–Huxleya lub zapis elektrofizjologiczny. Pokazana morfologia neuronu jest schematyczna i nie wynika z danych MRI.</p><h3>Nowe pracownie</h3><p>„Anatomia szczegółowa” rozkłada rzeczywiste parcele płatów DK; sześć warstw jest osobnym schematem kory nowej, bez danych histologicznych. W „Badaniach” obraz MRI pochodzi z szablonu, a przebiegi BOLD, EEG i PET są syntetyczne. Modele atomowe sześciu neuroprzekaźników korzystają z konformerów PubChem; protonacja i skala sceny są poglądowe. Biofeedback nie korzysta z czujnika. CSV z RR jest przetwarzany lokalnie i offline, bez automatycznej korekcji artefaktów.</p><h3>Rozbudowa pracowni</h3><p>Połączenia atlasu to wybór relacji z literatury, nie konektom. Mapa metod przedstawia orientacyjne zakresy i odróżnia pomiar aktywności od struktury, perturbacji TMS i badania uszkodzeń. Farmakologia jest jakościową ilustracją etapów transmisji, bez dawek i farmakokinetyki. Projekcje neuromodulacyjne są schematami; położenia niesegmentowanych jąder są przybliżone.</p><h3>Zadania i porównanie gatunków</h3><p>Cztery zadania mają własne bodźce, trening i przebieg właściwy. Czasy są mierzone performance.now(); brak norm i walidacji klinicznej. Fluencja nie korzysta ze słownika. Wyniki pozostają w pamięci strony, bez przesyłania. Porównanie gatunków wykorzystuje ludzkie fsaverage / aseg i rzeczywistą uproszczoną maskę szczura Waxholm v4, udostępnioną przez DANDI (CC BY 4.0; Kleven i in., 2023). Makak, pies i kot mają autorskie schematy, bez danych morfometrycznych. Wszystkie zwierzęce wyróżnienia obszarów są schematyczne. Skala równych widoków i orientacyjna skala rozmiaru są osobno opisane. Liczby pochodzą z różnych próbek, nie są normami gatunkowymi; brak porównywalnego EQ i liczby neuronów kory makaka oznaczono w tabeli. Nie tworzą rankingu inteligencji.</p><h3>Unaczynienie i sieci</h3><p>Terytoria ACA, MCA i PCA oraz strefy graniczne przypisano orientacyjnie do całych parcel DK. Nie jest to segmentacja tętnic ani mapa perfuzji; osobnicza zmienność jest duża. Modele naczyń i przypadki są dydaktyczne. Pracownia sieci korzysta z tych samych etykiet Yeo7 co Anatomia szczegółowa. Yeo7 łączy część sieci istotności i uwagi brzusznej. Oddzielną warstwę uwagi brzusznej przybliżono za pomocą wybranych parcel DK prawej półkuli. Animowane przełączanie nie jest fMRI ani aktywnością konkretnej osoby.</p><h3>Potencjał błonowy i przewodzenie</h3><p>Oscyloskop korzysta z modelu integrate-and-fire z upływem, krokiem 1 ms, narzuconym kształtem AP i refrakcją 80 ms. Nie jest to model Hodgkina–Huxleya. Procent demielinizacji lub blokady nie odpowiada dawce ani wynikowi badania. Czasy dwóch aksonów są wybrane dla dydaktyki. TTX dotyczy w scenie kanałów wrażliwych na tę toksynę. Animacja synapsy pokazuje jakościowo fuzję, nieregularną dyfuzję, wiązanie i odłączanie transmitera.</p><h3>Podziały kory i celownik MRI</h3><p>Trzy obrazy 2D korzystają z tego samego brain.mgz / aseg co przekrój 3D. Radiologiczna konwencja i powierzchniowy RAS są opisane przy oknach. Podziały kory pochodzą z etykiet FreeSurfer: Yeo2011 7 sieci oraz dziewięć progowanych pól ex vivo (1, 2, 3a, 3b, 4a, 4p, 6, 44, 45). Nie jest to pełny atlas Brodmanna. Przy nakładaniu etykiet pierwsza w tej kolejności ma pierwszeństwo. SD wykorzystuje odpowiadające indeksy zagnieżdżonej siatki; średnia różnica położenia względem HD wynosi około 1 mm. Mapa sieci nie jest pomiarem aktywności.</p><h3>Farmakologia · źródła mechanizmów</h3><ul>${Object.values(DRUGS).map(d => `<li><a class="source-link" href="${d.source}" target="_blank" rel="noopener">${d.name}</a></li>`).join("")}</ul><h3>Jak czytać treść</h3><p>Opisy są autorskim opracowaniem dydaktycznym. Wskazują możliwe mechanizmy i sposoby różnicowania, a nie gwarantowany skutek uszkodzenia. Testy wymagają norm, analizy jakościowej i kontekstu klinicznego. Przypadki w quizie są fikcyjne.</p><h3>Źródła danych i literatura</h3><ul>${Object.keys(
      SOURCES,
    )
      .map((k) => `<li>${sourceLink(k)}</li>`)
      .join(
        "",
      )}</ul><h3>Uznanie autorstwa i licencje</h3><p><small>FreeSurfer: Athinoula A. Martinos Center for Biomedical Imaging, Massachusetts General Hospital. Nilearn: zespół Nilearn (BSD-3-Clause). brainmontageplot: Keith Jamison (MIT). Three.js: autorzy Three.js (MIT). Dane i geometria zachowują warunki swoich źródeł; licencje dołączono do plików aplikacji. Modele atomowe: NCBI PubChem (CID 33032, 119, 681, 5202, 187, 439260). Źródła sprawdzono 7–8 października 2026 r.</small></p>`,
  );
}
function showHelp() {
  openDialog(
    "NAWIGACJA PO ATLASIE",
    `<h2>Wejdź do środka.</h2><p>Kliknij powierzchnię mózgu, przypis w przestrzeni lub nazwę w spisie. Wybór podświetla strukturę i otwiera jej opis. Kliknięcie tła, ponowne kliknięcie wybranej struktury lub Esc odznacza i przywraca wcześniejszy kadr. „Widok ogólny”, Home lub dwuklik tła przywraca pełny kadr bieżącej sceny. Dwuklik struktury w Atlasie zbliża ją. Reset pozostaje w bieżącej zakładce.</p><h3>Obracanie i przybliżanie</h3><div class="key-map"><kbd>Przeciągnij</kbd><span>Obrót lewym przyciskiem; na telefonie jednym palcem.</span><kbd>Scroll / gest</kbd><span>Przybliżenie miejsca pod kursorem; na telefonie gest dwoma palcami.</span><kbd>Prawy przycisk</kbd><span>Przesunięcie widoku; na telefonie przeciągnięcie dwoma palcami.</span><kbd>L P A T G D</kbd><span>Przyciski ustawiają kamerę z lewej, prawej, przodu, tyłu, góry i dołu.</span></div><h3>Swobodny lot</h3><p>Włącz „Swobodny lot”. Rozglądaj się myszą, poruszaj W A S D; Q podnosi, E obniża kamerę. Shift przyspiesza. Esc lub ponowne naciśnięcie przycisku kończy lot. Na telefonie przeciągaj widok i używaj przycisków ruchu.</p><h3>Przekroje i półkule</h3><p>Otwórz „Przekroje”. Wybierz płaszczyznę i przesuń suwak lub użyj „Animuj przekrój”, aby oglądać kolejne warstwy. Możesz regulować tempo, zatrzymać ruch i zmieniać kontrast MRI. „Zachowaj drugą stronę” odwraca stronę cięcia. „Lewa” i „Prawa” izolują półkulę; „Od środka” pokazuje jej powierzchnię przyśrodkową. Suwak „Rozsuń półkule” tworzy rozłożony widok z zachowanymi przypisami. Wygląd całego mózgu i przekroju przełączysz między naturalnym materiałem, kolorami tkanek a MRI.</p><h3>Pracownie</h3><p>„Badania”: MRI, fMRI, EEG i PET z animacją oraz ograniczeniami interpretacji. „Anatomia szczegółowa”: płat, zakręty obu półkul i schemat warstw kory. „Neuroprzekaźniki”: obracane modele atomowe oraz transport w synapsie. „Biofeedback”: przykładowe sygnały HRV, EEG i EDA oraz lokalny import pliku z kolumną rr_ms. Przyciski odtwarzania zatrzymują i wznawiają animacje.</p><h3>Odsłanianie struktur</h3><p>Zwiększ przezroczystość, ukryj jedną półkulę albo wybierz przekrój i przesuwaj jego położenie. Powyżej 70% przezroczystości kliknięcie wybiera struktury wewnętrzne zamiast powierzchni kory. Wybrana parcela kory pozostaje wyróżniona.</p><p>Użyj „Ścieżek nauki”, aby przejść przez systemy funkcjonalne, a „Sprawdź wiedzę”, aby rozwiązać pytania kliniczne z wyjaśnieniami.</p>`,
  );
}
function setMode(mode) {
  if (!ready) {
    pendingMode = mode;
    $$("[data-mode]").forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === mode),
    );
    return;
  }
  if (state.mode === mode) return;
  atlasConnections?.stop();
  sessions.leave();
  const restored = sessions.restore(mode);
  document.body.dataset.mode = mode;
  document.body.classList.remove("sidebar-open");
  $$("[data-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
    b.setAttribute("aria-current", b.dataset.mode === mode ? "page" : "false");
  });
  $("#annotation").hidden = mode !== "atlas";
  $("#overview").hidden = mode === "tests";
  $("#mode-panel").hidden = mode === "atlas";
  $(".orientation").style.display = "";
  $(".view-presets").style.display = "";
  $("#canvas-hint").hidden = false;
  $(".model-credit").firstChild.textContent = "MODEL SZABLONOWY ";
  $(".viewport-title>div").innerHTML = "Mózg człowieka <span>3D</span>";
  $("#world-scale").textContent = "1 jednostka = 40 mm";
  const lab = {
    impulse: impulseLab,
    research: researchLab,
    detailed: detailLab,
    transmitters: transmitterLab,
    biofeedback: biofeedbackLab,
    vascular: vascularLab,
    networks: networksLab,
    tests: testsLab,
    comparative: comparativeLab,
  }[mode];
  if (mode === "dissection") {
    renderDissection();
    if (!state.dissectionVisited && state.section === "none")
      setSection("coronal", true);
    state.dissectionVisited = true;
  }
  if (mode === "tours") renderTours();
  if (mode === "quiz") renderQuiz();
  if (lab) lab.enter({ resumeCamera: !!restored });
  if (restored) {
    focusTween = {
      start: performance.now(),
      from: camera.position.clone(),
      to: restored.position.clone(),
      fromTarget: controls.target.clone(),
      target: restored.target.clone(),
    };
  }
  if (!restored && ["tours", "quiz"].includes(mode)) setView("left");
  resize();
  updateVisibility();
  updateLabels();
  syncControls();
  $("#mode-panel").scrollTop = 0;
  revealPanel();
}
let beaconUntil = 0;
function revealPanel(origin) {
  const panel = state.mode === "atlas" ? $("#annotation") : $("#mode-panel");
  if (!panel || panel.hidden) return;
  beaconUntil = performance.now() + 1400;
  panel.dataset.selection = state.selected;
  const target =
    typeof origin === "string" ? panel.querySelector(origin) : null;
  if (target && panel.scrollTo) {
    const top =
      panel.scrollTop +
      target.getBoundingClientRect().top -
      panel.getBoundingClientRect().top -
      22;
    panel.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  panel.getAnimations?.().forEach((a) => a.cancel());
  if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    panel.animate?.(
      [
        { opacity: 0.25, transform: "translateX(16px)", filter: "blur(3px)" },
        { opacity: 1, transform: "translateX(0)", filter: "blur(0)" },
      ],
      { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  }
}
function renderTours() {
  const panel = $("#mode-panel");
  if (!tourState) {
    panel.innerHTML = `<span class="eyebrow">NAUKA W KONTEKŚCIE</span><h2>Połącz strukturę z funkcją.</h2><p>Wybierz system. Każdy przystanek przenosi Cię do właściwego miejsca w mózgu.</p>${TOURS.map((t, i) => `<button class="tour-card" data-tour="${i}"><span class="tour-num">Ścieżka ${i + 1} · ${t.stops.length} ${t.stops.length < 5 ? "przystanki" : "przystanków"}</span><strong>${t.name}</strong><small>${t.desc}</small></button>`).join("")}`;
    return;
  }
  const tour = TOURS[tourState.index],
    step = tour.stops[tourState.step],
    item = registry.get(step[0]);
  panel.innerHTML = `<span class="eyebrow">${tour.name.toUpperCase()}</span><div class="tour-progress">${tour.stops.map((s, i) => `<span class="${i <= tourState.step ? "active" : ""}"></span>`).join("")}</div><small class="eyebrow">PRZYSTANEK ${tourState.step + 1} / ${tour.stops.length}</small><h2>${step[1]}</h2><p>${step[2]}</p><p class="tour-location"><strong>${item.name}</strong><br><em>${item.latin}</em></p><div class="mode-actions"><button class="secondary-button" data-tour-back ${tourState.step === 0 ? "disabled" : ""}>Wstecz</button><button class="primary-button" data-tour-next>${tourState.step === tour.stops.length - 1 ? "Zakończ ścieżkę" : "Następny przystanek"}</button><button class="secondary-button" data-tour-exit>Spis ścieżek</button></div>`;
}
function startTour(index) {
  tourState = { index, step: 0 };
  visitTour();
}
function visitTour() {
  const step = TOURS[tourState.index].stops[tourState.step];
  presentItem(step[0]);
  renderTours();
  $("#mode-panel").scrollTop = 0;
}
function shuffle(a) {
  // Fisher–Yates: every order is equally likely.
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function startQuiz() {
  quizState = {
    questions: shuffle(QUESTIONS),
    step: 0,
    score: 0,
    answered: false,
    choices: null,
    missed: [],
  };
  renderQuiz();
  $("#mode-panel").scrollTop = 0;
  updateLabels();
}
function renderQuiz() {
  const panel = $("#mode-panel");
  if (!quizState) {
    panel.innerHTML =
      `<span class="eyebrow">AKTYWNE PRZYPOMINANIE</span><h2>Sprawdź rozumienie.</h2><p>${QUESTIONS.length} pytań: relacje anatomiczne, drogi i różnicowanie objawów. Po odpowiedzi zobaczysz wyjaśnienie oraz strukturę w 3D.</p><p>Wynik jest informacją o tej sesji nauki, a nie oceną kompetencji klinicznych.</p><button class="primary-button" data-quiz-start>Rozpocznij sesję</button><p class="quiz-keys">Skróty: <kbd>A</kbd>–<kbd>D</kbd> lub <kbd>1</kbd>–<kbd>4</kbd> wybiera odpowiedź, <kbd>Enter</kbd> przechodzi dalej.</p>`;
    return;
  }
  if (quizState.step >= quizState.questions.length) {
    const total = quizState.questions.length;
    panel.innerHTML = `<span class="eyebrow">SESJA ZAKOŃCZONA</span><h2>Twój wynik</h2><div class="score-large">${quizState.score}<span style="font-size:24px;color:var(--muted)"> / ${total}</span></div><p>${quizState.missed.length ? "Wróć do zagadnień, które wymagały poprawy:" : "W tej sesji wszystkie odpowiedzi były poprawne. Prześledź jeszcze powiązania między strukturami."}</p>${quizState.missed.map((q) => `<button class="tour-card" data-review="${q.target}"><strong>${registry.get(q.target)?.name}</strong><small>${q.q}</small></button>`).join("")}<div class="mode-actions"><button class="primary-button" data-quiz-start>Nowa sesja</button><button class="secondary-button" data-return-atlas>Wróć do atlasu</button></div>`;
    return;
  }
  const q = quizState.questions[quizState.step];
  if (!quizState.choices)
    quizState.choices = shuffle(
      q.options.map((text, index) => ({ text, index })),
    );
  panel.innerHTML = `<span class="eyebrow">PYTANIE ${quizState.step + 1} / ${quizState.questions.length} · WYNIK ${quizState.score}</span><h2 style="font-size:21px;line-height:1.4">${q.q}</h2><div class="question-options">${quizState.choices.map((c, i) => `<button class="question-option ${quizState.answered ? (c.index === q.correct ? "correct" : c.index === quizState.answer ? "wrong" : "") : ""}" data-answer="${c.index}" ${quizState.answered ? "disabled" : ""}><span style="opacity:.5">${String.fromCharCode(65 + i)}.</span> ${c.text}</button>`).join("")}</div>${quizState.answered ? `<div class="quiz-feedback"><strong>${quizState.answer === q.correct ? "Poprawnie." : "Sprawdź mechanizm."}</strong><br>${q.explanation}</div><div class="mode-actions"><button class="primary-button" data-quiz-next>${quizState.step === quizState.questions.length - 1 ? "Pokaż wynik" : "Następne pytanie"}</button><button class="secondary-button" data-quiz-description>Opis struktury</button></div>` : '<p style="font-size:12px;color:var(--muted)">Wybierz jedną najlepszą odpowiedź. Opisy zostaną odsłonięte po wyborze.</p>'}`;
}
function nextQuestion() {
  quizState.step++;
  quizState.answered = false;
  quizState.choices = null;
  renderQuiz();
  updateLabels();
  $("#mode-panel").scrollTop = 0;
}
function answerQuiz(answer) {
  if (!quizState || quizState.answered) return;
  const q = quizState.questions[quizState.step];
  quizState.answer = answer;
  quizState.answered = true;
  if (answer === q.correct) quizState.score++;
  else quizState.missed.push(q);
  presentItem(q.target);
  renderQuiz();
  updateLabels();
  revealPanel(".quiz-feedback");
}
// Tours and quiz show one target at a time: start each stop from a clean scene
// instead of accumulating transparency and tracts from previous stops.
function presentItem(id) {
  const item = registry.get(id);
  if (!item) return;
  state.left = state.right = true;
  state.section = "none";
  state.separation = 0;
  state.deep = true;
  state.tracts = item.kind === "tracts";
  const hidden =
    item.kind !== "cortex" ||
    ["insula", "transversetemporal", "entorhinal"].includes(item.key);
  setOpacity(hidden ? 0.73 : 0);
  select(id, { focus: true, open: false, reveal: false });
  syncControls();
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.select) {
    if (["atlas", "dissection"].includes(state.mode) && state.selected === b.dataset.select) {
      navigation.clearCurrentSelection();
      return;
    }
    const item = registry.get(b.dataset.select);
    if (state.mode === "impulse") {
      if (item?.kind === "tracts") impulseLab.selectRoute(item.id);
      else if (item) fullDescription(item.id);
    } else if (state.mode === "detailed") {
      detailLab.inspect(b.dataset.select);
    } else if (
      ["research", "transmitters", "biofeedback"].includes(state.mode)
    ) {
      if (item) fullDescription(item.id);
    } else {
      if (!["atlas", "dissection"].includes(state.mode)) setMode("atlas");
      select(b.dataset.select, {
        focus: b.classList.contains("structure-item"),
      });
    }
  }
  if (b.hasAttribute("data-atlas-connections")) {
    if (atlasConnections.state.active) atlasConnections.stop();
    else atlasConnections.show(state.selected);
    renderNote();
  }
  if (b.dataset.mode) setMode(b.dataset.mode);
  if (b.dataset.cutPlane) setSection(b.dataset.cutPlane, true);
  if (b.dataset.cutCamera)
    setSection(state.section, true, b.dataset.cutCamera === "oblique");
  if (b.dataset.cutHemi) inspectHemisphere(b.dataset.cutHemi);
  if (b.dataset.cutFace) {
    state.hemiFace = b.dataset.cutFace;
    const hemi =
      state.left && state.right ? state.hemi : state.left ? "lh" : "rh";
    inspectHemisphere(hemi, b.dataset.cutFace);
  }
  if (b.id === "cut-play") {
    state.cutPlaying = !state.cutPlaying;
    if (state.cutPlaying) {
      const axis = { sagittal: 0, coronal: 2, axial: 1 }[state.section],
        sign = state.section === "coronal" ? 1 : -1;
      let lo = Infinity,
        hi = -Infinity;
      for (const mesh of [...surfaces.map((s) => s.mesh), ...deepMeshes]) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
        for (const end of [box.min, box.max]) {
          const value = (end.getComponent(axis) / 0.028) * sign;
          lo = Math.min(lo, value);
          hi = Math.max(hi, value);
        }
      }
      lo = Math.max(-98, lo);
      hi = Math.min(98, hi);
      state.cutCenter = (lo + hi) / 2;
      state.cutAmplitude = (hi - lo) * 0.46;
      state.cutPhase = Math.asin(
        THREE.MathUtils.clamp(
          (state.slice - state.cutCenter) / state.cutAmplitude,
          -1,
          1,
        ),
      );
    } else state.slice = state.renderSlice;
    syncDissection();
  }
  if (b.id === "cut-flip") {
    state.cutFlip = !state.cutFlip;
    setSection(state.section, true);
  }
  if (b.hasAttribute("data-cut-reset")) {
    state.left = state.right = true;
    state.separation = 0;
    state.cutPlaying = false;
    state.cutFlip = false;
    state.slice = 0;
    setSection("none");
    setOpacity(0);
    updateVisibility();
    setView("front");
  }

  if (
    b.dataset.category &&
    ["atlas", "dissection", "detailed", "tours", "quiz", "impulse"].includes(
      state.mode,
    )
  ) {
    state.category = b.dataset.category;
    $("#search").value = "";
    renderList();
    if (state.category === "tracts") {
      if (["atlas", "dissection", "tours", "quiz"].includes(state.mode)) {
        state.tracts = true;
        toggleButton("#tract-toggle", true);
        setOpacity(0.78);
      }
    }
    updateVisibility();
  }
  if (b.dataset.hemi) {
    state.hemi = b.dataset.hemi;
    renderList();
  }
  if (b.dataset.noteTab) {
    state.noteTab = b.dataset.noteTab;
    renderNote();
  }
  if (b.dataset.view && ready) {
    setView(b.dataset.view);
    if (state.mode === "detailed") detailLab.sync();
  }
  if (b.id === "focus-selected") focusOnItem(getItem());
  if (b.id === "read-more") fullDescription();
  if (b.dataset.tour !== undefined) startTour(Number(b.dataset.tour));
  if (b.hasAttribute("data-tour-back")) {
    tourState.step--;
    visitTour();
  }
  if (b.hasAttribute("data-tour-next")) {
    if (tourState.step === TOURS[tourState.index].stops.length - 1) {
      toast("Ścieżka ukończona. Wybierz kolejny system lub sprawdź wiedzę.");
      tourState = null;
      renderTours();
    } else {
      tourState.step++;
      visitTour();
    }
  }
  if (b.hasAttribute("data-tour-exit")) {
    tourState = null;
    renderTours();
  }
  if (b.hasAttribute("data-quiz-start")) startQuiz();
  if (b.dataset.answer !== undefined) answerQuiz(Number(b.dataset.answer));
  if (b.hasAttribute("data-quiz-next")) nextQuestion();
  if (b.hasAttribute("data-quiz-description")) fullDescription();
  if (b.hasAttribute("data-return-atlas")) setMode("atlas");
  if (b.dataset.review) {
    setMode("atlas");
    select(b.dataset.review, { focus: true });
    state.noteTab = "clinical";
    renderNote();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "cut-speed") {
    state.cutSpeed = Number(e.target.value);
    syncDissection();
  }
  if (e.target.id === "cut-contrast") {
    state.sliceContrast = Number(e.target.value);
    sliceVolume.update();
  }
  if (e.target.id === "cut-position") {
    state.cutPlaying = false;
    state.slice = Number(e.target.value);
    updateClipping();
    syncDissection();
  }
  if (e.target.id === "cut-separation") {
    state.separation = (Number(e.target.value) / 100) * 1.8;
    updateVisibility();
  }
});
document.addEventListener("change", (e) => {
  if (state.mode === "dissection" && e.target.id === "cut-style") {
    state.sliceStyle = e.target.value;
    paintSurfaces();
    sliceVolume.update();
    syncDissection();
  }
});
$("#search").addEventListener("input", renderList);
$("#sidebar-toggle").addEventListener("click", () =>
  document.body.classList.toggle("sidebar-open"),
);
$("#panel-toggle").addEventListener("click", () => {
  document.body.classList.toggle("immersive");
  $("#panel-toggle").setAttribute(
    "aria-pressed",
    document.body.classList.contains("immersive"),
  );
  resize();
});
$("#opacity").addEventListener("input", (e) =>
  setOpacity(Number(e.target.value) / 100),
);
$("#show-left").addEventListener("click", () => {
  state.left = !state.left;
  toggleButton("#show-left", state.left);
  updateVisibility();
});
$("#show-right").addEventListener("click", () => {
  state.right = !state.right;
  toggleButton("#show-right", state.right);
  updateVisibility();
});
$("#deep-toggle").addEventListener("click", () => {
  state.deep = !state.deep;
  toggleButton("#deep-toggle", state.deep);
  updateVisibility();
});
$("#tract-toggle").addEventListener("click", () => {
  state.tracts = !state.tracts;
  toggleButton("#tract-toggle", state.tracts);
  if (state.tracts && state.opacity < 0.6) setOpacity(0.76);
  updateVisibility();
});
$("#labels-toggle").addEventListener("click", () => {
  state.labels = !state.labels;
  toggleButton("#labels-toggle", state.labels);
  updateLabels();
});
$("#color-mode").addEventListener("click", () => {
  state.colors = !state.colors;
  toggleButton("#color-mode", state.colors);
  paintSurfaces();
});
$("#section").addEventListener("change", (e) => setSection(e.target.value));
$("#slice").addEventListener("input", (e) => {
  state.cutPlaying = false;
  state.slice = Number(e.target.value);
  updateClipping();
  syncDissection();
});
$("#reset").addEventListener("click", () => navigation?.overview());
$("#overview").addEventListener("click", () => navigation?.overview());
$("#fly").addEventListener("click", () => {
  impulseLab?.releaseCamera();
  if (researchLab?.state.active) researchLab.state.orbit = false;
  state.fly ? stopFly() : startFly();
});
$("#detail-toggle").addEventListener("click", () => {
  const url = new URL(location.href);
  url.searchParams.set("detail", highDetail ? "low" : "high");
  // Reload into the same workspace instead of always landing in the atlas.
  if (state.mode !== "atlas") url.searchParams.set("tab", state.mode);
  else url.searchParams.delete("tab");
  location.assign(url.href);
});
$("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("#viewport").requestFullscreen();
  } catch {
    toast("Pełny ekran jest niedostępny w tej przeglądarce.");
  }
});
$("#close-note").addEventListener("click", () => {
  navigation?.clearCurrentSelection();
});
$("#sources").addEventListener("click", showSources);
$("#model-info").addEventListener("click", showSources);
$("#help").addEventListener("click", showHelp);
$("#dialog-close").addEventListener("click", () => $("#dialog").close());
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
document.addEventListener("keydown", (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
    if(e.key === "Escape" && !$("#dialog").open && state.mode !== "tests") {
      e.target.blur(); navigation?.clearCurrentSelection();
    }
    return;
  }
  if (e.key === "/" && !$("#dialog").open) {
    e.preventDefault();
    document.body.classList.add("sidebar-open");
    $("#search").focus();
  }
  if (e.key === "Escape" && state.fly) {
    stopFly();
    return;
  }
  if (e.key === "Escape" && document.body.classList.contains("sidebar-open")) {
    document.body.classList.remove("sidebar-open");
    return;
  }
  if (!$("#dialog").open && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key === "Home" && state.mode !== "tests") {
      e.preventDefault(); navigation?.overview(); return;
    }
    if (e.key === "Escape" && state.mode !== "tests") {
      navigation?.clearCurrentSelection(); return;
    }
  }
  if (
    state.mode === "quiz" &&
    quizState &&
    !$("#dialog").open &&
    quizState.step < quizState.questions.length &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  ) {
    const key = e.key.toLowerCase(),
      slot = "1234".includes(key) && key ? +key - 1 : "abcd".indexOf(key);
    if (!quizState.answered && key.length === 1 && slot >= 0) {
      const choice = quizState.choices?.[slot];
      if (choice) {
        e.preventDefault();
        answerQuiz(choice.index);
      }
      return;
    }
    if (quizState.answered && e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      nextQuestion();
      return;
    }
  }
  if (
    state.fly &&
    [
      "w",
      "a",
      "s",
      "d",
      "q",
      "e",
      "shift",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(e.key.toLowerCase())
  ) {
    e.preventDefault();
    keyState.add(e.key.toLowerCase());
  }
});
document.addEventListener("keyup", (e) => keyState.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keyState.clear());
const initialTab = new URLSearchParams(location.search).get("tab");
if (
  [
    "dissection",
    "impulse",
    "research",
    "detailed",
    "transmitters",
    "biofeedback",
    "vascular",
    "networks",
    "tests",
    "comparative",
    "tours",
    "quiz",
  ].includes(initialTab)
)
  pendingMode = initialTab;
init();
