import { useState, useEffect, useRef, forwardRef } from "react";
import { Mic, PencilLine, Skull, Loader2, Square, X, Camera, Trash2, LogIn, LogOut } from "lucide-react";

/* ---------------------------------------------------------------
   Design tokens — white receipt + neon stickers
---------------------------------------------------------------- */
const INK = "#000000";
const PAPER = "#F4F4F0";  // page background: the receipt paper
const WHITE = "#FFFFFF";  // receipt shell, cards, inputs
const BLOOD = "#FF0000";
/* Sticker accents — ONLY on: the savings card, active buttons/tabs, score badges */
const MINT = "#8CEDB0";
const CHART = "#E2FB72";
const MONO = "'Space Mono', 'JetBrains Mono', 'Courier New', monospace";

/*
  Hard shadows + pressed states.
  The chat preview runs Tailwind without a compiler, so arbitrary classes like
  shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] and active:translate-x-1 don't exist there.
  These utility classes reproduce them exactly. In a compiled Tailwind project you
  can swap each one for the arbitrary-value equivalent noted beside it.
*/
const NEO_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

  /* shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] */
  .neo-shadow-lg { box-shadow: 10px 10px 0 0 ${INK}; }
  /* shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] */
  .neo-shadow    { box-shadow: 6px 6px 0 0 ${INK}; }
  /* shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] */
  .neo-shadow-sm { box-shadow: 4px 4px 0 0 ${INK}; }

  /* Buttons: pop out at rest, press down on hover/click */
  .neo-btn {
    box-shadow: 6px 6px 0 0 ${INK};
    transition: transform 80ms ease-out, box-shadow 80ms ease-out;
    cursor: pointer;
  }
  .neo-btn:hover {
    transform: translate(2px, 2px);          /* hover:translate-x-0.5 hover:translate-y-0.5 */
    box-shadow: 4px 4px 0 0 ${INK};          /* hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] */
  }
  .neo-btn:active,
  .neo-btn[aria-current="page"] {
    transform: translate(6px, 6px);          /* active:translate-x-1.5 active:translate-y-1.5 */
    box-shadow: 0 0 0 0 ${INK};              /* active:shadow-none */
  }
  .neo-btn:focus-visible { outline: 4px solid ${INK}; outline-offset: 4px; }

  /* Delete: small round button, off-white at rest, harsh red when you mean it */
  .neo-del {
    display: flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem;
    border: 4px solid ${INK};
    border-radius: 9999px;
    background: ${WHITE};
    color: ${INK};
    box-shadow: 3px 3px 0 0 ${INK};
    transition: transform 80ms ease-out, box-shadow 80ms ease-out, background 80ms ease-out;
    cursor: pointer;
  }
  .neo-del:hover { background: ${BLOOD}; color: ${WHITE}; transform: translate(1px, 1px); box-shadow: 2px 2px 0 0 ${INK}; }
  .neo-del:active { transform: translate(3px, 3px); box-shadow: 0 0 0 0 ${INK}; }
  .neo-del:focus-visible { outline: 4px solid ${INK}; outline-offset: 3px; }

  /* A busy button stays pressed and stops reacting to hover */
  .neo-btn:disabled,
  .neo-btn:disabled:hover {
    transform: translate(6px, 6px);
    box-shadow: 0 0 0 0 ${INK};
    cursor: default;
  }

  /* Recording: a hard black ring pulses outward from the mic */
  @keyframes neo-pulse {
    0%   { transform: scale(1);    opacity: 1; }
    100% { transform: scale(1.35); opacity: 0; }
  }
  .neo-pulse-ring {
    position: absolute; inset: 0;
    border: 4px solid ${INK};
    border-radius: 9999px;
    animation: neo-pulse 1s ease-out infinite;
    pointer-events: none;
  }

  @keyframes neo-spin { to { transform: rotate(360deg); } }
  .neo-spin { animation: neo-spin 0.9s linear infinite; }

  /* Text link: plain underline, thickens on hover */
  .neo-link { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; }
  .neo-link:hover { text-decoration-thickness: 4px; }
  .neo-link:focus-visible { outline: 4px solid ${INK}; outline-offset: 4px; border-radius: 9999px; }

  /* Form fields: thick ink, focus thickens the shadow instead of glowing */
  .neo-input {
    width: 100%;
    border: 4px solid ${INK};
    border-radius: 1rem;
    background: #FFFFFF;
    color: ${INK};
    font-family: inherit;
    font-size: 1.125rem;
    font-weight: 700;
    padding: 0.75rem 1rem;
    box-shadow: 4px 4px 0 0 ${INK};
  }
  .neo-input:focus { outline: none; box-shadow: 6px 6px 0 0 ${INK}; background: ${PAPER}; }
  .neo-input[aria-invalid="true"] { border-color: ${BLOOD}; box-shadow: 4px 4px 0 0 ${BLOOD}; }
  .neo-input::placeholder { color: #00000066; font-weight: 400; }


  @media (prefers-reduced-motion: reduce) {
    .neo-btn, .neo-del { transition: none; }
    .neo-pulse-ring { animation: none; opacity: 1; transform: scale(1.12); }
    .neo-spin { animation: none; }
  }
`;

/* ---------------------------------------------------------------
   Pages
---------------------------------------------------------------- */
const PAGES = {
  INPUT: "Page1_Input",
  EDIT: "Page2_Edit",
  GRAVEYARD: "Page3_Graveyard",
};

const NAV_ITEMS = [
  { id: PAGES.INPUT, label: "Confess", icon: Mic },
  { id: PAGES.EDIT, label: "Review", icon: PencilLine },
  { id: PAGES.GRAVEYARD, label: "Graveyard", icon: Skull },
];

/* ---------------------------------------------------------------
   Mock data — frequency = billing cycle
---------------------------------------------------------------- */
/*
  killed = checked in the What-If Simulator. It starts true for anything the AI
  scores below 30, so the Graveyard opens with the obvious cuts already made.
*/
const INITIAL_SUBSCRIPTIONS = [
  {
    id: "sub_001",
    name: "Spotify Premium",
    cost: 11.99,
    frequency: "monthly",
    aiScore: 82,
    verdict: "Daily use, four hours a day. This one earns its keep.",
    killed: false,
  },
  {
    id: "sub_002",
    name: "Iron Temple Gym",
    cost: 54.0,
    frequency: "monthly",
    aiScore: 18,
    verdict: "Two visits since January. You are paying $27 per workout.",
    killed: true,
  },
  {
    id: "sub_003",
    name: "Adobe Creative Cloud",
    cost: 659.88,
    frequency: "yearly",
    aiScore: 41,
    verdict: "You open Photoshop to crop screenshots. Your phone does that for free.",
    killed: false,
  },
];

const toMonthly = (cost, frequency) => {
  if (frequency === "yearly") return cost / 12;
  if (frequency === "weekly") return (cost * 52) / 12;
  return cost;
};

const money = (n) => `$${n.toFixed(2)}`;

/* ---------------------------------------------------------------
   Shared pieces
---------------------------------------------------------------- */
function Rule() {
  return (
    <div className="my-5 overflow-hidden whitespace-nowrap select-none" aria-hidden="true">
      {"- ".repeat(80)}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`border-4 border-black rounded-3xl p-5 neo-shadow ${className}`}
      style={{ background: WHITE }}
    >
      {children}
    </section>
  );
}

const NeoButton = forwardRef(function NeoButton({ children, className = "", style, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`neo-btn border-4 border-black rounded-full font-bold ${className}`}
      style={{ background: WHITE, color: INK, ...style }}
      {...props}
    >
      {children}
    </button>
  );
});

/* ---------------------------------------------------------------
   Page placeholders
---------------------------------------------------------------- */
/* Voice input state machine: ready → recording (2s) → processing (2s) → Page2_Edit */
const MIC_STATUS = {
  READY: "ready",
  RECORDING: "recording",
  PROCESSING: "processing",
};

const RECORDING_MS = 2000;
const PROCESSING_MS = 2000;

const MIC_COPY = {
  [MIC_STATUS.READY]: {
    status: "Ready",
    hint: "Tap the mic. Say the name, the price, how often you actually use it, and how you feel about it.",
    aria: "Start voice input",
  },
  [MIC_STATUS.RECORDING]: {
    status: "Recording…",
    hint: "Keep talking. Be honest about the gym.",
    aria: "Recording",
  },
  [MIC_STATUS.PROCESSING]: {
    status: "Processing…",
    hint: "Turning your excuses into numbers.",
    aria: "Processing",
  },
};

function Page1Input({ setCurrentPage }) {
  const [micStatus, setMicStatus] = useState(MIC_STATUS.READY);
  const timers = useRef([]);

  // Clear pending timeouts if the user leaves the page mid-sequence
  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const startVoiceInput = () => {
    if (micStatus !== MIC_STATUS.READY) return;

    setMicStatus(MIC_STATUS.RECORDING);

    timers.current.push(
      setTimeout(() => {
        setMicStatus(MIC_STATUS.PROCESSING);

        timers.current.push(
          setTimeout(() => {
            setCurrentPage(PAGES.EDIT);
          }, PROCESSING_MS)
        );
      }, RECORDING_MS)
    );
  };

  const busy = micStatus !== MIC_STATUS.READY;
  const copy = MIC_COPY[micStatus];

  // Each state gets its own fill so it reads at a glance
  const micFill = {
    [MIC_STATUS.READY]: { background: CHART, color: INK },
    [MIC_STATUS.RECORDING]: { background: INK, color: WHITE },
    [MIC_STATUS.PROCESSING]: { background: WHITE, color: INK },
  }[micStatus];

  return (
    <Card className="flex flex-col items-center text-center py-10">
      <h2 className="text-3xl font-bold leading-tight mb-2">Say what you pay for.</h2>
      <p className="max-w-sm mb-10">{copy.hint}</p>

      {/* Giant mic */}
      <div className="relative pr-2 pb-2">
        {micStatus === MIC_STATUS.RECORDING && (
          <span className="neo-pulse-ring" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={startVoiceInput}
          disabled={busy}
          aria-label={copy.aria}
          className="neo-btn relative flex items-center justify-center w-48 h-48 border-4 border-black rounded-full"
          style={{ ...micFill, borderWidth: 6 }}
        >
          {micStatus === MIC_STATUS.READY && <Mic size={88} strokeWidth={2.25} />}
          {micStatus === MIC_STATUS.RECORDING && <Square size={64} strokeWidth={0} fill={WHITE} />}
          {micStatus === MIC_STATUS.PROCESSING && (
            <Loader2 size={80} strokeWidth={2.5} className="neo-spin" />
          )}
        </button>
      </div>

      {/* Status readout — announced to screen readers as it changes */}
      <p
        className="mt-8 border-4 border-black rounded-full px-6 py-2 text-xl font-bold"
        style={{ background: busy ? INK : WHITE, color: busy ? WHITE : INK }}
        role="status"
        aria-live="polite"
      >
        {copy.status}
      </p>

      {/* Escape hatch */}
      <button
        type="button"
        onClick={() => setCurrentPage(PAGES.EDIT)}
        disabled={busy}
        className="neo-link mt-8 text-sm"
        style={{ opacity: busy ? 0.4 : 1, cursor: busy ? "default" : "pointer" }}
      >
        (skip option to text)
      </button>
    </Card>
  );
}

/* What the "AI" pulled out of the voice note — editable before filing */
/* What we heard — the user can correct these */
const MOCK_EXTRACTED_FIELDS = {
  name: "Netflix",
  cost: "15.99",
  frequency: "monthly",
  feeling: "Kind of guilty. I keep it in case a good show comes out.",
};

/* What the AI decided — read-only. Frozen so nothing can mutate it. */
const MOCK_AI_RESULT = Object.freeze({
  aiScore: 20,
  verdict: "You rewatched one sitcom twice. That's $192 a year for comfort noise.",
});

const FREQUENCIES = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

// US 2 colour bands: 0–30 kill, 30–70 think, 70–100 keep
const scoreBand = (score) => {
  if (score < 30) return { label: "Kill it", background: BLOOD, color: WHITE };
  if (score < 70) return { label: "Think hard", background: CHART, color: INK };
  return { label: "Keep it", background: MINT, color: INK };
};

function Field({ id, label, error, children }) {
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

function Page2Edit({ setSubscriptions, setCurrentPage }) {
  const [draft, setDraft] = useState(MOCK_EXTRACTED_FIELDS);
  const ai = MOCK_AI_RESULT;
  const [errors, setErrors] = useState({});

  const update = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
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
    };
    entry.killed = entry.aiScore < 30;

    // Functional update so we never append to a stale array
    setSubscriptions((prev) => [...prev, entry]);
    setCurrentPage(PAGES.GRAVEYARD);
  };

  const band = scoreBand(ai.aiScore);

  return (
    <Card>
      <h2 className="text-3xl font-bold leading-tight mb-2">Check the paperwork.</h2>
      <p className="mb-6">Here's what we heard. Fix anything that's wrong, then file it.</p>

      {/* Receipt-style summary strip */}
      <div className="border-4 border-black rounded-2xl p-4 mb-6" style={{ background: PAPER }}>
        <div className="flex justify-between gap-4 font-bold text-lg">
          <span className="truncate">{draft.name || "Unnamed"}</span>
          <span>${parseFloat(draft.cost) > 0 ? parseFloat(draft.cost).toFixed(2) : "0.00"}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4 text-sm">
          <span>Billed {draft.frequency}</span>
          <span>
            ≈ ${(toMonthly(parseFloat(draft.cost) || 0, draft.frequency) * 12).toFixed(2)} / year
          </span>
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
          />
        </Field>

        {/* Frequency as pills instead of a dropdown */}
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
          />
        </Field>
      </div>

      <Rule />

      {/* AI verdict — read-only, nothing here is an input */}
      {/* One gap value spaces all three rows, so the rhythm stays even */}
      <section aria-labelledby="ai-verdict-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 id="ai-verdict-heading" className="text-xl font-bold leading-tight">
            The AI's verdict
          </h3>
          {/* Score pill + short verdict, right-aligned in the header row */}
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
          className="w-full flex items-center justify-center gap-3 py-5 text-2xl"
          style={{ background: INK, color: WHITE }}
        >
          <Skull size={28} strokeWidth={2.5} />
          <span>Submit to Graveyard</span>
        </NeoButton>
      </div>
    </Card>
  );
}

/* What-If Simulator: flip a subscription's killed flag in the array */
const yearly = (s) => toMonthly(s.cost, s.frequency) * 12;

function KillCheckbox({ id, checked, onChange, label }) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="shrink-0 w-8 h-8 cursor-pointer"
      style={{ accentColor: INK }}
    />
  );
}

function GraveCard({ sub, onToggle, onDelete }) {
  const band = scoreBand(sub.aiScore);
  const checkboxId = `kill-${sub.id}`;

  return (
    <li
      className="relative border-4 border-black rounded-2xl p-4 neo-shadow-sm overflow-hidden"
      style={{ background: sub.killed ? PAPER : WHITE }}
    >
      <div className="flex items-start gap-4">
        <KillCheckbox
          id={checkboxId}
          checked={sub.killed}
          onChange={onToggle}
          label={`Cancel ${sub.name}`}
        />

        <label htmlFor={checkboxId} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-bold leading-tight"
              style={{ textDecoration: sub.killed ? "line-through" : "none", textDecorationThickness: 3 }}
            >
              {sub.name}
            </span>
            <span
              className="shrink-0 border-2 border-black rounded-full px-3 py-1 font-bold leading-none"
              style={{ background: band.background, color: band.color }}
              title={band.label}
            >
              {sub.aiScore}
            </span>
          </div>

          <div className="mt-1 text-sm">
            {money(sub.cost)}/{{ weekly: "wk", monthly: "mo", yearly: "yr" }[sub.frequency]} ·{" "}
            {money(yearly(sub))} a year
          </div>

          {sub.verdict && <p className="mt-2 text-sm italic">“{sub.verdict}”</p>}
        </label>

        {/* Delete is outside the label, so clicking it never toggles the checkbox */}
        <button
          type="button"
          onClick={onDelete}
          className="neo-del shrink-0"
          aria-label={`Delete ${sub.name} from the list`}
          title="Delete from list"
        >
          <Trash2 size={18} strokeWidth={2.75} aria-hidden="true" />
        </button>
      </div>

      {sub.killed && (
        <span
          className="absolute right-3 bottom-3 px-3 py-1 text-base font-bold leading-none rounded-lg pointer-events-none"
          style={{
            color: BLOOD,
            background: WHITE,
            border: `4px solid ${BLOOD}`,
            boxShadow: `3px 3px 0 0 ${INK}`,
            transform: "rotate(-12deg)",
            letterSpacing: "0.04em",
          }}
          aria-hidden="true"
        >
          CANCELLED
        </span>
      )}
    </li>
  );
}

function Page3Graveyard({ subscriptions, setSubscriptions }) {
  const [posterOpen, setPosterOpen] = useState(false);

  // Instant, frontend-only recalculation on every toggle or delete
  const totalYearly = subscriptions.reduce((sum, s) => sum + yearly(s), 0);
  const savedYearly = subscriptions.filter((s) => s.killed).reduce((sum, s) => sum + yearly(s), 0);
  const stillBleeding = totalYearly - savedYearly;
  const killedCount = subscriptions.filter((s) => s.killed).length;

  // Lowest score first: the most urgent cancellations sit at the top
  const sorted = [...subscriptions].sort((a, b) => a.aiScore - b.aiScore);

  const toggleKill = (id) =>
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, killed: !s.killed } : s)));

  // Delete ≠ cancel: the item leaves the array entirely. If it was checked, its
  // amount drops out of savedYearly too, because every total is derived from this array.
  const deleteSub = (id) => setSubscriptions((prev) => prev.filter((s) => s.id !== id));

  const setAll = (killed) => setSubscriptions((prev) => prev.map((s) => ({ ...s, killed })));

  return (
    <div className="flex flex-col gap-6">
      {/* Top: the simulator total */}
      <section
        className="border-4 border-black rounded-3xl p-6 neo-shadow"
        style={{ background: CHART }}
        aria-live="polite"
      >
        <p className="text-lg font-bold">TOTAL MONEY SAVED:</p>
        <p className="text-6xl font-bold leading-none tracking-tighter break-words">
          {money(savedYearly)}
        </p>
        <p className="text-2xl font-bold">/Year</p>

        <div className="mt-5 border-t-4 border-black pt-3 flex flex-col gap-1">
          <div className="flex justify-between gap-4">
            <span>Monthly</span>
            <span className="font-bold">{money(savedYearly / 12)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Still bleeding</span>
            <span className="font-bold" style={{ color: BLOOD }}>
              −{money(stillBleeding)}/yr
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Before the cull</span>
            <span className="font-bold">{money(totalYearly)}/yr</span>
          </div>
        </div>
      </section>

      {/* Middle: the graveyard */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">The graveyard</h2>
          <div className="flex gap-3 pr-2 pb-2">
            <NeoButton className="px-4 py-1 text-sm" onClick={() => setAll(true)}>
              Kill all
            </NeoButton>
            <NeoButton className="px-4 py-1 text-sm" onClick={() => setAll(false)}>
              Spare all
            </NeoButton>
          </div>
        </div>
        <p className="text-sm mb-4">Check a subscription to cancel it. Worst scores first.</p>

        {sorted.length === 0 ? (
          <p className="border-4 border-black rounded-2xl p-4">
            Nothing buried yet. Record a subscription on the Confess page.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {sorted.map((s) => (
              <GraveCard
                key={s.id}
                sub={s}
                onToggle={() => toggleKill(s.id)}
                onDelete={() => deleteSub(s.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Bottom: poster */}
      <div className="pr-2 pb-2">
        <NeoButton
          onClick={() => setPosterOpen(true)}
          disabled={killedCount === 0}
          className="w-full flex items-center justify-center gap-3 py-5 text-2xl"
          style={{ background: INK, color: WHITE, opacity: killedCount === 0 ? 0.5 : 1 }}
        >
          <Skull size={28} strokeWidth={2.5} />
          <span>GENERATE MY POSTER</span>
        </NeoButton>
        {killedCount === 0 && (
          <p className="mt-3 text-sm text-center">Check at least one subscription to make a poster.</p>
        )}
      </div>

      {posterOpen && (
        <PosterModal
          killed={sorted.filter((s) => s.killed)}
          savedYearly={savedYearly}
          onClose={() => setPosterOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Poster modal — pure HTML/CSS, made to be screenshotted
---------------------------------------------------------------- */
function PosterModal({ killed, savedYearly, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto px-4 py-6"
      style={{ background: PAPER, fontFamily: MONO, color: INK }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="poster-title"
    >
      <div className="max-w-md mx-auto flex flex-col items-center gap-5">
        <div className="w-full flex justify-end pr-2 pb-2">
          <NeoButton ref={closeRef} onClick={onClose} className="flex items-center gap-2 px-5 py-2">
            <X size={20} strokeWidth={3} />
            <span>Close</span>
          </NeoButton>
        </div>

        {/* The poster */}
        <article
          className="relative w-full border-4 border-black rounded-3xl p-6 neo-shadow-lg overflow-hidden"
          style={{ background: "#FFFFFF" }}
        >
          <header className="text-center">
            <p className="text-sm">Office of the Subscription Coroner</p>
            <h3 id="poster-title" className="text-3xl font-bold leading-tight mt-1">
              Certificate of Death
            </h3>
            <p className="text-sm mt-1">Filed {today}</p>
          </header>

          <Rule />

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Deceased</dt>
              <dd className="font-bold">
                {killed.length} subscription{killed.length === 1 ? "" : "s"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Cause of death</dt>
              <dd className="font-bold">Chronic neglect</dd>
            </div>
          </dl>

          <Rule />

          <ul className="flex flex-col gap-2">
            {killed.map((s) => (
              <li key={s.id} className="flex justify-between gap-4">
                <span className="truncate">{s.name}</span>
                <span className="font-bold shrink-0">{money(yearly(s))}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t-4 border-black pt-4">
            <p className="text-sm font-bold">Reclaimed per year</p>
            <p className="text-5xl font-bold leading-none tracking-tighter break-words">{money(savedYearly)}</p>
            <p className="mt-1 text-sm">That's {money(savedYearly / 12)} back every month.</p>
          </div>

          <Rule />

          <p className="text-center text-sm">No refunds. No resurrections.</p>

          {/* The stamp */}
          <div
            className="absolute pointer-events-none select-none"
            style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%) rotate(-15deg)" }}
            aria-hidden="true"
          >
            <div
              className="px-4 py-2 text-center font-bold leading-none whitespace-nowrap"
              style={{
                border: `8px solid ${BLOOD}`,
                outline: `3px solid ${BLOOD}`,
                outlineOffset: 4,
                borderRadius: "1rem",
                color: BLOOD,
                fontSize: "3.25rem",
                letterSpacing: "-0.04em",
                opacity: 0.88,
                mixBlendMode: "multiply",
              }}
            >
              REST IN
              <br />
              PEACE
            </div>
          </div>
        </article>

        <p className="flex items-center gap-2 text-xl font-bold text-center">
          <Camera size={24} strokeWidth={2.5} />
          Screenshot to flex your savings!
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Dashboard — Confess / Review / Graveyard
---------------------------------------------------------------- */
function Dashboard({ onLogout }) {
  const [subscriptions, setSubscriptions] = useState(INITIAL_SUBSCRIPTIONS);
  const [currentPage, setCurrentPage] = useState(PAGES.INPUT);

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.INPUT:
        return (
          <Page1Input
            subscriptions={subscriptions}
            setSubscriptions={setSubscriptions}
            setCurrentPage={setCurrentPage}
          />
        );
      case PAGES.EDIT:
        return (
          <Page2Edit
            subscriptions={subscriptions}
            setSubscriptions={setSubscriptions}
            setCurrentPage={setCurrentPage}
          />
        );
      case PAGES.GRAVEYARD:
        return <Page3Graveyard subscriptions={subscriptions} setSubscriptions={setSubscriptions} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-10" style={{ background: PAPER, color: INK, fontFamily: MONO }}>
      {/* Log out: small text button above the receipt, top-right */}
      <div className="max-w-xl mx-auto flex justify-end mb-4">
        <button
          type="button"
          onClick={onLogout}
          className="neo-link flex items-center gap-2 text-sm font-bold"
          style={{ cursor: "pointer" }}
        >
          <LogOut size={16} strokeWidth={2.75} aria-hidden="true" />
          Log out
        </button>
      </div>

      <div
        className="max-w-xl mx-auto border-4 border-black rounded-3xl p-6 neo-shadow-lg"
        style={{ background: WHITE }}
      >
        {/* Receipt header */}
        <header className="text-center">
          <h1 className="text-5xl font-bold tracking-tighter">SubKiller</h1>
          <p className="mt-1">The Honest Sub — a receipt you didn't ask for</p>
          <p className="mt-2 text-sm">
            Txn #000{subscriptions.length} · {new Date().toLocaleDateString()}
          </p>
        </header>

        <Rule />

        {/* Navigation — separate pills so each can press down on its own */}
        <nav className="grid grid-cols-3 gap-3 pr-2 pb-2" aria-label="Pages">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <NeoButton
                key={id}
                onClick={() => setCurrentPage(id)}
                aria-current={active ? "page" : undefined}
                className="flex items-center justify-center gap-2 px-3 py-3"
                style={{ background: active ? MINT : WHITE, color: INK }}
              >
                <Icon size={18} strokeWidth={2.5} />
                <span>{label}</span>
              </NeoButton>
            );
          })}
        </nav>

        <Rule />

        <main className="pr-2 pb-2">{renderPage()}</main>

        <Rule />

        <footer className="text-center text-sm">
          <p>No refunds. No excuses.</p>
          <p className="mt-1">Thank you for bleeding with us.</p>
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   View 0 — Login (Google OAuth only)

   In production, onLogin becomes:
     () => supabase.auth.signInWithOAuth({ provider: "google" })
   and the view switches when Supabase reports a session
   (supabase.auth.onAuthStateChange), not on click.
---------------------------------------------------------------- */
function Login({ onLogin }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-12"
      style={{ background: PAPER, color: INK, fontFamily: MONO }}
    >
      <main className="w-full max-w-md flex flex-col gap-10">
        <header className="text-center">
          <h1
            className="font-bold uppercase leading-none tracking-tighter"
            style={{ fontSize: "clamp(3rem, 14vw, 5.5rem)" }}
          >
            SubKiller
          </h1>
          <p className="mt-3">The Honest Sub – a receipt you didn't ask for</p>
        </header>

        <section
          className="border-4 border-black rounded-3xl p-6 neo-shadow-lg"
          style={{ background: WHITE }}
          aria-labelledby="login-heading"
        >
          <p className="text-sm">Step 00 · Check-in</p>
          <h2 id="login-heading" className="mt-1 text-2xl font-bold uppercase leading-tight">
            Time to face the damage.
          </h2>

          <Rule />

          <div className="pr-2 pb-2">
            <button
              type="button"
              onClick={onLogin}
              className="neo-btn w-full flex items-center justify-center gap-3 border-4 border-black rounded-full px-6 py-5 text-xl font-bold uppercase"
              style={{ background: CHART, color: INK }}
            >
              <LogIn size={26} strokeWidth={2.75} aria-hidden="true" />
              <span>Log in with Google</span>
            </button>
          </div>

          <p className="mt-4 text-sm text-center">
            By logging in, you agree to face your financial reality.
          </p>
        </section>

        <footer className="text-center text-sm">
          <p>No refunds. No excuses.</p>
        </footer>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------
   Root — switches between Login and Dashboard
---------------------------------------------------------------- */
export default function SubKillerApp() {
  const [currentView, setCurrentView] = useState("login");

  // Start each view at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  return (
    <>
      <style>{NEO_STYLES}</style>
      {currentView === "login" ? (
        <Login onLogin={() => setCurrentView("dashboard")} />
      ) : (
        <Dashboard onLogout={() => setCurrentView("login")} />
      )}
    </>
  );
}
