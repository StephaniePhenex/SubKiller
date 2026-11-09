"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "./palette";
import { ReviewView, type ConfessionFields } from "./ReviewView";

const ReviewVisitContext = createContext(0);

/**
 * Counts arrivals at Review. The receipt shell stays mounted across client
 * navigations, so each return gets a new count and ReviewView can remount.
 */
export function ReviewVisitProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visit, setVisit] = useState(() => ({
    path: pathname,
    count: pathname === ROUTES.review ? 1 : 0,
  }));
  if (visit.path !== pathname) {
    setVisit({
      path: pathname,
      count: pathname === ROUTES.review ? visit.count + 1 : visit.count,
    });
  }

  return <ReviewVisitContext.Provider value={visit.count}>{children}</ReviewVisitContext.Provider>;
}

export function ReviewScreen({ initialFields }: { initialFields?: Partial<ConfessionFields> }) {
  const visit = useContext(ReviewVisitContext);
  return <ReviewView key={visit} initialFields={initialFields} />;
}
