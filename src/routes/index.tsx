import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/Studio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MYO/LAB — Anatomia 3D e simulador de treino" },
      { name: "description", content: "Explore músculos em 3D, veja quais exercícios os ativam e simule a evolução do shape semana a semana." },
      { property: "og:title", content: "MYO/LAB — Anatomia 3D e simulador de treino" },
      { property: "og:description", content: "Explore músculos em 3D e simule sua rotina de treino semana a semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});
