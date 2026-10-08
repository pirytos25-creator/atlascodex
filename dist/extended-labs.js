import * as THREE from "three";
const $ = (s) => document.querySelector(s),
  V = (a) => new THREE.Vector3(...a);
const tissue = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.63, metalness: 0 });
function snapshot(host) {
  return {
    position: host.camera.position.clone(),
    target: host.controls.target.clone(),
    opacity: host.state.opacity,
    left: host.state.left,
    right: host.state.right,
    deep: host.state.deep,
    tracts: host.state.tracts,
    section: host.state.section,
    separation: host.state.separation,
  };
}
function restore(host, saved) {
  if (!saved) return;
  Object.assign(host.state, {
    left: saved.left,
    right: saved.right,
    deep: saved.deep,
    tracts: saved.tracts,
    section: saved.section,
    separation: saved.separation,
  });
  host.setOpacity(saved.opacity);
  host.updateVisibility();
  host.moveCamera(saved.position, saved.target);
  $(".controls").inert = false;
  $("#world-scale").textContent = "1 jednostka = 40 mm";
  $(".viewport-title>div").innerHTML = "Mózg człowieka <span>3D</span>";
}
export { createDetailedAnatomy } from "./detailed-anatomy.js";

export { createNeurotransmitterLab } from "./neurotransmitter-lab.js";

const BIO = {
  hrv: {
    name: "HRV · oddech i odstępy RR",
    text: "Informacja o odstępach między uderzeniami może wspierać uczenie regulacji. Model ilustruje powiązanie oddechu, rytmu serca i odruchu z baroreceptorów.",
    limit:
      "Tempo rezonansowe jest indywidualne. Zmiana HRV nie jest prostą miarą relaksacji; znaczenie mają oddech, artefakty i warunki pomiaru.",
  },
  eeg: {
    name: "Neurofeedback · EEG",
    text: "Przetworzona cecha sygnału EEG może sterować informacją zwrotną. Trzeba określić protokół, montaż, odniesienie oraz sposób odrzucania artefaktów.",
    limit:
      "Wzrost wybranej amplitudy nie dowodzi poprawy funkcji. Demonstracja nie jest pomiarem EEG ani klinicznie zweryfikowanym protokołem.",
  },
  eda: {
    name: "EDA · przewodnictwo skóry",
    text: "Przewodnictwo skóry zależy m.in. od aktywności gruczołów potowych regulowanych współczulnie. Sprzężenie zwrotne może pokazywać zmianę pobudzenia w czasie.",
    limit:
      "EDA nie wskazuje konkretnej emocji. Ruch, temperatura, miejsce elektrod i stan skóry wpływają na sygnał.",
  },
};
// Files exported from Excel often carry a BOM, quoted headers, ";" separators
// and decimal commas (812,5). Pick the separator from the header line.
function parseCsv(raw) {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) throw new Error("Plik CSV jest pusty.");
  const first = lines[0],
    delimiter = first.includes("\t")
      ? "\t"
      : first.includes(";")
        ? ";"
        : ",",
    clean = (cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim();
  const header = first.split(delimiter).map((c) => clean(c).toLowerCase()),
    rows = lines.slice(1).map((line) => line.split(delimiter).map(clean));
  return { header, rows, decimalComma: delimiter !== "," };
}
export function createBiofeedbackLab(host) {
  const state = {
      active: false,
      mode: "hrv",
      playing: true,
      time: 0,
      breaths: 6,
      regulation: 0.5,
      rr: null,
    },
    root = new THREE.Group();
  host.scene.add(root);
  root.visible = false;
  let saved,
    lastUi = -1;
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: "#b5d8c2",
      roughness: 0.25,
      metalness: 0.02,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  orb.position.set(3, 0.5, 0);
  root.add(orb);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.018, 8, 72),
    tissue("#85aa95"),
  );
  ring.position.copy(orb.position);
  root.add(ring);
  function metrics(rr) {
    const mean = rr.reduce((a, b) => a + b, 0) / rr.length,
      differences = rr.slice(1).map((v, i) => Math.pow(v - rr[i], 2));
    return {
      mean,
      bpm: 60000 / mean,
      rmssd: Math.sqrt(
        differences.reduce((a, b) => a + b, 0) / differences.length,
      ),
    };
  }
  function render() {
    const b = BIO[state.mode];
    $("#mode-panel").innerHTML =
      `<div class="bio-panel"><span class="eyebrow">SYGNAŁ → INFORMACJA → REAKCJA</span><h2>Biofeedback</h2><div class="research-methods">${[
        ["hrv", "HRV"],
        ["eeg", "EEG"],
        ["eda", "EDA"],
      ]
        .map(
          ([k, n]) =>
            `<button data-bio-mode="${k}" class="${state.mode === k ? "active" : ""}">${n}</button>`,
        )
        .join(
          "",
        )}</div><h3>${b.name}</h3><div class="bio-source">${state.rr && state.mode === "hrv" ? "ZAPIS CSV · ANALIZA OFFLINE" : "DEMONSTRACJA · SYGNAŁ SYNTETYCZNY"}</div><p>${b.text}</p><div class="bio-readout"><strong id="bio-value"></strong><span id="bio-metric"></span></div><div id="bio-chart" class="research-chart"></div><strong id="bio-breath"></strong><label class="lab-field">Tempo wskaźnika oddechu <output id="bio-tempo-value">${state.breaths} / min</output><input id="bio-tempo" type="range" min="4" max="12" value="${state.breaths}" aria-label="Tempo modelu oddechu"></label><label class="lab-field">Sterowanie przykładowym sygnałem<input id="bio-regulation" type="range" min="0" max="100" value="${state.regulation * 100}" aria-label="Sterowanie sygnałem demonstracji" ${state.rr && state.mode === "hrv" ? "disabled" : ""}></label><div class="mode-actions"><button class="primary-button" data-bio-play>${state.playing ? "Pauza" : "Odtwarzaj"}</button><button class="secondary-button" data-bio-reset>Od początku</button></div>${state.mode === "hrv" ? '<label class="bio-import">Importuj CSV z kolumną rr_ms<input id="bio-file" type="file" accept=".csv,text/csv"></label><button class="source-link" data-bio-demo>Powrót do demonstracji</button>' : ""}<p class="lab-science-note">${b.limit}</p><p class="research-caption">Brak podłączonego czujnika. Wczytany CSV jest przetwarzany lokalnie; analiza RR nie wykonuje automatycznej korekcji artefaktów ani rozpoznania klinicznego.</p><a class="source-link" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4104929/" target="_blank" rel="noopener">Mechanizm HRV biofeedback · źródło</a></div>`;
    lastUi = -1;
  }
  let activation = 0;
  function enter() {
    activation++;
    saved = snapshot(host);
    state.active = true;
    root.visible = true;
    Object.assign(host.state, {
      left: true,
      right: true,
      deep: false,
      tracts: false,
      section: "none",
      separation: 0,
      renderSeparation: 0,
    });
    host.setOpacity(0.1);
    $(".controls").inert = true;
    $(".viewport-title>div").innerHTML =
      "Pętla informacji zwrotnej <span>3D</span>";
    host.moveCamera(V([0, 2.7, 11]), V([1, 0.2, 0]));
    render();
  }
  function exit() {
    state.active = false;
    root.visible = false;
    restore(host, saved);
  }
  function update(dt, t) {
    if (!state.active) return;
    if (state.playing) state.time += dt;
    const phase = ((state.time * state.breaths) / 60) * Math.PI * 2,
      wave = (1 - Math.cos(phase)) * 0.5;
    orb.scale.setScalar(0.65 + wave * 0.42);
    orb.material.emissive.set("#315e45");
    orb.material.emissiveIntensity = 0.06 + wave * 0.12;
    if (t - lastUi < 140) return;
    lastUi = t;
    const rr =
        state.rr ||
        Array.from(
          { length: 100 },
          (_, i) =>
            850 +
            Math.sin(((i * 0.85 * state.breaths) / 60) * Math.PI * 2) *
              (15 + state.regulation * 55) +
            Math.sin(i * 1.77) * 4,
        ),
      m = metrics(rr);
    $("#bio-value").textContent =
      state.mode === "hrv"
        ? m.bpm.toLocaleString("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + " / min"
        : state.mode === "eeg"
          ? (8 + state.regulation * 12).toFixed(1) + " µV*"
          : (2 + state.regulation * 3).toFixed(2) + " µS*";
    $("#bio-metric").textContent =
      state.mode === "hrv"
        ? "RMSSD " +
          m.rmssd.toLocaleString("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) +
          " ms · " +
          (state.rr
            ? `${state.rr.length.toLocaleString("pl-PL")} odstępów RR · ${(rr.reduce((a, b) => a + b, 0) / 60000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} min`
            : "przykład")
        : "Wartość poglądowa";
    $("#bio-breath").textContent =
      phase % (Math.PI * 2) < Math.PI ? "Wskaźnik: wdech" : "Wskaźnik: wydech";
    const graphRange = state.rr
      ? state.rr.reduce((max, v) => Math.max(max, Math.abs(v - m.mean)), 1)
      : 1;
    const points = Array.from({ length: 180 }, (_, i) => {
      const x = (i / 179) * 280;
      let value;
      if (state.mode === "hrv")
        value = state.rr
          ? ((state.rr[
              Math.min(
                state.rr.length - 1,
                Math.round((i / 179) * (state.rr.length - 1)),
              )
            ] -
              m.mean) /
              graphRange) *
            48
          : Math.sin(
              (((state.time + (i / 179) * 30) * state.breaths) / 60) *
                Math.PI *
                2,
            ) *
            (12 + state.regulation * 22);
      else if (state.mode === "eeg")
        value =
          Math.sin(i * 0.53 + state.time * 2) * (8 + state.regulation * 12);
      else
        value =
          Math.sin((i / 179) * 6 + state.time * 0.17) *
          (8 + state.regulation * 16);
      return `${x},${70 - value}`;
    }).join(" ");
    $("#bio-chart").innerHTML =
      `<svg viewBox="0 0 280 130" role="img" aria-label="Sygnał biofeedback ${state.rr ? "z pliku" : "syntetyczny"}"><path d="M0 70H280" stroke="#395344"/><polyline points="${points}" fill="none" stroke="#b8efc7" stroke-width="2"/></svg>`;
  }
  document.addEventListener("click", (e) => {
    if (!state.active) return;
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.bioMode) {
      state.mode = b.dataset.bioMode;
      render();
    }
    if (b.hasAttribute("data-bio-play")) {
      state.playing = !state.playing;
      render();
    }
    if (b.hasAttribute("data-bio-reset")) state.time = 0;
    if (b.hasAttribute("data-bio-demo")) {
      state.rr = null;
      render();
    }
  });
  document.addEventListener("input", (e) => {
    if (!state.active) return;
    if (e.target.id === "bio-tempo") {
      state.breaths = Number(e.target.value);
      $("#bio-tempo-value").textContent = state.breaths + " / min";
    }
    if (e.target.id === "bio-regulation")
      state.regulation = Number(e.target.value) / 100;
  });
  document.addEventListener("change", async (e) => {
    if (!state.active || e.target.id !== "bio-file" || !e.target.files[0])
      return;
    try {
      if (e.target.files[0].size > 5_000_000)
        throw new Error("CSV przekracza 5 MB.");
      const csvMode = host.state.mode,
        csvActivation = activation;
      const rawCsv = await e.target.files[0].text();
      if (
        !state.active ||
        host.state.mode !== csvMode ||
        activation !== csvActivation
      )
        return;
      const { header, rows, decimalComma } = parseCsv(rawCsv),
        index = header.indexOf("rr_ms");
      if (index < 0)
        throw new Error(
          "CSV wymaga kolumny rr_ms (znaleziono: " +
            (header.filter(Boolean).join(", ") || "brak nagłówka") +
            ").",
        );
      const rr = rows.map((cells) => {
        const value = (cells[index] ?? "").trim();
        if (!value) return NaN;
        return Number(decimalComma ? value.replace(",", ".") : value);
      });
      const bad = rr.findIndex(
        (v) => !Number.isFinite(v) || v < 200 || v > 2500,
      );
      if (bad >= 0)
        throw new Error(
          `Wiersz ${bad + 2}: wartość „${rows[bad][index] ?? ""}” nie jest odstępem RR 200–2500 ms.`,
        );
      if (
        rr.length < 10 ||
        rr.length > 100000 ||
        rr.some((v) => !Number.isFinite(v) || v < 200 || v > 2500)
      )
        throw new Error(
          "Wymagane 10–100 000 prawidłowych odstępów RR w ms (200–2500).",
        );
      state.rr = rr;
      state.mode = "hrv";
      render();
    } catch (error) {
      e.target.value = "";
      host.toast(error.message);
    }
  });
  return { root, state, enter, exit, update, resetView() { host.frame(V([0,2.7,11]),V([1,.2,0])); } };
}
