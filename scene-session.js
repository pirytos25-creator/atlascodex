// A tab owns its presentation. Shared MRI and geometry are immutable resources.
const PRESENTATION = [
  "category",
  "hemi",
  "selected",
  "noteTab",
  "labels",
  "left",
  "right",
  "deep",
  "tracts",
  "colors",
  "opacity",
  "section",
  "slice",
  "separation",
  "sliceStyle",
  "cutFlip",
  "hemiFace",
  "renderSlice",
  "renderSeparation",
  "cutPlaying",
  "cutSpeed",
  "cutPhase",
  "cutCenter",
  "cutAmplitude",
  "sliceContrast",
  "dissectionVisited",
];
export function createSceneSessions(host) {
  const views = new Map();
  const pick = () =>
    Object.fromEntries(PRESENTATION.map((key) => [key, host.state[key]]));
  const baseline = pick();
  function capture() {
    const destination = host.transition();
    return {
      values: pick(),
      position: (destination?.to || host.camera.position).clone(),
      target: (destination?.target || host.controls.target).clone(),
      search: host.search.value,
    };
  }
  views.set("atlas", capture());
  function leave() {
    views.set(host.state.mode, capture());
    host.cancelCamera();
    for (const lab of host.labs()) {
      if (lab?.state.active) lab.exit();
      if (lab?.root) lab.root.visible = false;
    }
    host.cancelCamera();
    host.controls.enabled = true;
    host.controls.minDistance = 1.3;
    host.controls.maxDistance = 24;
    host.controls.autoRotate = false;
    host.camera.clearViewOffset();
    host.camera.updateProjectionMatrix();
    host.scene.background.set("#14231b");
    document.querySelector(".controls").inert = false;
    delete document.body.dataset.labScope;
    document.querySelector("#hover-name").hidden = true;
    document.querySelector("#dialog").close();
  }
  function restore(mode) {
    const view = views.get(mode);
    Object.assign(host.state, view?.values || baseline);
    host.state.mode = mode;
    host.state.fly = false;
    host.state.cutPlaying = false;
    host.search.value = view?.search || "";
    host.repaint();
    host.scene.getObjectByName("atlas-grid").visible = true;
    return view;
  }
  return { leave, restore, views };
}
