import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginGate } from "@/components/receipt/LoginGate";
import { getSignedInUser } from "@/lib/auth";

async function Gate() {
  await connection();
  if (await getSignedInUser()) redirect("/confess");
  return <LoginGate />;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
