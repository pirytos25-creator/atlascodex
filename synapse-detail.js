import * as THREE from "three";

// Enlarged educational anatomy: particle counts, protein shapes and times are illustrative.
export function createSynapseDetails({
  micro,
  curve,
  pre,
  post,
  vesicles,
  ions,
  receptors,
  junctions,
  axon,
}) {
  const root = new THREE.Group();
  micro.add(root);
  const chemical = new THREE.Group(),
    electrical = new THREE.Group(),
    metabotropic = new THREE.Group();
  root.add(chemical, electrical, metabotropic);
  const protein = (color, glow = 0.08) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.38,
      metalness: 0.05,
      emissive: color,
      emissiveIntensity: glow,
    });
  const sphere = new THREE.SphereGeometry(1, 12, 9),
    ring = new THREE.TorusGeometry(0.019, 0.006, 8, 18);
  const nodeSites = [],
    calciumChannels = [],
    pores = [],
    domains = [];
  const scratch = new THREE.Object3D(),
    zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function ball(group, pos, radius, color) {
    const mesh = new THREE.Mesh(sphere, protein(color));
    mesh.position.set(...pos);
    mesh.scale.setScalar(radius);
    group.add(mesh);
    return mesh;
  }
  function loop(group, pos, color, size = 1) {
    const mesh = new THREE.Mesh(ring, protein(color));
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(...pos);
    mesh.scale.setScalar(size);
    group.add(mesh);
    return mesh;
  }
  function particles(group, count, radius, color) {
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(radius, 10, 8),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      count,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, zero);
    group.add(mesh);
    return mesh;
  }
  function place(mesh, i, point, scale = 1) {
    scratch.position.copy(point);
    scratch.quaternion.identity();
    scratch.scale.setScalar(scale);
    scratch.updateMatrix();
    mesh.setMatrixAt(i, scratch.matrix);
  }
  const transmitter = particles(chemical, 96, 0.008, "#c2ffe2"),
    postIons = particles(chemical, 24, 0.012, "#d9ffc5"),
    messengers = particles(metabotropic, 22, 0.009, "#ffd087"),
    gapIons = particles(electrical, 24, 0.01, "#9dccff"),
    membraneIons = particles(root, 72, 0.01, "#94ffda");
  for (const mesh of [pre, post]) {
    mesh.material = new THREE.MeshPhysicalMaterial({
      color: mesh.material.color,
      roughness: 0.44,
      metalness: 0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  // Docked/primed vesicles exist before the arriving action potential.
  for (let i = 0; i < vesicles.length; i++) {
    const shell = vesicles[i];
    shell.material = new THREE.MeshPhysicalMaterial({
      color: "#d6ccb0",
      roughness: 0.25,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    });
    shell.userData.pool = shell.position.clone();
    shell.userData.site = i % 4;
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI * 0.5;
      ball(
        shell,
        [Math.cos(a) * 0.012, Math.sin(a) * 0.012, (j % 2 ? 1 : -1) * 0.009],
        0.005,
        "#acddbd",
      );
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      y = Math.sin(a) * 0.15,
      z = Math.cos(a) * 0.15;
    calciumChannels.push(loop(chemical, [1.255, y, z], "#91bedc", 0.8));
    ions[i].material.color.set("#c8a9ff");
    calciumChannels[i].material.color.set("#c8a9ff");
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4,
      y = Math.sin(a) * 0.082,
      z = Math.cos(a) * 0.082;
    const pore = loop(chemical, [1.265, y, z], "#d6d3aa", 0.7);
    pores.push(pore);
    const domain = ball(chemical, [1.215, y, z], 0.058, "#9ec9ff");
    domain.material = new THREE.MeshBasicMaterial({
      color: "#a0cfff",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    domains.push(domain);
  }
  // A small glial process and transporter proteins illustrate extracellular clearance.
  const glia = ball(chemical, [1.26, 0.36, 0.19], 0.17, "#8fa68e");
  glia.scale.set(0.34, 0.055, 0.065);
  const transporters = [
    loop(chemical, [1.24, 0.31, 0.15], "#b7d9b1", 1.3),
    loop(chemical, [1.35, 0.31, 0.18], "#b7d9b1", 1.3),
  ];
  const gAlpha = ball(metabotropic, [1.55, -0.08, 0.07], 0.035, "#d5ad70"),
    gBeta = ball(metabotropic, [1.58, -0.11, 0.095], 0.026, "#9ec0ac"),
    gGamma = ball(metabotropic, [1.61, -0.11, 0.12], 0.017, "#aab3cf");
  const effector = loop(metabotropic, [1.68, -0.1, 0.06], "#dbc085", 1.7);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    loop(
      electrical,
      [1.255, Math.sin(a) * 0.105, Math.cos(a) * 0.105],
      "#a7c8e3",
      0.75,
    );
    loop(
      electrical,
      [1.355, Math.sin(a) * 0.105, Math.cos(a) * 0.105],
      "#a7c8e3",
      0.75,
    );
  }
  membraneIons.material.color.set("#ffffff");
  for(let i=0;i<72;i++)membraneIons.setColorAt(i,new THREE.Color(i%4<2?"#ffc987":"#8dbaff"));
  membraneIons.instanceColor.needsUpdate=true;
  // Na+/K+ channels and local flux at nodes; extra sites appear without myelin.
  for (let i = 0; i < 18; i++) {
    const t = i < 9 ? 0.152 + i * 0.088 : 0.055 + (i - 9) * 0.105,
      point = curve.getPointAt(Math.min(0.97, t)),
      tangent = curve.getTangentAt(Math.min(0.97, t));
    const group = new THREE.Group();
    group.position.copy(point);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
    root.add(group);
    const sodium = loop(group, [0, 0.052, 0], "#ffc987", 0.7),
      potassium = loop(group, [0, -0.052, 0], "#99b9e3", 0.7);
    sodium.rotation.set(Math.PI / 2, 0, 0);
    potassium.rotation.set(Math.PI / 2, 0, 0);
    nodeSites.push({ group, sodium, potassium, t: t, extra: i >= 9 });
  }
  const wave = { uAxonWave: { value: 0 }, uAxonActive: { value: 0 } };
  axon.material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, wave);
    shader.vertexShader =
      "varying float vAxonProgress;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAxonProgress=uv.x;",
      );
    shader.fragmentShader =
      "varying float vAxonProgress;uniform float uAxonWave;uniform float uAxonActive;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
   float depolarization=exp(-pow((vAxonProgress-uAxonWave)/.035,2.0))*uAxonActive;
   float repolarization=exp(-pow((vAxonProgress-uAxonWave+.06)/.035,2.0))*uAxonActive;
   totalEmissiveRadiance+=vec3(.14,1.15,.62)*depolarization+vec3(.12,.34,.96)*repolarization;`,
      );
  };
  axon.material.customProgramCacheKey = () =>
    "axon travelling membrane potential v1";
  let configured = "";
  function configure(state) {
    const electric = state.synapse === "electrical";
    chemical.visible = !electric;
    electrical.visible = electric;
    metabotropic.visible = state.synapse === "metabotropic";
    receptors.forEach((m) => (m.visible = !electric));
    ions.forEach((m) => (m.visible = !electric));
    junctions.forEach((m) => (m.visible = electric));
    vesicles.forEach((m) => (m.visible = !electric));
    transmitter.material.color.set(
      state.synapse === "gaba"
        ? "#f5b8dd"
        : state.synapse === "metabotropic"
          ? "#f6d487"
          : "#b6ffe0",
    );
    postIons.material.color.set(
      state.synapse === "gaba" ? "#f4c0e7" : "#b6ecce",
    );
    configured = state.synapse;
  }
  function update(p, elapsed, state) {
    if (configured !== state.synapse) configure(state);
    const electric = state.synapse === "electrical",
      waveT = p / 0.59;
    wave.uAxonWave.value = waveT;
    wave.uAxonActive.value = p < 0.59 ? 1 : 0;
    nodeSites.forEach((site, i) => {
      site.group.visible = state.ionDetails && (!state.myelin || !site.extra);
      const d = waveT - site.t,
        na = Math.exp(-Math.pow(d / 0.027, 2)),
        k = Math.exp(-Math.pow((d - 0.055) / 0.036, 2));
      site.sodium.material.emissiveIntensity = 0.1 + na * 1.3;
      site.potassium.material.emissiveIntensity = 0.1 + k * 1.1;
      for (let j = 0; j < 4; j++) {
        if (!site.group.visible || p > 0.59 || Math.abs(d) > 0.11) {
          membraneIons.setMatrixAt(i * 4 + j, zero);
          continue;
        }
        const outward = j >= 2,
          q = THREE.MathUtils.clamp(
            (d + (outward ? -0.006 : 0.025)) / 0.055,
            0,
            1,
          ),
          local = new THREE.Vector3(
            (j % 2 ? 1 : -1) * 0.019,
            (outward ? -1 : 1) * (0.14 - (outward ? 1 - q : q) * 0.11),
            0,
          );
        local.applyQuaternion(site.group.quaternion).add(site.group.position);
        place(membraneIons, i * 4 + j, local, Math.sin(q * Math.PI)*1.8);
      }
    });
    membraneIons.instanceMatrix.needsUpdate = true;
    const calcium =
      p > 0.54 && p < 0.69 ? Math.sin(((p - 0.54) / 0.15) * Math.PI) : 0;
    calciumChannels.forEach((channel, i) => {
      channel.material.emissiveIntensity = 0.1 + calcium;
      const a = (i * Math.PI) / 4,
        q = THREE.MathUtils.clamp((p - 0.54) * 12 - i * 0.06, 0, 1);
      ions[i].visible = !electric && p > 0.54 && p < 0.69;
      ions[i].position.set(
        1.31 - q * 0.15,
        Math.sin(a) * 0.15,
        Math.cos(a) * 0.15,
      );
    });
    vesicles.forEach((shell, i) => {
      const site = i % 4,
        a = (site * Math.PI) / 2 + 0.4,
        dock = new THREE.Vector3(
          1.225,
          Math.sin(a) * 0.082,
          Math.cos(a) * 0.082,
        ),
        onset = 0.64 + site * 0.022,
        fuse = THREE.MathUtils.clamp((p - onset) / 0.045, 0, 1);
      shell.visible = !electric;
      shell.scale.set(1, 1, 1);
      shell.position.copy(i < 4 ? dock : shell.userData.pool);
      if (i < 4 && p > onset && p < 0.84) {
        shell.position.x = 1.225 + fuse * 0.035;
        shell.scale.set(1 - fuse * 0.86, 1 + fuse * 0.2, 1 + fuse * 0.2);
      }
      if (i >= 4 && p > 0.88) {
        const refill = THREE.MathUtils.clamp((p - 0.88) / 0.12, 0, 1);
        shell.position.lerp(dock, refill * 0.5);
      }
    });
    pores.forEach((pore, i) => {
      const onset = 0.64 + i * 0.022,
        opening =
          p > onset && p < 0.83
            ? Math.sin(
                THREE.MathUtils.clamp((p - onset) / 0.13, 0, 1) * Math.PI,
              )
            : 0;
      pore.visible = !electric;
      pore.scale.setScalar(0.35 + opening * 1.25);
      pore.material.emissiveIntensity = 0.1 + opening * 1.1;
      domains[i].material.opacity = calcium * 0.065;
    });
    for (let i = 0; i < 96; i++) {
      const site = i % 4,
        a = (site * Math.PI) / 2 + 0.4,
        onset = 0.65 + site * 0.022 + (Math.floor(i / 4) % 5) * 0.002,
        q = (p - onset) / 0.15;
      if (electric || q < 0 || q > 1.6) {
        transmitter.setMatrixAt(i, zero);
        continue;
      }
      let point, scale;
      if (q <= 1) {
        const diffusion = Math.sin(q * Math.PI) * 0.035;
        point = new THREE.Vector3(
          1.265 + q * 0.09,
          Math.sin(a) * 0.082 + (Math.sin(i * 2.71 + q * 17) + .4 * Math.sin(i * 1.3 + q * 39)) * diffusion,
          Math.cos(a) * 0.082 + (Math.cos(i * 1.93 + q * 19) + .4 * Math.sin(i * 2.1 + q * 31)) * diffusion,
        );
        scale = Math.min(1, q * 12) * (q > 0.9 ? 1 - (q - 0.9) * 5 : 1);
      } else if (q < 1.15) {
        // Brief receptor binding followed by dissociation and clearance.
        point = receptors[i % receptors.length].position.clone();
        scale = .65;
      } else {
        const uptake = (q - 1.15) / 0.45;
        point = new THREE.Vector3(
          1.34 - 0.09 * uptake,
          Math.sin(a) * 0.082 + (0.31 - Math.sin(a) * 0.082) * uptake,
          Math.cos(a) * 0.082 + (0.17 - Math.cos(a) * 0.082) * uptake,
        );
        scale = 0.6 * (1 - uptake);
      }
      place(transmitter, i, point, scale);
    }
    transmitter.instanceMatrix.needsUpdate = true;
    const receptorActive =
      p > 0.72 && p < 0.89 ? Math.sin(((p - 0.72) / 0.17) * Math.PI) : 0;
    receptors.forEach((r, i) => {
      r.scale.setScalar(1 + receptorActive * 0.22);
      r.material.emissiveIntensity = 0.1 + receptorActive * 0.9;
    });
    for (let i = 0; i < 24; i++) {
      const direct =
        !electric && state.synapse !== "metabotropic" && p > 0.73 && p < 0.9;
      if (!direct) {
        postIons.setMatrixAt(i, zero);
        continue;
      }
      const a = ((i % 8) * Math.PI) / 4,
        q = ((p - 0.73) * 13 + i * 0.17) % 1,
        outward = state.synapse === "ampa" && i >= 16;
      const point = new THREE.Vector3(
        1.31 + (outward ? 1 - q : q) * 0.19,
        Math.sin(a) * 0.14,
        Math.cos(a) * 0.14,
      );
      place(postIons, i, point, Math.sin(q * Math.PI));
    }
    postIons.instanceMatrix.needsUpdate = true;
    gAlpha.position.x = 1.55 + Math.max(0, p - 0.76) * 0.65;
    gBeta.material.emissiveIntensity = receptorActive * 0.5;
    effector.material.emissiveIntensity = 0.1 + receptorActive * 0.8;
    for (let i = 0; i < 22; i++) {
      const q = (p - 0.77) * 5 - i * 0.018;
      if (state.synapse !== "metabotropic" || q < 0 || q > 1) {
        messengers.setMatrixAt(i, zero);
        continue;
      }
      place(
        messengers,
        i,
        new THREE.Vector3(
          1.59 + q * 0.57,
          -0.08 + Math.sin(i * 2.4) * q * 0.12,
          0.07 + Math.cos(i * 1.8) * q * 0.12,
        ),
        Math.sin(q * Math.PI),
      );
    }
    messengers.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 24; i++) {
      if (!electric || p < 0.55 || p > 0.87) {
        gapIons.setMatrixAt(i, zero);
        continue;
      }
      const a = ((i % 8) * Math.PI) / 4,
        q = ((p - 0.55) * 8 + i * 0.13) % 1;
      place(
        gapIons,
        i,
        new THREE.Vector3(
          1.18 + q * 0.29,
          Math.sin(a) * 0.105,
          Math.cos(a) * 0.105,
        ),
        Math.sin(q * Math.PI),
      );
    }
    gapIons.instanceMatrix.needsUpdate = true;
    transporters.forEach(
      (m) => (m.material.emissiveIntensity = p > 0.83 ? 0.55 : 0.1),
    );
  }
  return { configure, update };
}
