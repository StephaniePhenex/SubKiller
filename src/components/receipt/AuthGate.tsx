"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginGate } from "./LoginGate";
import { ROUTES } from "./palette";

const RECEIPT_ROUTES: readonly string[] = [ROUTES.confess, ROUTES.review, ROUTES.graveyard];

type GateSession = { user: { id: string } };

function confirmedSession(session: { user: { id: string } | null } | null): GateSession | null {
  if (!session?.user?.id) return null;
  return { user: { id: session.user.id } };
}

export function AuthGate({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: GateSession;
}) {
  const [session, setSession] = useState<GateSession | null | undefined>(initialSession);
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  pathnameRef.current = pathname;
  routerRef.current = router;

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      const confirmed = confirmedSession(next);
      setSession(confirmed);
      if (!confirmed && RECEIPT_ROUTES.includes(pathnameRef.current)) {
        routerRef.current.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session) return children;
  if (session === undefined) return null;
  return <LoginGate />;
}
