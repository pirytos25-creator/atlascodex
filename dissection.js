import * as THREE from "three";
const axes = { sagittal: [1, 0, 0], coronal: [0, 0, -1], axial: [0, 1, 0] };
export const ASEG_IDS = {
  4: "lh-ventricle",
  43: "rh-ventricle",
  10: "lh-thalamus",
  49: "rh-thalamus",
  11: "lh-caudate",
  50: "rh-caudate",
  12: "lh-putamen",
  51: "rh-putamen",
  13: "lh-pallidum",
  52: "rh-pallidum",
  17: "lh-hippocampus",
  53: "rh-hippocampus",
  18: "lh-amygdala",
  54: "rh-amygdala",
  26: "lh-accumbens",
  58: "rh-accumbens",
  8: "lh-cerebellum",
  47: "rh-cerebellum",
  16: "brainstem",
  14: "third-ventricle",
  15: "fourth-ventricle",
};
const deepIds = ASEG_IDS;
const cutShader = `
 precision highp sampler3D;
 uniform sampler3D uVolume;
 uniform mat4 uWorldToVoxel;
 uniform vec3 uSize;
 uniform float uOffset;
 uniform int uCompartment;
 uniform int uStyle;
 uniform int uSelected;
 uniform float uContrast;
 varying vec3 vCutWorld;
 bool fluid(int l){return l==4||l==43||l==5||l==44||l==14||l==15||l==24;}
 vec3 tissue(int l){
  bool white=l==2||l==41||l==7||l==46||l>=251;
  bool deep=l==10||l==49||l==11||l==50||l==12||l==51||l==13||l==52||l==17||l==53||l==18||l==54||l==26||l==58;
  vec3 color=vec3(.682,.494,.455);
  if(uStyle==0){
   color=vec3(.773,.651,.608);
   if(l==16)color=vec3(.725,.655,.569);
   if(l==8||l==47)color=vec3(.678,.600,.525);
   if(deep)color=vec3(.710,.608,.545);
   if(white)color=vec3(.843,.780,.682);
   if(fluid(l))color=vec3(.25,.30,.29);
  }else{
   if(l==16)color=vec3(.718,.675,.569);
   if(l==8||l==47)color=vec3(.682,.604,.518);
   if(deep)color=vec3(.639,.737,.584);
   if(white)color=vec3(.863,.788,.659);
   if(fluid(l))color=vec3(.188,.455,.561);
  }
  return color;
 }
 vec4 voxelTissue(ivec3 p){
  vec4 data=texelFetch(uVolume,p,0);int l=int(data.g*255.0+.5);
  float coverage=int(data.b*255.0+.5)==uCompartment?data.a:0.0;
  if(uStyle==0&&fluid(l))coverage=0.0;
  return vec4(tissue(l)*(.83+.17*data.r),coverage);
 }
 vec4 smoothTissue(vec3 p){
  ivec3 q=ivec3(floor(p));vec3 f=fract(p);ivec3 X=ivec3(1,0,0),Y=ivec3(0,1,0),Z=ivec3(0,0,1);
  vec4 a=mix(voxelTissue(q),voxelTissue(q+X),f.x),b=mix(voxelTissue(q+Y),voxelTissue(q+X+Y),f.x);
  vec4 c=mix(voxelTissue(q+Z),voxelTissue(q+X+Z),f.x),d=mix(voxelTissue(q+Y+Z),voxelTissue(q+X+Y+Z),f.x);
  return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);
 }
`;
const cutSurface = `
 vec3 cutPoint=(uWorldToVoxel*vec4(vCutWorld-vec3(uOffset,0.0,0.0),1.0)).xyz;
 if(any(lessThan(cutPoint,vec3(0.0)))||any(greaterThanEqual(cutPoint,uSize-vec3(1.0))))discard;
 vec4 exact=texelFetch(uVolume,ivec3(floor(cutPoint+.5)),0),sampled=smoothTissue(cutPoint);
 float coverage=smoothstep(.16,.84,sampled.a);if(coverage<.02)discard;
 float intensity=texture(uVolume,(cutPoint+.5)/uSize).r;
 intensity=clamp((intensity-.5)*uContrast+.5,0.0,1.0);
 vec3 cutColor=uStyle==2?vec3(pow(intensity,.85)*.94):sampled.rgb;
 int region=int(exact.g*255.0+.5);
 if(uSelected>0&&region==uSelected)cutColor=mix(cutColor,vec3(.69,.95,.76),.4);
 cutColor=mix(cutColor/12.92,pow((cutColor+.055)/1.055,vec3(2.4)),step(vec3(.04045),cutColor));
 diffuseColor.rgb=cutColor;diffuseColor.a*=coverage;
`;
export function createSliceVolume({ scene, state, highDetail, onStatus }) {
  const root = new THREE.Group();
  root.name = "anatomical-slices";
  scene.add(root);
  const caps = [],
    surfaceMaterials = [];
  let bytes, meta, inverse, pending, texture;
  for (let compartment = 1; compartment <= 3; compartment++) {
    const uniforms = {
      uVolume: { value: null },
      uWorldToVoxel: { value: new THREE.Matrix4() },
      uSize: { value: new THREE.Vector3(128, 128, 128) },
      uOffset: { value: 0 },
      uCompartment: { value: compartment },
      uStyle: { value: 0 },
      uSelected: { value: 0 },
      uContrast: { value: 1 },
    };
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.63,
      metalness: 0,
      side: THREE.DoubleSide,
      alphaTest: 0.12,
      alphaToCoverage: true,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        "varying vec3 vCutWorld;\n" +
        shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvCutWorld=(modelMatrix*vec4(transformed,1.0)).xyz;",
        );
      shader.fragmentShader =
        cutShader +
        "\n" +
        shader.fragmentShader
          .replace(
            "#include <color_fragment>",
            "#include <color_fragment>\n" + cutSurface,
          )
          .replace(
            "#include <normal_fragment_maps>",
            "#include <normal_fragment_maps>\nif(uStyle!=2){normal=normalize(normal-0.32*dFdx(intensity)*normalize(dFdx(vViewPosition))-0.32*dFdy(intensity)*normalize(dFdy(vViewPosition)));}",
          );
    };
    material.customProgramCacheKey = () => "Neuroatlas MRI tissue section v3";
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), material);
    mesh.userData = { kind: "slice", compartment };
    mesh.visible = false;
    root.add(mesh);
    caps.push({ mesh, compartment, uniforms });
  }
  async function ensure() {
    if (bytes) return;
    if (pending) return pending;
    onStatus("Wczytuję przekroje MRI…");
    pending = (async () => {
      try {
        const compressed = typeof DecompressionStream !== "undefined",
          prefix =
            highDetail && compressed ? "brain-volume-hd" : "brain-volume";
        const responses = await Promise.all([
          fetch(new URL(`./assets/${prefix}.json`, import.meta.url)),
          fetch(
        new URL(`./assets/${prefix}.bin${compressed ? ".gz" : ""}`, import.meta.url),
      ),
        ]);
        if (responses.some((r) => !r.ok))
          throw new Error("Nie udało się wczytać danych przekroju.");
        meta = await responses[0].json();
        let raw = await responses[1].arrayBuffer();
        if (
          compressed &&
          new Uint8Array(raw)[0] === 31 &&
          new Uint8Array(raw)[1] === 139
        )
          raw = await new Response(
            new Blob([raw])
              .stream()
              .pipeThrough(new DecompressionStream("gzip")),
          ).arrayBuffer();
        if (raw.byteLength !== meta.size.reduce((a, b) => a * b, 4))
          throw new Error("Niepełne dane przekroju.");
        bytes = new Uint8Array(raw);
        inverse = new THREE.Matrix4().set(...meta.worldToVoxel.flat());
        texture = new THREE.Data3DTexture(bytes, ...meta.size);
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;
        for (const c of caps) {
          c.uniforms.uVolume.value = texture;
          c.uniforms.uWorldToVoxel.value.copy(inverse);
          c.uniforms.uSize.value.set(...meta.size);
        }
        state.volumeReady = true;
        state.volumeResolution = meta.voxelSizeMm;
        onStatus(
          `MRI fsaverage · woksele ${meta.voxelSizeMm} mm · płynne próbkowanie`,
        );
        update();
      } catch (e) {
        onStatus(e.message);
        pending = null;
      }
    })();
    return pending;
  }
  function offsetFor(compartment) {
    return compartment === 1
      ? -state.renderSeparation
      : compartment === 2
        ? state.renderSeparation
        : 0;
  }
  function update() {
    syncMaterials();
    root.visible =
      state.section !== "none" &&
      ["atlas", "dissection", "detailed", "vascular", "networks", "tours", "quiz"].includes(state.mode);
    if (!bytes && (root.visible || state.sliceStyle !== "natural")) {
      ensure();
      return;
    }
    if (!root.visible) return;
    const normal = new THREE.Vector3(...axes[state.section]),
      quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      ),
      center = normal.clone().multiplyScalar(-state.renderSlice * 0.028);
    const selected = Number(
      Object.entries(deepIds).find(
        ([label, id]) => id === state.selected,
      )?.[0] || 0,
    );
    for (const c of caps) {
      c.mesh.position.copy(center);
      c.mesh.position.x += offsetFor(c.compartment);
      c.mesh.quaternion.copy(quaternion);
      c.mesh.visible =
        c.compartment === 1
          ? state.left
          : c.compartment === 2
            ? state.right
            : true;
      c.uniforms.uOffset.value = offsetFor(c.compartment);
      c.uniforms.uStyle.value =
        state.sliceStyle === "mri" ? 2 : state.sliceStyle === "tissue" ? 1 : 0;
      c.uniforms.uSelected.value = selected;
      c.uniforms.uContrast.value = state.sliceContrast;
    }
  }

  let mappedKey = "";
  function registerMeshes(meshes) {
    const baseColor = new THREE.Color("#c5a69b").r;
    for (const mesh of meshes) {
      const count = mesh.geometry.getAttribute("position").count,
        original = mesh.geometry.getAttribute("color"),
        shades = new Float32Array(count);
      for (let i = 0; i < count; i++)
        shades[i] =
          mesh.userData.kind === "cortex" && original
            ? original.array[i * 3] / baseColor
            : 1;
      surfaceMaterials.push({ mesh, shades });
    }
  }
  function tissueColor(l) {
    if ([4, 43, 5, 44, 14, 15, 24].includes(l)) return [0.188, 0.455, 0.561];
    if ([2, 41, 7, 46, 251, 252, 253, 254, 255].includes(l))
      return [0.863, 0.788, 0.659];
    if ([10, 49, 11, 50, 12, 51, 13, 52, 17, 53, 18, 54, 26, 58].includes(l))
      return [0.639, 0.737, 0.584];
    if ([8, 47].includes(l)) return [0.682, 0.604, 0.518];
    if (l === 16) return [0.718, 0.675, 0.569];
    return [0.682, 0.494, 0.455];
  }
  function syncMaterials(force = false) {
    if (state.sliceStyle === "natural") {
      for (const e of surfaceMaterials)
        if (e.mesh.userData.kind === "deep" && e.mesh.material.vertexColors) {
          e.mesh.material.vertexColors = false;
          e.mesh.material.needsUpdate = true;
        }
      mappedKey = "";
      return;
    }
    if (!bytes) return;
    const key = state.sliceStyle + "|" + state.sliceContrast;
    if (key === mappedKey && !force) return;
    mappedKey = key;
    const transform = meta.worldToVoxel,
      [nx, ny, nz] = meta.size,
      point = new THREE.Vector3();
    const linear = (c) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    for (const entry of surfaceMaterials) {
      const positions = entry.mesh.geometry.getAttribute("position").array,
        colors = new Float32Array(positions.length);
      for (let i = 0; i < entry.shades.length; i++) {
        const j = i * 3,
          x = positions[j],
          y = positions[j + 1],
          z = positions[j + 2];
        const vx = Math.max(
            0,
            Math.min(
              nx - 1.001,
              transform[0][0] * x +
                transform[0][1] * y +
                transform[0][2] * z +
                transform[0][3],
            ),
          ),
          vy = Math.max(
            0,
            Math.min(
              ny - 1.001,
              transform[1][0] * x +
                transform[1][1] * y +
                transform[1][2] * z +
                transform[1][3],
            ),
          ),
          vz = Math.max(
            0,
            Math.min(
              nz - 1.001,
              transform[2][0] * x +
                transform[2][1] * y +
                transform[2][2] * z +
                transform[2][3],
            ),
          );
        const ix = Math.floor(vx),
          iy = Math.floor(vy),
          iz = Math.floor(vz),
          fx = vx - ix,
          fy = vy - iy,
          fz = vz - iz;
        let intensity = 0;
        for (let dx = 0; dx < 2; dx++)
          for (let dy = 0; dy < 2; dy++)
            for (let dz = 0; dz < 2; dz++)
              intensity +=
                (bytes[4 * (ix + dx + nx * (iy + dy + ny * (iz + dz)))] *
                  (dx ? fx : 1 - fx) *
                  (dy ? fy : 1 - fy) *
                  (dz ? fz : 1 - fz)) /
                255;
        const index =
          4 * (Math.round(vx) + nx * (Math.round(vy) + ny * Math.round(vz)));
        let color;
        if (state.sliceStyle === "mri") {
          const tone =
            Math.pow(
              Math.max(
                0,
                Math.min(1, (intensity - 0.5) * state.sliceContrast + 0.5),
              ),
              0.85,
            ) * 0.94;
          color = [tone, tone, tone];
        } else
          color = tissueColor(bytes[index + 1]).map(
            (c) => c * (0.83 + 0.17 * intensity),
          );
        for (let k = 0; k < 3; k++)
          colors[j + k] = linear(color[k]) * entry.shades[i];
      }
      entry.mesh.geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3),
      );
      entry.mesh.material.color.set("#ffffff");
      if (!entry.mesh.material.vertexColors) {
        entry.mesh.material.vertexColors = true;
        entry.mesh.material.needsUpdate = true;
      }
    }
  }
  function itemAt(mesh, point) {
    if (!bytes) return null;
    const p = point.clone();
    p.x -= offsetFor(mesh.userData.compartment);
    p.applyMatrix4(inverse);
    const x = Math.round(p.x),
      y = Math.round(p.y),
      z = Math.round(p.z),
      [nx, ny, nz] = meta.size;
    if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) return null;
    const i = 4 * (x + nx * (y + ny * z));
    return bytes[i + 3] && bytes[i + 2] === mesh.userData.compartment
      ? deepIds[bytes[i + 1]]
      : null;
  }
  return {
    update,
    ensure,
    registerMeshes,
    getData: () => (bytes ? { bytes, meta } : null),
    applyGlobalStyle: () => syncMaterials(true),
    itemAt,
    tissueColor,
    meshes: () =>
      root.visible ? caps.filter((c) => c.mesh.visible).map((c) => c.mesh) : [],
    root,
  };
}
