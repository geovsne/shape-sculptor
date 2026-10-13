import { useState } from "react";
import { HEADS, HEADS_OF, MUSCLES, MUSCLE_IDS, TENDONS } from "@/lib/training";
import type { analyzePlan, SimState } from "@/lib/sim";
import { AlertRow } from "./ui";

type Analysis = ReturnType<typeof analyzePlan>;

const STATUS_STYLE = {
  zero: "text-muted-foreground",
  baixo: "text-muted-foreground",
  ideal: "text-emerald-700",
  alto: "text-amber-700",
  excessivo: "text-destructive font-semibold",
} as const;

function Delta({ v, unit, invert }: { v: number; unit: string; invert?: boolean | null }) {
  if (Math.abs(v) < 0.05) return null;
  const good = invert ? v < 0 : v > 0;
  const tone =
    invert === null ? "text-muted-foreground" : good ? "text-emerald-700" : "text-destructive";
  return (
    <span className={`ml-1 text-[10px] font-semibold ${tone}`}>
      {v > 0 ? "+" : ""}
      {v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      {unit}
    </span>
  );
}

export function StatusPanel({ sim, analysis }: { sim: SimState; analysis: Analysis }) {
  const [allAlerts, setAllAlerts] = useState(false);
  const [byHead, setByHead] = useState(false);
  const prev = sim.history.at(-2);
  const cur = sim.history.at(-1)!;
  const load = analysis.systemic / analysis.cap;
  const alerts = allAlerts ? analysis.alerts : analysis.alerts.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Semana</div>
          <div className="font-display text-6xl font-bold leading-none tracking-tighter tabular-nums">
            {String(sim.week).padStart(2, "0")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-muted-foreground">Energia</div>
          <div
            className={`font-display text-2xl font-bold tabular-nums ${sim.energy < 35 ? "text-destructive" : ""}`}
          >
            {sim.energy}
          </div>
          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${sim.energy < 35 ? "bg-destructive" : "bg-foreground"}`}
              style={{ width: `${sim.energy}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [
            "Peso",
            sim.profile.weight.toLocaleString("pt-BR"),
            "kg",
            prev ? cur.weight - prev.weight : 0,
            null,
          ],
          ["BF", sim.profile.bf.toLocaleString("pt-BR"), "%", prev ? cur.bf - prev.bf : 0, true],
          [
            "Massa magra",
            sim.leanKg.toLocaleString("pt-BR"),
            "kg",
            prev ? cur.lean - prev.lean : 0,
            false,
          ],
        ].map(([l, v, u, d, inv]) => (
          <div key={l as string} className="rounded-2xl bg-secondary px-1 py-2">
            <div className="text-[10px] text-muted-foreground">{l}</div>
            <div className="font-display text-sm font-semibold tabular-nums">
              {v}
              <span className="text-[10px] font-normal text-muted-foreground">{u}</span>
            </div>
            <Delta v={d as number} unit="" invert={inv as boolean | null} />
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[11px]">
          <span className="font-semibold">Carga da semana</span>
          <span
            className={`tabular-nums ${load > 1 ? "font-semibold text-destructive" : "text-muted-foreground"}`}
          >
            {analysis.systemic} / {analysis.cap}
          </span>
        </div>
        <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ${load > 1.3 ? "bg-destructive" : load > 1 ? "bg-amber-500" : "bg-foreground"}`}
            style={{ width: `${Math.min(100, (load / 1.5) * 100)}%` }}
          />
          <div
            className="absolute inset-y-0 w-px bg-destructive/60"
            style={{ left: `${100 / 1.5}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {analysis.restDays} {analysis.restDays === 1 ? "dia" : "dias"} de descanso · a linha marca
          o limite de recuperação
        </div>
      </div>

      {analysis.alerts.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground">Alertas da rotina</div>
          {alerts.map((a, i) => (
            <AlertRow key={i} level={a.level}>
              {a.text}
            </AlertRow>
          ))}
          {analysis.alerts.length > 4 && (
            <button
              type="button"
              onClick={() => setAllAlerts(!allAlerts)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              {allAlerts ? "Mostrar menos" : `Ver mais ${analysis.alerts.length - 4}`}
            </button>
          )}
        </div>
      )}

      {sim.injuries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground">Lesões</div>
          {sim.injuries.map((i) => (
            <div key={i.id} className="rounded-xl bg-destructive/8 px-3 py-2">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">
                  {i.target.type === "muscle" ? MUSCLES[i.target.m].name : TENDONS[i.target.t].name}
                </span>
                <span className="tabular-nums text-destructive">{i.weeksLeft} sem.</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{i.label}</div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-destructive"
                  style={{ width: `${(i.weeksLeft / i.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Desenvolvimento</span>
          <span>Séries/sem</span>
        </div>
        <div className="space-y-1.5">
          {MUSCLE_IDS.map((m) => {
            const pm = analysis.perMuscle[m];
            const hurt = sim.injuries.some((i) =>
              i.target.type === "muscle"
                ? i.target.m === m
                : TENDONS[i.target.t].muscles.includes(m),
            );
            return (
              <div key={m}>
                <div className="flex justify-between text-[11px]">
                  <span className={hurt ? "font-semibold text-destructive" : ""}>
                    {MUSCLES[m].name}
                    {hurt && " · lesão"}
                  </span>
                  <span className={`tabular-nums ${STATUS_STYLE[pm.status]}`}>
                    {Math.round(pm.sets * 10) / 10}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${hurt ? "bg-destructive/50" : "bg-primary"}`}
                    style={{ width: `${sim.dev[m] * 100}%` }}
                  />
                </div>
                {byHead && HEADS_OF[m].length > 1 && (
                  <div
                    className="mt-1 grid gap-1"
                    style={{ gridTemplateColumns: `repeat(${HEADS_OF[m].length}, minmax(0, 1fr))` }}
                  >
                    {HEADS_OF[m].map((h) => (
                      <div
                        key={h}
                        title={`${HEADS[h].name}: ${Math.round(analysis.headSets[h] * 10) / 10} séries efetivas/sem`}
                      >
                        <div className="h-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all duration-700"
                            style={{ width: `${sim.headDev[h] * 100}%` }}
                          />
                        </div>
                        <div className="mt-0.5 truncate text-[9px] text-muted-foreground">
                          {HEADS[h].short}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Ideal: 10 a 20 séries por músculo na semana.</span>
          <button
            type="button"
            onClick={() => setByHead(!byHead)}
            className="font-medium hover:text-foreground"
          >
            {byHead ? "Ocultar regiões" : "Ver por região"}
          </button>
        </div>
      </div>

      {sim.log.length > 0 && (
        <div className="space-y-1 border-t pt-3">
          <div className="text-xs font-semibold text-muted-foreground">Diário</div>
          {sim.log.slice(0, 12).map((l, i) => (
            <AlertRow key={i} level={l.level}>
              <span className="font-semibold">S{l.week}</span> {l.text}
            </AlertRow>
          ))}
        </div>
      )}
    </div>
  );
}
