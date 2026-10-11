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

  it("sem PRO ignora dieta e hormônio e usa a alimentação basal", () => {
    const s = run(PRESETS["ppl"]!.plan(), free, 4);
    expect(s.last!.kcal).toBe(2000);
    expect(s.hormone.level).toBe("nenhum");
    expect(s.profile.bf).toBeLessThan(man.bf);
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
