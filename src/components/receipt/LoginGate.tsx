"use client";

import { LogIn } from "lucide-react";
import { enterSignedInShell } from "@/lib/auth";
import { CHART, INK, MONO, PAPER, WHITE } from "./palette";
import { Rule } from "./ui";

export function LoginGate() {
  const onLogin = () => {
    void enterSignedInShell();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12" style={{ background: PAPER, color: INK, fontFamily: MONO }}>
      <main className="w-full max-w-md flex flex-col gap-10">
        <header className="text-center">
          <h1 className="font-bold uppercase leading-none tracking-tighter" style={{ fontSize: "clamp(3rem, 14vw, 5.5rem)" }}>
            SubKiller
          </h1>
          <p className="mt-3">The Honest Sub – a receipt you didn&apos;t ask for</p>
        </header>

        <section className="border-4 border-black rounded-3xl p-6 neo-shadow-lg" style={{ background: WHITE }} aria-labelledby="login-heading">
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
              aria-label="Log in with Google"
            >
              <LogIn size={26} strokeWidth={2.75} aria-hidden="true" />
              <span>Log in with Google</span>
            </button>
          </div>

          <p className="mt-4 text-sm text-center">By logging in, you agree to face your financial reality.</p>
        </section>

        <footer className="text-center text-sm">
          <p>No refunds. No excuses.</p>
        </footer>
      </main>
    </div>
  );
}
