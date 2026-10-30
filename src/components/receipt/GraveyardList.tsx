"use client";

import { Trash2 } from "lucide-react";
import { money, toMonthly, type Subscription } from "./data";
import { BLOOD, CHART, INK, MINT, PAPER, WHITE } from "./palette";

const yearly = (s: Subscription) => toMonthly(s.cost, s.frequency) * 12;

const scoreBand = (score: number) => {
  if (score < 30) return { label: "Kill it", background: BLOOD, color: WHITE };
  if (score < 70) return { label: "Think hard", background: CHART, color: INK };
  return { label: "Keep it", background: MINT, color: INK };
};

function KillCheckbox({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: () => void; label: string }) {
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

function GraveCard({ sub, onToggle, onDelete }: { sub: Subscription; onToggle: () => void; onDelete: () => void }) {
  const band = scoreBand(sub.aiScore);
  const checkboxId = `kill-${sub.id}`;

  return (
    <li className="relative border-4 border-black rounded-2xl p-4 neo-shadow-sm overflow-hidden" style={{ background: sub.killed ? PAPER : WHITE }}>
      <div className="flex items-start gap-4">
        <KillCheckbox id={checkboxId} checked={sub.killed} onChange={onToggle} label={`Cancel ${sub.name}`} />

        <label htmlFor={checkboxId} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-bold leading-tight"
              style={{ textDecorationLine: sub.killed ? "line-through" : "none", textDecorationThickness: 3 }}
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
            {money(sub.cost)}/{{ weekly: "wk", monthly: "mo", yearly: "yr" }[sub.frequency]} · {money(yearly(sub))} a year
          </div>

          {sub.verdict && <p className="mt-2 text-sm italic">“{sub.verdict}”</p>}
        </label>

        <button type="button" onClick={onDelete} className="neo-del shrink-0" aria-label={`Delete ${sub.name} from the list`} title="Delete from list">
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

export function GraveyardList({
  subscriptions,
  onToggle,
  onDelete,
}: {
  subscriptions: Subscription[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (subscriptions.length === 0) {
    return <p className="border-4 border-black rounded-2xl p-4">Nothing buried yet. Record a subscription on the Confess page.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {subscriptions.map((s) => (
        <GraveCard key={s.id} sub={s} onToggle={() => onToggle(s.id)} onDelete={() => onDelete(s.id)} />
      ))}
    </ul>
  );
}
