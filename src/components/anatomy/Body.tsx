import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Muscle, Profile } from "@/lib/training";
import { MUSCLE_IDS } from "@/lib/training";
import { deform, leanness, loadBody, STATIC_GROUP, TENDON_GROUP, type BodyModel } from "./model";

export type BodyProps = {
  profile: Profile;
  dev: Record<Muscle, number>;
  skin: number; // 0..1 opacity
  colorFor: (m: Muscle) => string;
  injured?: Partial<Record<Muscle, number>>;
  tendonInjured?: Partial<Record<Muscle, number>>;
  onPick?: (m: Muscle) => void;
  onLoaded?: () => void;
};

const STATIC_COLOR = new THREE.Color("#a5554c");
const TENDON_COLOR = new THREE.Color("#e9e1d2");
const INJURY_COLOR = new THREE.Color("#3a0606");
const TENDON_INJURY_COLOR = new THREE.Color("#ffb020");
const HOVER_COLOR = new THREE.Color("#ff6a2a");

/** procedural muscle fibres as a normal perturbation (no textures needed) */
function withFibers(mat: THREE.MeshPhysicalMaterial, strength: number) {
  mat.userData["fiber"] = { value: strength };
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

function buildGeometries(m: BodyModel) {
  const muscle = new THREE.BufferGeometry();
  muscle.setAttribute("position", new THREE.BufferAttribute(m.muscle.pos.slice(), 3));
  muscle.setAttribute("normal", new THREE.BufferAttribute(m.muscle.nrm.slice(), 3));
  muscle.setAttribute("color", new THREE.BufferAttribute(new Float32Array(m.muscle.pos.length), 3));
  muscle.setAttribute("fiber", new THREE.BufferAttribute(m.muscle.fiber, 3));
  const mask = new Float32Array(m.muscle.end.length);
  for (let i = 0; i < mask.length; i++) mask[i] = 1 - Math.min(1, m.muscle.end[i]! * 1.1);
  muscle.setAttribute("fiberMask", new THREE.BufferAttribute(mask, 1));
  muscle.setIndex(new THREE.BufferAttribute(m.muscle.idx, 1));

  const bone = new THREE.BufferGeometry();
  bone.setAttribute("position", new THREE.BufferAttribute(m.bone.pos, 3));
  bone.setAttribute("normal", new THREE.BufferAttribute(m.bone.nrm, 3));
  bone.setIndex(new THREE.BufferAttribute(m.bone.idx, 1));

  const skin = new THREE.BufferGeometry();
  skin.setAttribute("position", new THREE.BufferAttribute(m.skin.pos.slice(), 3));
  skin.setAttribute("normal", new THREE.BufferAttribute(m.skin.nrm.slice(), 3));
  skin.setAttribute("fiber", new THREE.BufferAttribute(m.skin.fiber, 3));
  skin.setAttribute("fiberMask", new THREE.BufferAttribute(m.skin.bindSum, 1));
  skin.setIndex(new THREE.BufferAttribute(m.skin.idx, 1));
  return { muscle, bone, skin };
}

export function Body({
  profile,
  dev,
  skin,
  colorFor,
  injured = {},
  tendonInjured = {},
  onPick,
  onLoaded,
}: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const [model, setModel] = useState<BodyModel | null>(null);
  const [hover, setHover] = useState<Muscle | null>(null);
  const sex = profile.sex;

  useEffect(() => {
    let alive = true;
    setModel(null);
    loadBody(sex)
      .then((m) => {
        if (alive) {
          setModel(m);
          onLoaded?.();
        }
      })
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [sex]); // eslint-disable-line react-hooks/exhaustive-deps

  const geo = useMemo(() => (model ? buildGeometries(model) : null), [model]);
  useEffect(
    () => () => {
      geo?.muscle.dispose();
      geo?.bone.dispose();
      geo?.skin.dispose();
    },
    [geo],
  );

  const mats = useMemo(() => {
    const muscle = withFibers(
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
    const skinMat = withFibers(
      new THREE.MeshPhysicalMaterial({
        color: sex === "m" ? "#d9a98c" : "#e3b59b",
        roughness: 0.55,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffe3d6"),
        clearcoat: 0.12,
        transparent: true,
      }),
      0,
    );
    const bone = new THREE.MeshStandardMaterial({ color: "#ebe4d3", roughness: 0.6 });
    return { muscle, skin: skinMat, bone };
  }, [sex]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // shape: muscle growth and body fat
  const devKey = MUSCLE_IDS.map((m) => dev[m].toFixed(3)).join(",");
  useEffect(() => {
    if (!model || !geo) return;
    const mp = geo.muscle.getAttribute("position") as THREE.BufferAttribute;
    const sp = geo.skin.getAttribute("position") as THREE.BufferAttribute;
    deform(model, dev, profile.bf, {
      muscle: mp.array as Float32Array,
      skin: sp.array as Float32Array,
    });
    mp.needsUpdate = true;
    sp.needsUpdate = true;
    geo.muscle.computeVertexNormals();
    geo.skin.computeVertexNormals();
    geo.muscle.computeBoundingSphere();
    geo.skin.computeBoundingSphere();
    mats.skin.userData["fiber"].value = 0.16 * leanness(profile.bf, sex);
  }, [model, geo, devKey, profile.bf]); // eslint-disable-line react-hooks/exhaustive-deps

  // colours
  const colorKey =
    MUSCLE_IDS.map((m) => colorFor(m)).join() +
    JSON.stringify(injured) +
    JSON.stringify(tendonInjured) +
    hover;
  useEffect(() => {
    if (!model || !geo) return;
    const col = geo.muscle.getAttribute("color") as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    const groups = model.header.groups;
    const base = groups.map((g) => new THREE.Color(colorFor(g)));
    const c = new THREE.Color();
    for (let i = 0; i < model.muscle.group.length; i++) {
      const gi = model.muscle.group[i]!;
      const end = model.muscle.end[i]!;
      if (gi === TENDON_GROUP) c.copy(TENDON_COLOR);
      else if (gi === STATIC_GROUP) c.copy(STATIC_COLOR);
      else {
        const g = groups[gi]!;
        c.copy(base[gi]!);
        if (hover === g) c.lerp(HOVER_COLOR, 0.45);
        if ((injured[g] ?? 0) > 0) c.lerp(INJURY_COLOR, 0.75);
      }
      // tendinous ends are pale
      const t = Math.min(1, Math.max(0, (end - 0.82) / 0.16));
      c.lerp(TENDON_COLOR, t * 0.85);
      if (gi < 200 && (tendonInjured[groups[gi]!] ?? 0) > 0 && end > 0.7)
        c.copy(TENDON_INJURY_COLOR);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    col.needsUpdate = true;
  }, [model, geo, colorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mats.skin.opacity = skin;
    mats.skin.depthWrite = skin > 0.95;
    mats.skin.needsUpdate = true;
  }, [skin, mats]);

  useFrame((st) => {
    if (group.current) group.current.position.y = Math.sin(st.clock.elapsedTime * 1.4) * 0.003;
  });

  if (!model || !geo) return null;
  const s = profile.height / 100 / model.header.height;

  const groupAt = (e: ThreeEvent<PointerEvent | MouseEvent>): Muscle | null => {
    const f = e.face;
    if (!f) return null;
    const gi = model.muscle.group[f.a]!;
    return gi < 200 ? (model.header.groups[gi] ?? null) : null;
  };

  return (
    <group ref={group} scale={[s, s, s]}>
      <mesh geometry={geo.bone} material={mats.bone} castShadow raycast={() => null} />
      <mesh
        geometry={geo.muscle}
        material={mats.muscle}
        castShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          const g = groupAt(e);
          if (g !== hover) setHover(g);
          document.body.style.cursor = g ? "pointer" : "";
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          const g = groupAt(e);
          if (g) onPick?.(g);
        }}
      />
      {skin > 0.02 && (
        <mesh geometry={geo.skin} material={mats.skin} raycast={() => null} renderOrder={2} />
      )}
    </group>
  );
}
