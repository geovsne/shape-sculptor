/* Loader for the anatomical atlas layers (exported from Z-Anatomy, see tools/anatomy). */

export const SYSTEMS = [
  "skin",
  "muscles",
  "bones",
  "joints",
  "nerves",
  "vessels",
  "organs",
] as const;
export type SystemId = (typeof SYSTEMS)[number];

export const SYSTEM_LABEL: Record<SystemId, string> = {
  skin: "Pele",
  muscles: "Músculos",
  bones: "Ossos",
  joints: "Ligamentos",
  nerves: "Nervos",
  vessels: "Vasos",
  organs: "Órgãos",
};

export type AtlasPart = {
  name: string;
  base: string;
  side: "l" | "r" | "c";
  group: string | null;
  cat: string;
  v0: number;
  nv: number;
  t0: number;
  nt: number;
};

export type AtlasLayer = {
  system: SystemId;
  pos: Float32Array;
  nrm: Float32Array;
  idx: Uint32Array;
  part: Uint16Array;
  parts: AtlasPart[];
};

const cache = new Map<SystemId, Promise<AtlasLayer>>();

async function gunzip(buf: ArrayBuffer) {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([buf]).stream().pipeThrough(ds);
  return new Response(stream).arrayBuffer();
}

export function loadLayer(system: SystemId): Promise<AtlasLayer> {
  let p = cache.get(system);
  if (p) return p;
  p = (async () => {
    const [hdrRes, datRes] = await Promise.all([
      fetch(`/atlas/atlas-${system}.json`),
      fetch(`/atlas/atlas-${system}.dat`),
    ]);
    if (!hdrRes.ok || !datRes.ok) throw new Error(`atlas ${system}: download falhou`);
    const hdr = (await hdrRes.json()) as {
      lo: number[];
      scale: number[];
      nv: number;
      nt: number;
      parts: AtlasPart[];
    };
    const raw = await datRes.arrayBuffer();
    // servers may already have removed the gzip layer
    const bytes = new Uint8Array(raw);
    const buf = bytes[0] === 0x1f && bytes[1] === 0x8b ? await gunzip(raw) : raw;
    const { nv, nt, lo, scale } = hdr;
    let o = 0;
    const q = new Uint16Array(buf, o, nv * 3);
    o += nv * 6;
    const n8 = new Int8Array(buf, o, nv * 3);
    o += nv * 3;
    // indices need 4-byte alignment: copy
    const idx = new Uint32Array(buf.slice(o, o + nt * 12));
    o += nt * 12;
    const part = new Uint16Array(buf.slice(o, o + nv * 2));
    const pos = new Float32Array(nv * 3);
    const nrm = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) {
      const a = i % 3;
      pos[i] = lo[a]! + (q[i]! / 65535) * scale[a]!;
      nrm[i] = n8[i]! / 127;
    }
    return { system, pos, nrm, idx, part, parts: hdr.parts };
  })();
  cache.set(system, p);
  p.catch(() => cache.delete(system));
  return p;
}

/** reviewed Portuguese names, Latin (TA2) and descriptions, one file per system */
export type Term = { pt: string; la: string; ta2: number | null; d: string; src: string };
export type Terms = { parts: Record<string, Term>; groups: Record<string, string> };

/** systems whose names were already reviewed (see tools/anatomy/terms) */
export const TERMS_READY: SystemId[] = ["organs", "skin", "bones", "joints", "nerves", "muscles"];

export function loadTerms(system: SystemId): Promise<Terms> {
  if (!TERMS_READY.includes(system)) return Promise.resolve({ parts: {}, groups: {} });
  return fetch(`/atlas/terms-${system}.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Terms>) : { parts: {}, groups: {} }))
    .catch(() => ({ parts: {}, groups: {} }));
}

/** colour per kind of structure */
export const CAT_COLOR: Record<string, string> = {
  skin: "#e2b398",
  muscles: "#b65a4f",
  bones: "#ebe2cf",
  ligament: "#d8cfae",
  disc: "#bcd2dc",
  nerve: "#f2c94c",
  brain: "#e7b3ad",
  sense: "#d8c3b8",
  artery: "#c8323b",
  vein: "#3b63b7",
  heart: "#a5323c",
  organs: "#c98774",
};

export const SIDE_LABEL = { l: "esquerdo", r: "direito", c: "" } as const;
