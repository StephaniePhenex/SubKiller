"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Mic, PencilLine, Skull } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INK, MINT, MONO, PAPER, ROUTES, WHITE } from "./palette";
import { SubscriptionProvider, useSubscriptions } from "./SubscriptionState";
import { NeoButton, Rule } from "./ui";

function emptySubscribe() {
  return () => {};
}

const NAV_ITEMS = [
  { href: ROUTES.confess, label: "Confess", icon: Mic },
  { href: ROUTES.review, label: "Review", icon: PencilLine },
  { href: ROUTES.graveyard, label: "Graveyard", icon: Skull },
];

export function ReceiptShell({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <ShellFrame>{children}</ShellFrame>
    </SubscriptionProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { subscriptions } = useSubscriptions();
  const today = useSyncExternalStore(
    emptySubscribe,
    () => new Date().toLocaleDateString(),
    () => "",
  );

  const onLogout = () => {
    const supabase = createClient();
    void supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip px-4 py-6 sm:py-10" style={{ background: PAPER, color: INK, fontFamily: MONO }}>
      <div className="max-w-xl mx-auto flex justify-end mb-4">
        <button
          type="button"
          onClick={onLogout}
          className="neo-link inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 text-sm font-bold"
          style={{ cursor: "pointer" }}
          aria-label="Log out"
        >
          <LogOut size={16} strokeWidth={2.75} aria-hidden="true" />
          Log out
        </button>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-xl border-4 border-black rounded-3xl p-4 neo-shadow-lg sm:p-6" style={{ background: WHITE }}>
        <header className="text-center">
          <h1 className="break-words text-4xl font-bold tracking-tighter sm:text-5xl">SubKiller</h1>
          <p className="mt-1 break-words">{"The Honest Sub — a receipt you didn't ask for"}</p>
          <p className="mt-2 text-sm break-words">
            Txn #000{subscriptions.length} · {today}
          </p>
        </header>

        <Rule />

        <nav className="grid min-w-0 grid-cols-1 gap-3 pr-2 pb-2 sm:grid-cols-3" aria-label="Pages">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <NeoButton
                key={href}
                onClick={() => router.push(href)}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className="flex min-h-11 w-full min-w-0 items-center justify-center gap-2 px-3 py-3 text-center"
                style={{ background: active ? MINT : WHITE, color: INK }}
              >
                <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                <span>{label}</span>
              </NeoButton>
            );
          })}
        </nav>

        <Rule />

        <main className="min-w-0 pr-2 pb-2">{children}</main>

        <Rule />

        <footer className="text-center text-sm">
          <p>No refunds. No excuses.</p>
          <p className="mt-1">Thank you for bleeding with us.</p>
        </footer>
      </div>
    </div>
  );
}
