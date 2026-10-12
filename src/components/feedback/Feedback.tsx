import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FEEDBACK_ENABLED,
  KINDS,
  ROLES,
  SCREEN_LABEL,
  onOpenFeedback,
  openFeedback,
  sendFeedback,
  type FeedbackContext,
  type FeedbackKind,
  type FeedbackRole,
  type FeedbackScreen,
} from "@/lib/feedback";

/** header button, same on every screen */
export function FeedbackButton({ screen }: { screen: FeedbackScreen }) {
  if (!FEEDBACK_ENABLED) return null;
  return (
    <button
      type="button"
      onClick={() => openFeedback({ screen })}
      aria-label="Enviar feedback"
      className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
}

/** inline link that opens the form already pointing at one item */
export function FeedbackLink({
  screen,
  item,
  children,
}: {
  screen: FeedbackScreen;
  item: string;
  children: React.ReactNode;
}) {
  if (!FEEDBACK_ENABLED) return null;
  return (
    <button
      type="button"
      onClick={() => openFeedback({ screen, item, kind: "conteudo" })}
      className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
    on ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"
  }`;

/** single form, mounted once at the root and opened through openFeedback() */
export function FeedbackDialog() {
  return FEEDBACK_ENABLED ? <FeedbackForm /> : null;
}

function FeedbackForm() {
  const [ctx, setCtx] = useState<FeedbackContext | null>(null);
  const [kind, setKind] = useState<FeedbackKind>("erro");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<FeedbackRole | undefined>();
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "fail">("idle");

  useEffect(
    () =>
      onOpenFeedback((c) => {
        setCtx(c);
        setKind(c.kind ?? "erro");
        setMessage("");
        setState("idle");
      }),
    [],
  );

  const close = () => setCtx(null);
  const ok = message.trim().length >= 3 && state !== "sending";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctx || !ok) return;
    setState("sending");
    try {
      await sendFeedback({
        screen: ctx.screen,
        ...(ctx.item ? { item: ctx.item } : {}),
        kind,
        message: message.trim(),
        ...(role ? { role } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      });
      setState("sent");
    } catch {
      setState("fail");
    }
  };

  return (
    <DialogPrimitive.Root open={!!ctx} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[28px] border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] font-body text-foreground shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:p-6"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          {state === "sent" ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="h-6 w-6" />
              </div>
              <DialogPrimitive.Title className="mt-4 font-display text-xl font-bold">
                Recebido, obrigado!
              </DialogPrimitive.Title>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Cada mensagem é lida. É assim que o MYO/LAB melhora no beta.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
              >
                Voltar
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="pr-8">
                <DialogPrimitive.Title className="font-display text-xl font-bold leading-tight">
                  Feedback
                </DialogPrimitive.Title>
                {ctx && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SCREEN_LABEL[ctx.screen]}
                    {ctx.item ? (
                      <>
                        {" · "}
                        <span className="font-semibold text-foreground">{ctx.item}</span>
                      </>
                    ) : null}
                  </p>
                )}
              </div>

              <fieldset>
                <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Tipo
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button
                      type="button"
                      key={k.id}
                      aria-pressed={kind === k.id}
                      onClick={() => setKind(k.id)}
                      className={chip(kind === k.id)}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Mensagem
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={
                    kind === "conteudo"
                      ? "O que está errado e qual seria o correto? Se puder, cite a fonte."
                      : kind === "erro"
                        ? "O que você fez e o que aconteceu?"
                        : "O que faria o app ser mais útil para você?"
                  }
                  className="w-full resize-none rounded-2xl border bg-card px-3.5 py-3 text-base outline-none focus:border-foreground/50 sm:text-sm"
                />
              </label>

              <fieldset>
                <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Você é <span className="normal-case tracking-normal">(opcional)</span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      aria-pressed={role === r.id}
                      onClick={() => setRole(role === r.id ? undefined : r.id)}
                      className={chip(role === r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Contato <span className="normal-case tracking-normal">(opcional)</span>
                </span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  placeholder="E-mail ou WhatsApp, se quiser resposta"
                  className="w-full rounded-full border bg-card px-4 py-2.5 text-base outline-none focus:border-foreground/50 sm:text-sm"
                />
              </label>

              {state === "fail" && (
                <p className="text-xs font-semibold text-destructive">
                  Não foi possível enviar. Tente de novo em instantes.
                </p>
              )}

              <button
                type="submit"
                disabled={!ok}
                className="w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
              >
                {state === "sending" ? "Enviando..." : "Enviar"}
              </button>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
