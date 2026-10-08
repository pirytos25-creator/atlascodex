import * as THREE from "three";
import { TRACTS } from "./data.js";
import { saltatoryProgress } from "./physiology-model.js";
import { createSynapseDetails } from "./synapse-detail.js";

const $ = (s) => document.querySelector(s),
  v = (a) => new THREE.Vector3(...a),
  formatSpeed = (x) => x.toLocaleString("pl-PL", { maximumFractionDigits: 2 }) + "×";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const NOTES = {
  vesicle: [
    "Pęcherzyki i strefa aktywna",
    "Część pęcherzyków jest dokowana i przygotowana do uwolnienia przed nadejściem potencjału. Lokalny napływ Ca²⁺ uruchamia czujniki wapnia i maszynerię fuzji, m.in. synaptotagminę oraz białka SNARE. Liczba markerów transmitera w animacji jest umowna.",
  ],
  clearance: [
    "Klirens transmitera",
    "Po pobudzeniu receptora transmiter jest usuwany ze szczeliny. Dla glutaminianu i GABA istotne są transportery w neuronach i komórkach glejowych; inne transmitery mogą być także rozkładane enzymatycznie. W scenie fragment gleju i transportery są schematyczne.",
  ],
  gprotein: [
    "GPCR: GDP, GTP i wtórne przekaźniki",
    "Aktywowany receptor sprzyja wymianie GDP na GTP w białku G. Jego podjednostki wpływają na efektory, kanały lub wytwarzanie wtórnych przekaźników. To inny proces niż bezpośrednie otwarcie kanału jonotropowego. Poszczególne GPCR korzystają z różnych kaskad.",
  ],

  soma: [
    "Soma i integracja wejść",
    "Dendryty i soma integrują potencjały postsynaptyczne. EPSP i IPSP mogą sumować się w czasie i przestrzeni. Potencjał czynnościowy jest zwykle inicjowany w segmencie początkowym aksonu po przekroczeniu progu. Kształty i rozmiary w tej scenie są schematyczne.",
  ],
  axon: [
    "Fala depolaryzacji",
    "Potencjał czynnościowy to regenerowana zmiana napięcia błony. Napływ Na⁺ przez kanały zależne od napięcia wywołuje depolaryzację, a prądy K⁺ uczestniczą w repolaryzacji. Świetlista cząstka oznacza położenie fali; nie jest pojedynczym elektronem podróżującym przez cały neuron.",
  ],
  myelin: [
    "Mielina i przewężenia Ranviera",
    "Mielina zmniejsza pojemność i zwiększa opór błony. Prąd rozprzestrzenia się biernie pod osłonką, a potencjał jest regenerowany w przewężeniach. Przewodzenie skokowe nie oznacza znikania sygnału i teleportowania go między węzłami.",
  ],
  calcium: [
    "Ca²⁺ i uwalnianie transmitera",
    "Depolaryzacja zakończenia otwiera presynaptyczne kanały Ca²⁺. Lokalny napływ wapnia uruchamia fuzję gotowych do uwolnienia pęcherzyków z błoną. Przestrzeń synapsy jest w animacji powiększona dla czytelności.",
  ],
  synapse: [
    "Synapsa chemiczna i elektryczna",
    "Chemiczna: neurotransmiter przechodzi przez szczelinę i działa na receptory; sygnał elektryczny zamienia się na chemiczny, a następnie na odpowiedź postsynaptyczną. Elektryczna: kanały połączeń szczelinowych łączą cytoplazmy i pozwalają na przepływ prądu jonowego. Często przewodzą w obu kierunkach; scena śledzi jeden kierunek.",
  ],
  receptor: [
    "Odpowiedź postsynaptyczna",
    "Receptor jonotropowy bezpośrednio zmienia przewodnictwo kanału. Receptor metabotropowy uruchamia białko G i kaskadę modulującą pracę komórki. EPSP nie gwarantuje potencjału czynnościowego. Hamowanie może obejmować hiperpolaryzację lub bocznikowanie; wpływ GABA zależy m.in. od gradientu Cl⁻.",
  ],
  energy: [
    "Energia i gradienty jonowe",
    "Energia pochodzi m.in. z ATP zużywanego na utrzymanie gradientów jonowych i obrót pęcherzyków. Na⁺/K⁺-ATPaza przenosi 3 Na⁺ na zewnątrz i 2 K⁺ do wnętrza na cykl z hydrolizą ATP. Pompa nie tworzy szybkiego zbocza potencjału czynnościowego; podtrzymuje warunki do pobudliwości.",
  ],
  route: [
    "Droga w skali mózgu",
    "Świetliste impulsy ilustrują kierunek propagacji w przykładowym pęczku. Drogi mają schematyczny przebieg. Pęczek zawiera wiele aksonów, a widoczne strumienie nie są rzeczywistą liczbą włókien, liczbą neuronów ani zapisem aktywności.",
  ],
};
export function createImpulseLab(host) {
  const { scene, camera, controls } = host;
  const state = {
    active: false,
    scope: "macro",
    route: "arcuate",
    playing: true,
    follow: false,
    speed: 1,
    progress: 0,
    myelin: true,
    ionDetails: true,
    synapse: "ampa",
    summation: false,
  };
  const root = new THREE.Group();
  const signalColor = new THREE.Color();
  root.name = "Neurophysiology laboratory";
  root.visible = false;
  scene.add(root);
  const macro = new THREE.Group(),
    micro = new THREE.Group();
  root.add(macro, micro);
  const labels = document.createElement("div");
  labels.id = "lab-labels";
  labels.className = "labels-layer";
  labels.hidden = true;
  $("#viewport").append(labels);
  const hud = document.createElement("div");
  hud.id = "impulse-hud";
  hud.className = "impulse-hud";
  hud.hidden = true;
  $("#viewport").append(hud);
  const markerGeo = new THREE.SphereGeometry(0.035, 16, 12),
    glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#b8ffe5").multiplyScalar(5),
      toneMapped: false,
    });
  const head = new THREE.Mesh(markerGeo, glowMat);
  root.add(head);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0x81ffd0,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  root.add(halo);
  const light = new THREE.PointLight(0x83ffcc, 2.5, 1.8);
  root.add(light);
  const tail = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x7cffe4, toneMapped: false }),
    64,
  );
  tail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(tail);
  let routeCurve,
    microCurve,
    routeGroup,
    curve,
    previous,
    elapsed = 0,
    phase = -1,
    microBuilt = false,
    labelItems = [],
    myelinMeshes = [],
    ions = [],
    transmitters = [],
    vesicles = [],
    junctions = [],
    receptors = [],
    somas = [],
    pumpGroup,
    energyParticles = [],
    otherPulses = [],
    details,
    cameraTween,
    followFocus = new THREE.Vector3(),
    cameraMatrix = new THREE.Matrix4(),
    cameraQuaternion = new THREE.Quaternion();
  const dummy = new THREE.Object3D();

  function moveCamera(position, target, duration = 1.35) {
    host.stopTransitions();
    state.follow = false;
    controls.enabled = true;
    host.resize();
    cameraTween = {
      started: performance.now(),
      duration,
      from: camera.position.clone(),
      to: position.clone(),
      fromTarget: controls.target.clone(),
      target: target.clone(),
    };
  }
  function cameraPreset(name) {
    const aspect =
      $("#canvas-host").clientWidth /
      Math.max(1, $("#canvas-host").clientHeight);
    if (name === "overview")
      moveCamera(
        v([-0.2, 3, Math.max(12, 16.5 / aspect)]),
        v([0, 0.3, 0]),
        1.6,
      );
    if (name === "synapse")
      moveCamera(v([1.22, 0.68, 1.48]), v([1.3, 0.025, 0]), 1.7);
    if (name === "axon")
      moveCamera(v([-1.2, 1.25, 5]), v([-1.2, 0, 0]), 1.4);
    if (name === "post")
      moveCamera(v([4.5, 2.3, 4.4]), v([3.65, 0.65, 0.1]), 1.7);
    renderPanel();
  }
  controls.addEventListener("start", () => {
    if (cameraTween) {
      cameraTween = null;
    }
  });

  function material(color, emissive = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.05,
      emissive: color,
      emissiveIntensity: emissive,
    });
  }
  function tube(group, points, radius, color) {
    const c = new THREE.CatmullRomCurve3(
      points.map((p) => (Array.isArray(p) ? v(p) : p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        c,
        Math.max(24, points.length * 16),
        radius,
        8,
        false,
      ),
      material(color, 0.13),
    );
    group.add(mesh);
    return { curve: c, mesh };
  }
  function ball(group, pos, radius, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 14),
      material(color, 0.15),
    );
    mesh.position.copy(v(pos));
    group.add(mesh);
    return mesh;
  }
  function label(id, text, pos) {
    const el = document.createElement("button");
    el.className = "world-label lab-label";
    el.dataset.labNote = id;
    el.textContent = text;
    labels.append(el);
    labelItems.push({ el, position: v(pos) });
  }
  function clearLabels() {
    labels.replaceChildren();
    labelItems = [];
  }
  function disposeGroup(g) {
    g.traverse((o) => {
      o.geometry?.dispose();
      if (o.material)
        Array.isArray(o.material)
          ? o.material.forEach((m) => m.dispose())
          : o.material.dispose();
    });
    g.removeFromParent();
  }
  function buildRoute() {
    if (routeGroup) disposeGroup(routeGroup);
    routeGroup = new THREE.Group();
    macro.add(routeGroup);
    const t = TRACTS.find((t) => t.key === state.route);
    routeCurve = new THREE.CatmullRomCurve3(t.points.map(v));
    curve = routeCurve;
    for (let i = 0; i < 7; i++) {
      const pts = t.points.map((p, j) =>
        v([
          p[0] + (i - 3) * 0.018,
          p[1] + Math.sin(i + j) * 0.012,
          p[2] + Math.cos(i - j) * 0.012,
        ]),
      );
      const m = tube(routeGroup, pts, 0.011, t.color).mesh;
      m.material.emissiveIntensity = 0.35;
    }
    const start = routeCurve.getPointAt(0),
      end = routeCurve.getPointAt(1);
    ball(routeGroup, start.toArray(), 0.07, "#b8f3cd");
    ball(routeGroup, end.toArray(), 0.07, t.color);
    otherPulses = [];
    for (let i = 0; i < 5; i++) {
      const m = ball(routeGroup, start.toArray(), 0.022, t.color);
      m.material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(t.color).multiplyScalar(1.8),
        toneMapped: false,
      });
      otherPulses.push(m);
    }
    clearLabels();
    label("route", "Początek szlaku", start.toArray());
    label("route", "Zakończenie szlaku", end.toArray());
    state.progress = 0;
    host.select(t.key, { open: false, reveal: true });
    host.state.deep = false;
    host.state.tracts = false;
    host.state.left = host.state.right = true;
    host.updateVisibility();
    host.stopTransitions();
    host.setOpacity(0.94);
    scene.getObjectByName("atlas-grid").visible = true;
    if (!state.follow)
      moveCamera(
        start.clone().add(new THREE.Vector3(-3, 2.4, 3.2)),
        start.clone().lerp(end, 0.5),
        1.5,
      );
  }
  function branch(group, start, dir, length, radius, depth, seed) {
    const unit = dir.clone().normalize();
    const mid = start
      .clone()
      .addScaledVector(unit, length * 0.5)
      .add(
        new THREE.Vector3(
          Math.sin(seed) * 0.12,
          Math.cos(seed) * 0.1,
          Math.sin(seed * 2) * 0.08,
        ),
      );
    const end = start.clone().addScaledVector(unit, length);
    tube(group, [start, mid, end], radius, "#77a39e");
    if (depth > 0) {
      for (let k = 0; k < 2; k++) {
        const next = unit
          .clone()
          .add(
            v([
              Math.sin(seed * 1.7 + k) * 0.8,
              Math.cos(seed + k) * 0.65,
              Math.sin(seed * 2.8 + k) * 0.75,
            ]),
          )
          .normalize();
        branch(
          group,
          end,
          next,
          length * 0.64,
          radius * 0.64,
          depth - 1,
          seed * 1.3 + k + 2,
        );
      }
    }
  }
  function buildMicro() {
    const soma1 = ball(micro, [-3.65, 0, 0], 0.52, "#cfad9c"),
      soma2 = ball(micro, [3.7, 0.7, 0.1], 0.55, "#9eb9c6");
    soma1.scale.set(1, 1.2, 0.9);
    soma2.scale.set(1.05, 1, 0.95);
    somas.push(soma1, soma2);
    ball(micro, [-3.65, 0, 0], 0.23, "#718caf");
    ball(micro, [3.7, 0.7, 0.1], 0.22, "#b293b2");
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      branch(
        micro,
        v([-3.65, 0, 0]),
        v([Math.cos(a) * 0.8, Math.sin(a), Math.sin(i * 1.8) * 0.45]),
        1,
        0.065,
        3,
        i + 2,
      );
      branch(
        micro,
        v([3.7, 0.7, 0.1]),
        v([Math.cos(a), Math.sin(a), Math.cos(i * 2.5) * 0.45]),
        1.1,
        0.055,
        3,
        i + 11,
      );
    }
    const a = tube(
      micro,
      [
        [-3.22, 0, 0],
        [-2.8, -0.28, 0.12],
        [-2, -0.12, 0.25],
        [-1.15, 0.3, 0.05],
        [-0.3, 0.35, -0.15],
        [0.6, 0.12, 0],
        [1.05, 0, 0],
      ],
      0.045,
      "#ddc2a2",
    );
    microCurve = a.curve;
    tube(
      micro,
      [
        [1.52, 0, 0],
        [2.15, 0.1, 0.04],
        [2.8, 0.5, 0.1],
        [3.2, 0.65, 0.1],
      ],
      0.07,
      "#8bacb4",
    );
    tube(
      micro,
      [
        [4.15, 0.6, 0.1],
        [4.9, 0.35, 0.2],
        [5.6, 0.7, 0.3],
      ],
      0.05,
      "#9ac2bd",
    );
    for (let i = 0; i < 9; i++) {
      const lo = 0.08 + i * 0.088,
        hi = lo + 0.065;
      const points = Array.from({ length: 9 }, (_, j) =>
        microCurve.getPointAt(lo + ((hi - lo) * j) / 8),
      );
      const sheath = tube(micro, points, 0.115, "#adc0d5").mesh;
      sheath.material.roughness = 0.28;
      sheath.material.transparent = true;
      sheath.material.opacity = 0.7;
      myelinMeshes.push(sheath);
      const node = ball(
        micro,
        microCurve.getPointAt(hi + 0.007).toArray(),
        0.057,
        "#f3c977",
      );
      node.userData.progress = hi + 0.007;
      myelinMeshes.push(node);
    }
    const pre = ball(micro, [1.13, 0, 0], 0.23, "#c2b392"),
      post = ball(micro, [1.48, 0, 0], 0.23, "#8aaebe");
    pre.scale.set(0.63, 1.2, 1.2);
    post.scale.set(0.6, 1.2, 1.2);
    for (let i = 0; i < 16; i++) {
      const p = [
        1.0 + Math.sin(i * 2.5) * 0.085,
        Math.cos(i * 1.6) * 0.12,
        Math.sin(i * 1.7) * 0.12,
      ];
      vesicles.push(ball(micro, p, 0.027, "#d8d998"));
      const particle = ball(micro, [1.2, 0, 0], 0.018, "#91ffd7");
      particle.material = new THREE.MeshBasicMaterial({
        color: 0x9cffcf,
        toneMapped: false,
      });
      particle.visible = false;
      particle.userData.seed = i;
      transmitters.push(particle);
    }
    for (let i = 0; i < 8; i++) {
      const channel = new THREE.Mesh(
        new THREE.TorusGeometry(0.027, 0.009, 7, 12),
        material("#92e9ce", 0.6),
      );
      channel.rotation.y = Math.PI / 2;
      channel.position.set(
        1.38,
        Math.sin(i * 2.4) * 0.14,
        Math.cos(i * 2.4) * 0.14,
      );
      micro.add(channel);
      receptors.push(channel);
      const ion = ball(micro, [1.08, 0.3, 0], 0.016, "#90c7ff");
      ion.userData.seed = i;
      ions.push(ion);
      const gap = tube(
        micro,
        [
          [1.19, Math.sin(i) * 0.1, Math.cos(i) * 0.1],
          [1.42, Math.sin(i) * 0.1, Math.cos(i) * 0.1],
        ],
        0.016,
        "#a9dcff",
      ).mesh;
      junctions.push(gap);
    }
    details = createSynapseDetails({
      micro,
      curve: microCurve,
      pre,
      post,
      vesicles,
      ions,
      receptors,
      junctions,
      axon: a.mesh,
    });
    pumpGroup = new THREE.Group();
    micro.add(pumpGroup);
    const mitochondrion = ball(pumpGroup, [-3.6, -0.22, 0.3], 0.14, "#dc975c");
    mitochondrion.scale.set(1.6, 0.7, 0.7);
    const pump = ball(pumpGroup, [-1.5, 0.25, 0.17], 0.085, "#e4bd7b");
    pump.scale.set(0.7, 1.1, 0.65);
    for (let i = 0; i < 5; i++) {
      const sodium = i < 3,
        m = ball(
          pumpGroup,
          [-1.5, 0.28, 0.17],
          0.023,
          sodium ? "#ffc987" : "#8dbaff",
        );
      m.userData = { sodium, seed: i };
      energyParticles.push(m);
    }
  }
  function configureMicro() {
    myelinMeshes.forEach((m) => (m.visible = state.myelin));
    vesicles.forEach((m) => (m.visible = state.synapse !== "electrical"));
    junctions.forEach((m) => (m.visible = state.synapse === "electrical"));
    receptors.forEach((m) =>
      m.material.color.set(
        state.synapse === "gaba"
          ? "#eab2d6"
          : state.synapse === "metabotropic"
            ? "#e2c16c"
            : "#92e9ce",
      ),
    );
    clearLabels();
    label("soma", "Soma i integracja", [-3.65, 0.55, 0]);
    label("axon", "Akson — fala depolaryzacji", [-1.4, 0.38, 0.05]);
    if (state.myelin)
      label("myelin", "Mielina / przewężenia", [-2.15, 0.16, 0.22]);
    label(
      "synapse",
      state.synapse === "electrical"
        ? "Połączenie szczelinowe"
        : "Synapsa chemiczna",
      [1.3, 0.3, 0],
    );
    label("receptor", "Błona postsynaptyczna", [2.1, 0.2, 0]);
    label("energy", "ATP · 3 Na⁺ / 2 K⁺", [-1.5, 0.29, 0.17]);
    label("vesicle", "Pęcherzyki i fuzja", [1.11, -0.2, 0.04]);
    if (state.synapse !== "electrical") {
      label("calcium", "Ca²⁺ · kanały", [1.255, 0.2, 0.15]);
      label("clearance", "Klirens transmitera", [1.26, 0.39, 0.19]);
    }
    if (state.synapse === "metabotropic")
      label("gprotein", "GDP / GTP · białko G", [1.62, -0.15, 0.12]);
    details?.configure(state);
    curve = microCurve;
    state.progress = 0;
    phase = -1;
  }
  function setScope(scope) {
    state.scope = scope;
    state.follow = false;
    controls.enabled = true;
    controls.maxDistance = scope === "micro" ? 50 : 24;
    controls.minDistance = scope === "micro" ? 0.25 : 1.3;
    host.resize();
    macro.visible = scope === "macro";
    micro.visible = scope === "micro";
    $(".controls").inert = scope === "micro";
    document.body.dataset.labScope = scope;
    if (scope === "macro") {
      host.updateVisibility();
      buildRoute();
      $(".viewport-title>div").innerHTML = "Impuls w mózgu <span>3D</span>";
    } else {
      host.macroObjects().forEach((m) => (m.visible = false));
      if (!microBuilt) {
        buildMicro();
        microBuilt = true;
      }
      configureMicro();
      const aspect =
        $("#canvas-host").clientWidth /
        Math.max(1, $("#canvas-host").clientHeight);
      moveCamera(
        v([-0.2, 3, Math.max(12, 16.5 / aspect)]),
        v([0, 0.3, 0]),
        1.6,
      );
      $(".viewport-title>div").innerHTML = "Neuron i synapsa <span>3D</span>";
      $("#selection-status").textContent =
        "Schemat neuronu i synapsy · mechanizmy neurofizjologii";
    }
    $("#view-label").textContent =
      scope === "micro"
        ? "SCHEMAT MECHANIZMU · SKALA UMOWNA"
        : "SZLAK SCHEMATYCZNY";
    $("#world-scale").textContent =
      scope === "micro"
        ? "Skala umowna · tempo ilustracyjne"
        : "1 jednostka = 40 mm";
    $(".model-credit").firstChild.textContent =
      scope === "micro" ? "SCHEMAT MECHANIZMU " : "MODEL SZABLONOWY ";
    scene.background = new THREE.Color(
      scope === "micro" ? "#091b22" : "#14231b",
    );
    renderPanel();
  }
  function enter({ resumeCamera = false } = {}) {
    state.active = true;
    previous = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      selected: host.state.selected,
      viewLabel: $("#view-label").textContent,
      opacity: host.state.opacity,
      left: host.state.left,
      right: host.state.right,
      deep: host.state.deep,
      tracts: host.state.tracts,
      separation: host.state.separation,
      section: host.state.section,
    };
    host.state.separation = 0;
    host.state.renderSeparation = 0;
    host.state.section = "none";
    host.updateVisibility();
    host.stopTransitions();
    root.visible = true;
    labels.hidden = false;
    hud.hidden = false;
    $(".orientation").style.display = "none";
    $(".view-presets").style.display = "none";
    $("#canvas-hint").hidden = true;
    setScope(state.scope);
    if (resumeCamera) {
      cameraTween = null;
      host.stopTransitions();
    }
  }
  function exit() {
    cameraTween = null;
    state.active = false;
    state.follow = false;
    root.visible = false;
    labels.hidden = true;
    hud.hidden = true;
    $(".controls").inert = false;
    delete document.body.dataset.labScope;
    controls.enabled = true;
    controls.maxDistance = 24;
    controls.minDistance = 1.3;
    host.resize();
    $(".orientation").style.display = "";
    $(".view-presets").style.display = "";
    $("#canvas-hint").hidden = false;
    $(".viewport-title>div").innerHTML = "Mózg człowieka <span>3D</span>";
    $("#world-scale").textContent = "1 jednostka = 40 mm";
    $(".model-credit").firstChild.textContent = "MODEL SZABLONOWY ";
    scene.background = new THREE.Color("#14231b");
    if (previous) {
      $("#view-label").textContent = previous.viewLabel || "WIDOK SWOBODNY";
      host.moveCamera?.(previous.position, previous.target);
      host.select(previous.selected, { open: false, reveal: false });
      Object.assign(host.state, {
        left: previous.left,
        right: previous.right,
        deep: previous.deep,
        tracts: previous.tracts,
        separation: previous.separation,
        renderSeparation: previous.separation,
        section: previous.section,
      });
      host.setOpacity(previous.opacity);
    }
    scene.getObjectByName("atlas-grid").visible = true;
    host.updateVisibility();
  }
  function renderPanel() {
    const t = TRACTS.find((t) => t.key === state.route);
    $("#mode-panel").innerHTML =
      `<div class="impulse-panel"><span class="eyebrow">LABORATORIUM SYGNAŁU</span><h2>Podążaj za impulsem<span class="accent">.</span></h2><div class="lab-tabs"><button data-lab-scope="macro" class="${state.scope === "macro" ? "active" : ""}">Drogi mózgu</button><button data-lab-scope="micro" class="${state.scope === "micro" ? "active" : ""}">Neuron i synapsa</button><button data-phys-scope="membrane">Potencjał błonowy</button><button data-phys-scope="pathology">Patologia przewodzenia</button></div>${state.scope === "macro" ? `<label class="lab-field">Droga sygnału<select id="lab-route">${TRACTS.map((r) => `<option value="${r.key}" ${r.key === state.route ? "selected" : ""}>${r.name}</option>`).join("")}</select></label><p>${t.tag}. Tory i strumienie są schematyczne.</p>` : `<label class="lab-field">Sposób transmisji<select id="lab-synapse"><option value="ampa" ${state.synapse === "ampa" ? "selected" : ""}>Chemiczna · glutaminian / AMPA</option><option value="gaba" ${state.synapse === "gaba" ? "selected" : ""}>Chemiczna · GABA-A</option><option value="metabotropic" ${state.synapse === "metabotropic" ? "selected" : ""}>Metabotropowa · białko G</option><option value="electrical" ${state.synapse === "electrical" ? "selected" : ""}>Elektryczna · gap junction</option></select></label><div class="lab-switches"><button data-lab-myelin class="${state.myelin ? "active" : ""}" aria-pressed="${state.myelin}">Osłonka mielinowa</button><button data-lab-sum ${state.synapse !== "ampa" ? 'disabled title="Sumowanie pokazano w przykładzie synapsy AMPA"' : ""} class="${state.summation ? "active" : ""}" aria-pressed="${state.summation}">Dodatkowe pobudzenie</button></div>`}${state.scope === "micro" ? `<button class="secondary-button" data-lab-ions aria-pressed="${state.ionDetails}">Jony i kanały Na⁺ / K⁺</button><div class="ion-legend"><span><i style="background:#ffc987"></i>Na⁺ · do wnętrza</span><span><i style="background:#8dbaff"></i>K⁺ · na zewnątrz</span><span><i style="background:#c8a9ff"></i>Ca²⁺ · zakończenie</span></div><p class="research-caption">${state.myelin?"Jasny znacznik zatrzymuje się przy przewężeniu, potem szybko przechodzi do kolejnego. Pod mieliną rozchodzi się prąd bierny; w węzłach odtwarza się AP.":"Bez mieliny fala i lokalna wymiana jonów przesuwają się ciągle wzdłuż błony."} Pomarańczowe i niebieskie jony przechodzą lokalnie przez kanały, nie biegną przez cały akson.</p><div class="lab-camera-presets" aria-label="Kadry kamery"><button data-lab-camera="overview">Cały neuron</button><button data-lab-camera="axon">Akson i jony</button><button data-lab-camera="synapse">Zbliż synapsę</button><button data-lab-camera="post">Drugi neuron</button></div>` : ""}<div class="lab-stage"><span class="eyebrow">AKTUALNY ETAP</span><strong id="lab-stage-title"></strong><p id="lab-stage-copy"></p></div><div class="lab-player"><button class="primary-button" data-lab-play>${state.playing ? "Pauza" : "Odtwarzaj"}</button><button class="secondary-button" data-lab-reset>Od początku</button><button class="follow-button ${state.follow ? "active" : ""}" data-lab-follow aria-pressed="${state.follow}">${state.follow ? "Odłącz kamerę" : "Podążaj · 3. osoba"}</button></div><label class="lab-field lab-speed">Tempo animacji <output id="lab-speed-value">${formatSpeed(state.speed)}</output><input id="lab-speed" type="range" min="0.25" max="2" step="0.25" value="${state.speed}" aria-label="Tempo animacji impulsu"></label><label class="lab-field">Przebieg cyklu<input id="lab-seek" type="range" min="0" max="1000" value="${Math.round(state.progress * 1000)}" aria-label="Przewiń cykl impulsu"></label><div class="lab-science-note">Świetlista fala ilustruje sygnał, a nie transport elektronów lub paczki energii. Czas, rozmiary synapsy i wartości napięcia są poglądowe.</div><button class="source-link" data-lab-note="${state.scope === "micro" ? "synapse" : "route"}">Otwórz wyjaśnienie mechanizmu</button></div>`;
    phase = -1;
  }
  function stages() {
    if (state.scope === "macro") {
      const t = TRACTS.find((t) => t.key === state.route);
      return [
        {
          at: 0,
          title: "Propagacja w pęczku",
          copy: `${t.name}: fala przemieszcza się wzdłuż przykładowego toru. Włókna w pęczku nie aktywują się wszystkie równocześnie.`,
          tag: "SYGNAŁ AKSONALNY",
        },
      ];
    }
    const type = state.synapse;
    return [
      {
        at: 0,
        title: "Inicjacja i depolaryzacja",
        copy: "Próg w segmencie początkowym. Otwieranie kanałów Na⁺ regeneruje falę potencjału czynnościowego.",
        tag: "Na⁺ · DEPOLARYZACJA",
      },
      {
        at: 0.13,
        title: state.myelin ? "Przewodzenie skokowe" : "Przewodzenie ciągłe",
        copy: state.myelin
          ? "Pod osłonką rozchodzi się prąd bierny. Potencjał czynnościowy jest regenerowany w przewężeniach Ranviera."
          : "Kolejne obszary błony regenerują potencjał czynnościowy. Inaktywacja Na⁺ i prądy K⁺ umożliwiają repolaryzację.",
        tag: state.myelin ? "MIELINA · WĘZŁY" : "Na⁺ / K⁺ · BŁONA",
      },
      {
        at: 0.55,
        title:
          type === "electrical" ? "Prąd jonowy przez kanały" : "Napływ Ca²⁺",
        copy:
          type === "electrical"
            ? "Połączenia szczelinowe pozwalają prądowi jonowemu płynąć bez uwalniania neurotransmitera. Sygnał może przewodzić w obie strony."
            : "Depolaryzacja zakończenia otwiera kanały wapniowe. Ca²⁺ wyzwala fuzję pęcherzyków z błoną presynaptyczną.",
        tag: type === "electrical" ? "GAP JUNCTION" : "Ca²⁺ · EGZOCYTOZA",
      },
      {
        at: 0.69,
        title:
          type === "electrical"
            ? "Sprzężenie elektryczne"
            : "Transmiter i receptor",
        copy:
          type === "ampa"
            ? "Glutaminian aktywuje receptory AMPA; zmiana przewodnictwa może wywołać EPSP."
            : type === "gaba"
              ? "GABA-A zwiększa przewodnictwo anionowe. Efekt hamujący zależy od gradientu Cl⁻ i warunków błony."
              : type === "metabotropic"
                ? "Receptor aktywuje białko G i kaskadę wewnątrzkomórkową. Efekt jest zwykle wolniejszy i modulacyjny."
                : "Prąd wpływa na napięcie komórki postsynaptycznej, sprzyjając synchronizacji.",
        tag:
          type === "gaba"
            ? "GABA-A · HAMOWANIE"
            : type === "metabotropic"
              ? "GPCR · MODULACJA"
              : type === "electrical"
                ? "SPRZĘŻENIE"
                : "AMPA · EPSP",
      },
      {
        at: 0.83,
        title:
          state.summation && type === "ampa"
            ? "Sumowanie i możliwy nowy AP"
            : "Odpowiedź postsynaptyczna",
        copy:
          state.summation && type === "ampa"
            ? "Dodatkowe wejścia mogą pomóc osiągnąć próg. Nowy potencjał powstaje w neuronie postsynaptycznym; poprzedni nie przechodzi przez szczelinę."
            : "PSP ma stopniowaną amplitudę i nie gwarantuje nowego potencjału czynnościowego. Pobudzanie, hamowanie i modulacja mają różne skutki.",
        tag: type === "gaba" ? "IPSP / BOCZNIKOWANIE" : "INTEGRACJA WEJŚĆ",
      },
      {
        at: 0.94,
        title: "ATP podtrzymuje gradienty",
        copy: "Na⁺/K⁺-ATPaza i procesy obrotu pęcherzyków zużywają energię. Pompa podtrzymuje gradienty; szybką fazę AP tworzą prądy kanałowe.",
        tag: "ATP · HOMEOSTAZA",
      },
    ];
  }
  function pointAt(p, target = new THREE.Vector3()) {
    if (state.scope === "macro")
      return routeCurve.getPointAt(THREE.MathUtils.clamp(p, 0, 1), target);
    if (p < 0.59) return microCurve.getPointAt(p / 0.59, target);
    if (p < 0.81)
      return v([
        1.1 + ((p - 0.59) / 0.22) * 0.45,
        Math.sin(((p - 0.59) / 0.22) * Math.PI) * 0.05,
        0,
      ]);
    if (state.synapse === "ampa" && state.summation) {
      if (p < 0.91) {
        const u = (p - 0.81) / 0.1;
        return v([1.55 + u * 2.6, u * 0.6, u * 0.1]);
      }
      const u = Math.min(1, (p - 0.91) / 0.07);
      return v([4.15 + u * 1.45, 0.6 + Math.sin(u * 4) * 0.1, 0.1 + u * 0.2]);
    }
    return v([1.55 + ((p - 0.81) / 0.19) * 2.15, ((p - 0.81) / 0.19) * 0.7, 0]);
  }
  let hudUpdate = -Infinity;
  function update(dt, time) {
    if (!state.active) return;
    if (reducedMotion.matches) dt *= .5;
    if (state.playing) elapsed += dt;
    if (state.playing) {
      const slow =
        state.scope === "micro" &&
        state.progress > 0.52 &&
        state.progress < 0.85
          ? 0.5
          : 1;
      state.progress =
        (state.progress +
          (dt * state.speed * slow) /
            (state.scope === "macro" ? 12 : state.myelin ? 18 : 25)) %
        1;
    }
    const p = state.progress;
    const packet = state.scope === "micro" && state.myelin && p < .59 ? saltatoryProgress(p/.59)*.59 : p;
    const pt = pointAt(packet);
    const color =
      state.scope === "micro" && p > 0.68 && state.synapse === "gaba"
        ? "#f08ece"
        : state.scope === "micro" &&
            p > 0.68 &&
            state.synapse === "metabotropic"
          ? "#eec574"
          : "#a0ffde";
    head.material.color.set(color).multiplyScalar(2.8);
    halo.material.color.set(color);
    head.position.copy(pt);
    halo.position.copy(pt);
    halo.scale.setScalar(1 + Math.sin(elapsed * 8) * 0.15);
    light.position.copy(pt);
    light.color.set(color);
    light.intensity = state.scope === "micro" ? 0.45 : 0.18;
    head.scale.setScalar(state.scope === "micro" ? 1.2 : 1);
    head.visible =
      state.scope === "macro" ||
      p < 0.59 ||
      state.synapse === "electrical" ||
      (state.synapse === "ampa" && state.summation && p > 0.91);
    halo.visible = head.visible && !reducedMotion.matches;
    if (reducedMotion.matches) light.intensity = 0;
    tail.visible = head.visible;
    if (state.scope === "macro")
      otherPulses.forEach((m, i) =>
        m.position
          .copy(routeCurve.getPointAt((p + i * 0.173 + 0.13) % 1))
          .add(v([(i - 2) * 0.017, 0, 0])),
      );
    else
      energyParticles.forEach((m, i) => {
        const q = (elapsed * 0.65 + i * 0.18) % 1;
        m.position.set(
          -1.5 + Math.sin(i * 3.5) * 0.04,
          0.17 + (m.userData.sodium ? q : 1 - q) * 0.2,
          0.17 + Math.cos(i) * 0.035,
        );
        m.material.emissiveIntensity = p > 0.94 ? 0.7 : 0.2;
      });
    for (let i = 0; i < 64; i++) {
      const q = Math.max(0, p - i * (state.scope === "macro" ? 0.003 : 0.002));
      const tailP=state.scope === "micro" && state.myelin && q<.59 ? saltatoryProgress(q/.59)*.59 : q;
      pointAt(tailP, dummy.position);
      dummy.scale.setScalar((1 - i / 64) * (state.scope === "micro" ? 1.6 : 1));
      dummy.updateMatrix();
      tail.setMatrixAt(i, dummy.matrix);
      tail.setColorAt(
        i,
        signalColor.set(color).multiplyScalar(0.25 + (1 - i / 64) * 1.3),
      );
    }
    tail.instanceMatrix.needsUpdate = true;
    tail.instanceColor.needsUpdate = true;
    if (state.scope === "micro") {
      host.macroObjects().forEach((m) => (m.visible = false));
      myelinMeshes.forEach((m, i) => {
        if (i % 2 === 1)
          m.material.emissiveIntensity = state.myelin
            ? Math.max(
                0.08,
                1.7 - Math.abs(p / 0.59 - m.userData.progress) * 28,
              )
            : 0.08;
      });
      const release = p > 0.57 && p < 0.85 && state.synapse !== "electrical";
      transmitters.forEach((m, i) => {
        m.visible = release;
        const q = THREE.MathUtils.clamp((p - 0.64) * 6 - i * 0.018, 0, 1);
        m.position.set(
          1.16 + q * 0.26,
          Math.sin(i * 3.1 + q * 2) * (0.07 + Math.sin(q * Math.PI) * 0.1),
          Math.cos(i * 2.1 + q) * 0.13,
        );
        m.material.color.set(color);
      });
      ions.forEach((m, i) => {
        m.visible = p > 0.52 && p < 0.69 && state.synapse !== "electrical";
        const q = (elapsed * state.speed * 0.7 + i * 0.13) % 1;
        m.position.set(
          1.04 + Math.sin(i) * 0.045,
          0.35 - q * 0.33,
          Math.cos(i) * 0.14,
        );
      });
      vesicles.forEach((m, i) =>
        m.scale.setScalar(1 + Math.max(0, 1 - Math.abs(p - 0.65) * 18) * 0.4),
      );
      somas[1].material.emissiveIntensity =
        p > 0.84
          ? state.synapse === "gaba"
            ? 0.15
            : state.summation && state.synapse === "ampa"
              ? 1
              : 0.4
          : 0.1;
      pumpGroup.scale.setScalar(p > 0.94 ? 1.12 : 1);
    }
    if (state.scope === "micro") {
      transmitters.forEach((m) => (m.visible = false));
      details?.update(p, elapsed, state);
    }
    const ss = stages();
    let idx = 0;
    ss.forEach((s, i) => {
      if (p >= s.at) idx = i;
    });
    if (idx !== phase) {
      phase = idx;
      $("#lab-stage-title").textContent = ss[idx].title;
      $("#lab-stage-copy").textContent = ss[idx].copy;
    }
    const seek = $("#lab-seek");
    if (seek && document.activeElement !== seek)
      seek.value = Math.round(p * 1000);
    const voltage =
      state.scope === "micro"
        ? p < 0.04
          ? -70 + (100 * p) / 0.04
          : p < 0.08
            ? 30 - (105 * (p - 0.04)) / 0.04
            : p < 0.13
              ? -75 + (5 * (p - 0.08)) / 0.05
              : p < 0.59
                ? -70 + 85 * Math.pow(Math.sin(p * 80), 12)
                : p > 0.84
                  ? state.synapse === "gaba"
                    ? -76
                    : state.synapse === "metabotropic"
                      ? -70
                      : state.summation && state.synapse === "ampa"
                        ? -70 +
                          100 * Math.exp(-Math.pow((p - 0.925) / 0.012, 2))
                        : -62
                  : -70
        : null;
    if (time - hudUpdate > 100) {
    hudUpdate = time;
    if (!hud.querySelector(".signal-meter")) hud.innerHTML = `<span class="eyebrow"></span><strong></strong><div class="signal-meter"><span></span></div><span class="impulse-hud-tag"></span><b></b>`;
    hud.querySelector(".eyebrow").textContent = state.scope === "micro" ? "MECHANIZMY MIKROSKOPOWE" : "PRZEPŁYW W SZLAKU";
    hud.querySelector("strong").textContent = state.scope === "micro" ? Math.round(voltage) + " mV poglądowo" : Math.round(p*100) + "% cyklu";
    hud.querySelector(".signal-meter span").style.width = p*100 + "%";
    hud.querySelector(".impulse-hud-tag").textContent = ss[idx].tag;
    hud.querySelector("b").textContent = state.follow ? "KAMERA · TRZECIA OSOBA" : "";
    }

    if (cameraTween) {
      const f = cameraTween;
      const q = Math.min(1, (performance.now() - f.started) / (f.duration * 1000 * (reducedMotion.matches ? 1.5 : 1))),
        ease = q * q * q * (q * (q * 6 - 15) + 10);
      camera.position.lerpVectors(f.from, f.to, ease);
      controls.target.lerpVectors(f.fromTarget, f.target, ease);
      cameraMatrix.lookAt(camera.position, controls.target, camera.up);
      cameraQuaternion.setFromRotationMatrix(cameraMatrix);
      camera.quaternion.slerp(cameraQuaternion, 1 - Math.exp(-dt * 10));
      if (q === 1) { camera.quaternion.copy(cameraQuaternion); cameraTween = null; }
    } else if (state.follow) {
      const ahead = pointAt(Math.min(0.999, p + 0.015));
      let tangent = ahead.clone().sub(pt).normalize();
      if (tangent.lengthSq() < 0.1) tangent.set(1, 0, 0);
      const desired = pt
        .clone()
        .addScaledVector(tangent, state.scope === "micro" ? -1.4 : -0.55)
        .add(v(state.scope === "micro" ? [0, 0.65, 1.15] : [0, 0.25, 0.32]));
      let target = pt
        .clone()
        .addScaledVector(tangent, state.scope === "micro" ? 0.28 : 0.15);
      if (state.scope === "micro") {
        const zone =
          THREE.MathUtils.smoothstep(p, 0.46, 0.58) *
          (1 - THREE.MathUtils.smoothstep(p, 0.84, 0.92));
        desired.lerp(v([1.26, 0.57, 1.3]), zone);
        target.lerp(v([1.3, 0.02, 0]), zone);
      }
      camera.position.lerp(desired, 1 - Math.exp(-dt * 3.1));
      followFocus.lerp(target, 1 - Math.exp(-dt * 4.2));
      cameraMatrix.lookAt(camera.position, followFocus, camera.up);
      cameraQuaternion.setFromRotationMatrix(cameraMatrix);
      camera.quaternion.slerp(cameraQuaternion, 1 - Math.exp(-dt * 4.5));
      controls.target.copy(followFocus);
    }
    const w = $("#canvas-host").clientWidth,
      h = $("#canvas-host").clientHeight,
      used = [];
    labelItems.forEach((l) => {
      const c = l.position.clone().project(camera),
        x = (c.x * 0.5 + 0.5) * w;
      let y = (-c.y * 0.5 + 0.5) * h - 24,
        shift = 0;
      while (
        shift < 132 &&
        used.some((o) => Math.abs(o.x - x) < 155 && Math.abs(o.y - y) < 38)
      ) {
        y -= 44;
        shift += 44;
      }
      l.el.hidden =
        !host.state.labels ||
        c.z < -1 ||
        c.z > 1 ||
        x < 50 ||
        x > w - 60 ||
        y < 105 ||
        y > h - 125;
      l.el.style.left = x + "px";
      l.el.style.top = y + "px";
      l.el.style.setProperty("--leader-height", 24 + shift + "px");
      if (!l.el.hidden) used.push({ x, y });
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !state.active) return;
    if (b.dataset.labScope) setScope(b.dataset.labScope);
    if (b.hasAttribute("data-lab-ions")) { state.ionDetails=!state.ionDetails; renderPanel(); }
    if (b.dataset.labCamera) cameraPreset(b.dataset.labCamera);
    if (b.hasAttribute("data-lab-play")) {
      state.playing = !state.playing;
      renderPanel();
    }
    if (b.hasAttribute("data-lab-reset")) {
      state.progress = 0;
      phase = -1;
    }
    if (b.hasAttribute("data-lab-follow")) {
      state.follow = !state.follow;
      cameraTween = null;
      followFocus.copy(controls.target);
      controls.enabled = !state.follow;
      host.stopTransitions();
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      if (!state.follow) {
        controls.target.copy(pointAt(state.progress));
        host.resize();
      }
      renderPanel();
    }
    if (b.hasAttribute("data-lab-myelin")) {
      state.myelin = !state.myelin;
      configureMicro();
      renderPanel();
    }
    if (b.hasAttribute("data-lab-sum")) {
      state.summation = !state.summation;
      phase = -1;
      renderPanel();
    }
    if (b.dataset.labNote) {
      const n = NOTES[b.dataset.labNote];
      host.openDialog(
        "NEUROFIZJOLOGIA · SCHEMAT DYDAKTYCZNY",
        `<h2>${n[0]}</h2><p>${n[1]}</p><p><small>Geometria mikroskopowa, napięcia i czas stanowią ilustrację mechanizmu, a nie numeryczne rozwiązanie modelu elektrofizjologicznego ani zapis z preparatu. Jaskrawe kolory oznaczają rodzaje sygnału.</small></p><p><a href="https://www.ncbi.nlm.nih.gov/books/NBK26910/" target="_blank" rel="noopener">Kanały jonowe i pobudliwość</a> · <a href="https://cshperspectives.cshlp.org/content/4/1/a011353.full" target="_blank" rel="noopener">Ca²⁺ i wydzielanie transmitera</a></p>`,
      );
    }
  });
  document.addEventListener("change", (e) => {
    if (!state.active) return;
    if (e.target.id === "lab-route") {
      state.route = e.target.value;
      buildRoute();
      renderPanel();
    }
    if (e.target.id === "lab-synapse") {
      state.synapse = e.target.value;
      configureMicro();
      renderPanel();
    }
  });
  document.addEventListener("input", (e) => {
    if (!state.active) return;
    if (e.target.id === "lab-speed") {
      state.speed = Number(e.target.value);
      $("#lab-speed-value").value = formatSpeed(state.speed);
    }
    if (e.target.id === "lab-seek") {
      state.progress = Number(e.target.value) / 1000;
      state.playing = false;
      phase = -1;
      $("[data-lab-play]").textContent = "Odtwarzaj";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (state.active && e.key === "Escape" && state.follow) {
      state.follow = false;
      controls.enabled = true;
      controls.target.copy(pointAt(state.progress));
      host.resize();
      renderPanel();
    }
  });
  return {
    root,
    state,
    enter,
    exit,
    update,
    renderPanel,
    suspend() { root.visible = false; labels.hidden = true; hud.hidden = true; cameraTween = null; state.follow = false; controls.enabled = true; },
    resume() { root.visible = true; labels.hidden = false; hud.hidden = false; },
    resetView() {
      cameraTween = null; state.follow = false; controls.enabled = true;
      if(state.scope === "micro")cameraPreset("overview");
      else { host.moveCamera(v([-7.7,2.1,.25]).multiplyScalar(Math.max(1,1.15/camera.aspect)),v([0,-.05,.25])); renderPanel(); }
    },
    releaseCamera() {
      const following = state.follow;
      cameraTween = null;
      state.follow = false;
      controls.enabled = true;
      if(following && state.active)renderPanel();
    },
    selectRoute(id) {
      if (!TRACTS.some((t) => t.key === id)) return;
      state.route = id;
      setScope("macro");
    },
  };
}
