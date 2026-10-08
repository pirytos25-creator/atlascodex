import * as THREE from "three";

// Each lab owns its DOM layer and anchors; inactive scenes never leave pins behind.
export function createWorldAnnotations({
  camera,
  canvasHost,
  viewport,
  onSelect,
}) {
  const layer = document.createElement("div");
  layer.className = "world-hotspots labels-layer";
  layer.hidden = true;
  viewport.append(layer);
  let entries = [];
  function set(items) {
    layer.replaceChildren();
    entries = items.map((item, index) => {
      const el = document.createElement("button");
      el.className = "world-hotspot";
      el.innerHTML = `<span class="hotspot-dot">${index + 1}</span><span>${item.name}</span>`;
      el.setAttribute("aria-label", item.name);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(item);
      });
      layer.append(el);
      return { item, el };
    });
  }
  function update(active, enabled = true) {
    layer.hidden = !active || !enabled;
    if (layer.hidden) return;
    const w = canvasHost.clientWidth,
      h = canvasHost.clientHeight,
      used = [];
    for (const { item, el } of entries) {
      const point =
        typeof item.point === "function" ? item.point() : item.point;
      const p = (
        Array.isArray(point) ? new THREE.Vector3(...point) : point.clone()
      ).project(camera);
      const x = (p.x * 0.5 + 0.5) * w,
        y = (-p.y * 0.5 + 0.5) * h;
      let offset = 0;
      while (
        offset < 96 &&
        used.some(
          (q) => Math.abs(q.x - x) < 170 && Math.abs(q.y - (y - offset)) < 40,
        )
      )
        offset += 42;
      el.hidden =
        p.z < -1 ||
        p.z > 1 ||
        x < 25 ||
        x > w - 45 ||
        y - offset < (w < 850 ? 190 : 110) ||
        y > h - 75 ||
        offset > 84;
      const halfWidth = Math.min(185, el.offsetWidth || 157) / 2;
      el.style.left =
        Math.max(halfWidth + 10, Math.min(w - halfWidth - 10, x)) + "px";
      el.style.top = y - offset - 22 + "px";
      el.style.setProperty("--leader-height", 22 + offset + "px");
      if (!el.hidden) used.push({ x, y: y - offset });
    }
  }
  return {
    set,
    update,
    hide() {
      layer.hidden = true;
    },
    dispose() {
      layer.remove();
    },
  };
}
