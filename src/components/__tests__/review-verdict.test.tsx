import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { previewVerdict, scoreSubscription } from "@/app/(app)/review/actions";
import { SubscriptionProvider } from "@/components/receipt/SubscriptionState";
import { ReviewView } from "@/components/receipt/ReviewView";
import { GraveyardView } from "@/components/receipt/GraveyardView";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/app/(app)/review/actions", () => ({
  previewVerdict: jest.fn(),
  scoreSubscription: jest.fn(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ROW_ID = "a0000000-0000-4000-8000-000000000001";
const FEELING = "Kind of guilty. I keep it in case a good show comes out.";

const savedRow = {
  id: ROW_ID,
  user_id: USER_ID,
  name: "Netflix",
  cost: 15.99,
  frequency: "monthly",
  feeling: FEELING,
  ai_score: null,
  verdict: null,
  created_at: "2026-11-03T00:00:00+00:00",
};

function stored(aiScore: number, verdict: string) {
  return {
    id: ROW_ID,
    userId: USER_ID,
    name: "Netflix",
    cost: 15.99,
    frequency: "monthly" as const,
    feeling: FEELING,
    aiScore,
    verdict,
    createdAt: savedRow.created_at,
  };
}

type Call = [method: string, args: unknown[]];

function installClient() {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "order", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: savedRow, error: null }).then(resolve, reject);
  jest.mocked(createClient).mockReturnValue({
    from: jest.fn(() => builder),
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
  } as never);
  return { inserts: () => calls.filter(([method]) => method === "insert") };
}

const preview = (aiScore: number, verdict: string, isMock = true) => ({ ok: true as const, verdict: { aiScore, verdict }, isMock });

function verdictSection() {
  return screen.getByRole("region", { name: "The AI's verdict" });
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit to Graveyard" }));
  });
}

describe("Review page AI verdict", () => {
  beforeEach(() => {
    mockPush.mockReset();
    jest.mocked(createClient).mockReset();
    jest.mocked(previewVerdict).mockReset().mockResolvedValue(preview(25, "Costs more than it gives."));
    jest.mocked(scoreSubscription).mockReset();
  });

  it("asks the server to score the confession shown in the form", async () => {
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );

    await waitFor(() =>
      expect(previewVerdict).toHaveBeenCalledWith({ name: "Netflix", cost: 15.99, frequency: "monthly", feeling: FEELING }),
    );
  });

  it("shows the validated score in a read-only badge with its band and the verdict below it", async () => {
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );

    const badge = await screen.findByRole("img", { name: "Importance score 25 out of 100" });
    const section = verdictSection();
    expect(section).toContainElement(badge);
    expect(within(section).getByText("Kill it")).toBeInTheDocument();
    expect(within(section).getByText(/Costs more than it gives\./)).toBeInTheDocument();

    expect(within(section).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(section).queryAllByRole("spinbutton")).toHaveLength(0);
    expect(within(section).queryAllByRole("button")).toHaveLength(0);
    expect(section.querySelectorAll("input, textarea, select, [contenteditable]")).toHaveLength(0);
  });

  it("renders whatever the server returns, not a hard-coded score", async () => {
    jest.mocked(previewVerdict).mockResolvedValue(preview(82, "Daily use. This one earns its keep."));
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );

    expect(await screen.findByRole("img", { name: "Importance score 82 out of 100" })).toHaveTextContent("82");
    expect(within(verdictSection()).getByText("Keep it")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Importance score 20 out of 100" })).not.toBeInTheDocument();
  });

  it("says plainly when the verdict comes from the built-in demo scorer, not a real AI model", async () => {
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );

    await screen.findByRole("img", { name: "Importance score 25 out of 100" });
    expect(within(verdictSection()).getByText(/demo scoring/i)).toBeInTheDocument();
  });

  it("re-scores after the user edits the cost", async () => {
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("img", { name: "Importance score 25 out of 100" });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Cost ($)" }), { target: { value: "89.99" } });

    await waitFor(() => expect(previewVerdict).toHaveBeenLastCalledWith(expect.objectContaining({ cost: 89.99 })));
  });

  it("shows no score when the server cannot produce a valid verdict", async () => {
    jest.mocked(previewVerdict).mockResolvedValue({ ok: false, reason: "invalid-ai-output" });
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );

    expect(await within(verdictSection()).findByText(/verdict isn't ready/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Importance score/ })).not.toBeInTheDocument();
  });

  it("files the row first, then asks the server to score it by id only, never sending a score", async () => {
    const { inserts } = installClient();
    jest.mocked(scoreSubscription).mockResolvedValue({ ok: true, subscription: stored(25, "Costs more than it gives.") });
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("img", { name: "Importance score 25 out of 100" });

    await submit();

    expect(inserts()).toHaveLength(1);
    expect(inserts()[0][1][0]).not.toHaveProperty("ai_score");
    expect(inserts()[0][1][0]).not.toHaveProperty("verdict");
    expect(scoreSubscription).toHaveBeenCalledTimes(1);
    expect(jest.mocked(scoreSubscription).mock.calls[0]).toEqual([ROW_ID]);
    expect(mockPush).toHaveBeenCalledWith("/graveyard");
  });

  it("keeps the user on Review when scoring fails, and a retry re-scores without filing a second row", async () => {
    const { inserts } = installClient();
    jest
      .mocked(scoreSubscription)
      .mockResolvedValueOnce({ ok: false, reason: "failed" })
      .mockResolvedValueOnce({ ok: true, subscription: stored(25, "Costs more than it gives.") });
    render(
      <SubscriptionProvider>
        <ReviewView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("img", { name: "Importance score 25 out of 100" });

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Filed, but the verdict couldn't be recorded. Try again.");
    expect(mockPush).not.toHaveBeenCalled();
    // The row is already filed as entered, so the fields lock: a retry re-scores that stored row.
    expect(screen.getByRole("spinbutton", { name: "Cost ($)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Subscription" })).toBeDisabled();

    await submit();

    expect(inserts()).toHaveLength(1);
    expect(scoreSubscription).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith("/graveyard");
  });
});

describe("Graveyard cancellation from the stored score", () => {
  beforeEach(() => {
    mockPush.mockReset();
    jest.mocked(previewVerdict).mockReset().mockResolvedValue(preview(25, "Costs more than it gives."));
    jest.mocked(scoreSubscription).mockReset();
  });

  async function fileWithStoredScore(aiScore: number) {
    installClient();
    jest.mocked(scoreSubscription).mockResolvedValue({ ok: true, subscription: stored(aiScore, "Stored verdict.") });
    render(
      <SubscriptionProvider>
        <ReviewView />
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("img", { name: "Importance score 25 out of 100" });
    await submit();
  }

  it("opens a filed subscription scored under 30 already marked to cancel", async () => {
    await fileWithStoredScore(18);

    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).toBeChecked();
  });

  it.each([30, 45, 82])("leaves a filed subscription scored %d unmarked", async (aiScore) => {
    await fileWithStoredScore(aiScore);

    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).not.toBeChecked();
  });

  it("uses the stored score, not the preview, to decide", async () => {
    // Preview said 25, but the row was stored with 45: the stored value wins.
    await fileWithStoredScore(45);

    expect(screen.getByRole("img", { name: "Importance score 45 out of 100" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).not.toBeChecked();
  });
});
