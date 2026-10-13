import { useEffect, useMemo, useRef, useState } from "react";
import { FeedbackButton, FeedbackLink } from "@/components/feedback/Feedback";
import { Link } from "@tanstack/react-router";
import { Check, Crosshair, Search, X } from "lucide-react";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { ProfileLink } from "@/components/shell/ProfileLink";
import { Sheet } from "@/components/shell/Sheet";
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

  // fasciae wrap the muscles almost on their surface: drawn opaque they flicker through each other,
  // so they get their own see-through mesh sharing the same vertices
  const fasciaGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    for (const k of ["position", "normal", "color"]) g.setAttribute(k, geo.getAttribute(k));
    g.boundingSphere = geo.boundingSphere;
    return g;
  }, [geo]);
  useEffect(() => () => fasciaGeo.dispose(), [fasciaGeo]);
  const [fasciaShown, setFasciaShown] = useState(false);

  // visible triangles: isolated part, or every part whose sub-category is switched on
  useEffect(() => {
    const p = isolate && picked != null ? layer.parts[picked] : null;
    if (p) {
      geo.setIndex(new THREE.BufferAttribute(layer.idx, 1));
      geo.setDrawRange(p.t0 * 3, p.nt * 3);
      setFasciaShown(false);
      return;
    }
    geo.setDrawRange(0, Infinity);
    const pick = (keep: (k: number) => boolean) => {
      const parts = layer.parts.filter((_, k) => keep(k));
      const out = new Uint32Array(parts.reduce((a, q) => a + q.nt * 3, 0));
      let o = 0;
      for (const q of parts) {
        out.set(layer.idx.subarray(q.t0 * 3, (q.t0 + q.nt) * 3), o);
        o += q.nt * 3;
      }
      return new THREE.BufferAttribute(out, 1);
    };
    const hasFascia = subs.includes("fascia");
    if (hidden.size === 0 && !hasFascia) {
      geo.setIndex(new THREE.BufferAttribute(layer.idx, 1));
      setFasciaShown(false);
      return;
    }
    geo.setIndex(pick((k) => subs[k] !== "fascia" && (k === picked || !hidden.has(subs[k]!))));
    const showFascia = hasFascia && !hidden.has("fascia");
    if (showFascia) fasciaGeo.setIndex(pick((k) => subs[k] === "fascia"));
    setFasciaShown(showFascia);
  }, [geo, fasciaGeo, layer, picked, isolate, hidden, subs]);

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
  const fasciaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55,
        metalness: 0,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        // pulled slightly towards the camera so it always lies on top of the muscle it wraps
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  useEffect(() => {
    fasciaMat.opacity = ghost ? 0.12 : 0.42;
    fasciaMat.needsUpdate = true;
  }, [fasciaMat, ghost]);
  useEffect(() => () => fasciaMat.dispose(), [fasciaMat]);

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // a drag, not a tap
    if (ghost) return onPick(null, true); // see-through layers let the tap pass
    e.stopPropagation();
    const f = e.face;
    onPick(f ? (layer.part[f.a] ?? null) : null, false);
  };
  return (
    <>
      <mesh geometry={geo} material={mat} renderOrder={ghost ? 2 : 1} onClick={click} />
      {fasciaShown && (
        <mesh geometry={fasciaGeo} material={fasciaMat} renderOrder={3} onClick={click} />
      )}
    </>
  );
}

const HOME = SMALL
  ? { target: new THREE.Vector3(0, 0.88, 0), cam: new THREE.Vector3(0, 0.92, 3.8) }
  : { target: new THREE.Vector3(0, 0.85, 0), cam: new THREE.Vector3(0, 0.9, 4.1) };

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
  const [sheetOpen, setSheetOpen] = useState(false);

  // part names of every layer (small headers) so search reaches all structures
  useEffect(() => {
    for (const s of SYSTEMS)
      fetch(`/atlas/atlas-${s}.json`)
        .then((r) => r.json())
        .then((h: { parts: AtlasPart[] }) => setCatalog((c) => ({ ...c, [s]: h.parts })))
        .catch(() => {});
    for (const s of SYSTEMS) loadTerms(s).then((t) => setTerms((m) => ({ ...m, [s]: t })));
  }, []);

  // a new structure shows the panel at half height, so the body stays in view
  useEffect(() => setSheetOpen(false), [pick?.system, pick?.index]);

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

  const layerDot = (s: SystemId) =>
    s === "vessels"
      ? "linear-gradient(90deg,#c8323b 50%,#3b63b7 50%)"
      : s === "nerves"
        ? CAT_COLOR["nerve"]
        : s === "joints"
          ? CAT_COLOR["ligament"]
          : CAT_COLOR[s];
  const toggleLayer = (s: SystemId) => {
    setOn({ ...on, [s]: !on[s] });
    if (pick?.system === s) {
      setPick(null);
      setIsolate(false);
    }
  };
  const layerChips = (
    <>
      {SYSTEMS.map((s) => (
        <button
          type="button"
          key={s}
          aria-pressed={on[s]}
          onClick={() => toggleLayer(s)}
          className={`flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${on[s] ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40"}`}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: layerDot(s) }} />
          {SYSTEM_LABEL[s]}
        </button>
      ))}
    </>
  );
  const searchBox = (cls: string) => (
    <label className={`flex items-center gap-2.5 rounded-full border bg-card px-4 ${cls}`}>
      <Search className="h-[18px] w-[18px] flex-none text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setSheetOpen(true)}
        placeholder="Buscar: bíceps, fêmur, biliar"
        aria-label="Buscar estrutura"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
      />
      {q && (
        <button type="button" aria-label="Limpar busca" onClick={() => setQ("")}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </label>
  );
  const resultList =
    q.trim().length >= 2 ? (
      results.length > 0 ? (
        <div className="space-y-0.5">
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
                setQ("");
                setSheetOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
            >
              <span>
                {nameOf(r.system, r.p)}
                {r.p.side !== "c" && (
                  <span className="text-muted-foreground"> ({SIDE_LABEL[r.p.side]})</span>
                )}
              </span>
              <span className="flex-none text-xs text-muted-foreground">
                {SYSTEM_LABEL[r.system]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          Nada encontrado. Tente outro nome, em português, latim ou inglês.
        </p>
      )
    ) : null;
  const filters = (
    <>
      <div className="text-[13px] font-semibold text-muted-foreground">Modo rápido</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className="rounded-full bg-secondary px-3.5 py-2 text-[13px] font-semibold hover:bg-foreground hover:text-background"
          >
            {p.label}
          </button>
        ))}
      </div>
      {SYSTEMS.filter((s) => on[s] && SUBS[s].length > 1).map((s) => (
        <div key={s} className="mt-4">
          <div className="text-[13px] font-semibold text-muted-foreground">{SYSTEM_LABEL[s]}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUBS[s].map((sub) => {
              const shown = !hidden.has(sub.id);
              return (
                <button
                  type="button"
                  key={sub.id}
                  aria-pressed={shown}
                  onClick={() => toggleSub(sub.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${shown ? "border-foreground/60 bg-card font-semibold" : "border-dashed text-muted-foreground"}`}
                >
                  {shown && <Check className="h-3.5 w-3.5" />}
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <label className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
        Pele e músculos transparentes
        <input
          type="checkbox"
          checked={see}
          onChange={(e) => setSee(e.target.checked)}
          className="h-5 w-5 accent-foreground"
        />
      </label>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Nomes em português, com latim e código da Terminologia Anatomica 2ª ed. (FIPAT, 2019).
        Descrições baseadas na Wikipédia e no Feneis (CC BY-SA). Modelos: Z-Anatomy (CC BY-SA 4.0),
        baseado em BodyParts3D.
      </p>
    </>
  );
  const structure = part && pick && (
    <div>
      <div className="text-[13px] font-semibold text-muted-foreground">
        {part.group ? groupOf(pick.system, part) : SYSTEM_LABEL[pick.system]}
      </div>
      <div className="mt-0.5 font-display text-[22px] font-bold leading-tight tracking-tight">
        {nameOf(pick.system, part)}
        {part.side !== "c" && (
          <span className="font-normal text-muted-foreground"> ({SIDE_LABEL[part.side]})</span>
        )}
      </div>
      {term && <div className="mt-1 text-[13px] italic text-muted-foreground">{term.la}</div>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setIsolate(!isolate)}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-bold text-background"
        >
          <Crosshair className="h-4 w-4" />
          {isolate ? "Mostrar tudo" : "Isolar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPick(null);
            setIsolate(false);
          }}
          className="inline-flex h-11 items-center justify-center rounded-full border bg-card px-5 text-sm font-bold"
        >
          Fechar
        </button>
      </div>
      {term ? (
        <div className="mt-4 border-t pt-4 text-[14.5px] leading-relaxed">
          <p>{term.d}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {term.ta2 ? `TA2 ${term.ta2}. ` : ""}Fonte:{" "}
            {term.src.startsWith("http") ? (
              <a href={term.src} target="_blank" rel="noopener noreferrer" className="underline">
                {term.src.includes("wikipedia") ? "Wikipédia" : "Radiopaedia"}
              </a>
            ) : (
              term.src
            )}
            . Latim: Terminologia Anatomica, 2ª ed. (FIPAT, 2019).
          </p>
          <div className="mt-3">
            <FeedbackLink screen="atlas" item={nameOf(pick.system, part)}>
              Reportar erro neste nome
            </FeedbackLink>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Descrição em breve.</p>
      )}
    </div>
  );

  return (
    <div className="relative w-full bg-background font-body text-foreground max-lg:h-dvh max-lg:overflow-hidden lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_30%,var(--glow),transparent_60%)]" />

      {/* phone: search and layers float over the body */}
      <div className="absolute inset-x-0 top-0 z-30 pt-[max(12px,env(safe-area-inset-top))] lg:hidden">
        <div className="flex items-center gap-2 px-4">
          {searchBox("h-12 flex-1 shadow-[0_8px_24px_-16px_rgba(21,24,29,0.4)]")}
          <FeedbackButton screen="atlas" />
        </div>
      </div>

      {/* desktop header */}
      <header className="absolute inset-x-0 top-0 z-30 hidden items-center justify-between px-8 py-6 lg:flex">
        <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
          MYO<span className="text-primary">/</span>LAB
          <span className="ml-2 align-middle text-sm font-semibold text-muted-foreground">
            Atlas
          </span>
        </Link>
        <nav className="flex gap-2">
          <Link to="/raio-x" className="glass rounded-full px-4 py-2 text-sm font-semibold">
            Raio-X
          </Link>
          <Link to="/editor" className="glass rounded-full px-4 py-2 text-sm font-semibold">
            Simulador
          </Link>
          <FeedbackButton screen="atlas" />
          <ProfileLink />
        </nav>
      </header>

      <div className="absolute inset-x-0 top-16 bottom-[calc(64px+env(safe-area-inset-bottom)+var(--sheet-vis,40dvh)-28px)] lg:inset-0">
        <Canvas dpr={[1, SMALL ? 1.5 : 2]} camera={{ position: HOME.cam.toArray(), fov: 32 }}>
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
            target={HOME.target.toArray()}
            enablePan
            screenSpacePanning
            minDistance={0.2}
            maxDistance={4.5}
          />
        </Canvas>
        {loading.length > 0 && (
          <div className="glass absolute left-1/2 top-32 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs lg:top-20">
            Carregando {loading.map((s) => SYSTEM_LABEL[s].toLowerCase()).join(", ")}…
          </div>
        )}
      </div>

      {/* phone: one panel for the picked structure, the search results or the filters */}
      <Sheet
        peek="40dvh"
        min="84px"
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        raiseKey={pick ? `${pick.system}-${pick.index}` : undefined}
        label="Atlas"
        className="lg:hidden"
        header={
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {layerChips}
          </div>
        }
      >
        <div className="px-5 pb-6 pt-1">{resultList ?? structure ?? filters}</div>
      </Sheet>

      {/* desktop: controls on the left, the structure on the right */}
      <aside className="glass absolute bottom-6 left-6 top-24 z-10 hidden w-[360px] overflow-y-auto rounded-[28px] p-5 lg:block">
        <h2 className="font-display text-2xl font-bold leading-none tracking-tight">
          Atlas anatômico
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {total > 0 ? `${total.toLocaleString("pt-BR")} estruturas. ` : ""}Ligue as camadas e toque
          numa estrutura para ver o nome. Arraste para girar.
        </p>
        {searchBox("mt-4 h-11")}
        {resultList && <div className="mt-2 max-h-72 overflow-y-auto">{resultList}</div>}
        <div className="mt-5 text-[13px] font-semibold text-muted-foreground">Camadas</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{layerChips}</div>
        <div className="mt-5">{filters}</div>
      </aside>
      {structure && (
        <div className="glass absolute right-6 top-24 z-10 hidden max-h-[calc(100vh-120px)] w-[380px] overflow-y-auto rounded-[24px] p-5 lg:block">
          {structure}
        </div>
      )}
      <BottomTabs />
    </div>
  );
}
