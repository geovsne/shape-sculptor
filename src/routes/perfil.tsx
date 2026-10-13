import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "@/components/profile/Profile";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Perfil · MYO/LAB" }, { name: "robots", content: "noindex" }],
  }),
  component: Profile,
});
