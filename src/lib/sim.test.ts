import { describe, expect, it } from "vitest";
import {
  PRESETS,
  advanceWeek,
  analyzePlan,
  emptyPlan,
  initSim,
  type Options,
  type Plan,
  type SimState,
} from "./sim";
import { EXERCISES, HEADS_OF, MUSCLE_IDS, headEmphasis, type Head } from "./training";

const man = { sex: "m" as const, height: 178, weight: 78, bf: 16 };
const free: Options = { pro: false, nutrition: { kcal: 3000, protein: 2 }, hormone: "supra" };
const bulk: Options = { pro: true, nutrition: { kcal: 2900, protein: 2 }, hormone: "nenhum" };
const run = (plan: Plan, o: Options, weeks: number, s: SimState = initSim(man)) => {
  for (let i = 0; i < weeks; i++) s = advanceWeek(s, plan, o);
  return s;
};
const injuriesIn = (s: SimState) =>
  s.log.filter((l) => l.level === "danger" && /fora\./.test(l.text)).length;

describe("simulação", () => {
  it("é determinística para o mesmo perfil e rotina", () => {
    const a = run(PRESETS["ppl"]!.plan(), bulk, 8);
    const b = run(PRESETS["ppl"]!.plan(), bulk, 8);
    expect(a.dev).toEqual(b.dev);
    expect(a.profile).toEqual(b.profile);
  });

  it("sem PRO ignora dieta e hormônio e come em manutenção", () => {
    const s = run(PRESETS["ppl"]!.plan(), free, 4);
    expect(s.last!.kcal).toBe(s.last!.tdee);
    expect(s.hormone.level).toBe("nenhum");
    expect(Math.abs(s.profile.weight - man.weight)).toBeLessThan(1.5);
  });

  it("superávit com bom treino ganha músculo; sem treino só ganha gordura", () => {
    const trained = run(PRESETS["ppl"]!.plan(), bulk, 12);
    const idle = run(emptyPlan(), bulk, 12);
    expect(trained.leanKg).toBeGreaterThan(initSim(man).leanKg + 1.5);
    expect(idle.leanKg).toBeLessThan(initSim(man).leanKg);
    expect(idle.fatKg).toBeGreaterThan(trained.fatKg);
  });

  it("déficit severo com treino pesado perde músculo", () => {
    const s = run(
      PRESETS["ppl"]!.plan(),
      { pro: true, nutrition: { kcal: 1300, protein: 0.8 }, hormone: "nenhum" },
      8,
    );
    expect(s.leanKg).toBeLessThan(initSim(man).leanKg);
  });

  it("treinar peito todo dia até a falha gera lesão e alerta, sem bloquear", () => {
    const plan = PRESETS["overkill"]!.plan();
    const a = analyzePlan(plan, initSim(man), bulk);
    expect(a.alerts.some((x) => x.level === "danger")).toBe(true);
    expect(injuriesIn(run(plan, bulk, 4))).toBeGreaterThan(0);
  });

  it("hormônio acima do fisiológico acelera o ganho e sempre suprime a produção natural", () => {
    const natural = run(PRESETS["ppl"]!.plan(), bulk, 12);
    const supra = run(PRESETS["ppl"]!.plan(), { ...bulk, hormone: "supra" }, 12);
    expect(supra.leanKg).toBeGreaterThan(natural.leanKg);
    expect(supra.hormone.effects.some((e) => e.id === "supressao")).toBe(true);
  });

  it("parar o hormônio gera fase de supressão com perda de energia", () => {
    const on = run(PRESETS["ppl"]!.plan(), { ...bulk, hormone: "supra" }, 10);
    const off = advanceWeek(on, PRESETS["ppl"]!.plan(), bulk);
    expect(off.hormone.postWeeks).toBeGreaterThan(0);
    expect(off.energy).toBeLessThan(on.energy);
  });

  it("carga acima do 1RM no PRO dispara alerta de tendão", () => {
    const plan = emptyPlan();
    plan[0] = [{ exId: "bench", sets: 3, reps: 5, intensity: "pesada", kg: 200 }];
    const a = analyzePlan(plan, initSim(man), bulk);
    expect(a.alerts.some((x) => x.level === "danger" && /1RM/.test(x.text))).toBe(true);
  });
});

describe("cabeças musculares", () => {
  const only = (exId: string, variant?: string): Plan => {
    const p = emptyPlan();
    for (const d of [0, 2, 4]) p[d] = [{ exId, variant, sets: 5, reps: 10, intensity: "pesada" }];
    return p;
  };
  const gain = (s: SimState, h: Head) => s.headDev[h] - initSim(man).headDev[h];

  it("cada cabeça tem um exercício que a faz crescer mais que as vizinhas", () => {
    const misses: string[] = [];
    for (const m of MUSCLE_IDS) {
      const heads = HEADS_OF[m];
      if (heads.length < 2) continue;
      for (const h of heads) {
        // the exercise / grip with the largest emphasis margin over the other heads of the muscle
        let best: { id: string; v: string | undefined; margin: number } | null = null;
        for (const e of EXERCISES)
          for (const v of e.variants ?? [undefined]) {
            const w = headEmphasis(e, h, v?.id);
            if (!e.primary.includes(m) || w === 0) continue;
            const other = Math.max(
              ...heads.filter((x) => x !== h).map((x) => headEmphasis(e, x, v?.id)),
            );
            const margin = w - other;
            if (!best || margin > best.margin) best = { id: e.id, v: v?.id, margin };
          }
        if (!best) {
          misses.push(`${h}: nenhum exercício`);
          continue;
        }
        const s = run(only(best.id, best.v), bulk, 10);
        const g = gain(s, h);
        const rival = heads.filter((x) => x !== h).find((x) => gain(s, x) >= g);
        if (rival)
          misses.push(`${h} (${best.id}${best.v ? "/" + best.v : ""}) perde para ${rival}`);
      }
    }
    expect(misses).toEqual([]);
  });
  it("pegada muda a ênfase: barra fixa aberta = dorsal alta, supinada/neutra = dorsal baixa", () => {
    const wide = run(only("pullup", "wide"), bulk, 10);
    const under = run(only("pullup", "under"), bulk, 10);
    const neutral = run(only("pullup", "neutral"), bulk, 10);
    expect(gain(wide, "lats_upper")).toBeGreaterThan(gain(wide, "lats_lower"));
    expect(gain(under, "lats_lower")).toBeGreaterThan(gain(under, "lats_upper"));
    expect(gain(neutral, "lats_lower")).toBeGreaterThan(gain(neutral, "lats_upper"));
    // supinated grip loads the biceps more; neutral grip the brachialis and brachioradialis
    expect(gain(under, "biceps_short")).toBeGreaterThan(gain(neutral, "biceps_short"));
    expect(gain(neutral, "brachioradialis")).toBeGreaterThan(gain(under, "brachioradialis"));
  });
  it("trapézio: encolhimento cresce a parte superior; Y no banco, a inferior", () => {
    const shrug = run(only("shrug"), bulk, 10);
    const y = run(only("yRaise"), bulk, 10);
    expect(gain(shrug, "traps_upper")).toBeGreaterThan(gain(shrug, "traps_lower"));
    expect(gain(y, "traps_lower")).toBeGreaterThan(gain(y, "traps_upper"));
  });
  it("tríceps francês desenvolve mais a cabeça longa; pulley, a lateral", () => {
    const fr = run(only("frenchPress"), bulk, 12);
    const pd = run(only("pushdown"), bulk, 12);
    expect(fr.headDev.triceps_long).toBeGreaterThan(fr.headDev.triceps_lateral);
    expect(pd.headDev.triceps_lateral).toBeGreaterThan(pd.headDev.triceps_long);
  });
  it("supino inclinado prioriza o peitoral superior; declinado, o inferior", () => {
    const inc = run(only("dbIncline"), bulk, 12);
    const dec = run(only("declineBench"), bulk, 12);
    expect(inc.headDev.chest_upper).toBeGreaterThan(inc.headDev.chest_lower);
    expect(dec.headDev.chest_lower).toBeGreaterThan(dec.headDev.chest_upper);
  });
  it("todo grupo muscular tem ao menos um exercício principal", () => {
    const orphan = MUSCLE_IDS.filter((m) => !EXERCISES.some((e) => e.primary.includes(m)));
    expect(orphan).toEqual([]);
  });
  it("cadeira adutora cresce os adutores; agachamento sumô, o adutor magno", () => {
    const add = run(only("adductor"), bulk, 12);
    expect(add.dev.adductors).toBeGreaterThan(initSim(man).dev.adductors + 0.05);
    expect(add.dev.quads).toBeLessThanOrEqual(initSim(man).dev.quads + 0.01);
    expect(gain(add, "add_short")).toBeGreaterThan(gain(add, "add_magnus"));
    const sumo = run(only("sumoGoblet"), bulk, 12);
    expect(gain(sumo, "add_magnus")).toBeGreaterThan(gain(sumo, "add_short"));
  });
  it("flexores do quadril, pescoço e tibial crescem com os exercícios próprios", () => {
    const base = initSim(man).dev;
    expect(run(only("hipFlexCable"), bulk, 12).dev.hipFlexors).toBeGreaterThan(base.hipFlexors);
    const neck = run(only("neckExt"), bulk, 12);
    expect(gain(neck, "neck_back")).toBeGreaterThan(gain(neck, "neck_front"));
    expect(run(only("tibRaise"), bulk, 12).dev.tibialis).toBeGreaterThan(base.tibialis);
  });
  it("só glúteo: só o glúteo cresce", () => {
    const s = run(
      only("hipThrust"),
      bulk,
      16,
      initSim({ sex: "f", height: 165, weight: 60, bf: 24 }),
    );
    expect(s.dev.glutes).toBeGreaterThan(0.3);
    expect(s.dev.chest).toBeLessThan(0.2);
    expect(s.dev.quads).toBeLessThan(0.2);
  });
});

describe("recursos PRO de execução", () => {
  const one = (extra: Partial<import("./sim").PlanItem>): Plan => {
    const p = emptyPlan();
    for (const d of [0, 2, 4])
      p[d] = [{ exId: "bench", sets: 5, reps: 10, intensity: "pesada", ...extra }];
    return p;
  };
  const g = (s: SimState, h: "chest_upper" | "chest_lower") =>
    s.headDev[h] - initSim(man).headDev[h];
  it("supino a 45° (PRO) puxa o peitoral superior; sem PRO o ângulo é ignorado", () => {
    const pro45 = run(one({ angle: 45 }), bulk, 10);
    expect(g(pro45, "chest_upper")).toBeGreaterThan(g(pro45, "chest_lower"));
    const free45 = run(one({ angle: 45 }), { ...bulk, pro: false }, 10);
    const flat = run(one({}), { ...bulk, pro: false }, 10);
    expect(free45.headDev).toEqual(flat.headDev);
  });
  it("amplitude parcial encurtada cresce menos que a completa", () => {
    const full = run(one({}), bulk, 10);
    const short = run(one({ rom: "short" }), bulk, 10);
    expect(full.dev.chest).toBeGreaterThan(short.dev.chest);
  });
});
