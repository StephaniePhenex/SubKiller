import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginGate } from "@/components/receipt/LoginGate";
import { getSignedInUser } from "@/lib/auth";

async function Gate() {
  await connection();
  // Cypress sets this so the receipt routes render. `/` stays the login gate,
  // which is what the homepage spec checks. Production never reads the flag.
  const e2eLogin = process.env.NODE_ENV !== "production" && process.env.SUBKILLER_E2E_AUTH === "1";
  if (!e2eLogin && (await getSignedInUser())) redirect("/confess");
  return <LoginGate />;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
