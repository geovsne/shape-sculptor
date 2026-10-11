import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Head, Muscle, Profile } from "@/lib/training";
import { HEADS, HEAD_IDS } from "@/lib/training";
import { REF_FMI } from "@/lib/sim";
import {
  deform,
  leanness,
  loadBody,
  smoothLayerNormals,
  STATIC_GROUP,
  TENDON_GROUP,
  type BodyModel,
} from "./model";

export type BodyProps = {
  profile: Profile;
  headDev: Record<Head, number>;
  skin: number; // 0..1 opacity
  /** colour of a muscle head (null head = muscle outside the training groups) */
  colorFor: (m: Muscle, h: Head) => string;
  injured?: Partial<Record<Muscle, number>>;
  tendonInjured?: Partial<Record<Muscle, number>>;
  onPick?: (m: Muscle, h: Head | null) => void;
  /** colour of muscles outside the training groups (adductors, shin, neck...) */
  neutral?: string;
};

const TENDON_COLOR = new THREE.Color("#e9e1d2");
const INJURY_COLOR = new THREE.Color("#3a0606");
const TENDON_INJURY_COLOR = new THREE.Color("#ffb020");
const HOVER_COLOR = new THREE.Color("#ff6a2a");
const LIP_TINT = new THREE.Color(1, 0.72, 0.72);
const SCLERA = new THREE.Color("#ece5dc");
const IRIS = new THREE.Color("#7a5232");
const IRIS_IN = new THREE.Color("#a77a45");
const IRIS_RING = new THREE.Color("#3a2617");
const PUPIL = new THREE.Color("#0d0a08");

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

/** draws a layer (clothes, hair) over the skin: pushed out along the normal, clipped smoothly by its mask */
function layerMaterial(mat: THREE.Material, offset: number, channel: number) {
  // each layer compiles its own program (the default cache key is the callback source)
  mat.customProgramCacheKey = () => `layer-${offset}-${channel}`;
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec3 clothW;\nvarying float vMaskL;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\ntransformed += normalize(objectNormal) * ${offset.toFixed(5)};\nvMaskL = clothW[${channel}];`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vMaskL;")
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (vMaskL < 0.5) discard;",
      );
  };
  return mat;
}

function subsetIndex(m: BodyModel, channel: number) {
  const idx = m.skin.idx;
  const w = m.skin.clothW;
  const out: number[] = [];
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f]!,
      b = idx[f + 1]!,
      c = idx[f + 2]!;
    if (Math.max(w[a * 3 + channel]!, w[b * 3 + channel]!, w[c * 3 + channel]!) > 0.5)
      out.push(a, b, c);
  }
  return new Uint32Array(out);
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

  const skinPos = new THREE.BufferAttribute(m.skin.pos.slice(), 3);
  const skinNrm = new THREE.BufferAttribute(m.skin.nrm.slice(), 3);
  const skin = new THREE.BufferGeometry();
  skin.setAttribute("position", skinPos);
  skin.setAttribute("normal", skinNrm);
  skin.setAttribute("fiber", new THREE.BufferAttribute(m.skin.fiber, 3));
  skin.setAttribute("fiberMask", new THREE.BufferAttribute(m.skin.bindSum, 1));
  const tint = new Float32Array(m.skin.tint.length * 3);
  const c = new THREE.Color();
  for (let i = 0; i < m.skin.tint.length; i++) {
    c.setRGB(1, 1, 1).lerp(LIP_TINT, m.skin.tint[i]!);
    tint[i * 3] = c.r;
    tint[i * 3 + 1] = c.g;
    tint[i * 3 + 2] = c.b;
  }
  skin.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  skin.setIndex(new THREE.BufferAttribute(m.skin.idx, 1));

  // clothes and hair cap share the (deformed) skin vertices; fabric gets its own,
  // smoother normals so it drapes over small skin details instead of revealing them
  const clothW = new THREE.BufferAttribute(m.skin.clothW, 3);
  const fabricNrm = new THREE.BufferAttribute(m.skin.nrm.slice(), 3);
  const sub = (channel: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", skinPos);
    g.setAttribute("normal", channel === 2 ? skinNrm : fabricNrm);
    g.setAttribute("clothW", clothW);
    g.setIndex(new THREE.BufferAttribute(subsetIndex(m, channel), 1));
    return g;
  };
  const shorts = sub(0);
  const top = sub(1);
  const cap = sub(2);

  const eye = new THREE.BufferGeometry();
  eye.setAttribute("position", new THREE.BufferAttribute(m.eye.pos, 3));
  eye.setAttribute("normal", new THREE.BufferAttribute(m.eye.nrm, 3));
  const ec = new Float32Array(m.eye.kind.length * 3);
  for (let i = 0; i < m.eye.kind.length; i++) {
    const r = m.eye.kind[i]!; // angle from the gaze axis relative to the iris
    if (r > 1.08) c.copy(SCLERA);
    else if (r > 0.94) c.copy(IRIS_RING);
    else if (r > 0.42) c.copy(IRIS).lerp(IRIS_IN, Math.max(0, (0.94 - r) / 0.52) * 0.6);
    else c.copy(PUPIL);
    ec[i * 3] = c.r;
    ec[i * 3 + 1] = c.g;
    ec[i * 3 + 2] = c.b;
  }
  eye.setAttribute("color", new THREE.BufferAttribute(ec, 3));
  eye.setIndex(new THREE.BufferAttribute(m.eye.idx, 1));

  const hair = new THREE.BufferGeometry();
  hair.setAttribute("position", new THREE.BufferAttribute(m.hair.pos, 3));
  hair.setAttribute("normal", new THREE.BufferAttribute(m.hair.nrm, 3));
  hair.setIndex(new THREE.BufferAttribute(m.hair.idx, 1));
  return { muscle, bone, skin, shorts, top, cap, eye, hair };
}

export function Body({
  profile,
  headDev,
  skin,
  colorFor,
  injured = {},
  tendonInjured = {},
  onPick,
  neutral = "#a5554c",
}: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const [model, setModel] = useState<BodyModel | null>(null);
  const [hover, setHover] = useState<Muscle | null>(null);
  const sex = profile.sex;

  useEffect(() => {
    let alive = true;
    setModel(null);
    loadBody(sex)
      .then((m) => alive && setModel(m))
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [sex]);

  const geo = useMemo(() => (model ? buildGeometries(model) : null), [model]);
  useEffect(
    () => () => {
      if (geo) Object.values(geo).forEach((g) => g.dispose());
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
        color: sex === "m" ? "#d9a98c" : "#e6b9a0",
        vertexColors: true,
        roughness: 0.62,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffe3d6"),
        clearcoat: 0,
        transparent: true,
        // back faces fill tiny cracks between the original skin patches
        side: THREE.DoubleSide,
      }),
      0,
    );
    const cloth = layerMaterial(
      new THREE.MeshStandardMaterial({ color: "#2b2f38", roughness: 0.85, transparent: true }),
      0.004,
      0,
    );
    const top = layerMaterial(
      new THREE.MeshStandardMaterial({ color: "#2b2f38", roughness: 0.85, transparent: true }),
      0.003,
      1,
    );
    const capMat = layerMaterial(
      new THREE.MeshStandardMaterial({
        color: sex === "m" ? "#2a1d16" : "#3b2416",
        roughness: 0.75,
        transparent: true,
      }),
      sex === "m" ? 0.0028 : 0.0065,
      2,
    );
    const hair = new THREE.MeshStandardMaterial({
      color: sex === "m" ? "#2a1d16" : "#3b2416",
      roughness: 0.75,
      transparent: true,
    });
    const eye = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.15,
      clearcoat: 1,
    });
    const bone = new THREE.MeshStandardMaterial({ color: "#ebe4d3", roughness: 0.6 });
    return { muscle, skin: skinMat, cloth, top, cap: capMat, hair, eye, bone };
  }, [sex]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // shape: muscle growth (head by head) and body fat
  const devKey = HEAD_IDS.map((h) => headDev[h].toFixed(3)).join(",");
  useEffect(() => {
    if (!model || !geo) return;
    const mp = geo.muscle.getAttribute("position") as THREE.BufferAttribute;
    const sp = geo.skin.getAttribute("position") as THREE.BufferAttribute;
    const h2 = (profile.height / 100) ** 2;
    const fatRel = (profile.weight * profile.bf) / 100 / h2 / REF_FMI[sex];
    deform(model, headDev, fatRel, {
      muscle: mp.array as Float32Array,
      skin: sp.array as Float32Array,
    });
    mp.needsUpdate = true;
    sp.needsUpdate = true;
    geo.muscle.computeVertexNormals();
    geo.skin.computeVertexNormals();
    (geo.skin.getAttribute("normal") as THREE.BufferAttribute).needsUpdate = true;
    const fn = geo.top.getAttribute("normal") as THREE.BufferAttribute;
    smoothLayerNormals(
      model,
      (geo.skin.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array,
      fn.array as Float32Array,
    );
    fn.needsUpdate = true;
    geo.muscle.computeBoundingSphere();
    geo.skin.computeBoundingSphere();
    for (const g of [geo.shorts, geo.top, geo.cap]) g.computeBoundingSphere();
    mats.skin.userData["fiber"].value = 0.16 * leanness(profile.bf, sex);
  }, [model, geo, devKey, profile.bf, profile.weight, profile.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // colours
  const colorKey =
    HEAD_IDS.map((h) => colorFor(HEADS[h].group, h)).join() +
    JSON.stringify(injured) +
    JSON.stringify(tendonInjured) +
    hover +
    neutral;
  useEffect(() => {
    if (!model || !geo) return;
    const col = geo.muscle.getAttribute("color") as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    const { groups, heads } = model.header;
    const hc = heads.map((h) => new THREE.Color(colorFor(HEADS[h].group, h)));
    const c = new THREE.Color();
    const staticColor = new THREE.Color(neutral);
    for (let i = 0; i < model.muscle.group.length; i++) {
      const gi = model.muscle.group[i]!;
      const end = model.muscle.end[i]!;
      if (gi === TENDON_GROUP) c.copy(TENDON_COLOR);
      else if (gi === STATIC_GROUP) c.copy(staticColor);
      else {
        const g = groups[gi]!;
        const h1 = model.muscle.head[i]!;
        const h2 = model.muscle.head2[i]!;
        c.copy(hc[h1] ?? staticColor).lerp(hc[h2] ?? staticColor, model.muscle.hw[i]!);
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
    const coverOpacity = Math.min(1, skin * 1.6);
    mats.skin.opacity = skin;
    mats.skin.depthWrite = skin > 0.95;
    for (const m of [mats.cloth, mats.top, mats.cap, mats.hair]) {
      m.opacity = coverOpacity;
      m.depthWrite = coverOpacity > 0.95;
      m.needsUpdate = true;
    }
    mats.skin.needsUpdate = true;
  }, [skin, mats]);

  useFrame((st) => {
    if (group.current) group.current.position.y = Math.sin(st.clock.elapsedTime * 1.4) * 0.003;
  });

  if (!model || !geo) return null;
  const s = profile.height / 100 / model.header.height;
  const showInside = skin < 0.97;

  const pickAt = (e: ThreeEvent<PointerEvent | MouseEvent>): [Muscle | null, Head | null] => {
    const f = e.face;
    if (!f) return [null, null];
    const gi = model.muscle.group[f.a]!;
    if (gi >= 200) return [null, null];
    const hi = model.muscle.head[f.a]!;
    return [model.header.groups[gi] ?? null, hi < 200 ? (model.header.heads[hi] ?? null) : null];
  };

  return (
    <group ref={group} scale={[s, s, s]}>
      <mesh geometry={geo.eye} material={mats.eye} raycast={() => null} />
      {showInside && <mesh geometry={geo.bone} material={mats.bone} raycast={() => null} />}
      {showInside && (
        <mesh
          geometry={geo.muscle}
          material={mats.muscle}
          onPointerMove={(e) => {
            e.stopPropagation();
            const [g] = pickAt(e);
            if (g !== hover) setHover(g);
            document.body.style.cursor = g ? "pointer" : "";
          }}
          onPointerOut={() => {
            setHover(null);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            const [g, h] = pickAt(e);
            if (g) onPick?.(g, h);
          }}
        />
      )}
      {skin > 0.02 && (
        <>
          <mesh
            geometry={geo.skin}
            material={mats.skin}
            raycast={() => null}
            renderOrder={2}
            castShadow
          />
          <mesh geometry={geo.shorts} material={mats.cloth} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.top} material={mats.top} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.cap} material={mats.cap} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.hair} material={mats.hair} raycast={() => null} renderOrder={3} />
        </>
      )}
    </group>
  );
}
