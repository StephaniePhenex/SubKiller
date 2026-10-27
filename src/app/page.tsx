import { Skull } from "lucide-react";
import { Card } from "@/components/Card";
import { NeoButton } from "@/components/NeoButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper px-4 py-10 text-ink">
      <Card className="mx-auto max-w-xl p-6">
        <header className="text-center">
          <p className="text-sm">Txn #0000 · placeholder</p>
          <h1 className="mt-1 text-5xl font-bold tracking-tighter">SubKiller</h1>
          <p className="mt-1">{"The Honest Sub — a receipt you didn't ask for"}</p>
        </header>

        <div className="my-5 overflow-hidden whitespace-nowrap select-none" aria-hidden="true">
          {"- ".repeat(48)}
        </div>

        <p className="text-lg font-bold">TOTAL MONEY BLED</p>
        <p className="text-6xl font-bold leading-none tracking-tighter">$0.00</p>
        <p className="text-2xl font-bold">/Year</p>

        <div className="mt-5 flex items-center justify-between gap-4 border-t-[length:var(--spacing-border-thick)] border-ink pt-3">
          <span>Still bleeding</span>
          <span className="font-bold text-blood">−$0.00/yr</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-pill border-[length:var(--spacing-border-thick)] border-ink bg-mint px-3 py-1 font-bold">82</span>
          <span className="rounded-pill border-[length:var(--spacing-border-thick)] border-ink bg-chartreuse px-3 py-1 font-bold">Keep it</span>
        </div>

        <div className="mt-8">
          <NeoButton className="inline-flex items-center gap-3 bg-chartreuse text-ink">
            <Skull size={22} strokeWidth={2.5} aria-hidden="true" />
            Face the damage
          </NeoButton>
        </div>
      </Card>
    </main>
  );
}
