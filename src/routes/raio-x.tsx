import { createFileRoute } from "@tanstack/react-router";
import { RaioX } from "@/components/raiox/RaioX";

export const Route = createFileRoute("/raio-x")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Raio-X do exercício · MYO/LAB" },
      {
        name: "description",
        content:
          "Veja em 3D quais músculos cada exercício trabalha, os melhores exercícios para cada músculo e monte o treino do dia.",
      },
      { property: "og:title", content: "Raio-X do exercício · MYO/LAB" },
      {
        property: "og:description",
        content: "O que o seu exercício está pegando, músculo por músculo, em 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RaioX,
});
