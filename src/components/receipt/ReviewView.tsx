"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skull } from "lucide-react";
import { previewVerdict, scoreSubscription } from "@/app/(app)/review/actions";
import { scoreBand } from "@/lib/ai/score";
import type { AiVerdict } from "@/lib/ai/verdict";
import { createClient } from "@/lib/supabase/client";
import { NotAuthenticatedError, createSubscription } from "@/lib/subscriptions/repository";
import { fromStoredSubscription, toMonthly, type Frequency } from "./data";
import { ScoreBadge } from "./ScoreBadge";
import { useSubscriptions } from "./SubscriptionState";
import { BLOOD, CHART, INK, PAPER, ROUTES, WHITE } from "./palette";
import { Card, NeoButton, Rule } from "./ui";

const MOCK_EXTRACTED_FIELDS = {
  name: "Netflix",
  cost: "15.99",
  frequency: "monthly" as Frequency,
  feeling: "Kind of guilty. I keep it in case a good show comes out.",
};

export type ConfessionFields = {
  name: string;
  cost: string;
  frequency: Frequency;
  feeling: string;
};

function isFrequency(value: string | undefined): value is Frequency {
  return value === "weekly" || value === "monthly" || value === "yearly";
}

/** Uses a passed confession when one exists. Missing pieces stay on the sample. */
function confessionFields(initial?: Partial<ConfessionFields>): ConfessionFields {
  return {
    name: initial?.name ?? MOCK_EXTRACTED_FIELDS.name,
    cost: initial?.cost ?? MOCK_EXTRACTED_FIELDS.cost,
    frequency: isFrequency(initial?.frequency) ? initial.frequency : MOCK_EXTRACTED_FIELDS.frequency,
    feeling: initial?.feeling ?? MOCK_EXTRACTED_FIELDS.feeling,
  };
}

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/** Wait for typing to pause before asking the server to re-score. */
const PREVIEW_DELAY_MS = 300;

type Preview =
  | { status: "loading" }
  | { status: "ready"; verdict: AiVerdict; isMock: boolean }
  | { status: "unavailable" };

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-bold" style={{ color: BLOOD }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ReviewView({ initialFields }: { initialFields?: Partial<ConfessionFields> }) {
  const router = useRouter();
  const { setSubscriptions } = useSubscriptions();
  const [draft, setDraft] = useState(() => confessionFields(initialFields));
  const [preview, setPreview] = useState<Preview>({ status: "loading" });
  const previewRequest = useRef(0);
  // Set once the row is filed, so a retry after a scoring failure never files a second row.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; cost?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Client navigations keep this screen mounted while it is hidden. This
  // generation changes when it is shown or hidden, so a submit started on a
  // previous visit cannot leave the button disabled.
  const shownGeneration = useRef(0);

  useLayoutEffect(() => {
    const generation = ++shownGeneration.current;
    setSaving(false);
    setSavedId(null);
    setSaveError(null);
    return () => {
      if (shownGeneration.current === generation) shownGeneration.current += 1;
    };
  }, []);

  // The score is read-only: it is always computed by the server from the fields, never typed in.
  useEffect(() => {
    const request = ++previewRequest.current;
    const timer = setTimeout(async () => {
      const cost = parseFloat(draft.cost);
      let next: Preview = { status: "unavailable" };
      try {
        const result = await previewVerdict({
          name: draft.name.trim(),
          cost: Number.isFinite(cost) ? cost : 0,
          frequency: draft.frequency,
          feeling: draft.feeling.trim(),
        });
        if (result.ok) next = { status: "ready", verdict: result.verdict, isMock: result.isMock };
      } catch {
        // A dropped request leaves the verdict unavailable, never stale.
      }
      if (request === previewRequest.current) setPreview(next);
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft.name, draft.cost, draft.frequency, draft.feeling]);

  const update = (key: keyof typeof draft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key as "name" | "cost"]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: { name?: string; cost?: string } = {};
    const cost = parseFloat(draft.cost);
    if (!draft.name.trim()) next.name = "Name the subscription so you know what you're killing.";
    if (!Number.isFinite(cost) || cost <= 0) next.cost = "Enter a price above $0, like 15.99.";
    return next;
  };

  const submitToGraveyard = async () => {
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    if (saving) return;

    const generation = shownGeneration.current;
    setSaving(true);
    setSaveError(null);

    const name = draft.name.trim();
    const cost = Math.round(parseFloat(draft.cost) * 100) / 100;
    const feeling = draft.feeling.trim();

    let id = savedId;
    if (!id) {
      try {
        const saved = await createSubscription(createClient(), {
          name,
          cost,
          frequency: draft.frequency,
          feeling,
        });
        if (shownGeneration.current !== generation) return;
        id = saved.id;
        setSavedId(id);
      } catch (error) {
        if (shownGeneration.current !== generation) return;
        setSaving(false);
        if (error instanceof NotAuthenticatedError) {
          setSaveError(error.message);
        } else {
          console.error(error);
          const detail = error instanceof Error ? error.message : "";
          setSaveError(
            process.env.NODE_ENV === "development" && detail
              ? detail
              : "Could not file this subscription. Try again.",
          );
        }
        return;
      }
    }

    // The server scores the stored row and saves the verdict; only the row id is sent.
    const scored = await scoreSubscription(id);
    if (shownGeneration.current !== generation) return;
    const entry = scored.ok && scored.subscription.aiScore !== null ? fromStoredSubscription(scored.subscription) : null;
    if (!entry) {
      setSaving(false);
      setSaveError("Filed, but the verdict couldn't be recorded. Try again.");
      return;
    }

    setSaving(false);
    setSubscriptions((prev) => [...prev, entry]);
    router.push(ROUTES.graveyard);
  };

  return (
    <Card>
      <h2 className="text-3xl font-bold leading-tight mb-2">Check the paperwork.</h2>
      <p className="mb-6">Here&apos;s what we heard. Fix anything that&apos;s wrong, then file it.</p>

      <div className="border-4 border-black rounded-2xl p-4 mb-6" style={{ background: PAPER }}>
        <div className="flex flex-col gap-1 font-bold text-lg sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span className="min-w-0 break-words">{draft.name || "Unnamed"}</span>
          <span className="shrink-0">${parseFloat(draft.cost) > 0 ? parseFloat(draft.cost).toFixed(2) : "0.00"}</span>
        </div>
        <div className="mt-1 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
          <span>Billed {draft.frequency}</span>
          <span className="break-words">≈ ${(toMonthly(parseFloat(draft.cost) || 0, draft.frequency) * 12).toFixed(2)} / year</span>
        </div>
      </div>

      {/* Locked once the row is filed: a retry re-scores that stored row, so later edits would be lost. */}
      <fieldset disabled={!!savedId} className="flex flex-col gap-6 border-0 p-0 m-0 min-w-0">
        <Field id="sub-name" label="Subscription" error={errors.name}>
          <input
            id="sub-name"
            className="neo-input"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Netflix"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "sub-name-error" : undefined}
            aria-label="Subscription"
          />
        </Field>

        <Field id="sub-cost" label="Cost ($)" error={errors.cost}>
          <input
            id="sub-cost"
            className="neo-input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={draft.cost}
            onChange={(e) => update("cost", e.target.value)}
            placeholder="15.99"
            aria-invalid={!!errors.cost}
            aria-describedby={errors.cost ? "sub-cost-error" : undefined}
            aria-label="Cost ($)"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span id="sub-freq-label" className="font-bold">
            Billed
          </span>
          <div className="grid min-w-0 grid-cols-1 gap-3 pr-2 pb-2 sm:grid-cols-3" role="group" aria-labelledby="sub-freq-label">
            {FREQUENCIES.map((f) => {
              const on = draft.frequency === f.id;
              return (
                <NeoButton
                  key={f.id}
                  onClick={() => update("frequency", f.id)}
                  aria-pressed={on}
                  aria-label={f.label}
                  className="min-h-11 w-full min-w-0 py-2 px-2"
                  style={{
                    background: on ? CHART : WHITE,
                    color: INK,
                    ...(on ? { transform: "translate(6px, 6px)", boxShadow: "none" } : {}),
                  }}
                >
                  {f.label}
                </NeoButton>
              );
            })}
          </div>
        </div>

        <Field id="sub-feeling" label="How you feel about it">
          <textarea
            id="sub-feeling"
            className="neo-input resize-none"
            style={{ fontWeight: 400, fontSize: "1rem" }}
            rows={3}
            value={draft.feeling}
            onChange={(e) => update("feeling", e.target.value)}
            placeholder="e.g. I forget I even have it."
            aria-label="How you feel about it"
          />
        </Field>
      </fieldset>

      <Rule />

      <section aria-labelledby="ai-verdict-heading" className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="ai-verdict-heading" className="text-xl font-bold leading-tight">
            The AI&apos;s verdict
          </h3>
          {preview.status === "ready" && (
            <div className="flex flex-wrap items-center gap-3">
              <ScoreBadge score={preview.verdict.aiScore} />
              <span className="text-lg font-bold leading-none">
                {scoreBand(preview.verdict.aiScore).label}
              </span>
            </div>
          )}
        </div>

        {preview.status === "ready" ? (
          <>
            <p className="border-4 border-black rounded-2xl p-4 italic" style={{ background: PAPER }}>
              “{preview.verdict.verdict}”
            </p>
            {preview.isMock && (
              <p className="text-sm">Demo scoring: built-in rules, not an AI model. The score is set when you file.</p>
            )}
          </>
        ) : (
          <p className="border-4 border-black rounded-2xl p-4" style={{ background: PAPER }} role="status">
            {preview.status === "loading"
              ? "Scoring…"
              : "The verdict isn't ready. Check the fields above, then try again."}
          </p>
        )}
      </section>

      <Rule />

      <div className="pr-2 pb-2">
        <NeoButton
          onClick={submitToGraveyard}
          disabled={saving}
          aria-label="Submit to Graveyard"
          className="flex min-h-11 w-full flex-wrap items-center justify-center gap-3 py-5 text-center text-xl sm:text-2xl"
          style={{ background: INK, color: WHITE, opacity: saving ? 0.5 : 1 }}
        >
          <Skull size={28} strokeWidth={2.5} aria-hidden="true" />
          <span>Submit to Graveyard</span>
        </NeoButton>
        {saveError && (
          <p className="mt-3 text-sm font-bold text-center" style={{ color: BLOOD }} role="alert">
            {saveError}
          </p>
        )}
      </div>
    </Card>
  );
}
