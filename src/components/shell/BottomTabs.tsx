import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, CircleUserRound, House, PersonStanding, ScanLine } from "lucide-react";

const TABS = [
  { to: "/", label: "Início", Icon: House },
  { to: "/atlas", label: "Atlas", Icon: PersonStanding },
  { to: "/raio-x", label: "Raio-X", Icon: ScanLine },
  { to: "/editor", label: "Simulador", Icon: BarChart3 },
  { to: "/perfil", label: "Perfil", Icon: CircleUserRound },
] as const;

/** phone navigation between the modules; desktop keeps the links in each header */
export function BottomTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Módulos"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {TABS.map(({ to, label, Icon }) => {
        const on = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-current={on ? "page" : undefined}
            className={`flex h-16 w-[72px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${on ? "text-foreground" : "text-muted-foreground"}`}
          >
            <Icon className={`h-[22px] w-[22px] ${on ? "text-primary" : ""}`} strokeWidth={1.9} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
