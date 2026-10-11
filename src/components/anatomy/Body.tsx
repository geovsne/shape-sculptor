import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Head, Muscle, Profile } from "@/lib/training";
import { HEADS, HEAD_IDS } from "@/lib/training";
import { REF_FMI } from "@/lib/sim";
import { createMuscleMaterial, TENDON_COLOR, withFibers } from "./muscleMaterial";
import {
  deform,
  leanness,
  loadBody,
  follow,
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

const INJURY_COLOR = new THREE.Color("#3a0606");
const TENDON_INJURY_COLOR = new THREE.Color("#ffb020");
const HOVER_COLOR = new THREE.Color("#ff6a2a");
const LIP_TINT = new THREE.Color(1, 0.72, 0.72);
const SCLERA = new THREE.Color("#ece5dc");
const IRIS = new THREE.Color("#7a5232");
const IRIS_IN = new THREE.Color("#a77a45");
const IRIS_RING = new THREE.Color("#3a2617");
const PUPIL = new THREE.Color("#0d0a08");

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

  // skin render vertices = originals + copies along texture seams
  const N = m.skin.depth.length;
  const dup = m.skin.dup;
  const ext = (a: Float32Array, n: number) => {
    const out = new Float32Array((N + dup.length) * n);
    out.set(a.subarray(0, N * n));
    for (let k = 0; k < dup.length; k++)
      for (let c = 0; c < n; c++) out[(N + k) * n + c] = a[dup[k]! * n + c]!;
    return out;
  };
  const skinPos = new THREE.BufferAttribute(ext(m.skin.pos, 3), 3);
  const skinNrm = new THREE.BufferAttribute(ext(m.skin.nrm, 3), 3);
  const skin = new THREE.BufferGeometry();
  skin.setAttribute("position", skinPos);
  skin.setAttribute("normal", skinNrm);
  skin.setAttribute("fiber", new THREE.BufferAttribute(ext(m.skin.fiber, 3), 3));
  skin.setAttribute("fiberMask", new THREE.BufferAttribute(ext(m.skin.bindSum, 1), 1));
  const tint = new Float32Array(m.skin.tint.length * 3);
  const c = new THREE.Color();
  for (let i = 0; i < m.skin.tint.length; i++) {
    // with a real skin texture the lips are already painted
    const t = m.skin.tone;
    if (t) c.setRGB(t[i * 3]!, t[i * 3 + 1]!, t[i * 3 + 2]!);
    else c.setRGB(1, 1, 1);
    c.lerp(LIP_TINT, m.skin.tint[i]! * 0.8);
    tint[i * 3] = c.r;
    tint[i * 3 + 1] = c.g;
    tint[i * 3 + 2] = c.b;
  }
  skin.setAttribute("color", new THREE.BufferAttribute(ext(tint, 3), 3));
  if (m.skin.uv) skin.setAttribute("uv", new THREE.BufferAttribute(m.skin.uv, 2));
  skin.setIndex(new THREE.BufferAttribute(m.skin.renderIdx, 1));

  // hair cap (scalp under the hair) shares the deformed skin vertices
  const clothWArr = ext(m.skin.clothW, 3);
  const clothW = new THREE.BufferAttribute(clothWArr, 3);
  const capIdx: number[] = [];
  const ri = m.skin.renderIdx;
  for (let f = 0; f < ri.length; f += 3)
    if (
      Math.max(
        clothWArr[ri[f]! * 3 + 2]!,
        clothWArr[ri[f + 1]! * 3 + 2]!,
        clothWArr[ri[f + 2]! * 3 + 2]!,
      ) > 0.5
    )
      capIdx.push(ri[f]!, ri[f + 1]!, ri[f + 2]!);
  const cap = new THREE.BufferGeometry();
  cap.setAttribute("position", skinPos);
  cap.setAttribute("normal", skinNrm);
  cap.setAttribute("clothW", clothW);
  cap.setIndex(new THREE.BufferAttribute(new Uint32Array(capIdx), 1));

  // MakeHuman clothes, hair and eyebrows: their own meshes riding on the skin
  const assets = m.assets.map((a) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a.pos.slice(), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(a.nrm.slice(), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(a.uv, 2));
    g.setIndex(new THREE.BufferAttribute(a.idx, 1));
    return g;
  });

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
  hair.setAttribute("position", new THREE.BufferAttribute(m.hair.pos.slice(), 3));
  hair.setAttribute("normal", new THREE.BufferAttribute(m.hair.nrm.slice(), 3));
  hair.setIndex(new THREE.BufferAttribute(m.hair.idx, 1));
  return { muscle, bone, skin, cap, eye, hair, assets };
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
      if (geo)
        Object.values(geo).forEach((g) => (Array.isArray(g) ? g : [g]).forEach((x) => x.dispose()));
    },
    [geo],
  );

  const mats = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = (path: string | null | undefined) => {
      if (!path) return null;
      const t = loader.load(`/models/${path}`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    const skinTex = tex(model?.header.skinTex);
    const muscle = createMuscleMaterial();
    const skinMat = withFibers(
      new THREE.MeshPhysicalMaterial({
        color: skinTex ? "#ffffff" : sex === "m" ? "#d9a98c" : "#e6b9a0",
        map: skinTex,
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
    // MakeHuman pieces: fabric (texture as greyscale detail, tinted), hair cards, eyebrows
    const assets = (model?.assets ?? []).map((a) => {
      const map = tex(a.tex);
      if (a.kind === "cloth")
        return new THREE.MeshPhysicalMaterial({
          map,
          color: a.color ?? "#ffffff",
          roughness: 0.9,
          sheen: 0.6,
          sheenRoughness: 0.55,
          sheenColor: new THREE.Color("#ffffff"),
          transparent: true,
          side: THREE.DoubleSide,
        });
      if (a.kind === "hair")
        return new THREE.MeshStandardMaterial({
          map,
          alphaTest: 0.45,
          roughness: 0.6,
          side: THREE.DoubleSide,
          transparent: true,
        });
      return new THREE.MeshStandardMaterial({
        color: a.color ?? "#2a1a12",
        roughness: 0.9,
        side: THREE.DoubleSide,
        transparent: true,
      });
    });
    const capMat = layerMaterial(
      new THREE.MeshStandardMaterial({
        color: sex === "m" ? "#2a1d16" : "#3b2416",
        roughness: 0.75,
        transparent: true,
      }),
      sex === "m" ? 0.0028 : 0.0065,
      2,
    );
    // eyelashes
    const hair = new THREE.MeshStandardMaterial({
      color: "#1c120c",
      roughness: 0.8,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const eye = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.15,
      clearcoat: 1,
    });
    const bone = new THREE.MeshStandardMaterial({ color: "#ebe4d3", roughness: 0.6 });
    return { muscle, skin: skinMat, assets, cap: capMat, hair, eye, bone };
  }, [sex, model]);
  useEffect(
    () => () =>
      Object.values(mats).forEach((m) => (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose())),
    [mats],
  );

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
    // seam copies sit exactly on their originals
    const N = model.skin.depth.length;
    const dup = model.skin.dup;
    const spa = sp.array as Float32Array;
    for (let k = 0; k < dup.length; k++) spa.copyWithin((N + k) * 3, dup[k]! * 3, dup[k]! * 3 + 3);
    mp.needsUpdate = true;
    sp.needsUpdate = true;
    geo.muscle.computeVertexNormals();
    geo.skin.computeVertexNormals();
    const sn = geo.skin.getAttribute("normal") as THREE.BufferAttribute;
    const sna = sn.array as Float32Array;
    for (let k = 0; k < dup.length; k++) {
      const a = dup[k]! * 3,
        b = (N + k) * 3;
      for (let c = 0; c < 3; c++) sna[a + c] = sna[b + c] = sna[a + c]! + sna[b + c]!;
    }
    sn.needsUpdate = true;
    // clothes, hair and eyebrows ride on the deformed skin
    const skinNow = spa;
    const riders: [THREE.BufferGeometry, { pos: Float32Array; bind: Uint32Array }][] = [
      [geo.hair, model.hair],
      ...geo.assets.map(
        (g, k) => [g, model.assets[k]!] as [THREE.BufferGeometry, (typeof model.assets)[number]],
      ),
    ];
    for (const [g, part] of riders) {
      const gp = g.getAttribute("position") as THREE.BufferAttribute;
      follow(part.pos, part.bind, model.skin.pos, skinNow, gp.array as Float32Array);
      gp.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
    }
    geo.muscle.computeBoundingSphere();
    geo.skin.computeBoundingSphere();
    geo.cap.computeBoundingSphere();
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
    for (const m of [...mats.assets, mats.cap, mats.hair]) {
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
          {geo.assets.map((g, k) => (
            <mesh
              key={k}
              geometry={g}
              material={mats.assets[k]!}
              raycast={() => null}
              renderOrder={model.assets[k]?.kind === "hair" ? 4 : 3}
              castShadow={model.assets[k]?.kind === "cloth"}
            />
          ))}
          <mesh geometry={geo.cap} material={mats.cap} raycast={() => null} renderOrder={3} />
          <mesh geometry={geo.hair} material={mats.hair} raycast={() => null} renderOrder={3} />
        </>
      )}
    </group>
  );
}
