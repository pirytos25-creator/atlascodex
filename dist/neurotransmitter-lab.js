import * as THREE from "three";
import { DRUGS, drugPanel } from "./pharmacology-data.js";
import { PROJECTIONS, createTransmitterProjections } from "./transmitter-projections.js";
import { TRANSMITTERS } from "./transmitter-data.js";
import { createWorldAnnotations } from "./world-annotations.js";
const $ = (s) => document.querySelector(s),
  V = (a) => new THREE.Vector3(...a);
const ATOMS = {
  1: { name: "Wodór", symbol: "H", color: "#eee7d6", radius: 0.13 },
  6: { name: "Węgiel", symbol: "C", color: "#68786f", radius: 0.23 },
  7: { name: "Azot", symbol: "N", color: "#7fa8cd", radius: 0.24 },
  8: { name: "Tlen", symbol: "O", color: "#d69a8b", radius: 0.23 },
};
const physical = (color, opacity = 1) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.37,
    metalness: 0.04,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });
export function createNeurotransmitterLab(host) {
  const state = {
    active: false,
    key: "glutamate",
    view: "molecule",
    playing: true,
    time: 0,
    speed: 1,
    representation: "ball",
    hydrogens: true,
    rotate: true,
    atom: null,
    drug: "none",
  };
  const root = new THREE.Group(),
    molecule = new THREE.Group(),
    atoms = new THREE.Group(),
    bonds = new THREE.Group(),
    transport = new THREE.Group();
  root.name = "Pracownia neuroprzekaźników";
  molecule.add(atoms, bonds);
  root.add(molecule, transport);
  host.scene.add(root);
  root.visible = false;
  const projection = createTransmitterProjections(host, root);
  const pins = createWorldAnnotations({
    ...host,
    onSelect: (item) => {
      state.time = item.time;
      state.playing = false;
      render();
      host.revealPanel();
    },
  });
  let data,
    loading,
    built = "",
    atomMeshes = [],
    bondMeshes = [],
    pointerDown;
  function ball(group, point, radius, color, opacity = 1) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      physical(color, opacity),
    );
    m.position.copy(V(point));
    group.add(m);
    return m;
  }
  function cylinder(group, a, b, radius, color) {
    const delta = b.clone().sub(a),
      m = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, delta.length(), 12),
        physical(color),
      );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V([0, 1, 0]), delta.normalize());
    group.add(m);
    return m;
  }
  const cells = [];
  for (const sign of [-1, 1]) {
    const m = ball(
      transport,
      [sign * 0.87, 0, 0],
      0.53,
      sign < 0 ? "#baa796" : "#acb8a8",
      0.18,
    );
    m.scale.set(0.85, 1.25, 1.3);
    cells.push(m);
  }
  const beads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.026, 10, 8),
      physical("#c9b9a1"),
      256,
    ),
    dummy = new THREE.Object3D();
  transport.add(beads);
  for (let i = 0; i < 256; i++) {
    const side = i < 128 ? -1 : 1,
      j = i % 128,
      row = Math.floor(j / 16),
      col = j % 16;
    dummy.position.set(
      side * (0.43 + 0.03 * Math.sin(col * 0.5)),
      (row - 3.5) * 0.12,
      (col - 7.5) * 0.09,
    );
    dummy.updateMatrix();
    beads.setMatrixAt(i, dummy.matrix);
  }
  const vesicles = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(),
      shell = ball(g, [0, 0, 0], 0.105, "#dfccae", 0.38);
    for (let j = 0; j < 8; j++)
      ball(
        g,
        [
          Math.sin(j * 2.4) * 0.056,
          Math.cos(j * 1.3) * 0.056,
          Math.sin(j * 1.7) * 0.056,
        ],
        0.009,
        "#b3d1aa",
      );
    transport.add(g);
    g.userData.shell = shell;
    vesicles.push(g);
  }
  const channels = [];
  for (let i = 0; i < 5; i++) {
    const channel = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.018, 10, 24),
      physical("#9ab5a7"),
    );
    channel.rotation.y = Math.PI / 2;
    channel.position.set(0.42, (i - 2) * 0.19, Math.sin(i * 1.6) * 0.22);
    transport.add(channel);
    channels.push(channel);
  }
  const glia = ball(transport, [0.13, 0.8, 0.18], 0.33, "#839f87", 0.45);
  glia.scale.set(1.4, 0.47, 0.65);
  const enzyme = ball(transport, [0.16, 0.36, 0.1], 0.07, "#d6bb8b");
  const gProtein = ball(transport, [0.64, -0.24, 0.1], 0.048, "#d4b47a"),
    effector = ball(transport, [0.9, -0.3, 0.1], 0.055, "#acbdb3");
  const particles = [],
    products = [],
    messengers = [];
  for (let i = 0; i < 72; i++)
    particles.push(ball(transport, [0, 0, 0], 0.014, "#b8dbbb"));
  for (let i = 0; i < 24; i++)
    products.push(ball(transport, [0, 0, 0], 0.011, "#d9b08b"));
  for (let i = 0; i < 24; i++)
    messengers.push(ball(transport, [0, 0, 0], 0.01, "#e4c07c"));
  const gradient = [];
  for (let i = 0; i < 12; i++)
    gradient.push(ball(transport, [0, 0, 0], 0.012, "#a0c4dd"));
  const stageNames = [
    "Gradient H⁺ i pakowanie",
    "Dokowanie pęcherzyka",
    "Fuzja i dyfuzja",
    "Receptor i odpowiedź",
    "Wychwyt / metabolizm",
  ];
  let shownStage = -1;
  function stageCopy(stage) {
    const t = TRANSMITTERS[state.key];
    return [
      `V-ATPaza zakwasza wnętrze pęcherzyka; gradient H⁺ napędza transporter ${t.pack}, który ładuje transmiter (niebieskie markery to protony).`,
      "Napełniony pęcherzyk przesuwa się do strefy aktywnej i dokuje przy błonie presynaptycznej, gotowy do fuzji.",
      "Napływ Ca²⁺ wyzwala fuzję. Cząsteczki transmitera dyfundują przez szczelinę synaptyczną (odległości są powiększone).",
      ["dopamine", "serotonin", "noradrenaline"].includes(state.key)
        ? "Receptory metabotropowe aktywują białko G i wtórne przekaźniki (złote markery). Odpowiedź jest wolniejsza i modulacyjna."
        : `Transmiter wiąże receptory: ${t.receptors}. Kanały jonotropowe zmieniają przewodnictwo błony.`,
      state.key === "acetylcholine"
        ? "AChE hydrolizuje acetylocholinę: niebieskie markery to cholina, złote — octan. Cholina wraca do zakończenia przez CHT1."
        : `Sygnał kończy się przez ${t.clear}. Szlaki neuronów i gleju są poglądowe.`,
    ][stage];
  }
  async function load() {
    if (data) return;
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch(
        new URL("./assets/neurotransmitters.json", import.meta.url),
      );
      if (!response.ok)
        throw new Error("Nie można wczytać konformerów PubChem.");
      data = await response.json();
      if (state.active) {
        build();
        fit();
        render();
      }
    })();
    try {
      await loading;
    } catch (error) {
      loading = null;
      host.toast(error.message);
    }
  }
  function clear(group) {
    for (const m of [...group.children]) {
      m.geometry.dispose();
      m.material.dispose();
      group.remove(m);
    }
  }
  function build() {
    if (!data || built === state.key) return;
    clear(atoms);
    clear(bonds);
    atomMeshes = [];
    bondMeshes = [];
    state.atom = null;
    const record = data[state.key],
      mean = V([0, 0, 0]),
      points = new Map(),
      lookup = new Map();
    record.atoms.forEach((a) => mean.add(V(a.position)));
    mean.divideScalar(record.atoms.length);
    for (const atom of record.atoms) {
      const spec = ATOMS[atom.element],
        point = V(atom.position).sub(mean).multiplyScalar(0.58),
        mesh = ball(atoms, point.toArray(), spec.radius, spec.color);
      mesh.userData = { atom };
      points.set(atom.id, point);
      lookup.set(atom.id, atom);
      atomMeshes.push(mesh);
    }
    for (const bond of record.bonds) {
      const a = points.get(bond.a),
        b = points.get(bond.b),
        direction = b.clone().sub(a).normalize(),
        normal = V([0, 0, 0]).crossVectors(direction, V([0, 1, 0]));
      if (normal.lengthSq() < 0.01)
        normal.crossVectors(direction, V([1, 0, 0]));
      normal.normalize();
      const count = Math.min(3, bond.order);
      for (let k = 0; k < count; k++) {
        const offset = normal
            .clone()
            .multiplyScalar((k - (count - 1) / 2) * 0.08),
          start = a.clone().add(offset),
          end = b.clone().add(offset),
          mid = start.clone().lerp(end, 0.5);
        for (const [from, to, element] of [
          [start, mid, lookup.get(bond.a).element],
          [mid, end, lookup.get(bond.b).element],
        ]) {
          const m = cylinder(bonds, from, to, 0.036, ATOMS[element].color);
          m.userData.hydrogen =
            lookup.get(bond.a).element === 1 ||
            lookup.get(bond.b).element === 1;
          bondMeshes.push(m);
        }
      }
    }
    built = state.key;
    representation();
  }
  function representation() {
    atomMeshes.forEach((m) => {
      m.visible = state.hydrogens || m.userData.atom.element !== 1;
      m.scale.setScalar(
        state.representation === "space"
          ? 2.05
          : state.representation === "sticks"
            ? 0.42
            : 1,
      );
    });
    bondMeshes.forEach(
      (m) =>
        (m.visible =
          state.representation !== "space" &&
          (state.hydrogens || !m.userData.hydrogen)),
    );
  }
  function fit() {
    const box = new THREE.Box3().setFromObject(molecule),
      sphere = box.getBoundingSphere(new THREE.Sphere());
    const distance = Math.max(
      5.8,
      (sphere.radius * 3.7) / Math.min(1, host.camera.aspect),
    );
    host.moveCamera(V([0, distance * 0.17, distance]), V([0, 0, 0]));
  }
  function show() {
    projection.hide();
    if (state.view === "projection" && !PROJECTIONS[state.key]) { state.key = "dopamine"; state.drug = "none"; }
    molecule.visible = state.view === "molecule";
    transport.visible = state.view === "transport";
    host.macroObjects().forEach((m) => (m.visible = false));
    if (state.view === "projection") {
      pins.hide();
      projection.set(state.key);
      $(".controls").inert = true;
      $(".viewport-title>div").innerHTML = "Układy projekcyjne <span>3D</span>";
      $("#world-scale").textContent = "Mózg fsaverage · jądra i szlaki przybliżone";
      render(); return;
    }
    host.controls.minDistance = 0.25;
    host.controls.maxDistance = 30;
    if (state.view === "molecule") {
      pins.set([]);
      if (data) fit();
      else host.moveCamera(V([0, 1.5, 9]), V([0, 0, 0]));
    } else {
      host.moveCamera(V([1.25, 1, 3.4]), V([0, 0.08, 0]));
      pins.set([
        {
          name: TRANSMITTERS[state.key].pack + " · pęcherzyk",
          point: [-0.62, 0.21, 0.16],
          time: 2.4,
        },
        { name: "Receptory", point: [0.43, 0.1, 0.2], time: 10 },
        {
          name:
            state.key === "acetylcholine"
              ? "AChE → cholina"
              : "Wychwyt / klirens",
          point: [0.16, 0.66, 0.16],
          time: 14,
        },
      ]);
    }
    $(".viewport-title>div").innerHTML =
      (state.view === "molecule"
        ? "Cząsteczka neurotransmitera"
        : "Transport synaptyczny") + " <span>3D</span>";
    $("#world-scale").textContent =
      "Konformer PubChem / mechanizm · skala sceny umowna";
    render();
  }
  function render() {
    if (state.view === "projection") {
      const config = PROJECTIONS[state.key];
      $("#mode-panel").innerHTML = `<div class="transmitter-panel"><span class="eyebrow">UKŁADY NEUROMODULACYJNE</span><h2>${TRANSMITTERS[state.key].name}</h2><div class="lab-tabs"><button data-transmitter-view="molecule">Cząsteczka 3D</button><button data-transmitter-view="transport">Transport</button><button class="active" data-transmitter-view="projection">Projekcje</button></div><label class="lab-field">Układ<select id="transmitter-select">${Object.keys(PROJECTIONS).map(k=>`<option value="${k}" ${k===state.key?"selected":""}>${TRANSMITTERS[k].name}</option>`).join("")}</select></label><p>${config.desc}</p><h3>Jądra źródłowe</h3>${config.sources.map(([name])=>`<p><span class="legend-dot" style="background:${config.color}"></span>${name}</p>`).join("")}<h3>Wybrane cele</h3><div class="connection-links">${config.targets.map(id=>`<button class="source-link" data-select="${id}">${host.registry.get(id).name} · ${id.startsWith("lh-")?"L":"P"}</button>`).join("")}</div><p class="lab-science-note">Szlaki schematyczne, położenia jąder przybliżone. Model nie segmentuje tych jąder; nie przedstawia pełnego zasięgu unerwienia ani aktywności konkretnej osoby.</p><a class="source-link" href="https://www.ncbi.nlm.nih.gov/books/NBK10795/" target="_blank" rel="noopener">Neuroprzekaźniki · źródło</a></div>`;
      return;
    }
    shownStage = -1;
    const t = TRANSMITTERS[state.key],
      record = data?.[state.key],
      atom = state.atom ? ATOMS[state.atom.element] : null;
    $("#mode-panel").innerHTML =
      `<div class="transmitter-panel"><span class="eyebrow">CZĄSTECZKA → SYNAPSA → SIEĆ</span><h2>${t.name}</h2><label class="lab-field">Neuroprzekaźnik<select id="transmitter-select">${Object.entries(
        TRANSMITTERS,
      )
        .map(
          ([k, v]) =>
            `<option value="${k}" ${state.key === k ? "selected" : ""}>${v.name}</option>`,
        )
        .join(
          "",
        )}</select></label><div class="lab-tabs"><button data-transmitter-view="molecule" class="${state.view === "molecule" ? "active" : ""}">Cząsteczka 3D</button><button data-transmitter-view="transport" class="${state.view === "transport" ? "active" : ""}">Transport</button><button data-transmitter-view="projection">Projekcje</button></div><p class="chemical-formula">${t.formula}</p>${
        state.view === "molecule"
          ? `<div class="lab-tabs representation"><button data-transmitter-style="ball" class="${state.representation === "ball" ? "active" : ""}">Kulki i wiązania</button><button data-transmitter-style="space" class="${state.representation === "space" ? "active" : ""}">Przestrzenny</button><button data-transmitter-style="sticks" class="${state.representation === "sticks" ? "active" : ""}">Szkielet</button></div><div class="mode-actions"><button class="secondary-button" data-transmitter-hydrogens aria-pressed="${state.hydrogens}">Atomy H</button><button class="secondary-button" data-transmitter-rotate aria-pressed="${state.rotate}">Obrót cząsteczki</button><button class="secondary-button" data-transmitter-fit>Dopasuj kadr</button></div><div class="atom-legend" aria-label="Kolory atomów">${Object.values(
              ATOMS,
            )
              .map(
                (a) =>
                  `<span><i style="background:${a.color}"></i><b>${a.symbol}</b> ${a.name}</span>`,
              )
              .join("")}</div><div class="lab-stage"><strong>${atom ? atom.name + " · atom " + state.atom.id : "Kliknij atom w modelu"}</strong><p>${record ? record.atoms.length + " atomów · " + record.bonds.length + " wiązań · CID " + record.cid : "Wczytywanie konformeru…"}</p></div>`
          : `<div class="lab-stage"><span class="eyebrow">ETAP MECHANIZMU</span><strong id="transmitter-phase"></strong><p id="transmitter-phase-copy"></p></div><label class="lab-field">Przebieg cyklu<input id="transmitter-seek" type="range" min="0" max="1000" value="${Math.round(((state.time % 16) / 16) * 1000)}" aria-label="Przewiń transport transmitera"></label><label class="lab-field">Tempo ilustracji<input id="transmitter-speed" type="range" min=".25" max="2" step=".25" value="${state.speed}" aria-label="Tempo transportu"></label>`
      }${state.view === "transport" ? `<div class="mode-actions"><button class="primary-button" data-transmitter-play>${state.playing ? "Pauza" : "Odtwarzaj"}</button><button class="secondary-button" data-transmitter-reset>Od początku</button></div>` : ""}${state.view === "transport" ? drugPanel(state) : ""}<p>${t.function}</p><dl class="lab-facts"><dt>Receptory</dt><dd>${t.receptors}</dd><dt>Pakowanie</dt><dd>${t.pack} · gradient elektrochemiczny H⁺ utrzymywany przez V-ATPazę</dd><dt>Zakończenie sygnału</dt><dd>${t.clear}</dd></dl><p class="lab-science-note">Jeden konformer PubChem. Protonacja, promienie atomów i skala sceny są poglądowe. Białka, stężenia, liczby cząstek oraz czas są schematami.</p>${record ? `<a class="source-link" href="${record.source}" target="_blank" rel="noopener">Konformer · PubChem CID ${record.cid}</a>` : ""}<br><a class="source-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3281572/" target="_blank" rel="noopener">Transport pęcherzykowy i błonowy · źródło</a></div>`;
  }
  function enter() {
    state.active = true;
    root.visible = true;
    $(".controls").inert = true;
    show();
    load();
  }
  function exit() {
    state.active = false;
    root.visible = false;
    pins.hide();
    projection.hide();
    $(".controls").inert = false;
  }
  function update(dt) {
    if (!state.active) return;
    if (state.view === "projection") {
      if (state.playing) state.time += dt * state.speed;
      projection.update(state.time); return;
    }
    host.macroObjects().forEach((m) => (m.visible = false));
    if (state.playing) state.time += dt * state.speed;
    if (state.view === "molecule" && state.rotate)
      molecule.rotation.y += dt * 0.13;
    pins.update(state.view === "transport", host.state.labels);
    if (state.view === "molecule") return;
    const drug = DRUGS[state.drug];
    const p = (state.time % 16) / 16,
      stage = Math.min(4, Math.floor(p * 5));
    if ($("#transmitter-phase") && stage !== shownStage) {
      shownStage = stage;
      $("#transmitter-phase").textContent =
        stage === 4 && state.key === "acetylcholine"
          ? "AChE → rozkład → CHT1"
          : stageNames[stage];
      $("#transmitter-phase-copy").textContent = stageCopy(stage);
    }
    const seek = $("#transmitter-seek");
    if (seek && document.activeElement !== seek)
      seek.value = Math.round(p * 1000);
    const mono = ["dopamine", "serotonin", "noradrenaline"].includes(state.key);
    gProtein.visible = effector.visible = mono;
    glia.visible = ["glutamate", "gaba"].includes(state.key);
    enzyme.visible = state.key === "acetylcholine" || drug?.effect === "metabolism";
    enzyme.position.set(drug?.effect === "metabolism" ? -0.8 : 0.16, 0.36, 0.1);
    enzyme.material.emissive.set(drug?.effect === "metabolism" ? "#78432d" : "#000000");
    vesicles.forEach((g, i) => {
      g.children.forEach(child => { if (child !== g.userData.shell) child.visible = drug?.effect !== "vesicles"; });
      g.position.set(
        -0.74 + Math.min(1, p / 0.4) * 0.23,
        Math.sin(i * 2.3) * 0.36,
        Math.cos(i * 1.7) * 0.24,
      );
      g.scale.setScalar(
        i === 0 && p > 0.4 && p < 0.6 ? Math.max(0.18, 1 - (p - 0.4) * 4) : 1,
      );
    });
    gradient.forEach((m, i) => {
      const q = (p * 5 + i / 12) % 1;
      m.visible = p < 0.22;
      m.position
        .copy(vesicles[i % 6].position)
        .add(V([-0.05 + q * 0.1, Math.sin(i) * 0.06, Math.cos(i) * 0.06]));
    });
    particles.forEach((m, i) => {
      const q = (p - 0.42) * (drug?.effect === "clearance" ? 2.25 : 3.6) - i * 0.0026;
      const available = ["synthesis", "metabolism", "release"].includes(drug?.effect) ? 72 : 48;
      m.visible = i < available && drug?.effect !== "vesicles" && q > 0 && q < 1.62;
      const y = Math.sin(i * 2.1) * 0.31,
        z = Math.cos(i * 1.6) * 0.25;
      if (q < 1) {
        m.position.set(
          -0.42 + q * 0.84,
          y * Math.sin(q * Math.PI),
          z * (0.3 + Math.sin(q * Math.PI) * 0.7),
        );
        // Deterministic irregular paths: stable when scrubbing or pausing.
        m.position.y += Math.sin(q * 19 + i * 2.7) * 0.035 * Math.sin(q * Math.PI);
        m.position.z += Math.cos(q * 23 + i * 1.3) * 0.03 * Math.sin(q * Math.PI);
        m.material.color.set(state.key === "gaba" ? "#c1a8d6" : "#b8dbbb");
        m.scale.setScalar(drug?.effect === "release" ? 1.15 : 1);
      } else {
        const u = (q - 1) / 0.62,
          glial = glia.visible && i % 2 === 0;
        m.position.set(
          0.4 - u * (glial ? 0.3 : 1.02),
          y * 0.35 + u * (glial ? 0.78 : 0.18),
          z * 0.5,
        );
        m.material.color.set(
          state.key === "acetylcholine" ? "#8fbdd9" : "#b8dbbb",
        );
        m.scale.setScalar(Math.max(0.15, 1 - u * 0.7));
      }
    });
    products.forEach((m, i) => {
      const q = (p - 0.75) * 5 - i * 0.009;
      m.visible = state.key === "acetylcholine" && drug?.effect !== "clearance" && q > 0 && q < 1;
      m.position.set(0.22 + q * 0.65, 0.26 + q * 0.6, Math.sin(i * 2.2) * 0.2);
      m.scale.setScalar(Math.max(0.15, 1 - q));
    });
    channels.forEach((m, i) =>
      m.material.emissive.setRGB(drug?.effect === "receptor" ? .2 : 0, p > 0.6 && p < 0.82 ? (drug?.effect === "potentiation" ? .4 : .12) : 0, 0),
    );
    gProtein.position.x = 0.64 + Math.max(0, p - 0.65) * 0.8;
    messengers.forEach((m, i) => {
      const q = (p - 0.66) * 5 - i * 0.018;
      m.visible = mono && drug?.effect !== "receptor" && q > 0 && q < 1;
      m.position.set(
        0.52 + q * 0.55,
        -0.17 + Math.sin(i * 2.1) * q * 0.25,
        Math.cos(i * 1.7) * q * 0.2,
      );
    });
  }
  host.controls.addEventListener("start", () => {
    if (!state.active || !state.rotate) return;
    state.rotate = false;
    // Manual orbit stops the turntable; keep the toggle honest.
    document
      .querySelector("[data-transmitter-rotate]")
      ?.setAttribute("aria-pressed", "false");
  });
  const canvas = host.canvasHost;
  canvas.addEventListener(
    "pointerdown",
    (e) => (pointerDown = { x: e.clientX, y: e.clientY }),
  );
  canvas.addEventListener("pointerup", (e) => {
    if (
      !host.isCanvasClick(e) ||
      !state.active ||
      state.view !== "molecule" ||
      !pointerDown ||
      Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 5
    )
      return;
    const rect = canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      host.camera,
    );
    const hit = ray.intersectObjects(
      atomMeshes.filter((m) => m.visible),
      false,
    )[0];
    if (hit) {
      state.atom = hit.object.userData.atom;
      atomMeshes.forEach((m) =>
        m.material.emissive.set(m === hit.object ? "#587668" : "#000000"),
      );
      render();
      host.revealPanel();
    } else if (state.atom) resetView();
  });
  document.addEventListener("click", (e) => {
    if (!state.active) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.transmitterView) {
      state.view = b.dataset.transmitterView;
      show();
    }
    if (b.dataset.transmitterStyle) {
      state.representation = b.dataset.transmitterStyle;
      representation();
      render();
    }
    if (b.hasAttribute("data-transmitter-hydrogens")) {
      state.hydrogens = !state.hydrogens;
      representation();
      render();
    }
    if (b.hasAttribute("data-transmitter-rotate")) {
      state.rotate = !state.rotate;
      render();
    }
    if (b.hasAttribute("data-transmitter-fit")) fit();
    if (b.hasAttribute("data-transmitter-play")) {
      state.playing = !state.playing;
      render();
    }
    if (b.hasAttribute("data-transmitter-reset")) state.time = 0;
  });
  document.addEventListener("change", (e) => {
    if (state.active && e.target.id === "transmitter-drug") { state.drug = e.target.value; state.time = 0; render(); }
    if (state.active && e.target.id === "transmitter-select") {
      state.key = e.target.value;
      state.drug = "none";
      state.time = 0;
      build();
      show();
    }
  });
  document.addEventListener("input", (e) => {
    if (!state.active) return;
    if (e.target.id === "transmitter-seek") {
      state.time = (+e.target.value / 1000) * 16;
      state.playing = false;
      const play = $("[data-transmitter-play]");
      if (play) play.textContent = "Odtwarzaj";
    }
    if (e.target.id === "transmitter-speed") state.speed = +e.target.value;
  });
  function resetView() { state.atom = null; state.rotate = false; atomMeshes.forEach(m=>m.material.emissive.set("#000000")); show(); }
  return { root, state, enter, exit, update, resetView, clearSelection: resetView };
}
