import { useMemo, useState } from "react";
import { Viewer } from "./anatomy/Viewer";
import {
  DAYS, EXERCISES, EX_BY_ID, MUSCLES, MUSCLE_IDS, PRESETS, PROTOCOLS,
  advanceWeek, emptyPlan, initSim, weeklyLoad,
  type Diet, type Equip, type Muscle, type Plan, type Profile, type SimState,
} from "@/lib/training";

const EQUIPS: (Equip | "Todos")[] = ["Todos", "Máquina", "Peso livre", "Cabo", "Corporal"];
const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${active ? "bg-foreground text-background shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-muted-foreground/15"}`}>
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-display font-semibold tabular-nums">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="mt-2 w-full accent-primary" />
    </label>
  );
}

export function Studio() {
  const [mode, setMode] = useState<"explore" | "sim">("explore");
  const [skin, setSkin] = useState(0);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<(typeof EQUIPS)[number]>("Todos");
  const [exId, setExId] = useState<string | null>("ohp");

  const [profile, setProfile] = useState<Profile>({ sex: "m", height: 178, weight: 78, bf: 16 });
  const [sim, setSim] = useState<SimState | null>(null);
  const [plan, setPlan] = useState<Plan>(PRESETS.shoulders.plan());
  const [day, setDay] = useState(0);
  const [pro, setPro] = useState(false);
  const [diet, setDiet] = useState<Diet>("manutencao");
  const [protocol, setProtocol] = useState(0);
  const [proModal, setProModal] = useState(false);

  const ex = exId ? EX_BY_ID[exId] : null;
  const list = EXERCISES.filter((e) => (equip === "Todos" || e.equip === equip) && (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)));
  const load = useMemo(() => weeklyLoad(plan), [plan]);

  const curProfile = sim?.profile ?? profile;
  const dev = sim?.dev ?? initSim(profile).dev;

  const colorFor = (m: Muscle) => {
    if (mode === "explore") {
      if (ex?.primary.includes(m)) return "#ff3b1f";
      if (ex?.secondary.includes(m)) return "#ff9a5a";
      if (muscle === m) return "#ff3b1f";
      return "#d9b8ae";
    }
    return hex(lerp([214, 190, 182], [214, 24, 30], Math.min(1, (dev[m] - 0.15) / 0.7)));
  };

  const needPro = (fn: () => void) => (pro ? fn() : setProModal(true));
  const addEx = (id: string) => setPlan((p) => p.map((d, i) => (i === day ? [...d, { exId: id, sets: 3 }] : d)));

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background font-body text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--glow),transparent_60%)]" />
      <div className="absolute inset-0"><Viewer profile={curProfile} dev={dev} skin={skin} colorFor={colorFor} injured={sim?.injured} onPick={(m) => { setMuscle(m); setMode("explore"); setExId(null); }} /></div>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-6">
        <div>
          <div className="font-display text-2xl font-bold tracking-tight">MYO<span className="text-primary">/</span>LAB</div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Anatomia · Treino · Simulação</div>
        </div>
        <div className="glass flex gap-1 rounded-full p-1">
          {(["explore", "sim"] as const).map((k) => (
            <button key={k} onClick={() => setMode(k)} className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${mode === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "explore" ? "Explorar músculos" : "Simulador"}
            </button>
          ))}
        </div>
        <button onClick={() => setPro(!pro)} className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide ${pro ? "bg-primary text-primary-foreground" : "glass"}`}>
          {pro ? "PRO ATIVO" : "FREE · ver PRO"}
        </button>
      </header>

      {/* Left panel */}
      <aside className="glass absolute bottom-6 left-6 top-28 flex w-[380px] flex-col overflow-hidden rounded-[28px]">
        {mode === "explore" ? (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <h2 className="font-display text-3xl font-bold leading-none tracking-tight">Escolha o<br />músculo.</h2>
            <p className="mt-2 text-xs text-muted-foreground">Clique no corpo ou na lista. Depois escolha o exercício.</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Pill active={!muscle} onClick={() => setMuscle(null)}>Todos</Pill>
              {MUSCLE_IDS.map((m) => <Pill key={m} active={muscle === m} onClick={() => setMuscle(m)}>{MUSCLES[m].name}</Pill>)}
            </div>
            <div className="mt-5 flex gap-1.5 border-t pt-4">
              {EQUIPS.map((e) => <Pill key={e} active={equip === e} onClick={() => setEquip(e)}>{e}</Pill>)}
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {list.map((e) => (
                <button key={e.id} onClick={() => setExId(e.id)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all ${exId === e.id ? "bg-foreground text-background" : "hover:bg-secondary"}`}>
                  <span className="text-sm font-medium">{e.name}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${exId === e.id ? "opacity-70" : "text-muted-foreground"}`}>{e.equip}</span>
                </button>
              ))}
            </div>
          </div>
        ) : !sim ? (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            <h2 className="font-display text-3xl font-bold leading-none tracking-tight">Monte seu<br />avatar.</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["m", "f"] as const).map((s) => (
                <button key={s} onClick={() => setProfile({ ...profile, sex: s, height: s === "m" ? 178 : 165, weight: s === "m" ? 78 : 60, bf: s === "m" ? 16 : 24 })} className={`rounded-2xl border p-4 text-left transition-all ${profile.sex === s ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"}`}>
                  <div className="font-display text-lg font-semibold">{s === "m" ? "Masculino" : "Feminino"}</div>
                </button>
              ))}
            </div>
            <Slider label="Altura" value={profile.height} min={145} max={205} unit=" cm" onChange={(v) => setProfile({ ...profile, height: v })} />
            <Slider label="Peso" value={profile.weight} min={40} max={140} unit=" kg" onChange={(v) => setProfile({ ...profile, weight: v })} />
            <Slider label="Gordura corporal (BF)" value={profile.bf} min={5} max={40} unit="%" onChange={(v) => setProfile({ ...profile, bf: v })} />
            <button onClick={() => { setSim(initSim(profile)); setSkin(0.35); }} className="mt-auto rounded-full bg-primary py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]">Criar avatar →</button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-3xl font-bold leading-none tracking-tight">Rotina</h2>
              <button onClick={() => setSim(null)} className="text-xs text-muted-foreground hover:text-foreground">Novo avatar</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.entries(PRESETS).map(([k, p]) => <button key={k} onClick={() => setPlan(p.plan())} className="rounded-full border px-2.5 py-1 text-[10px] font-medium hover:bg-secondary">{p.name}</button>)}
              <button onClick={() => setPlan(emptyPlan())} className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground">Limpar</button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setDay(i)} className={`rounded-xl py-2 text-center transition-all ${day === i ? "bg-foreground text-background" : "bg-secondary"}`}>
                  <div className="text-[10px] font-semibold">{d}</div>
                  <div className="text-[10px] opacity-60">{plan[i].length || "–"}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {plan[day].length === 0 && <div className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">Descanso — adicione exercícios abaixo</div>}
              {plan[day].map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2">
                  <span className="flex-1 truncate text-xs font-medium">{EX_BY_ID[it.exId].name}</span>
                  <input type="number" min={1} max={10} value={it.sets} onChange={(e) => setPlan((p) => p.map((d, i) => (i === day ? d.map((x, j) => (j === idx ? { ...x, sets: +e.target.value } : x)) : d)))} className="w-10 rounded-lg bg-background px-1 py-0.5 text-center text-xs" />
                  <span className="text-[10px] text-muted-foreground">séries</span>
                  <button onClick={() => setPlan((p) => p.map((d, i) => (i === day ? d.filter((_, j) => j !== idx) : d)))} className="text-muted-foreground hover:text-destructive">×</button>
                </div>
              ))}
            </div>
            <select onChange={(e) => { if (e.target.value) addEx(e.target.value); e.target.value = ""; }} className="mt-2 rounded-2xl border bg-background px-3 py-2.5 text-xs">
              <option value="">+ Adicionar exercício em {DAYS[day]}</option>
              {(["Máquina", "Peso livre", "Cabo", "Corporal"] as Equip[]).map((g) => (
                <optgroup key={g} label={g}>{EXERCISES.filter((e) => e.equip === g).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>
              ))}
            </select>

            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Dieta <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">PRO</span></span>
                <div className="flex gap-1">{(["deficit", "manutencao", "superavit"] as Diet[]).map((d) => <Pill key={d} active={pro && diet === d} onClick={() => needPro(() => setDiet(d))}>{d === "deficit" ? "Déficit" : d === "manutencao" ? "Manut." : "Superávit"}</Pill>)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold">Recuperação & saúde <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">PRO</span></span>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {PROTOCOLS.map((p, i) => (
                    <button key={p.name} onClick={() => needPro(() => setProtocol(i))} className={`rounded-xl border px-2 py-2 text-left text-[10px] ${pro && protocol === i ? "border-foreground bg-foreground text-background" : ""}`}>
                      <div className="font-semibold">{p.name}</div>
                      <div className="opacity-60">+{Math.round(p.recovery * 100)}% recup · risco {Math.round(p.risk * 100)}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">Simulação educativa. Ergogênicos e hormônios trazem riscos reais à saúde — consulte um médico.</p>
              </div>
            </div>
            <button onClick={() => setSim(advanceWeek(sim, plan, { diet, protocol, pro }))} className="mt-4 rounded-full bg-primary py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]">
              Treinar semana {sim.week + 1} →
            </button>
          </div>
        )}
      </aside>

      {/* Right panel */}
      <aside className="glass absolute right-6 top-28 w-[300px] rounded-[28px] p-6">
        {mode === "explore" ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{ex ? ex.equip : muscle ? MUSCLES[muscle].region : "Selecione"}</div>
            <div className="mt-1 font-display text-2xl font-bold leading-tight">{ex?.name ?? (muscle ? MUSCLES[muscle].name : "Toque num músculo")}</div>
            {ex && (
              <div className="mt-4 space-y-3">
                <div><div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Principais</div><div className="flex flex-wrap gap-1">{ex.primary.map((m) => <span key={m} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{MUSCLES[m].name}</span>)}</div></div>
                {ex.secondary.length > 0 && <div><div className="mb-1.5 flex items-center gap-2 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-primary/50" />Sinergistas</div><div className="flex flex-wrap gap-1">{ex.secondary.map((m) => <span key={m} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{MUSCLES[m].name}</span>)}</div></div>}
              </div>
            )}
          </>
        ) : sim ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Semana</div>
            <div className="font-display text-6xl font-bold leading-none tracking-tighter">{String(sim.week).padStart(2, "0")}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Peso", sim.profile.weight + "kg"], ["BF", sim.profile.bf + "%"], ["Shape", Math.round((sim.history.at(-1)!.avg) * 100)]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-secondary py-2"><div className="text-[10px] text-muted-foreground">{l}</div><div className="font-display text-sm font-semibold">{v}</div></div>
              ))}
            </div>
            <div className="mt-4 max-h-[34vh] space-y-1.5 overflow-y-auto pr-1">
              {MUSCLE_IDS.map((m) => {
                const inj = (sim.injured[m] ?? 0) > 0;
                const over = load.sets[m] > 20 || load.streak[m] >= 3;
                return (
                  <div key={m}>
                    <div className="flex justify-between text-[11px]"><span className={inj ? "font-semibold text-destructive" : ""}>{MUSCLES[m].name}{inj && " · lesão"}</span><span className={`tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}>{load.sets[m]} séries/sem</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${sim.dev[m] * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
            {sim.log.length > 0 && <div className="mt-3 max-h-24 space-y-1 overflow-y-auto border-t pt-3 text-[10px] text-muted-foreground">{sim.log.map((l, i) => <div key={i}>{l}</div>)}</div>}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Defina sexo, altura, peso e BF para gerar o avatar. Cada semana o shape evolui conforme o que você treinou.</div>
        )}
      </aside>

      {/* Skin toggle */}
      <div className="glass absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full px-6 py-3">
        <span className="text-xs font-semibold">Músculos</span>
        <input type="range" min={0} max={1} step={0.01} value={skin} onChange={(e) => setSkin(+e.target.value)} className="w-40 accent-primary" />
        <span className="text-xs font-semibold">Pele</span>
      </div>

      {proModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setProModal(false)}>
          <div className="glass max-w-sm rounded-[32px] p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-3xl font-bold">MYO/LAB <span className="text-primary">PRO</span></div>
            <p className="mt-3 text-sm text-muted-foreground">Edite a dieta e simule protocolos de recuperação para ver o impacto real no shape e na saúde do seu avatar.</p>
            <button onClick={() => { setPro(true); setProModal(false); }} className="mt-6 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground">Ativar demo PRO</button>
          </div>
        </div>
      )}
    </div>
  );
}
