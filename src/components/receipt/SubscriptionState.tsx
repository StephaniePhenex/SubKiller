"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Subscription } from "./data";

type SubscriptionState = {
  subscriptions: Subscription[];
  setSubscriptions: Dispatch<SetStateAction<Subscription[]>>;
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // Starts empty: the Graveyard fills it from Supabase, never from the prototype samples.
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  return <SubscriptionContext.Provider value={{ subscriptions, setSubscriptions }}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptions() {
  const state = useContext(SubscriptionContext);
  if (!state) throw new Error("Receipt views must render inside the receipt shell.");
  return state;
}
