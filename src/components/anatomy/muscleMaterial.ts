import * as THREE from "three";

export const TENDON_COLOR = new THREE.Color("#e9e1d2");

/** Shared surface detail for the simulator and atlas; geometry supplies fibre direction/mask. */
export function withFibers(mat: THREE.MeshPhysicalMaterial, strength: number) {
  mat.userData["fiber"] = { value: strength };
  mat.customProgramCacheKey = () => "anatomical-fibers-v1";
  mat.onBeforeCompile = (sh) => {
    sh.uniforms["uFiber"] = mat.userData["fiber"];
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec3 fiber;\nattribute float fiberMask;\nvarying vec3 vFiber;\nvarying vec3 vPosW;\nvarying float vMask;",
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvFiber = normalize(mat3(modelMatrix) * fiber);\nvPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvMask = fiberMask;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uFiber;\nvarying vec3 vFiber;\nvarying vec3 vPosW;\nvarying float vMask;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          vec3 fW = normalize(vFiber);
          vec3 refAxis = abs(fW.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          vec3 p1 = normalize(cross(fW, refAxis));
          vec3 p2 = cross(fW, p1);
          float u = dot(vPosW, p1) * 1500.0 + 2.6 * sin(dot(vPosW, p2) * 260.0) + 1.4 * sin(dot(vPosW, fW) * 55.0);
          float fade = 1.0 - smoothstep(0.7, 2.4, fwidth(u));
          float s = sin(u) * 0.6 + sin(u * 2.17 + 1.3) * 0.4;
          vec3 bV = normalize((viewMatrix * vec4(p1, 0.0)).xyz);
          normal = normalize(normal + bV * s * uFiber * vMask * fade);
        }`,
      );
  };
  return mat;
}

export function createMuscleMaterial() {
  return withFibers(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.42,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      sheen: 0.6,
      sheenColor: new THREE.Color("#ffd6c7"),
    }),
    0.32,
  );
}
