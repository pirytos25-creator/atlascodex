import * as THREE from "three";

// Geometry is extracted once per surface and reused across educational views.
const surfaceCache = new WeakMap();
function regionGeometry(surface, index) {
  let cache = surfaceCache.get(surface);
  if (!cache) {
    cache = new Map();
    const triangles = new Map();
    for (let j = 0; j < surface.indices.length; j += 3) {
      const a = surface.indices[j], b = surface.indices[j + 1], c = surface.indices[j + 2];
      const la = surface.labels[a], lb = surface.labels[b], lc = surface.labels[c];
      const label = la === lb || la === lc ? la : lb === lc ? lb : la;
      if (!triangles.has(label)) triangles.set(label, []);
      triangles.get(label).push(a, b, c);
    }
    for (const [label, indices] of triangles) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", surface.mesh.geometry.getAttribute("position"));
      geometry.setAttribute("normal", surface.mesh.geometry.getAttribute("normal"));
      geometry.setIndex(indices);
      cache.set(label, geometry);
    }
    surfaceCache.set(surface, cache);
  }
  return cache.get(index);
}
export function createCorticalOverlays(host, parent) {
  const root = new THREE.Group(), entries = new Map();
  (parent || host.scene).add(root);
  root.visible = false;
  function set(items) {
    for (const entry of entries.values()) { entry.enabled = false; entry.mesh.visible = false; }
    for (const spec of items) {
      const item = host.registry.get(spec.id);
      if (!item) continue;
      let entry = entries.get(spec.id);
      if (!entry) {
        const surface = host.surfaces().find(s => s.info.hemi === item.hemi);
        const source = item.kind === "cortex" ? null : host.macroObjects().find(m => m.userData.id === item.id && m.isMesh);
        const geometry = item.kind === "cortex" ? regionGeometry(surface, item.index) : source?.geometry;
        if (!geometry) continue;
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
          color: spec.color, emissive: spec.color, emissiveIntensity: 0.12,
          roughness: 0.65, transparent: true, opacity: 0.72, depthWrite: false,
          polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide,
        }));
        mesh.userData = { id: item.id, kind: item.kind };
        root.add(mesh);
        entry = { mesh, surface: item.kind === "cortex" ? surface : null, source, item };
        entries.set(spec.id, entry);
      }
      entry.mesh.visible = true;
      entry.enabled = true;
      entry.mesh.material.color.set(spec.color);
      entry.mesh.material.emissive.set(spec.color);
      entry.mesh.material.opacity = spec.opacity ?? 0.72;
    }
    sync();
  }
  function sync() {
    for (const { mesh, surface, source, item, enabled } of entries.values()) {
      mesh.position.copy((surface?.mesh || source).position);
      mesh.material.clippingPlanes = (surface?.mesh || source).material.clippingPlanes;
      mesh.visible = enabled && !((item.hemi === "lh" && !host.state.left) || (item.hemi === "rh" && !host.state.right));
    }
  }
  return { root, entries, set, sync };
}
