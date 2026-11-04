import { act, fireEvent, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { SubscriptionProvider } from "@/components/receipt/SubscriptionState";
import { ReviewView } from "@/components/receipt/ReviewView";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

// The AI score is a server concern (Issue #9, covered in review-verdict.test.tsx). Stub it so
// these tests keep checking only the form: validation, the insert payload, and navigation.
jest.mock("@/app/(app)/review/actions", () => ({
  previewVerdict: jest.fn(async () => ({
    ok: true,
    verdict: { aiScore: 20, verdict: "You rewatched one sitcom twice." },
    isMock: true,
  })),
  scoreSubscription: jest.fn(async (id: string) => ({
    ok: true,
    subscription: {
      id,
      userId: "11111111-1111-4111-8111-111111111111",
      name: "Netflix",
      cost: 15.99,
      frequency: "monthly",
      feeling: "",
      aiScore: 20,
      verdict: "You rewatched one sitcom twice.",
      createdAt: "2026-11-02T00:00:00+00:00",
    },
  })),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "a0000000-0000-4000-8000-000000000001";

const savedRow = {
  id: ROW_ID,
  user_id: USER_ID,
  name: "Netflix",
  cost: 15.99,
  frequency: "monthly",
  feeling: "Kind of guilty. I keep it in case a good show comes out.",
  ai_score: null,
  verdict: null,
  created_at: "2026-11-02T00:00:00+00:00",
};

type Call = [method: string, args: unknown[]];

function installClient(user: { id: string } | null, result = { data: savedRow, error: null as { message: string } | null }) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);

  const from = jest.fn((table: string) => {
    calls.push(["from", [table]]);
    return builder;
  });

  jest.mocked(createClient).mockReturnValue({
    from,
    auth: {
      getUser: jest.fn(async () => ({
        data: { user },
        error: user ? null : { message: "Auth session missing!" },
      })),
    },
  } as never);

  return { calls, from };
}

function renderReview() {
  return render(
    <SubscriptionProvider>
      <ReviewView />
    </SubscriptionProvider>,
  );
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit to Graveyard" }));
  });
}

describe("confession review form", () => {
  beforeEach(() => {
    mockPush.mockReset();
    jest.mocked(createClient).mockReset();
  });

  it("prefills the parsed confession and keeps every field editable", () => {
    renderReview();

    const name = screen.getByRole("textbox", { name: "Subscription" });
    const cost = screen.getByRole("spinbutton", { name: "Cost ($)" });
    const feeling = screen.getByRole("textbox", { name: "How you feel about it" });

    expect(name).toHaveValue("Netflix");
    expect(cost).toHaveValue(15.99);
    expect(feeling).toHaveValue("Kind of guilty. I keep it in case a good show comes out.");
    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("≈ $191.88 / year")).toBeInTheDocument();

    fireEvent.change(name, { target: { value: "Hulu" } });
    fireEvent.change(cost, { target: { value: "9.99" } });
    fireEvent.change(feeling, { target: { value: "Barely watch it." } });

    expect(name).toHaveValue("Hulu");
    expect(cost).toHaveValue(9.99);
    expect(feeling).toHaveValue("Barely watch it.");
    expect(screen.getByText("Hulu")).toBeInTheDocument();
    expect(screen.getByText("≈ $119.88 / year")).toBeInTheDocument();
  });

  it("uses a pressed toggle for weekly, monthly, and yearly and updates the yearly cost", () => {
    renderReview();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    const weekly = screen.getByRole("button", { name: "Weekly" });
    const monthly = screen.getByRole("button", { name: "Monthly" });
    const yearly = screen.getByRole("button", { name: "Yearly" });

    fireEvent.click(weekly);

    expect(weekly).toHaveAttribute("aria-pressed", "true");
    expect(monthly).toHaveAttribute("aria-pressed", "false");
    expect(yearly).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Billed weekly")).toBeInTheDocument();
    expect(screen.getByText("≈ $831.48 / year")).toBeInTheDocument();

    fireEvent.click(yearly);

    expect(yearly).toHaveAttribute("aria-pressed", "true");
    expect(weekly).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("≈ $15.99 / year")).toBeInTheDocument();
  });

  it("blocks an empty name or a cost that is not above zero and names the field", async () => {
    const { from } = installClient({ id: USER_ID });
    renderReview();

    fireEvent.change(screen.getByRole("textbox", { name: "Subscription" }), { target: { value: "   " } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cost ($)" }), { target: { value: "0" } });
    await submit();

    expect(screen.getByRole("textbox", { name: "Subscription" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("spinbutton", { name: "Cost ($)" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Name the subscription so you know what you're killing.")).toBeInTheDocument();
    expect(screen.getByText("Enter a price above $0, like 15.99.")).toBeInTheDocument();
    expect(from).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Subscription" }), { target: { value: "Netflix" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Cost ($)" }), { target: { value: "-4" } });
    await submit();

    expect(screen.queryByText("Name the subscription so you know what you're killing.")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a price above $0, like 15.99.")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("inserts one row for the signed-in user and opens the Graveyard", async () => {
    const { calls } = installClient({ id: USER_ID });
    renderReview();

    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));
    fireEvent.change(screen.getByRole("textbox", { name: "How you feel about it" }), {
      target: { value: "  I forget I even have it.  " },
    });
    await submit();

    const payload = calls.find(([method]) => method === "insert")?.[1][0];
    expect(calls.some(([method, args]) => method === "from" && args[0] === "subscriptions")).toBe(true);
    expect(payload).toEqual({
      user_id: USER_ID,
      name: "Netflix",
      cost: 15.99,
      frequency: "yearly",
      feeling: "I forget I even have it.",
    });
    expect(payload).not.toHaveProperty("ai_score");
    expect(payload).not.toHaveProperty("verdict");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/graveyard");
  });

  it("stays on Review when the insert is rejected", async () => {
    installClient({ id: USER_ID }, { data: null as never, error: { message: "permission denied" } });
    renderReview();

    await submit();

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not file this subscription. Try again.");
    expect(screen.getByRole("button", { name: "Submit to Graveyard" })).toBeEnabled();
  });
});
