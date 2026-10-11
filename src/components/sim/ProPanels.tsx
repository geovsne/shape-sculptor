import {
  BASAL_PROTEIN,
  HORMONE_LEVELS,
  tdee,
  type HormoneLevel,
  type Nutrition,
  type Plan,
  type SimState,
  kcalOf,
  macrosFor,
} from "@/lib/sim";
import { AlertRow, RangeField } from "./ui";

function Locked({
  title,
  children,
  onUnlock,
}: {
  title: string;
  children: React.ReactNode;
  onUnlock: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed p-4">
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</div>
      <button
        type="button"
        onClick={onUnlock}
        className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        Ver o PRO
      </button>
    </div>
  );
}

export function DietPanel({
  sim,
  plan,
  pro,
  nutrition,
  setNutrition,
  onUnlock,
}: {
  sim: SimState;
  plan: Plan;
  pro: boolean;
  nutrition: Nutrition;
  setNutrition: (n: Nutrition) => void;
  onUnlock: () => void;
}) {
  const spend = tdee(sim.profile, plan);
  if (!pro) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Alimentação de manutenção
          </div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{spend} kcal</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Igual ao gasto estimado do avatar · proteína {BASAL_PROTEIN} g/kg
          </div>
        </div>
        <Locked title="Dieta personalizada" onUnlock={onUnlock}>
          No grátis o avatar come exatamente o que gasta para o peso dele, e a mudança vem só do
          treino. No PRO você monta a dieta em calorias, proteína, carboidrato e gordura: com
          superávit e bom treino ele ganha músculo; com déficit ele seca; pouco carboidrato rende
          menos treino e pouca gordura derruba os hormônios.
        </Locked>
      </div>
    );
  }
  const w = sim.profile.weight;
  const m = {
    protein: nutrition.protein,
    carbs: nutrition.carbs ?? macrosFor(nutrition.kcal, w, nutrition.protein, 0.9).carbs!,
    fat: nutrition.fat ?? 0.9,
  };
  const kcal = kcalOf(m, w);
  const setMacro = (patch: Partial<typeof m>) => {
    const next = { ...m, ...patch };
    setNutrition({ ...next, kcal: kcalOf(next, w) });
  };
  const r = kcal / spend;
  const presets = [
    { label: "Déficit agressivo", kcal: spend * 0.75 },
    { label: "Déficit", kcal: spend * 0.85 },
    { label: "Manutenção", kcal: spend },
    { label: "Superávit", kcal: spend * 1.12 },
  ].map((p) => ({ ...p, n: macrosFor(p.kcal, w, 2, 0.9) }));
  const parts = [
    { k: "Proteína", kcal: m.protein * 4 * w, c: "bg-primary" },
    { k: "Carboidrato", kcal: m.carbs * 4 * w, c: "bg-amber-500" },
    { k: "Gordura", kcal: m.fat * 9 * w, c: "bg-foreground" },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {kcal} kcal por dia
          </span>
          <span className="text-[10px] text-muted-foreground">gasto ~{spend} kcal</span>
        </div>
        <div
          className={`mt-1 font-display text-3xl font-bold tabular-nums ${r < 0.8 ? "text-destructive" : ""}`}
        >
          {kcal - spend > 0 ? "+" : ""}
          {kcal - spend} kcal
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {r >= 1.05
            ? "Superávit: favorece ganho de músculo, com algum ganho de gordura."
            : r >= 0.95
              ? "Manutenção: peso estável, recomposição lenta."
              : r >= 0.8
                ? "Déficit: perde gordura e preserva músculo se a proteína estiver alta."
                : "Déficit agressivo: perde gordura rápido e também músculo."}
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-background">
          {parts.map((p) => (
            <div
              key={p.k}
              className={p.c}
              style={{ width: `${(p.kcal / Math.max(1, kcal)) * 100}%` }}
              title={`${p.k}: ${Math.round((p.kcal / Math.max(1, kcal)) * 100)}%`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          {parts.map((p) => (
            <span key={p.k}>
              {p.k} {Math.round((p.kcal / Math.max(1, kcal)) * 100)}%
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            type="button"
            key={p.label}
            onClick={() => setNutrition(p.n)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${Math.abs(kcal - p.n.kcal) < 30 ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <RangeField
        label={`Proteína · ${Math.round(m.protein * w)} g/dia`}
        value={m.protein}
        min={0.6}
        max={3.5}
        step={0.1}
        unit=" g/kg"
        onChange={(v) => setMacro({ protein: v })}
      />
      <RangeField
        label={`Carboidrato · ${Math.round(m.carbs * w)} g/dia`}
        value={m.carbs}
        min={0}
        max={9}
        step={0.1}
        unit=" g/kg"
        onChange={(v) => setMacro({ carbs: v })}
      />
      <RangeField
        label={`Gordura · ${Math.round(m.fat * w)} g/dia`}
        value={m.fat}
        min={0.2}
        max={2.5}
        step={0.1}
        unit=" g/kg"
        onChange={(v) => setMacro({ fat: v })}
      />
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Proteína: 1,6 a 2,2 g/kg maximiza o ganho muscular. Carboidrato é o combustível do treino:
        pouco carboidrato rende menos estímulo. Gordura abaixo de 0,5 g/kg derruba hormônios e piora
        ganho e recuperação.
      </p>
    </div>
  );
}

export function HormonePanel({
  sim,
  pro,
  level,
  setLevel,
  onUnlock,
}: {
  sim: SimState;
  pro: boolean;
  level: HormoneLevel;
  setLevel: (l: HormoneLevel) => void;
  onUnlock: () => void;
}) {
  if (!pro)
    return (
      <Locked title="Hormônios" onUnlock={onUnlock}>
        Simule testosterona em reposição médica ou acima do nível natural e veja o efeito no
        músculo, na recuperação, na energia e na saúde do avatar, incluindo os efeitos colaterais.
      </Locked>
    );
  const h = sim.hormone;
  const fem = sim.profile.sex === "f";
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {(Object.keys(HORMONE_LEVELS) as HormoneLevel[]).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setLevel(k)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${level === k ? (k === "supra" ? "border-primary bg-primary/8" : "border-foreground bg-foreground/5") : "hover:border-foreground/40"}`}
          >
            <div className="text-xs font-semibold">{HORMONE_LEVELS[k].label}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {HORMONE_LEVELS[k].desc}
            </div>
          </button>
        ))}
      </div>
      {level !== "nenhum" && (
        <div className="rounded-2xl bg-secondary p-3 text-[11px] leading-relaxed">
          <div className="font-semibold">O que muda no avatar</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {level === "supra" ? (
              <>
                <li>Ganho muscular cerca de 50% maior, até sem treinar</li>
                <li>Recuperação mais rápida e mais energia para treinar</li>
                <li>Tendões não acompanham o músculo: risco maior de ruptura</li>
                <li>Produção natural suprimida sempre; colaterais crescem com o tempo de uso</li>
                {fem && <li>Em mulheres, voz grave e outros efeitos podem ser permanentes</li>}
                <li>Ao parar: semanas de supressão, cansaço e perda de massa</li>
              </>
            ) : (
              <>
                <li>Ganho e recuperação um pouco melhores</li>
                <li>Produção natural fica suprimida enquanto usa</li>
                <li>Colaterais raros, exigem acompanhamento médico</li>
              </>
            )}
          </ul>
        </div>
      )}
      {(h.weeksOn > 0 || h.postWeeks > 0 || h.effects.length > 0) && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {h.weeksOn > 0
              ? `${h.weeksOn} semanas em uso`
              : h.postWeeks > 0
                ? `Pós-uso: ${h.postWeeks} semanas de supressão`
                : "Histórico"}
          </div>
          {h.effects.map((e) => (
            <AlertRow key={e.id} level={e.severity >= 2 ? "danger" : "warn"}>
              {e.name}
              {!e.reversible && <strong className="ml-1">· irreversível</strong>}
            </AlertRow>
          ))}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Simulação educativa, sem doses. Os efeitos colaterais são sempre simulados e as chances
        crescem com o tempo de uso. Hormônios só devem ser usados com indicação e acompanhamento
        médico.
      </p>
    </div>
  );
}
