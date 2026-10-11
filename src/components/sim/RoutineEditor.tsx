import { useEffect, useState } from "react";
import {
  BENCH_ANGLES,
  DAYS,
  DAYS_FULL,
  EX_BY_ID,
  MUSCLES,
  ROMS,
  type Muscle,
  type Rom,
} from "@/lib/training";
import {
  INTENSITIES,
  INTENSITY_IDS,
  PRESETS,
  emptyPlan,
  loadInfo,
  suggestKg,
  type Plan,
  type PlanItem,
  type SimState,
} from "@/lib/sim";
import { ExercisePicker } from "./ExercisePicker";
import { ProBadge, Stepper } from "./ui";

export function RoutineEditor({
  plan,
  setPlan,
  sim,
  pro,
  onUnlock,
  focus = null,
}: {
  plan: Plan;
  setPlan: (fn: (p: Plan) => Plan) => void;
  sim: SimState;
  pro: boolean;
  onUnlock: () => void;
  /** muscle tapped on the body (n changes on every tap): open the picker filtered to it */
  focus?: { m: Muscle; n: number } | null;
}) {
  const [day, setDay] = useState(0);
  const [picking, setPicking] = useState(false);
  const [pickMuscle, setPickMuscle] = useState<Muscle | null>(null);
  useEffect(() => {
    if (!focus) return;
    setPickMuscle(focus.m);
    setPicking(true);
  }, [focus]);
  const items = plan[day] ?? [];

  const update = (idx: number, patch: Partial<PlanItem>) =>
    setPlan((p) =>
      p.map((d, i) => (i === day ? d.map((x, j) => (j === idx ? { ...x, ...patch } : x)) : d)),
    );
  const remove = (idx: number) =>
    setPlan((p) => p.map((d, i) => (i === day ? d.filter((_, j) => j !== idx) : d)));
  const move = (idx: number, dir: -1 | 1) =>
    setPlan((p) =>
      p.map((d, i) => {
        if (i !== day) return d;
        const n = [...d];
        const j = idx + dir;
        if (j < 0 || j >= n.length) return d;
        [n[idx], n[j]] = [n[j]!, n[idx]!];
        return n;
      }),
    );
  const add = (exId: string) => {
    setPlan((p) =>
      p.map((d, i) =>
        i === day ? [...d, { exId, sets: 3, reps: 10, intensity: "moderada" as const }] : d,
      ),
    );
    setPicking(false);
  };
  const copyTo = (target: number) =>
    setPlan((p) => p.map((d, i) => (i === target ? items.map((x) => ({ ...x })) : d)));

  const dayMuscles = Array.from(new Set(items.flatMap((i) => EX_BY_ID[i.exId]?.primary ?? []))).map(
    (m) => MUSCLES[m].name,
  );

  const planKey = JSON.stringify(plan);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap gap-1">
        {Object.entries(PRESETS).map(([k, p]) => {
          // highlighted while the routine is exactly that preset (any edit clears it)
          const on = JSON.stringify(p.plan()) === planKey;
          return (
            <button
              type="button"
              key={k}
              aria-pressed={on}
              onClick={() => setPlan(() => p.plan())}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${on ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}
            >
              {on && "✓ "}
              {p.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPlan(() => emptyPlan())}
          className="rounded-full border px-2.5 py-1 text-[10px] text-muted-foreground hover:bg-secondary"
        >
          Limpar
        </button>
      </div>

      {!pro && (
        <button
          type="button"
          onClick={onUnlock}
          className="mt-2 text-left text-[10px] text-muted-foreground hover:text-foreground"
        >
          Pegada, ângulo do banco, amplitude e carga em kg:{" "}
          <span className="font-semibold text-primary">PRO</span>
        </button>
      )}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => {
          const n = (plan[i] ?? []).length;
          return (
            <button
              type="button"
              key={d}
              onClick={() => setDay(i)}
              className={`rounded-xl py-2 text-center transition-all ${day === i ? "bg-foreground text-background" : n ? "bg-secondary" : "border border-dashed"}`}
            >
              <div className="text-[10px] font-semibold">{d}</div>
              <div className="text-[9px] opacity-60">{n ? `${n} ex.` : "folga"}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold">{DAYS_FULL[day]}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {items.length ? dayMuscles.join(" · ") : "Dia de descanso"}
          </div>
        </div>
        {items.length > 0 && (
          <select
            id="copy-day"
            aria-label="Copiar este dia para"
            value=""
            onChange={(e) => e.target.value && copyTo(+e.target.value)}
            className="rounded-full border bg-background px-2 py-1 text-[10px] text-muted-foreground"
          >
            <option value="">Copiar para…</option>
            {DAYS_FULL.map((d, i) =>
              i === day ? null : (
                <option key={d} value={i}>
                  {d}
                </option>
              ),
            )}
          </select>
        )}
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Sem exercícios, este dia conta como descanso.
          </div>
        )}
        {items.map((item, idx) => {
          const e = EX_BY_ID[item.exId];
          if (!e) return null;
          const li = loadInfo(item, sim, pro);
          const sug = suggestKg(item.exId, item.reps, item.intensity, sim);
          const rmShown = Math.max(0, Math.round(li.rm - e.bodyFrac * sim.profile.weight));
          return (
            <div key={idx} className="rounded-2xl bg-secondary p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{e.name}</div>
                  <div className="text-[10px] text-muted-foreground">{e.equip}</div>
                </div>
                <div className="flex flex-none items-center gap-0.5 text-muted-foreground">
                  <button
                    type="button"
                    aria-label="Subir"
                    onClick={() => move(idx, -1)}
                    className="h-6 w-6 rounded-full hover:bg-background"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Descer"
                    onClick={() => move(idx, 1)}
                    className="h-6 w-6 rounded-full hover:bg-background"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Remover"
                    onClick={() => remove(idx)}
                    className="h-6 w-6 rounded-full hover:bg-background hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              </div>
              {pro && (
                <>
                  {e.variants && (
                    <div
                      className="mt-2 flex flex-wrap gap-1"
                      role="radiogroup"
                      aria-label="Pegada"
                    >
                      {e.variants.map((v, vi) => {
                        const on = ((pro && item.variant) || e.variants![0]?.id) === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            title={!pro && vi > 0 ? "Variações de pegada são PRO" : undefined}
                            onClick={() =>
                              !pro && vi > 0
                                ? onUnlock()
                                : update(idx, { variant: vi === 0 ? undefined : v.id })
                            }
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${on ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
                          >
                            {v.label}
                            {!pro && vi > 0 && " 🔒"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {e.bench != null && (
                    <ChipRow
                      label="Banco"
                      items={BENCH_ANGLES.map((a) => ({
                        id: String(a),
                        label: a === 0 ? "Reto" : `${a}°`,
                        locked: !pro && a !== e.bench,
                      }))}
                      value={String(pro && item.angle != null ? item.angle : e.bench)}
                      onPick={(id) => update(idx, { angle: +id === e.bench ? undefined : +id })}
                      onLocked={onUnlock}
                    />
                  )}
                  <ChipRow
                    label="Amplitude"
                    items={(Object.keys(ROMS) as Rom[]).map((k) => ({
                      id: k,
                      label: ROMS[k].label,
                      locked: !pro && k !== "full",
                    }))}
                    value={pro && item.rom ? item.rom : "full"}
                    onPick={(id) => update(idx, { rom: id === "full" ? undefined : (id as Rom) })}
                    onLocked={onUnlock}
                  />
                </>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <Stepper
                    label="séries"
                    value={item.sets}
                    min={1}
                    max={12}
                    onChange={(v) => update(idx, { sets: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">séries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Stepper
                    label="repetições"
                    value={item.reps}
                    min={1}
                    max={40}
                    onChange={(v) => update(idx, { reps: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">reps</span>
                </div>
              </div>
              {pro ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      id={`kg-${day}-${idx}`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={item.kg ?? ""}
                      placeholder={String(sug)}
                      onChange={(ev) =>
                        update(idx, {
                          kg: ev.target.value === "" ? undefined : Math.max(0, +ev.target.value),
                        })
                      }
                      className="w-20 rounded-full bg-background px-3 py-1 text-xs font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-[10px] text-muted-foreground">{e.unit}</span>
                    <ProBadge />
                    {item.kg == null && (
                      <button
                        type="button"
                        onClick={() => update(idx, { kg: sug })}
                        className="ml-auto text-[10px] font-medium text-primary hover:underline"
                      >
                        Usar {sug} kg
                      </button>
                    )}
                  </div>
                  <div
                    className={`mt-1.5 text-[10px] ${li.impossible ? "font-semibold text-destructive" : li.failed ? "font-semibold text-amber-700" : "text-muted-foreground"}`}
                  >
                    1RM estimado {rmShown} kg ·{" "}
                    {item.kg == null
                      ? `sem carga definida, usa intensidade ${INTENSITIES[item.intensity].label.toLowerCase()}`
                      : li.impossible
                        ? "carga acima do seu máximo"
                        : `${Math.round(li.pct * 100)}% do 1RM · aguenta ~${li.possible} reps${li.failed ? `, não ${item.reps}` : ""}`}
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {INTENSITY_IDS.map((k) => (
                    <button
                      type="button"
                      key={k}
                      title={INTENSITIES[k].hint}
                      onClick={() => update(idx, { intensity: k })}
                      className={`rounded-full px-1 py-1 text-[10px] font-medium transition-all ${item.intensity === k ? (k === "falha" ? "bg-primary text-primary-foreground" : "bg-foreground text-background") : "bg-background text-muted-foreground hover:text-foreground"}`}
                    >
                      {INTENSITIES[k].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full rounded-2xl border border-dashed py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          + Adicionar exercício em {DAYS_FULL[day]}
        </button>
      </div>

      {picking && (
        <ExercisePicker
          dayLabel={DAYS_FULL[day] ?? ""}
          onPick={add}
          onClose={() => {
            setPicking(false);
            setPickMuscle(null);
          }}
          initialMuscle={pickMuscle}
        />
      )}
    </div>
  );
}

function ChipRow({
  label,
  items,
  value,
  onPick,
  onLocked,
}: {
  label: string;
  items: { id: string; label: string; locked: boolean }[];
  value: string;
  onPick: (id: string) => void;
  onLocked: () => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1" role="radiogroup" aria-label={label}>
      <span className="mr-0.5 text-[10px] text-muted-foreground">{label}</span>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={value === it.id}
          onClick={() => (it.locked ? onLocked() : onPick(it.id))}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${value === it.id ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
        >
          {it.label}
          {it.locked && " 🔒"}
        </button>
      ))}
    </div>
  );
}
