import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { StudioEnvironment } from "../anatomy/StudioEnvironment";
import * as THREE from "three";
import { createMuscleMaterial, TENDON_COLOR } from "../anatomy/muscleMaterial";
import { buildMuscleDetail } from "./muscleDetail";
import { PRESETS, SUBS, SUB_COLOR, classify, norm, searchTerms } from "./atlasFilters";
import {
  CAT_COLOR,
  SIDE_LABEL,
  SYSTEMS,
  SYSTEM_LABEL,
  loadLayer,
  loadTerms,
  type AtlasLayer,
  type AtlasPart,
  type SystemId,
  type Terms,
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
  hidden,
  onPick,
}: {
  layer: AtlasLayer;
  picked: number | null;
  isolate: boolean;
  ghost: boolean;
  hidden: Set<string>;
  onPick: (index: number | null, through: boolean) => void;
}) {
  const detail = useMemo(
    () => (layer.system === "muscles" ? buildMuscleDetail(layer) : null),
    [layer],
  );
  const subs = useMemo(() => layer.parts.map((p) => classify(layer.system, p)), [layer]);
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
      c.set(SUB_COLOR[subs[k]!] ?? CAT_COLOR[p.cat] ?? CAT_COLOR[layer.system] ?? "#cccccc");
      if (k === picked) c.copy(HIGHLIGHT);
      const base = c.clone();
      for (let i = p.v0; i < p.v0 + p.nv; i++) {
        c.copy(base);
        if (detail && k !== picked && (subs[k] === "superficial" || subs[k] === "deep")) {
          const end = detail.end[i] ?? 0;
          if (/tendon|aponeurosis/i.test(p.base)) c.copy(TENDON_COLOR);
          else c.lerp(TENDON_COLOR, Math.min(1, Math.max(0, (end - 0.82) / 0.16)) * 0.85);
        }
        c.toArray(arr, i * 3);
      }
    });
    col.needsUpdate = true;
  }, [geo, layer, picked, detail, subs]);

  // visible triangles: isolated part, or every part whose sub-category is switched on
  useEffect(() => {
    const p = isolate && picked != null ? layer.parts[picked] : null;
    if (p) {
      geo.setIndex(new THREE.BufferAttribute(layer.idx, 1));
      geo.setDrawRange(p.t0 * 3, p.nt * 3);
      return;
    }
    geo.setDrawRange(0, Infinity);
    if (hidden.size === 0) {
      geo.setIndex(new THREE.BufferAttribute(layer.idx, 1));
      return;
    }
    const keep = layer.parts.filter((q, k) => k === picked || !hidden.has(subs[k]!));
    const total = keep.reduce((a, q) => a + q.nt * 3, 0);
    const out = new Uint32Array(total);
    let o = 0;
    for (const q of keep) {
      out.set(layer.idx.subarray(q.t0 * 3, (q.t0 + q.nt) * 3), o);
      o += q.nt * 3;
    }
    geo.setIndex(new THREE.BufferAttribute(out, 1));
  }, [geo, layer, picked, isolate, hidden, subs]);

  const mat = useMemo(() => {
    const material =
      layer.system === "muscles"
        ? createMuscleMaterial()
        : new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: layer.system === "bones" ? 0.7 : 0.5,
            metalness: 0,
            transparent: true,
            side: THREE.DoubleSide,
          });
    material.side = THREE.DoubleSide;
    return material;
  }, [layer.system]);
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

const HOME = { target: new THREE.Vector3(0, 0.95, 0), cam: new THREE.Vector3(0, 1.0, 3.6) };

/** glides the camera to frame a box (an isolated structure), or back to the whole body */
function CameraFocus({ box }: { box: THREE.Box3 | null }) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  const goal = useRef<{ target: THREE.Vector3; cam: THREE.Vector3 } | null>(null);
  useEffect(() => {
    if (!box) {
      goal.current = { target: HOME.target.clone(), cam: HOME.cam.clone() };
      return;
    }
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.min(3.6, Math.max(0.25, size * 1.6));
    const dir = camera.position
      .clone()
      .sub(controls?.target ?? HOME.target)
      .normalize();
    goal.current = { target: c, cam: c.clone().add(dir.multiplyScalar(dist)) };
  }, [box, camera, controls]);
  useFrame(() => {
    const g = goal.current;
    if (!g || !controls) return;
    controls.target.lerp(g.target, 0.12);
    camera.position.lerp(g.cam, 0.12);
    controls.update();
    if (controls.target.distanceTo(g.target) < 0.001 && camera.position.distanceTo(g.cam) < 0.001)
      goal.current = null;
  });
  return null;
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
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(["fascia"]));
  const [catalog, setCatalog] = useState<Partial<Record<SystemId, AtlasPart[]>>>({});
  const [terms, setTerms] = useState<Partial<Record<SystemId, Terms>>>({});
  const [open, setOpen] = useState(false);

  // part names of every layer (small headers) so search reaches all structures
  useEffect(() => {
    for (const s of SYSTEMS)
      fetch(`/atlas/atlas-${s}.json`)
        .then((r) => r.json())
        .then((h: { parts: AtlasPart[] }) => setCatalog((c) => ({ ...c, [s]: h.parts })))
        .catch(() => {});
    for (const s of SYSTEMS) loadTerms(s).then((t) => setTerms((m) => ({ ...m, [s]: t })));
  }, []);

  // the description starts closed for every new structure
  useEffect(() => setOpen(false), [pick?.system, pick?.index]);

  const termOf = (s: SystemId, p: AtlasPart) => terms[s]?.parts[p.base];
  const nameOf = (s: SystemId, p: AtlasPart) => termOf(s, p)?.pt ?? p.base;
  const groupOf = (s: SystemId, p: AtlasPart) =>
    p.group ? (terms[s]?.groups[p.group] ?? p.group) : "";

  const toggleSub = (id: string) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setOn(
      Object.fromEntries(SYSTEMS.map((s) => [s, p.on.includes(s)])) as Record<SystemId, boolean>,
    );
    setHidden(new Set(p.hidden));
    setPick(null);
    setIsolate(false);
  };

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

  const part: AtlasPart | null = pick
    ? (layers[pick.system]?.parts[pick.index] ?? catalog[pick.system]?.[pick.index] ?? null)
    : null;

  // searchable text of every structure: English, Portuguese, Latin and description
  const haystack = useMemo(() => {
    const out: { system: SystemId; index: number; p: AtlasPart; text: string }[] = [];
    for (const s of SYSTEMS)
      catalog[s]?.forEach((p, i) => {
        const t = terms[s]?.parts[p.base];
        const g = p.group ? (terms[s]?.groups[p.group] ?? "") : "";
        out.push({
          system: s,
          index: i,
          p,
          text: norm(`${p.name} ${p.group ?? ""} ${g} ${t ? `${t.pt} ${t.la} ${t.d}` : ""}`),
        });
      });
    return out;
  }, [catalog, terms]);

  const results = useMemo(() => {
    const words = searchTerms(q);
    if (!words.length) return [];
    // names that start with the query first, then names that contain it, then description hits
    const hits = haystack.filter((h) => words.some((w) => h.text.includes(w)));
    const rank = (h: (typeof hits)[number]) => {
      const pt = norm(nameOf(h.system, h.p));
      const en = norm(h.p.name);
      if (words.some((w) => pt.startsWith(w) || en.startsWith(w))) return 0;
      if (words.some((w) => pt.includes(w) || en.includes(w))) return 1;
      return 2;
    };
    return hits
      .map((h) => ({ h, r: rank(h) }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.h)
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, haystack]);

  // the isolated structure's bounds, for the camera
  const focusBox = useMemo(() => {
    if (!isolate || !pick) return null;
    const ly = layers[pick.system];
    const p = ly?.parts[pick.index];
    if (!ly || !p) return null;
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = p.v0; i < p.v0 + p.nv; i++) b.expandByPoint(v.fromArray(ly.pos, i * 3));
    return b;
  }, [isolate, pick, layers]);

  const term = pick && part ? termOf(pick.system, part) : undefined;

  const total = SYSTEMS.reduce((a, s) => a + (catalog[s]?.length ?? 0), 0);

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
                hidden={hidden}
                onPick={(index, through) => {
                  if (through) return;
                  setPick(index == null ? null : { system: s, index });
                }}
              />
            );
          })}
          <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={3} blur={2.4} far={1.5} />
          <CameraFocus box={focusBox} />
          <OrbitControls
            makeDefault
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
              {pick && part.group ? ` · ${groupOf(pick.system, part)}` : ""}
            </div>
            <div className="font-display text-lg font-semibold leading-tight">
              {pick ? nameOf(pick.system, part) : part.base}
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
              {term ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpen(!open)}
                  className="ml-auto self-center text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {open ? "Fechar descrição ▴" : "Descrição ▾"}
                </button>
              ) : (
                <span className="ml-auto self-center text-[10px] text-muted-foreground">
                  Descrição em breve
                </span>
              )}
            </div>
            {term && open && (
              <div className="mt-3 max-h-[34vh] overflow-y-auto border-t pt-3 text-sm leading-relaxed lg:max-h-[50vh]">
                <p className="text-xs text-muted-foreground">
                  <span className="italic">{term.la}</span>
                  {term.ta2 ? ` · TA2 ${term.ta2}` : ""}
                </p>
                <p className="mt-1.5">{term.d}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Fonte:{" "}
                  {term.src.startsWith("http") ? (
                    <a
                      href={term.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {term.src.includes("wikipedia") ? "Wikipédia" : "Radiopaedia"}
                    </a>
                  ) : (
                    term.src
                  )}
                  . Latim: Terminologia Anatomica, 2ª ed. (FIPAT, 2019).
                </p>
              </div>
            )}
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
          {total > 0 ? `${total.toLocaleString("pt-BR")} estruturas. ` : ""}Ligue as camadas e toque
          numa estrutura para ver o nome. Arraste para girar.
        </p>
        <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Modo rápido
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-foreground hover:text-background"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Camadas
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
        {SYSTEMS.filter((s) => on[s] && SUBS[s].length > 1).map((s) => (
          <div key={s} className="mt-3">
            <div className="text-[10px] font-semibold text-muted-foreground">{SYSTEM_LABEL[s]}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {SUBS[s].map((sub) => {
                const shown = !hidden.has(sub.id);
                return (
                  <button
                    type="button"
                    key={sub.id}
                    aria-pressed={shown}
                    onClick={() => toggleSub(sub.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${shown ? "border-foreground/70 bg-background font-medium" : "border-dashed text-muted-foreground"}`}
                  >
                    {shown ? "✓ " : ""}
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={see} onChange={(e) => setSee(e.target.checked)} />
          Pele e músculos transparentes
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar estrutura (ex.: fígado, bíceps, isquiático)"
          className="mt-4 w-full rounded-full bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {results.length > 0 && (
          <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
            {results.map((r) => (
              <button
                type="button"
                key={`${r.system}-${r.index}`}
                onClick={() => {
                  // turn on its layer and its group, then show it alone
                  setOn((o) => ({ ...o, [r.system]: true }));
                  const sub = classify(r.system, r.p);
                  setHidden((h) => {
                    const n = new Set(h);
                    n.delete(sub);
                    return n;
                  });
                  setPick({ system: r.system, index: r.index });
                  setIsolate(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-secondary"
              >
                <span>
                  {nameOf(r.system, r.p)}
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
            Nada encontrado. Tente outro nome, em português, latim ou inglês.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground">
          Nomes em português, com latim e código da Terminologia Anatomica 2ª ed. (FIPAT, 2019).
          Descrições baseadas na Wikipédia e no Feneis (CC BY-SA). Modelos: Z-Anatomy (CC BY-SA
          4.0), baseado em BodyParts3D. Quiz em breve.
        </p>
      </aside>
    </div>
  );
}
