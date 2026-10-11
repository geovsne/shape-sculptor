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
    ],
  }),
  component: Atlas,
});
