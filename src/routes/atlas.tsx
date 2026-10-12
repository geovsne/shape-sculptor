import { createFileRoute } from "@tanstack/react-router";
import { Atlas } from "@/components/atlas/Atlas";

export const Route = createFileRoute("/atlas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atlas anatômico · MYO/LAB" },
      {
        name: "description",
        content: "Atlas 3D grátis: músculos, ossos, ligamentos, nervos, vasos e órgãos.",
      },
      { property: "og:title", content: "Atlas anatômico · MYO/LAB" },
      {
        property: "og:description",
        content: "Explore músculos, ossos e estruturas anatômicas em 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Atlas,
});
