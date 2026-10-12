import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { StudioEnvironment } from "../anatomy/StudioEnvironment";
import * as THREE from "three";
import { createMuscleMaterial, TENDON_COLOR } from "../anatomy/muscleMaterial";
import { buildMuscleDetail } from "./muscleDetail";
import {
  CAT_COLOR,
  SIDE_LABEL,
  SYSTEMS,
  SYSTEM_LABEL,
  loadLayer,
  type AtlasLayer,
  type AtlasPart,
  type SystemId,
} from "./atlasData";

type Pick = { system: SystemId; index: number };

const SMALL = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
const HIGHLIGHT = new THREE.Color("#ff6a3d");

/** one anatomical layer as a single mesh; colours per vertex, a part can be isolated */
function LayerMesh({
  layer,
  picked,
  isolate,
  ghost,
  onPick,
}: {
  layer: AtlasLayer;
  picked: number | null;
  isolate: boolean;
  ghost: boolean;
  onPick: (index: number | null, through: boolean) => void;
}) {
  const detail = useMemo(() => layer.system === "muscles" ? buildMuscleDetail(layer) : null, [layer]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(layer.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(layer.nrm, 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(layer.pos.length), 3));
    g.setIndex(new THREE.BufferAttribute(layer.idx, 1));
    if (detail) {
      g.setAttribute("fiber", new THREE.BufferAttribute(detail.fiber, 3));
      g.setAttribute("fiberMask", new THREE.BufferAttribute(detail.mask, 1));
    }
    g.computeBoundingSphere();
    return g;
  }, [layer, detail]);
  useEffect(() => () => geo.dispose(), [geo]);

  // colours: by kind, the picked part highlighted
  useEffect(() => {
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    const arr = col.array as Float32Array;
    const c = new THREE.Color();
    layer.parts.forEach((p, k) => {
      c.set(CAT_COLOR[p.cat] ?? CAT_COLOR[layer.system] ?? "#cccccc");
      if (k === picked) c.copy(HIGHLIGHT);
      const base = c.clone();
      for (let i = p.v0; i < p.v0 + p.nv; i++) {
        c.copy(base);
        if (detail) {
          const end = detail.end[i] ?? 0;
          if (/tendon|aponeurosis/i.test(p.base) && k !== picked) c.copy(TENDON_COLOR);
          else c.lerp(TENDON_COLOR, Math.min(1, Math.max(0, (end - 0.82) / 0.16)) * 0.85);
        }
        c.toArray(arr, i * 3);
      }
    });
    col.needsUpdate = true;
  }, [geo, layer, picked, detail]);

  useEffect(() => {
    const p = isolate && picked != null ? layer.parts[picked] : null;
    if (p) geo.setDrawRange(p.t0 * 3, p.nt * 3);
    else geo.setDrawRange(0, Infinity);
  }, [geo, layer, picked, isolate]);

  const mat = useMemo(
    () => {
      const material = layer.system === "muscles" ? createMuscleMaterial() : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: layer.system === "bones" ? 0.7 : 0.5,
        metalness: 0,
        transparent: true,
        side: THREE.DoubleSide,
      });
      material.side = THREE.DoubleSide;
      return material;
    },
    [layer.system],
  );
  useEffect(() => {
    mat.opacity = ghost ? (layer.system === "skin" ? 0.18 : 0.28) : 1;
    mat.depthWrite = !ghost;
    mat.transparent = ghost;
    mat.needsUpdate = true;
  }, [mat, ghost, layer.system]);
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <mesh
      geometry={geo}
      material={mat}
      renderOrder={ghost ? 2 : 1}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return; // a drag, not a tap
        if (ghost) return onPick(null, true); // see-through layers let the tap pass
        e.stopPropagation();
        const f = e.face;
        onPick(f ? (layer.part[f.a] ?? null) : null, false);
      }}
    />
  );
}

export function Atlas() {
  const [on, setOn] = useState<Record<SystemId, boolean>>({
    skin: false,
    muscles: true,
    bones: true,
    joints: false,
    nerves: false,
    vessels: false,
    organs: false,
  });
  const [layers, setLayers] = useState<Partial<Record<SystemId, AtlasLayer>>>({});
  const [loading, setLoading] = useState<SystemId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [see, setSee] = useState(false);
  const [q, setQ] = useState("");

  // load the layers that are switched on
  useEffect(() => {
    for (const s of SYSTEMS) {
      if (!on[s] || layers[s] || loading.includes(s)) continue;
      setLoading((l) => [...l, s]);
      loadLayer(s)
        .then((ly) => setLayers((m) => ({ ...m, [s]: ly })))
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading((l) => l.filter((x) => x !== s)));
    }
  }, [on, layers, loading]);

  // inner layers on: outer ones become see-through automatically
  const inner = on.nerves || on.vessels || on.organs;
  const ghostOf = (s: SystemId) => (see || inner) && (s === "skin" || s === "muscles");

  const part: AtlasPart | null = pick ? (layers[pick.system]?.parts[pick.index] ?? null) : null;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { system: SystemId; index: number; p: AtlasPart }[] = [];
    for (const s of SYSTEMS) {
      const ly = layers[s];
      if (!ly) continue;
      ly.parts.forEach((p, i) => {
        if (out.length < 30 && p.name.toLowerCase().includes(term))
          out.push({ system: s, index: i, p });
      });
    }
    return out;
  }, [q, layers]);

  return (
    <div className="relative min-h-screen w-full bg-background font-body text-foreground lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--glow),transparent_60%)]" />
      <div className="sticky top-0 z-20 h-[58vh] bg-background lg:absolute lg:inset-0 lg:z-auto lg:h-auto lg:bg-transparent">
        <Canvas dpr={[1, SMALL ? 1.5 : 2]} camera={{ position: [0, 1.0, 3.6], fov: 32 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} />
          <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#cfe3ff" />
          <StudioEnvironment />
          {SYSTEMS.map((s) => {
            const ly = layers[s];
            if (!ly || !on[s]) return null;
            if (isolate && pick && pick.system !== s) return null;
            return (
              <LayerMesh
                key={s}
                layer={ly}
                picked={pick?.system === s ? pick.index : null}
                isolate={isolate}
                ghost={!isolate && ghostOf(s)}
                onPick={(index, through) => {
                  if (through) return;
                  setPick(index == null ? null : { system: s, index });
                }}
              />
            );
          })}
          <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={3} blur={2.4} far={1.5} />
          <OrbitControls
            target={[0, 0.95, 0]}
            enablePan
            screenSpacePanning
            minDistance={0.2}
            maxDistance={4.5}
          />
        </Canvas>
        {loading.length > 0 && (
          <div className="glass absolute left-1/2 top-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs">
            Carregando {loading.map((s) => SYSTEM_LABEL[s].toLowerCase()).join(", ")}…
          </div>
        )}
        {part && (
          <div className="glass absolute inset-x-3 bottom-3 z-10 rounded-2xl p-3 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[420px] lg:-translate-x-1/2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {pick ? SYSTEM_LABEL[pick.system] : ""}
              {part.group ? ` · ${part.group}` : ""}
            </div>
            <div className="font-display text-lg font-semibold leading-tight">
              {part.base}
              {part.side !== "c" && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({SIDE_LABEL[part.side]})
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsolate(!isolate)}
                className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                {isolate ? "Mostrar tudo" : "Isolar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPick(null);
                  setIsolate(false);
                }}
                className="rounded-full border px-3 py-1.5 text-xs"
              >
                Fechar
              </button>
              <span className="ml-auto self-center text-[10px] text-muted-foreground">
                Ficha em breve
              </span>
            </div>
          </div>
        )}
      </div>

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-4 lg:px-8 lg:py-6">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          MYO<span className="text-primary">/</span>LAB
          <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Atlas
          </span>
        </Link>
        <Link
          to="/editor"
          className="glass rounded-full px-4 py-2 text-xs font-semibold tracking-wide"
        >
          Simulador →
        </Link>
      </header>

      <aside className="glass relative z-10 m-4 rounded-[28px] p-5 lg:absolute lg:bottom-6 lg:left-6 lg:top-24 lg:m-0 lg:w-[360px] lg:overflow-y-auto">
        <h2 className="font-display text-2xl font-bold leading-none tracking-tight">
          Atlas anatômico
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ligue as camadas e toque numa estrutura para ver o nome. Arraste para girar.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {SYSTEMS.map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={on[s]}
              onClick={() => {
                setOn({ ...on, [s]: !on[s] });
                if (pick?.system === s) {
                  setPick(null);
                  setIsolate(false);
                }
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${on[s] ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background:
                    s === "vessels"
                      ? "linear-gradient(90deg,#c8323b 50%,#3b63b7 50%)"
                      : s === "nerves"
                        ? CAT_COLOR["nerve"]
                        : s === "joints"
                          ? CAT_COLOR["ligament"]
                          : CAT_COLOR[s],
                }}
              />
              {SYSTEM_LABEL[s]}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={see} onChange={(e) => setSee(e.target.checked)} />
          Pele e músculos transparentes
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar estrutura (ex.: biceps, femur, vagus)"
          className="mt-4 w-full rounded-full bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {results.length > 0 && (
          <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
            {results.map((r) => (
              <button
                type="button"
                key={`${r.system}-${r.index}`}
                onClick={() => {
                  setPick({ system: r.system, index: r.index });
                  setIsolate(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-secondary"
              >
                <span>
                  {r.p.base}
                  {r.p.side !== "c" && (
                    <span className="text-muted-foreground"> ({SIDE_LABEL[r.p.side]})</span>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {SYSTEM_LABEL[r.system]}
                </span>
              </button>
            ))}
          </div>
        )}
        {q.trim().length >= 2 && results.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nada nas camadas ligadas. Ligue a camada da estrutura e busque de novo.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground">
          Nomes em inglês anatômico (Terminologia Anatômica). Português, latim, fichas e quiz chegam
          em breve. Modelos: Z-Anatomy (CC BY-SA 4.0), baseado em BodyParts3D.
        </p>
      </aside>
    </div>
  );
}
