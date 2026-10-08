import * as THREE from "three";
import { CONNECTIONS } from "./data.js";
import { createCorticalOverlays } from "./cortical-overlays.js";

export function connectionsFor(item, registry) {
  if (!item) return { routes: [], partners: [] };
  const hemi = item.hemi || "lh", resolve = key => registry.has(key) ? key : `${hemi}-${key}`;
  let routes = item.kind === "tracts" ? [item.id] : Object.keys(CONNECTIONS.tracts).filter(key => CONNECTIONS.tracts[key].includes(item.id.replace(/^[lr]h-/, "")));
  const partners = new Set(routes.flatMap(key => CONNECTIONS.tracts[key].map(resolve)));
  for (const key of CONNECTIONS.deep[item.id.replace(/^[lr]h-/, "")] || []) partners.add(resolve(key));
  if (item.kind === "cortex") {
    routes = [...new Set([...routes, "callosum"])];
    partners.add(`${hemi === "lh" ? "rh" : "lh"}-${item.id.slice(3)}`);
  }
  if (item.id === "callosum") for (const r of registry.values()) if (r.kind === "cortex") partners.add(r.id);
  if (item.id === "thalamus" || /thalamus$/.test(item.id)) for (const r of registry.values()) if (r.kind === "cortex" && r.hemi === hemi) partners.add(r.id);
  partners.delete(item.id);
  return { routes, partners: [...partners].filter(id => registry.has(id)) };
}
export function createAtlasConnections(host) {
  const overlay = createCorticalOverlays(host), state = { active: false }, savedMaterials = new Map();
  let previous, selected;
  function stop() {
    if (!state.active) return;
    state.active = false;
    overlay.root.visible = false;
    for (const [material, values] of savedMaterials) Object.assign(material, values);
    savedMaterials.clear();
    Object.assign(host.state, previous);
    host.updateVisibility();
    host.syncControls();
  }
  function show(id) {
    const item = host.registry.get(id);
    if (!item) return;
    if (!state.active) previous = Object.fromEntries(["opacity", "tracts", "colors", "left", "right", "separation", "section", "slice"].map(k => [k, host.state[k]]));
    state.active = true;
    selected = id;
    const { routes, partners } = connectionsFor(item, host.registry);
    Object.assign(host.state, { tracts: true, left: true, right: true, separation: 0, section: "none" });
    host.setOpacity(0.78);
    overlay.root.visible = true;
    overlay.set([id, ...partners].filter(id => host.registry.get(id)?.kind !== "tracts").map(id => ({ id, color: id === item.id ? "#b8efc7" : "#88c4d4" })));
    for (const group of host.tractObjects()) {
      group.visible = routes.includes(group.userData.id);
      group.traverse(mesh => {
        if (!mesh.material) return;
        if (!savedMaterials.has(mesh.material)) savedMaterials.set(mesh.material, { emissiveIntensity: mesh.material.emissiveIntensity });
        mesh.material.emissiveIntensity = 0.5;
      });
    }
    host.moveCamera(new THREE.Vector3(-7.8, 3.5, 6.5), new THREE.Vector3(0, 0, 0));
    host.syncControls();
  }
  function html(item) {
    const { routes, partners } = connectionsFor(item, host.registry);
    const list = ids => ids.map(id => `<button class="source-link" data-select="${id}">${host.registry.get(id)?.name || id}</button>`).join("");
    return `<section class="connection-section"><h3>Połączenia</h3><p>Wybrane drogi i obszary partnerskie.</p><div class="connection-links">${list(routes)}${list(partners)}</div><button class="secondary-button" data-atlas-connections aria-pressed="${state.active}">${state.active ? "Wyłącz połączenia" : "Pokaż połączenia"}</button><p class="lab-science-note">Schemat wybranych połączeń z literatury. Drogi nie są traktografią; lista nie jest konektomem. Połączenia spoidłowe pokazują poglądowo odpowiednik w drugiej półkuli.</p></section>`;
  }
  return { state, html, show, stop, update() {
    if (!state.active) return;
    if (host.state.mode !== "atlas") return stop();
    if (selected !== host.state.selected) show(host.state.selected);
    for (const group of host.tractObjects()) group.visible = connectionsFor(host.registry.get(selected), host.registry).routes.includes(group.userData.id);
    overlay.sync();
  } };
}
