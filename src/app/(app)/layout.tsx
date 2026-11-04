import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthGate } from "@/components/receipt/AuthGate";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";
import { E2E_PLACEHOLDER_USER_ID, getSignedInUser } from "@/lib/auth";

async function SignedInShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSignedInUser();
  if (!user) redirect("/");

  return (
    <AuthGate initialSession={{ user: { id: user.id } }} holdE2ESession={user.id === E2E_PLACEHOLDER_USER_ID}>
      <ReceiptShell>{children}</ReceiptShell>
    </AuthGate>
  );
}

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}
