import { fireEvent, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { enterSignedInShell } from "@/lib/auth";
import { LoginGate } from "@/components/receipt/LoginGate";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  enterSignedInShell: jest.fn(),
  leaveSignedInShell: jest.fn(),
  getSignedInUser: jest.fn(),
}));

const signInWithOAuth = jest.fn();

describe("signed-out landing page", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset().mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
    jest.mocked(enterSignedInShell).mockReset();
    jest.mocked(createClient).mockReset().mockReturnValue({
      auth: { signInWithOAuth },
    } as never);
  });

  it("shows one primary control named Log in with Google", () => {
    render(<LoginGate />);

    const controls = screen.getAllByRole("button");
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName("Log in with Google");
  });

  it("starts a Supabase Google OAuth session and no other provider", () => {
    render(<LoginGate />);

    fireEvent.click(screen.getByRole("button", { name: "Log in with Google" }));

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(signInWithOAuth.mock.calls.map((call) => call[0]?.provider)).toEqual(["google"]);
    expect(enterSignedInShell).not.toHaveBeenCalled();
  });
});
