import { Link } from "@tanstack/react-router";
import { CircleUserRound } from "lucide-react";

/** desktop shortcut to the profile; on phones the bottom tab does this */
export function ProfileLink() {
  return (
    <Link
      to="/perfil"
      aria-label="Perfil"
      className="glass hidden h-10 w-10 place-items-center rounded-full lg:grid"
    >
      <CircleUserRound className="h-5 w-5" strokeWidth={1.8} />
    </Link>
  );
}
