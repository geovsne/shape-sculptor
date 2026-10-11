import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MYO/LAB · Simulador de treino em 3D" },
      {
        name: "description",
        content:
          "Monte sua semana de treino, veja os músculos trabalhando em 3D e simule a evolução do corpo com treino, dieta, lesões e hormônios.",
      },
      { property: "og:title", content: "MYO/LAB · Simulador de treino em 3D" },
      {
        property: "og:description",
        content: "Monte a semana de treino e veja o corpo evoluir semana a semana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
