import type { Head, Muscle, Sex } from "@/lib/training";

/**
 * Anatomical body model built from Z-Anatomy (CC BY-SA 4.0, derived from BodyParts3D).
 * See public/models/LICENSE.txt. Files are produced by an offline pipeline:
 *   body-<sex>.json  header (sections, part table)
 *   body-<sex>.dat   binary blob (gzip-compressed)
 */

export type Part = {
  name: string;
  label: string;
  side: "l" | "r" | "c";
  group: Muscle | null;
  tendon: boolean;
  head: Head | null;
  v0: number;
  nv: number;
};

type Header = {
  version: number;
  sex: Sex;
  lo: [number, number, number];
  scale: [number, number, number];
  height: number;
  groups: Muscle[];
  heads: Head[];
  fatRegions: string[];
  parts: Part[];
  sections: { name: string; offset: number; dtype: string; shape: number[] }[];
  ampMax: number;
  depthMax: number;
  bindK: number;
  restBf: number;
};

export type BodyModel = {
  header: Header;
  muscle: {
    pos: Float32Array;
    nrm: Float32Array;
    idx: Uint32Array;
    part: Uint16Array;
    group: Uint8Array;
    amp: Float32Array;
    fiber: Float32Array;
    end: Float32Array;
    head: Uint8Array;
    head2: Uint8Array;
    hw: Float32Array;
  };
  bone: { pos: Float32Array; nrm: Float32Array; idx: Uint32Array };
  eye: { pos: Float32Array; nrm: Float32Array; idx: Uint32Array; kind: Float32Array };
  /** brows/lashes (kind 0), hair mass (1), hair tie (2); each vertex follows one skin vertex */
  hair: {
    pos: Float32Array;
    nrm: Float32Array;
    idx: Uint32Array;
    bind: Uint32Array;
    kind: Uint8Array;
    dir: Float32Array;
  };
  /** clothes: shorts (kind 0) and sports bra (1); band = waistband / hem (0..1) */
  garment: {
    pos: Float32Array;
    nrm: Float32Array;
    idx: Uint32Array;
    bind: Uint32Array;
    kind: Uint8Array;
    band: Float32Array;
  };
  skin: {
    pos: Float32Array;
    nrm: Float32Array;
    idx: Uint32Array;
    region: Float32Array;
    depth: Float32Array;
    bindIdx: Uint32Array;
    bindW: Float32Array;
    bindSum: Float32Array;
    fiber: Float32Array;
    /** 0 none, 1 shorts, 2 sports top, 3 hair cap (per triangle) */
    cloth: Uint8Array;
    /** smooth masks per vertex: shorts, top, hair cap (0.5 = edge) */
    clothW: Float32Array;
    tint: Float32Array;
  };
};

export const STATIC_GROUP = 255;
export const TENDON_GROUP = 254;

const ARR = {
  uint8: Uint8Array,
  int8: Int8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  float32: Float32Array,
} as const;

async function inflate(buf: ArrayBuffer): Promise<ArrayBuffer> {
  const b = new Uint8Array(buf);
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf;
  const ds = new DecompressionStream("gzip");
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
}

const cache = new Map<Sex, Promise<BodyModel>>();

export function loadBody(sex: Sex): Promise<BodyModel> {
  let p = cache.get(sex);
  if (!p) {
    p = (async () => {
      const [hRes, dRes] = await Promise.all([
        fetch(`/models/body-${sex}.json`),
        fetch(`/models/body-${sex}.dat`),
      ]);
      if (!hRes.ok || !dRes.ok) throw new Error("Não foi possível carregar o modelo 3D.");
      const header = (await hRes.json()) as Header;
      const buf = await inflate(await dRes.arrayBuffer());
      return decode(header, buf);
    })();
    p.catch(() => cache.delete(sex));
    cache.set(sex, p);
  }
  return p;
}

function decode(h: Header, buf: ArrayBuffer): BodyModel {
  const raw = (name: string) => {
    const s = h.sections.find((x) => x.name === name);
    if (!s) throw new Error(`modelo sem seção ${name}`);
    const C = ARR[s.dtype as keyof typeof ARR];
    const count = s.shape.reduce((a, b) => a * b, 1);
    return new C(buf, s.offset, count);
  };
  const pos = (name: string) => {
    const q = raw(name) as Uint16Array;
    const out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) {
      const c = i % 3;
      out[i] = (q[i]! / 65535) * h.scale[c]! + h.lo[c]!;
    }
    return out;
  };
  const unit = (name: string) => {
    const q = raw(name) as Int8Array;
    const out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 3) {
      const x = q[i]! / 127,
        y = q[i + 1]! / 127,
        z = q[i + 2]! / 127;
      const l = Math.hypot(x, y, z) || 1;
      out[i] = x / l;
      out[i + 1] = y / l;
      out[i + 2] = z / l;
    }
    return out;
  };
  const scaled = (name: string, max: number, div: number) => {
    const q = raw(name);
    const out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) out[i] = (q[i]! / div) * max;
    return out;
  };
  const bindW = scaled("skin.bindW", 1, 255);
  const K = h.bindK;
  const bindSum = new Float32Array(bindW.length / K);
  for (let i = 0; i < bindSum.length; i++) {
    let s = 0;
    for (let k = 0; k < K; k++) s += bindW[i * K + k]!;
    bindSum[i] = Math.min(1, s);
  }
  return {
    header: h,
    muscle: {
      pos: pos("muscle.pos"),
      nrm: unit("muscle.nrm"),
      idx: raw("muscle.idx") as Uint32Array,
      part: raw("muscle.part") as Uint16Array,
      group: raw("muscle.group") as Uint8Array,
      amp: scaled("muscle.amp", h.ampMax, 65535),
      fiber: unit("muscle.fiber"),
      end: scaled("muscle.end", 1, 255),
      head: raw("muscle.head") as Uint8Array,
      head2: raw("muscle.head2") as Uint8Array,
      hw: scaled("muscle.hw", 1, 255),
    },
    bone: { pos: pos("bone.pos"), nrm: unit("bone.nrm"), idx: raw("bone.idx") as Uint32Array },
    eye: {
      pos: pos("eye.pos"),
      nrm: unit("eye.nrm"),
      idx: raw("eye.idx") as Uint32Array,
      kind: scaled("eye.kind", 2, 255),
    },
    hair: {
      pos: pos("hair.pos"),
      nrm: unit("hair.nrm"),
      idx: raw("hair.idx") as Uint32Array,
      bind: raw("hair.bind") as Uint32Array,
      kind: raw("hair.kind") as Uint8Array,
      dir: unit("hair.dir"),
    },
    garment: {
      pos: pos("garment.pos"),
      nrm: unit("garment.nrm"),
      idx: raw("garment.idx") as Uint32Array,
      bind: raw("garment.bind") as Uint32Array,
      kind: raw("garment.kind") as Uint8Array,
      band: scaled("garment.band", 1, 255),
    },
    skin: {
      pos: pos("skin.pos"),
      nrm: unit("skin.nrm"),
      idx: raw("skin.idx") as Uint32Array,
      region: scaled("skin.region", 1, 255),
      depth: scaled("skin.depth", h.depthMax, 65535),
      bindIdx: raw("skin.bindIdx") as Uint32Array,
      bindW,
      bindSum,
      fiber: unit("skin.fiber"),
      cloth: raw("skin.cloth") as Uint8Array,
      clothW: scaled("skin.clothW", 1, 255),
      tint: scaled("skin.tint", 1, 255),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Deformation                                                         */
/* ------------------------------------------------------------------ */

/** development that matches the sculpted rest pose of each model */
export const REST_DEV: Record<Sex, number> = { m: 0.25, f: 0.2 };

/** relative fat distribution per region (order = header.fatRegions) */
const FAT_DIST: Record<Sex, Record<string, number>> = {
  m: {
    abdomen: 1.7,
    lowback: 1.35,
    chest: 1.1,
    glutes: 0.9,
    thighs: 0.7,
    arms: 0.65,
    back: 0.9,
    face: 0.7,
    other: 0.3,
  },
  f: {
    abdomen: 1.15,
    lowback: 1.0,
    chest: 1.3,
    glutes: 1.55,
    thighs: 1.5,
    arms: 1.0,
    back: 0.75,
    face: 0.7,
    other: 0.35,
  },
};

/** growth of a muscle group as a fraction of its local half-thickness */
export function growthOf(dev: number, sex: Sex) {
  // women build less absolute size for the same training: softer, athletic look
  const k = sex === "m" ? 2 : 1.25;
  return Math.max(-0.4, Math.min(sex === "m" ? 1.6 : 1, (dev - REST_DEV[sex]) * k));
}

export function deform(
  m: BodyModel,
  headDev: Record<Head, number>,
  /** fat mass per height relative to the sculpted model (1 = as modelled) */
  fatRel: number,
  out: { muscle: Float32Array; skin: Float32Array },
) {
  const { header: h, muscle: mu, skin: sk } = m;
  const sex = h.sex;
  const G = new Float32Array(256);
  h.heads.forEach((hd, i) => (G[i] = growthOf(headDev[hd] ?? REST_DEV[sex], sex)));

  // muscles: push along the normal, scaled by local thickness and belly profile
  const nv = mu.amp.length;
  const disp = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    const h1 = mu.head[i]!;
    const w2 = mu.hw[i]!;
    const d = h1 < 200 ? mu.amp[i]! * ((1 - w2) * G[h1]! + w2 * G[mu.head2[i]!]!) : 0;
    const j = i * 3;
    disp[j] = mu.nrm[j]! * d;
    disp[j + 1] = mu.nrm[j + 1]! * d;
    disp[j + 2] = mu.nrm[j + 2]! * d;
    out.muscle[j] = mu.pos[j]! + disp[j]!;
    out.muscle[j + 1] = mu.pos[j + 1]! + disp[j + 1]!;
    out.muscle[j + 2] = mu.pos[j + 2]! + disp[j + 2]!;
  }

  // skin: follow the muscles underneath, then add or remove subcutaneous fat
  const regions = h.fatRegions;
  const R = regions.length;
  const dist = regions.map((r) => FAT_DIST[sex][r] ?? 0.5);
  // body fat in "BF points" of the sculpted model: same height and fat kg = same look
  const bf = Math.max(0.25, fatRel) * h.restBf;
  const fatScale = Math.pow(Math.max(3, bf) / h.restBf, 0.85) - 1;
  const K = h.bindK;
  const ns = sk.depth.length;
  // muscle-driven displacement of each skin vertex, smoothed over the skin surface
  let D = new Float32Array(ns * 3);
  for (let i = 0; i < ns; i++) {
    let dx = 0,
      dy = 0,
      dz = 0;
    for (let k = 0; k < K; k++) {
      const w = sk.bindW[i * K + k]!;
      if (w <= 0) continue;
      const q = sk.bindIdx[i * K + k]! * 3;
      dx += disp[q]! * w;
      dy += disp[q + 1]! * w;
      dz += disp[q + 2]! * w;
    }
    D[i * 3] = dx;
    D[i * 3 + 1] = dy;
    D[i * 3 + 2] = dz;
  }
  const adj = skinAdjacency(m);
  let T = new Float32Array(ns * 3);
  const skinIters = sex === "m" ? 5 : 8;
  for (let it = 0; it < skinIters; it++) {
    for (let i = 0; i < ns; i++) {
      const a = adj.start[i]!,
        b = adj.start[i + 1]!;
      let sx = 0,
        sy = 0,
        sz = 0;
      for (let e = a; e < b; e++) {
        const q = adj.nbr[e]! * 3;
        sx += D[q]!;
        sy += D[q + 1]!;
        sz += D[q + 2]!;
      }
      const n = b - a || 1;
      const j = i * 3;
      // keep the largest outward push so muscles never poke through
      T[j] = 0.5 * D[j]! + (0.5 * sx) / n;
      T[j + 1] = 0.5 * D[j + 1]! + (0.5 * sy) / n;
      T[j + 2] = 0.5 * D[j + 2]! + (0.5 * sz) / n;
    }
    [D, T] = [T, D];
  }
  // thick soft tissue (breasts, glutes, belly) spreads the push of the muscle underneath
  // instead of copying its shape, so the bust stays round as the pecs grow
  const deep = deepVerts(m);
  for (let it = 0; it < 14; it++) {
    for (let k = 0; k < deep.idx.length; k++) {
      const i = deep.idx[k]!;
      const a = adj.start[i]!,
        b = adj.start[i + 1]!;
      let sx = 0,
        sy = 0,
        sz = 0;
      for (let e = a; e < b; e++) {
        const q = adj.nbr[e]! * 3;
        sx += D[q]!;
        sy += D[q + 1]!;
        sz += D[q + 2]!;
      }
      const n = b - a || 1;
      const w = deep.w[k]!;
      const j = i * 3;
      T[j] = (1 - w) * D[j]! + (w * sx) / n;
      T[j + 1] = (1 - w) * D[j + 1]! + (w * sy) / n;
      T[j + 2] = (1 - w) * D[j + 2]! + (w * sz) / n;
    }
    for (let k = 0; k < deep.idx.length; k++) {
      const j = deep.idx[k]! * 3;
      D[j] = T[j]!;
      D[j + 1] = T[j + 1]!;
      D[j + 2] = T[j + 2]!;
    }
  }
  const abdIdx = Math.max(0, regions.indexOf("abdomen"));
  const bellyK = sex === "m" ? 0.0016 : 0.0009;
  // fat layer: thickness per vertex, then smoothed so extra fat rounds the contours off
  let Fv = new Float32Array(ns);
  for (let i = 0; i < ns; i++) {
    let mult = 0;
    for (let r = 0; r < R; r++) mult += sk.region[i * R + r]! * dist[r]!;
    const depth = sk.depth[i]!;
    const fat = Math.min(0.03, Math.max(depth - 0.0015, 0.004 * mult));
    // belly: visceral and abdominal fat push the front of the trunk out as BF rises
    const abd = sk.region[i * R + abdIdx]!;
    Fv[i] = fat * mult * fatScale + abd * bellyK * Math.max(0, bf - h.restBf);
  }
  const extra = Math.max(0, Math.min(1, fatScale));
  const fatIters = Math.round(2 + 12 * extra);
  let Ft = new Float32Array(ns);
  for (let it = 0; it < fatIters; it++) {
    for (let i = 0; i < ns; i++) {
      const a = adj.start[i]!,
        b = adj.start[i + 1]!;
      let sum = 0;
      for (let e = a; e < b; e++) sum += Fv[adj.nbr[e]!]!;
      const avg = b > a ? sum / (b - a) : Fv[i]!;
      Ft[i] = 0.5 * Fv[i]! + 0.5 * avg;
    }
    [Fv, Ft] = [Ft, Fv];
  }
  for (let i = 0; i < ns; i++) {
    const j = i * 3;
    const depth = sk.depth[i]!;
    // never sink the skin into what lies underneath
    const f = Math.max(Fv[i]!, -(depth - 0.0012));
    out.skin[j] = sk.pos[j]! + D[j]! + sk.nrm[j]! * f;
    out.skin[j + 1] = sk.pos[j + 1]! + D[j + 1]! + sk.nrm[j + 1]! * f;
    out.skin[j + 2] = sk.pos[j + 2]! + D[j + 2]! + sk.nrm[j + 2]! * f;
  }
}

/** normals for the clothing layers: the skin normals averaged over the fabric area */
export function smoothLayerNormals(
  m: BodyModel,
  skinNrm: Float32Array,
  out: Float32Array,
  iters = 24,
) {
  const adj = skinAdjacency(m);
  const cw = m.skin.clothW;
  const n = m.skin.depth.length;
  out.set(skinNrm);
  const tmp = new Float32Array(out.length);
  const act: number[] = [];
  for (let i = 0; i < n; i++) if (Math.max(cw[i * 3]!, cw[i * 3 + 1]!) > 0) act.push(i);
  const A = out,
    B = tmp;
  for (let it = 0; it < iters; it++) {
    for (const i of act) {
      const a = adj.start[i]!,
        b = adj.start[i + 1]!;
      let sx = 0,
        sy = 0,
        sz = 0;
      for (let e = a; e < b; e++) {
        const q = adj.nbr[e]! * 3;
        sx += A[q]!;
        sy += A[q + 1]!;
        sz += A[q + 2]!;
      }
      const j = i * 3;
      const x = A[j]! + sx / (b - a || 1),
        y = A[j + 1]! + sy / (b - a || 1),
        z = A[j + 2]! + sz / (b - a || 1);
      const l = Math.hypot(x, y, z) || 1;
      B[j] = x / l;
      B[j + 1] = y / l;
      B[j + 2] = z / l;
    }
    for (const i of act) {
      const j = i * 3;
      A[j] = B[j]!;
      A[j + 1] = B[j + 1]!;
      A[j + 2] = B[j + 2]!;
    }
  }
}

/** moves attached meshes (clothes, hair) with the skin vertex each one is bound to */
export function follow(
  rest: Float32Array,
  bind: Uint32Array,
  skinRest: Float32Array,
  skinNow: Float32Array,
  out: Float32Array,
) {
  for (let i = 0; i < bind.length; i++) {
    const j = i * 3,
      q = bind[i]! * 3;
    out[j] = rest[j]! + skinNow[q]! - skinRest[q]!;
    out[j + 1] = rest[j + 1]! + skinNow[q + 1]! - skinRest[q + 1]!;
    out[j + 2] = rest[j + 2]! + skinNow[q + 2]! - skinRest[q + 2]!;
  }
}

const deepCache = new WeakMap<BodyModel, { idx: Uint32Array; w: Float32Array }>();
/** skin vertices with a thick layer under them, and how strongly to spread their motion */
function deepVerts(m: BodyModel) {
  let d = deepCache.get(m);
  if (d) return d;
  const idx: number[] = [];
  const w: number[] = [];
  for (let i = 0; i < m.skin.depth.length; i++) {
    const t = (m.skin.depth[i]! - 0.012) / 0.025;
    if (t > 0) {
      idx.push(i);
      w.push(0.9 * Math.min(1, t));
    }
  }
  d = { idx: Uint32Array.from(idx), w: Float32Array.from(w) };
  deepCache.set(m, d);
  return d;
}

const adjCache = new WeakMap<BodyModel, { start: Uint32Array; nbr: Uint32Array }>();
function skinAdjacency(m: BodyModel) {
  let a = adjCache.get(m);
  if (a) return a;
  const n = m.skin.depth.length;
  const idx = m.skin.idx;
  const deg = new Uint32Array(n + 1);
  for (let t = 0; t < idx.length; t += 3)
    for (let k = 0; k < 3; k++) deg[idx[t + k]!] = deg[idx[t + k]!]! + 2;
  const start = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i]! + deg[i]!;
  const fill = start.slice(0, n);
  const nbr = new Uint32Array(start[n]!);
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t]!, idx[t + 1]!, idx[t + 2]!];
    for (let k = 0; k < 3; k++) {
      const x = v[k]!;
      nbr[fill[x]!++] = v[(k + 1) % 3]!;
      nbr[fill[x]!++] = v[(k + 2) % 3]!;
    }
  }
  a = { start, nbr };
  adjCache.set(m, a);
  return a;
}

/** how visible muscle detail is through the skin (0 = smooth, 1 = shredded) */
export function leanness(bf: number, sex: Sex) {
  const lo = sex === "m" ? 6 : 11;
  const hi = sex === "m" ? 16 : 19;
  return Math.max(0, Math.min(1, (hi - bf) / (hi - lo)));
}
