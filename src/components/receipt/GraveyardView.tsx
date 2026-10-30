"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Skull, X } from "lucide-react";
import { INITIAL_SUBSCRIPTIONS, money, toMonthly, type Subscription } from "./data";
import { GraveyardList } from "./GraveyardList";
import { BLOOD, CHART, INK, MONO, PAPER, WHITE } from "./palette";
import { NeoButton, Rule } from "./ui";

const yearly = (s: Subscription) => toMonthly(s.cost, s.frequency) * 12;

function PosterModal({ killed, savedYearly, onClose }: { killed: Subscription[]; savedYearly: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
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
          <NeoButton ref={closeRef} onClick={onClose} aria-label="Close" className="flex items-center gap-2 px-5 py-2">
            <X size={20} strokeWidth={3} aria-hidden="true" />
            <span>Close</span>
          </NeoButton>
        </div>

        <article className="relative w-full border-4 border-black rounded-3xl p-6 neo-shadow-lg overflow-hidden" style={{ background: "#FFFFFF" }}>
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
            <p className="mt-1 text-sm">That&apos;s {money(savedYearly / 12)} back every month.</p>
          </div>

          <Rule />

          <p className="text-center text-sm">No refunds. No resurrections.</p>

          <div className="absolute pointer-events-none select-none" style={{ top: "38%", left: "50%", transform: "translate(-50%, -50%) rotate(-15deg)" }} aria-hidden="true">
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
          <Camera size={24} strokeWidth={2.5} aria-hidden="true" />
          Screenshot to flex your savings!
        </p>
      </div>
    </div>
  );
}

export function GraveyardView() {
  const [subscriptions, setSubscriptions] = useState(INITIAL_SUBSCRIPTIONS);
  const [posterOpen, setPosterOpen] = useState(false);

  const totalYearly = subscriptions.reduce((sum, s) => sum + yearly(s), 0);
  const savedYearly = subscriptions.filter((s) => s.killed).reduce((sum, s) => sum + yearly(s), 0);
  const stillBleeding = totalYearly - savedYearly;
  const killedCount = subscriptions.filter((s) => s.killed).length;
  const sorted = [...subscriptions].sort((a, b) => a.aiScore - b.aiScore);

  const toggleKill = (id: string) => setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, killed: !s.killed } : s)));
  const deleteSub = (id: string) => setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  const setAll = (killed: boolean) => setSubscriptions((prev) => prev.map((s) => ({ ...s, killed })));

  return (
    <div className="flex flex-col gap-6">
      <section className="border-4 border-black rounded-3xl p-6 neo-shadow" style={{ background: CHART }} aria-live="polite">
        <p className="text-lg font-bold">TOTAL MONEY BLED:</p>
        <p className="text-6xl font-bold leading-none tracking-tighter break-words">{money(savedYearly)}</p>
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

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">The graveyard</h2>
          <div className="flex gap-3 pr-2 pb-2">
            <NeoButton className="px-4 py-1 text-sm" onClick={() => setAll(true)} aria-label="Kill all">
              Kill all
            </NeoButton>
            <NeoButton className="px-4 py-1 text-sm" onClick={() => setAll(false)} aria-label="Spare all">
              Spare all
            </NeoButton>
          </div>
        </div>
        <p className="text-sm mb-4">Check a subscription to cancel it. Worst scores first.</p>

        <GraveyardList subscriptions={sorted} onToggle={toggleKill} onDelete={deleteSub} />
      </div>

      <div className="pr-2 pb-2">
        <NeoButton
          onClick={() => setPosterOpen(true)}
          disabled={killedCount === 0}
          aria-label="Generate my poster"
          className="w-full flex items-center justify-center gap-3 py-5 text-2xl"
          style={{ background: INK, color: WHITE, opacity: killedCount === 0 ? 0.5 : 1 }}
        >
          <Skull size={28} strokeWidth={2.5} aria-hidden="true" />
          <span>GENERATE MY POSTER</span>
        </NeoButton>
        {killedCount === 0 && <p className="mt-3 text-sm text-center">Check at least one subscription to make a poster.</p>}
      </div>

      {posterOpen && <PosterModal killed={sorted.filter((s) => s.killed)} savedYearly={savedYearly} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}
