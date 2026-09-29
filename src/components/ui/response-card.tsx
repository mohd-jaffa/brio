"use client";

import { AlertTriangle, Check, CircleAlert, Info, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

import { UI_TEXT, type ErrorMessageCode } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors/errorMessage";
import { EXIT_MS, canAnimate } from "@/lib/motion";

import { cn } from "./cn";
import { Medallion, type MedallionTone } from "./medallion";
import { Modal } from "./modal";

export type ResponseKind = "success" | "info" | "warning" | "error" | "confirm";

/** A button on a card: it acts, or goes somewhere; either way the card closes. */
export interface ResponseAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

/** One of up to three key figures under the message: Order ORD-1028. */
export interface ResponseFact {
  label: string;
  value: string;
}

export interface OutcomeCard {
  title: string;
  message?: string;
  facts?: readonly ResponseFact[];
  primary?: ResponseAction;
  secondary?: ResponseAction;
  /** A success or info card with no next step closes itself; `false` keeps it. */
  autoClose?: boolean;
}

export interface ErrorCard extends OutcomeCard {
  /** The API's own words (errorMessage), never raw text. */
  message: string;
  /** Shown in small type so it can be quoted. */
  requestId?: string;
  /** Offers Try again, which runs this. */
  retry?: () => void;
}

export interface ConfirmCard {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "warning" | "danger";
}

interface Card extends OutcomeCard {
  id: number;
  kind: ResponseKind;
  requestId?: string;
  tone?: "warning" | "danger";
  cancelLabel?: string;
  resolve?: (answer: boolean) => void;
  /** It has been answered or closed, and is on its way off the screen. */
  leaving?: boolean;
}

export interface Respond {
  success: (card: OutcomeCard) => void;
  info: (card: OutcomeCard) => void;
  warning: (card: OutcomeCard) => void;
  error: (card: ErrorCard) => void;
  /** An error card for a caught failure: its message and request id come from the API's envelope. */
  failure: (failure: unknown, card: Omit<ErrorCard, "message" | "requestId"> & { fallback?: ErrorMessageCode }) => void;
  /** Resolves `true` for the confirm button, `false` for anything else. */
  confirm: (card: ConfirmCard) => Promise<boolean>;
}

// A newer card replaces an older one of lower or equal severity; a lower one
// waits its turn.
const SEVERITY: Record<ResponseKind, number> = { info: 0, success: 1, warning: 2, error: 3, confirm: 4 };

const MEDALLIONS: Record<ResponseKind, { icon: LucideIcon; tone: MedallionTone }> = {
  success: { icon: Check, tone: "primary" },
  info: { icon: Info, tone: "neutral" },
  warning: { icon: AlertTriangle, tone: "warning" },
  error: { icon: CircleAlert, tone: "danger" },
  confirm: { icon: AlertTriangle, tone: "warning" },
};

/** How long a card with no next step stays up (Q13). */
export const AUTO_CLOSE_MS = 3000;

const same = (a: Card, b: Card) => a.kind === b.kind && a.title === b.title && a.message === b.message;

/** A success or info card with nothing to do next, which closes itself. */
const closesItself = (card: Card) =>
  (card.kind === "success" || card.kind === "info") && !card.primary && !card.secondary && card.autoClose !== false;

const ResponseContext = createContext<Respond | null>(null);

/**
 * How the app reports what just happened (plan §139.6): mounted once in the
 * root layout, reached with `useResponse()`, one card at a time.
 */
export function ResponseProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const nextId = useRef(0);

  const show = useCallback((card: Omit<Card, "id">) => {
    const next = { ...card, id: nextId.current++ };
    setCards((current) => {
      // A card on its way out has already gone, as far as a new one is concerned.
      const [shown, ...waiting] = current.filter((card) => !card.leaving);
      if (!shown) return [next];
      if (same(shown, next) || waiting.some((card) => same(card, next))) {
        next.resolve?.(false);
        return current;
      }
      if (SEVERITY[next.kind] >= SEVERITY[shown.kind]) {
        shown.resolve?.(false);
        return [next, ...waiting];
      }
      return [shown, ...waiting, next];
    });
  }, []);

  // The answer is given at once; the card then leaves the way it came
  // (EXIT_MS), and the next one waiting follows it. A browser that cannot
  // play the exit takes it off at once.
  const close = useCallback((card: Card, answer = false) => {
    card.resolve?.(answer);
    const remove = () => setCards((current) => current.filter((waiting) => waiting.id !== card.id));
    if (!canAnimate(document.body)) return remove();
    setCards((current) => current.map((shown) => (shown.id === card.id ? { ...shown, leaving: true } : shown)));
    window.setTimeout(remove, EXIT_MS);
  }, []);

  const respond = useMemo<Respond>(
    () => ({
      success: (card) => show({ ...card, kind: "success" }),
      info: (card) => show({ ...card, kind: "info" }),
      warning: (card) => show({ ...card, kind: "warning" }),
      error: ({ retry, ...card }) =>
        show({
          ...card,
          kind: "error",
          primary: card.primary ?? (retry ? { label: UI_TEXT.actions.retry, onClick: retry } : undefined),
        }),
      failure: (failure, { fallback, retry, ...card }) =>
        show({
          ...card,
          kind: "error",
          message: errorMessage(failure, fallback),
          requestId: failure instanceof ApiError ? failure.requestId : undefined,
          primary: card.primary ?? (retry ? { label: UI_TEXT.actions.retry, onClick: retry } : undefined),
        }),
      confirm: ({ confirmLabel, cancelLabel, ...card }) =>
        new Promise<boolean>((resolve) =>
          show({
            ...card,
            kind: "confirm",
            primary: { label: confirmLabel },
            cancelLabel,
            resolve,
          }),
        ),
    }),
    [show],
  );

  const current = cards[0];
  return (
    <ResponseContext.Provider value={respond}>
      {children}
      {current &&
        (closesItself(current) ? (
          <ResponseNotice key={current.id} card={current} onClose={() => close(current)} />
        ) : (
          <ResponseCard key={current.id} card={current} onClose={(answer) => close(current, answer)} />
        ))}
      {/* Announces a card that closes itself, which never takes focus. */}
      <p role="status" aria-live="polite" className="sr-only">
        {current && closesItself(current)
          ? [
              current.title,
              current.message,
              ...(current.facts ?? []).slice(0, 3).map((fact) => `${fact.label} ${fact.value}`),
            ]
              .filter(Boolean)
              .join(". ")
          : ""}
      </p>
    </ResponseContext.Provider>
  );
}

/** The card for the outcome of an action. Only inside a `ResponseProvider`. */
export function useResponse(): Respond {
  const respond = useContext(ResponseContext);
  if (!respond) throw new Error("useResponse() is used outside a ResponseProvider.");
  return respond;
}

function ActionButton({
  action,
  variant,
  onDone,
  buttonRef,
}: {
  action: ResponseAction;
  variant: "primary" | "secondary" | "danger";
  onDone: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const classes = cn(
    "touch-target inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
    variant === "primary" && "bg-primary text-primary-text hover:bg-primary-hover",
    variant === "danger" && "bg-danger text-primary-text hover:opacity-90",
    variant === "secondary" && "border border-border bg-surface text-text hover:bg-surface-hover",
  );
  if (action.href) {
    return (
      <Link
        href={action.href}
        className={classes}
        onClick={() => {
          action.onClick?.();
          onDone();
        }}
      >
        {action.label}
      </Link>
    );
  }
  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes}
      onClick={() => {
        action.onClick?.();
        onDone();
      }}
    >
      {action.label}
    </button>
  );
}

/**
 * A card that needs an answer, or offers a next step: modal, on the kit's
 * `Modal`. Focus goes to the primary action — except on a destructive
 * confirmation, where it goes to the safe answer, so Enter cannot destroy
 * anything by accident. Escape closes a success, info or error card and
 * means No to a confirmation; a warning waits for a choice.
 */
function ResponseCard({ card, onClose }: { card: Card; onClose: (answer?: boolean) => void }) {
  const titleId = useId();
  const first = useRef<HTMLButtonElement>(null);
  const safe = useRef<HTMLButtonElement>(null);
  const { icon, tone } = MEDALLIONS[card.kind];
  const confirming = card.kind === "confirm";
  const danger = confirming && card.tone === "danger";
  const dismissible = card.kind !== "warning";

  return (
    <Modal
      open={!card.leaving}
      onDismiss={dismissible ? () => onClose(false) : undefined}
      labelledBy={titleId}
      role={card.kind === "success" || card.kind === "info" ? "dialog" : "alertdialog"}
      initialFocus={danger ? safe : first}
      motion="rise"
      className="md:max-w-[420px]"
    >
      <div className="safe-bottom [--safe-pb:1.5rem] relative flex flex-col items-center px-6 pt-8 text-center">
        {dismissible && !confirming && (
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label={UI_TEXT.actions.close}
            className="touch-target absolute right-2 top-2 flex items-center justify-center rounded-full p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <Medallion icon={icon} tone={danger ? "danger" : tone} size="lg" />
        <h2 id={titleId} className="mt-4 font-heading text-2xl font-medium leading-tight">
          {card.title}
        </h2>
        {card.message && <p className="mt-2 text-sm text-text-muted">{card.message}</p>}
        {card.facts && card.facts.length > 0 && (
          <dl
            className="mt-5 grid w-full divide-x divide-border rounded-xl border border-border bg-sunken text-left"
            style={{ gridTemplateColumns: `repeat(${Math.min(card.facts.length, 3)}, minmax(0, 1fr))` }}
          >
            {card.facts.slice(0, 3).map((fact) => (
              <div key={fact.label} className="min-w-0 px-3 py-2.5">
                <dt className="text-xs text-text-muted">{fact.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-text">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {card.requestId && <p className="mt-3 text-xs text-text-muted">{UI_TEXT.response.reference(card.requestId)}</p>}
        <div className={cn("mt-6 grid w-full gap-3", (confirming || card.secondary) && "grid-cols-2")}>
          {confirming && (
            <ActionButton
              action={{ label: card.cancelLabel ?? UI_TEXT.actions.cancel }}
              variant="secondary"
              onDone={() => onClose(false)}
              buttonRef={safe}
            />
          )}
          {card.secondary && <ActionButton action={card.secondary} variant="secondary" onDone={() => onClose(false)} />}
          {card.primary && (
            <ActionButton
              action={card.primary}
              variant={danger ? "danger" : "primary"}
              onDone={() => onClose(true)}
              buttonRef={first}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * A success or info card with nothing to do next (Q13): it closes itself after
 * about three seconds, with a hairline counting down, and stops counting while
 * a pointer rests on it, a finger holds it or focus is in it (WCAG 2.2.1). It
 * does not take focus — focus would stop its clock for good and pull it away
 * from what the person was doing — so the provider announces it instead.
 */
function ResponseNotice({ card, onClose }: { card: Card; onClose: () => void }) {
  const [held, setHeld] = useState(0);
  const { icon, tone } = MEDALLIONS[card.kind];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const hold = () => setHeld((count) => count + 1);
  const letGo = () => setHeld((count) => Math.max(0, count - 1));

  return (
    <div
      data-response-notice=""
      onPointerEnter={hold}
      onPointerLeave={letGo}
      onFocus={hold}
      onBlur={letGo}
      className={cn(
        card.leaving ? "animate-leave pointer-events-none" : "animate-response",
        "fixed inset-x-4 bottom-[calc(var(--bottom-bar-offset)+var(--safe-bottom)+0.75rem)] z-50 mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated md:bottom-6",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Medallion icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 flex-1 pt-1">
          <p className="font-heading text-lg font-medium leading-tight text-text">{card.title}</p>
          {card.message && <p className="mt-1 text-sm text-text-muted">{card.message}</p>}
          {card.facts && card.facts.length > 0 && (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {card.facts.slice(0, 3).map((fact) => (
                <div key={fact.label} className="flex gap-1.5">
                  <dt className="text-text-muted">{fact.label}</dt>
                  <dd className="font-semibold tabular-nums text-text">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={UI_TEXT.actions.close}
          className="touch-target -m-2 flex items-center justify-center rounded-full p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <div aria-hidden="true" className="h-0.5 bg-sunken">
        <div
          data-countdown=""
          className="h-full origin-left bg-primary"
          style={{
            animation: `response-countdown ${AUTO_CLOSE_MS}ms linear forwards`,
            animationPlayState: held > 0 ? "paused" : "running",
          }}
          onAnimationEnd={onClose}
        />
      </div>
    </div>
  );
}
