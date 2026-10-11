import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/Studio";

export const Route = createFileRoute("/editor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Simulador · MYO/LAB" },
      {
        name: "description",
        content: "Monte a semana de treino do avatar e veja o corpo evoluir semana a semana.",
      },
    ],
  }),
  component: Studio,
});
