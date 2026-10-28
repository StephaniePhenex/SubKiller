import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";
import { getSignedInUser } from "@/lib/auth";

async function SignedInShell({ children }: { children: React.ReactNode }) {
  const user = await getSignedInUser();
  if (!user) redirect("/");

  return <ReceiptShell>{children}</ReceiptShell>;
}

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  );
}
