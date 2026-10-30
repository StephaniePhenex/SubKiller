"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skull } from "lucide-react";
import { toMonthly, type Frequency } from "./data";
import { useSubscriptions } from "./SubscriptionState";
import { BLOOD, CHART, INK, MINT, PAPER, ROUTES, WHITE } from "./palette";
import { Card, NeoButton, Rule } from "./ui";

const MOCK_EXTRACTED_FIELDS = {
  name: "Netflix",
  cost: "15.99",
  frequency: "monthly" as Frequency,
  feeling: "Kind of guilty. I keep it in case a good show comes out.",
};

const MOCK_AI_RESULT = Object.freeze({
  aiScore: 20,
  verdict: "You rewatched one sitcom twice. That's $192 a year for comfort noise.",
});

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const scoreBand = (score: number) => {
  if (score < 30) return { label: "Kill it", background: BLOOD, color: WHITE };
  if (score < 70) return { label: "Think hard", background: CHART, color: INK };
  return { label: "Keep it", background: MINT, color: INK };
};

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

export function ReviewView() {
  const router = useRouter();
  const { setSubscriptions } = useSubscriptions();
  const [draft, setDraft] = useState(MOCK_EXTRACTED_FIELDS);
  const ai = MOCK_AI_RESULT;
  const [errors, setErrors] = useState<{ name?: string; cost?: string }>({});

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

  const submitToGraveyard = () => {
    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const entry = {
      id: `sub_${Date.now()}`,
      name: draft.name.trim(),
      cost: Math.round(parseFloat(draft.cost) * 100) / 100,
      frequency: draft.frequency,
      feeling: draft.feeling.trim(),
      aiScore: ai.aiScore,
      verdict: ai.verdict,
      killed: ai.aiScore < 30,
    };

    setSubscriptions((prev) => [...prev, entry]);
    router.push(ROUTES.graveyard);
  };

  const band = scoreBand(ai.aiScore);

  return (
    <Card>
      <h2 className="text-3xl font-bold leading-tight mb-2">Check the paperwork.</h2>
      <p className="mb-6">Here&apos;s what we heard. Fix anything that&apos;s wrong, then file it.</p>

      <div className="border-4 border-black rounded-2xl p-4 mb-6" style={{ background: PAPER }}>
        <div className="flex justify-between gap-4 font-bold text-lg">
          <span className="truncate">{draft.name || "Unnamed"}</span>
          <span>${parseFloat(draft.cost) > 0 ? parseFloat(draft.cost).toFixed(2) : "0.00"}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4 text-sm">
          <span>Billed {draft.frequency}</span>
          <span>≈ ${(toMonthly(parseFloat(draft.cost) || 0, draft.frequency) * 12).toFixed(2)} / year</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
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
          <div className="grid grid-cols-3 gap-3 pr-2 pb-2" role="group" aria-labelledby="sub-freq-label">
            {FREQUENCIES.map((f) => {
              const on = draft.frequency === f.id;
              return (
                <NeoButton
                  key={f.id}
                  onClick={() => update("frequency", f.id)}
                  aria-pressed={on}
                  aria-label={f.label}
                  className="py-2 px-2"
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
      </div>

      <Rule />

      <section aria-labelledby="ai-verdict-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 id="ai-verdict-heading" className="text-xl font-bold leading-tight">
            The AI&apos;s verdict
          </h3>
          <div className="flex items-center gap-3">
            <span
              className="shrink-0 border-4 border-black rounded-full px-3 py-1 text-lg font-bold leading-none"
              style={{
                background: band.background,
                color: band.color,
                boxShadow: `3px 3px 0 0 ${INK}`,
              }}
              role="img"
              aria-label={`Importance score ${ai.aiScore} out of 100`}
            >
              {ai.aiScore}
            </span>
            <span className="text-lg font-bold leading-none whitespace-nowrap">{band.label}</span>
          </div>
        </div>

        <p className="border-4 border-black rounded-2xl p-4 italic" style={{ background: PAPER }}>
          “{ai.verdict}”
        </p>
      </section>

      <Rule />

      <div className="pr-2 pb-2">
        <NeoButton
          onClick={submitToGraveyard}
          aria-label="Submit to Graveyard"
          className="w-full flex items-center justify-center gap-3 py-5 text-2xl"
          style={{ background: INK, color: WHITE }}
        >
          <Skull size={28} strokeWidth={2.5} aria-hidden="true" />
          <span>Submit to Graveyard</span>
        </NeoButton>
      </div>
    </Card>
  );
}
