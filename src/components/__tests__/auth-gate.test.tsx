import { act, fireEvent, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { AuthGate } from "@/components/receipt/AuthGate";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";

jest.mock("next/navigation", () => ({
  usePathname: () => "/confess",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  enterSignedInShell: jest.fn(),
  leaveSignedInShell: jest.fn(),
  getSignedInUser: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

type SessionPayload = { user: { id: string } } | null;
type AuthListener = (event: string, session: SessionPayload) => void;

const listeners: AuthListener[] = [];
const signInWithOAuth = jest.fn();
const signOut = jest.fn();
const onAuthStateChange = jest.fn((callback: AuthListener) => {
  listeners.push(callback);
  return { data: { subscription: { unsubscribe: jest.fn() } } };
});

async function emit(event: string, session: SessionPayload) {
  const listener = listeners.at(-1);
  if (!listener) {
    throw new Error("AuthGate never subscribed to supabase.auth.onAuthStateChange");
  }
  await act(async () => {
    listener(event, session);
  });
}

function renderGate() {
  return render(
    <AuthGate>
      <ReceiptShell>
        <p>Confess ledger</p>
      </ReceiptShell>
    </AuthGate>,
  );
}

describe("session-driven gate", () => {
  beforeEach(() => {
    listeners.length = 0;
    signInWithOAuth.mockReset().mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
    signOut.mockReset().mockResolvedValue({ error: null });
    onAuthStateChange.mockClear();
    jest.mocked(createClient).mockReset().mockReturnValue({
      auth: {
        signInWithOAuth,
        signOut,
        onAuthStateChange,
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    } as never);
  });

  it("hides the receipt shell from a signed-out user and shows Log in with Google", async () => {
    renderGate();

    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(screen.queryByText("Confess ledger")).not.toBeInTheDocument();

    await emit("INITIAL_SESSION", null);

    expect(screen.getByRole("button", { name: "Log in with Google" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(screen.queryByText("Confess ledger")).not.toBeInTheDocument();
  });

  it("does not open the receipt shell from the login click alone", async () => {
    renderGate();
    await emit("INITIAL_SESSION", null);

    fireEvent.click(screen.getByRole("button", { name: "Log in with Google" }));

    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(screen.queryByText("Confess ledger")).not.toBeInTheDocument();
  });

  it("shows the receipt shell when the session payload arrives", async () => {
    renderGate();
    await emit("SIGNED_IN", { user: { id: "user-1" } });

    expect(screen.getByRole("navigation", { name: "Pages" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText("Confess ledger")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log in with Google" })).not.toBeInTheDocument();
  });

  it("returns to the gate after log out ends the Supabase session", async () => {
    renderGate();
    await emit("SIGNED_IN", { user: { id: "user-1" } });

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeInTheDocument();

    await emit("SIGNED_OUT", null);

    expect(screen.getByRole("button", { name: "Log in with Google" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });
});
