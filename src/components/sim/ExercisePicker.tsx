import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EXERCISES, MUSCLES, MUSCLE_IDS, type Equip, type Muscle } from "@/lib/training";
import { Pill } from "./ui";

const EQUIPS: Equip[] = ["Máquina", "Peso livre", "Cabo", "Corporal"];

export function ExercisePicker({
  dayLabel,
  onPick,
  onClose,
}: {
  dayLabel: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<Equip | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    return EXERCISES.filter(
      (e) =>
        (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!equip || e.equip === equip) &&
        (!term || e.name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(term)),
    );
  }, [q, muscle, equip]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Adicionar exercício em ${dayLabel}`}
        className="glass flex max-h-[85vh] w-full max-w-lg flex-col rounded-[28px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {dayLabel}
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight">Adicionar exercício</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-secondary"
          >
            Fechar
          </button>
        </div>
        <input
          id="exercise-search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar exercício"
          className="mt-4 rounded-2xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill active={!equip} onClick={() => setEquip(null)}>
            Todos
          </Pill>
          {EQUIPS.map((e) => (
            <Pill key={e} active={equip === e} onClick={() => setEquip(e)}>
              {e}
            </Pill>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {MUSCLE_IDS.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMuscle(muscle === m ? null : m)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${muscle === m ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"}`}
            >
              {MUSCLES[m].name}
            </button>
          ))}
        </div>
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {list.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhum exercício com esses filtros.
            </p>
          )}
          {list.map((e) => (
            <button
              type="button"
              key={e.id}
              onClick={() => onPick(e.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{e.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {e.primary.map((m) => MUSCLES[m].name).join(", ")}
                  {e.secondary.length > 0 &&
                    ` · apoio: ${e.secondary.map((m) => MUSCLES[m].name).join(", ")}`}
                </span>
              </span>
              <span className="flex-none text-[10px] uppercase tracking-wider text-muted-foreground">
                {e.equip}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
