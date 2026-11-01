import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthGate } from "@/components/receipt/AuthGate";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";
import { getSignedInUser } from "@/lib/auth";

async function SignedInShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getSignedInUser();
  if (!user) redirect("/");

  return (
    <AuthGate initialSession={{ user: { id: user.id } }}>
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
