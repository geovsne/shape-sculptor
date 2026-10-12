export type FeedbackKind = "erro" | "sugestao" | "conteudo";
export type FeedbackRole = "aluno" | "personal" | "professor" | "outro";
export type FeedbackScreen = "atlas" | "raio-x" | "simulador";

/** where the person was when they opened the form; sent along automatically */
export interface FeedbackContext {
  screen: FeedbackScreen;
  /** structure, exercise or similar the report is about */
  item?: string;
  /** preselected type, e.g. "conteudo" from a "reportar erro" link */
  kind?: FeedbackKind;
}

export interface FeedbackPayload extends FeedbackContext {
  kind: FeedbackKind;
  message: string;
  role?: FeedbackRole;
  contact?: string;
}

export const KINDS: { id: FeedbackKind; label: string }[] = [
  { id: "erro", label: "Algo não funciona" },
  { id: "conteudo", label: "Conteúdo errado" },
  { id: "sugestao", label: "Sugestão" },
];

export const ROLES: { id: FeedbackRole; label: string }[] = [
  { id: "aluno", label: "Aluno" },
  { id: "personal", label: "Personal" },
  { id: "professor", label: "Professor" },
  { id: "outro", label: "Outro" },
];

export const SCREEN_LABEL: Record<FeedbackScreen, string> = {
  atlas: "Atlas",
  "raio-x": "Raio-X",
  simulador: "Simulador",
};

const EVENT = "myolab:feedback";

export function openFeedback(ctx: FeedbackContext) {
  window.dispatchEvent(new CustomEvent<FeedbackContext>(EVENT, { detail: ctx }));
}

export function onOpenFeedback(fn: (ctx: FeedbackContext) => void) {
  const h = (e: Event) => fn((e as CustomEvent<FeedbackContext>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

const env = import.meta.env as Record<string, string | undefined>;

/** the form only shows up once the Lovable Cloud connection exists, so it never pretends to send */
export const FEEDBACK_ENABLED = !!(
  env["VITE_SUPABASE_URL"] && env["VITE_SUPABASE_PUBLISHABLE_KEY"]
);

/** writes one row to public.feedback (RLS: insert only, nobody can read it from the app) */
export async function sendFeedback(p: FeedbackPayload): Promise<void> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase
    .from("feedback")
    .insert({
      screen: p.screen,
      item: p.item?.slice(0, 200) ?? null,
      kind: p.kind,
      message: p.message.slice(0, 2000),
      role: p.role ?? null,
      contact: p.contact?.slice(0, 120) ?? null,
      user_agent: navigator.userAgent.slice(0, 300),
    })
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw new Error(error.message);
}
