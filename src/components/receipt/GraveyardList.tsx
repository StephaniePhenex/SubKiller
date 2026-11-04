"use client";

import Link from "next/link";
import { Mic, Trash2 } from "lucide-react";
import { money, toMonthly, type Subscription } from "./data";
import { BLOOD, INK, PAPER, ROUTES, WHITE } from "./palette";
import { ScoreBadge } from "./ScoreBadge";

const yearly = (s: Subscription) => toMonthly(s.cost, s.frequency) * 12;

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

function GraveCard({
  sub,
  deleting,
  onToggle,
  onDelete,
}: {
  sub: Subscription;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
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
            {sub.aiScore !== null ? (
              <ScoreBadge score={sub.aiScore} size="compact" />
            ) : (
              <span className="shrink-0 border-2 border-black rounded-full px-3 py-1 text-sm font-bold leading-none">
                Not scored yet
              </span>
            )}
          </div>

          <div className="mt-1 text-sm">
            {money(sub.cost)}/{{ weekly: "wk", monthly: "mo", yearly: "yr" }[sub.frequency]} · {money(yearly(sub))} a year
          </div>

          {sub.verdict && <p className="mt-2 text-sm italic">“{sub.verdict}”</p>}
        </label>

        {/* Delete is outside the label, so it never toggles the cancel checkbox. */}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="neo-del shrink-0"
          style={deleting ? { opacity: 0.5, cursor: "wait" } : undefined}
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

export function GraveyardList({
  subscriptions,
  deletingIds,
  onToggle,
  onDelete,
}: {
  subscriptions: Subscription[];
  /** Rows with a delete in flight; their delete button is disabled. */
  deletingIds?: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="border-4 border-black rounded-2xl p-4 flex flex-col gap-4">
        <p>Nothing buried yet. Record a subscription on the Confess page.</p>
        <div className="pr-2 pb-2">
          <Link
            href={ROUTES.confess}
            aria-label="Confess a subscription"
            className="neo-btn inline-flex items-center gap-2 border-4 border-black rounded-full font-bold px-5 py-2"
            style={{ background: WHITE, color: INK }}
          >
            <Mic size={18} strokeWidth={2.75} aria-hidden="true" />
            Confess a subscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {subscriptions.map((s) => (
        <GraveCard
          key={s.id}
          sub={s}
          deleting={deletingIds?.has(s.id) ?? false}
          onToggle={() => onToggle(s.id)}
          onDelete={() => onDelete(s.id)}
        />
      ))}
    </ul>
  );
}
