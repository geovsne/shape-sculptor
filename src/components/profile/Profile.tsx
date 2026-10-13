import { Link } from "@tanstack/react-router";
import { Camera, Monitor, Moon, Sun, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/shell/BottomTabs";

/** a setting that is drawn but not usable yet */
function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${last ? "" : "border-b"}`}>
      <span className="text-[15px] font-semibold">{label}</span>
      <span className="text-[15px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[13px] font-semibold text-muted-foreground">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      <div className="mt-2 overflow-hidden rounded-[20px] border bg-card">{children}</div>
    </section>
  );
}

export function Profile() {
  return (
    <div className="min-h-screen bg-background pb-tabs font-body text-foreground lg:pb-12">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))] lg:pt-8">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Perfil</h1>
        <Link to="/" className="hidden text-sm font-semibold text-muted-foreground lg:block">
          Voltar ao início
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-5">
        <div className="mt-3 flex items-center gap-4 rounded-[24px] border bg-card p-4">
          <div className="relative grid h-16 w-16 flex-none place-items-center rounded-full bg-secondary text-muted-foreground">
            <UserRound className="h-8 w-8" strokeWidth={1.6} />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border bg-card">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold">Visitante</div>
            <p className="text-[13px] leading-snug text-muted-foreground">
              Em breve você entra com a sua conta e o simulador já começa com o seu corpo.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="mt-3 h-12 w-full rounded-full bg-foreground text-[15px] font-bold text-background opacity-40"
        >
          Entrar ou criar conta
        </button>

        <Group title="Seus dados" note="Em breve">
          <div className="opacity-50">
            <Row label="Peso" value="—" />
            <Row label="Altura" value="—" />
            <Row label="Gordura corporal" value="—" />
            <Row label="Idade" value="—" />
            <Row label="Tempo de treino" value="—" />
            <Row label="Dieta" value="—" last />
          </div>
        </Group>

        <Group title="Aparência" note="Em breve">
          <div
            className="grid grid-cols-3 gap-1.5 p-1.5 opacity-50"
            role="radiogroup"
            aria-label="Tema"
          >
            {(
              [
                ["Claro", Sun, true],
                ["Escuro", Moon, false],
                ["Automático", Monitor, false],
              ] as const
            ).map(([label, Icon, on]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                disabled
                className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-semibold ${on ? "bg-foreground text-background" : ""}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>
        </Group>

        <p className="mt-6 px-1 text-xs leading-relaxed text-muted-foreground">
          Os seus dados vão ser usados só para a simulação. Enquanto o login não chega, o simulador
          guarda o seu avatar neste aparelho.
        </p>
      </main>
      <BottomTabs />
    </div>
  );
}
