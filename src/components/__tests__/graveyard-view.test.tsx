import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { SubscriptionProvider } from "@/components/receipt/SubscriptionState";
import { GraveyardView } from "@/components/receipt/GraveyardView";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";

/** A row exactly as Supabase returns it (snake_case, numeric cost as a string). */
function dbRow(id: string, name: string, cost: string, frequency: string, aiScore: number | null, verdict: string | null) {
  return {
    id,
    user_id: USER_ID,
    name,
    cost,
    frequency,
    feeling: "",
    ai_score: aiScore,
    verdict,
    created_at: "2026-11-03T12:00:00+00:00",
  };
}

const GYM = dbRow("a0000000-0000-4000-8000-000000000001", "Unused Gym", "49.00", "monthly", 12, "Three visits this year.");
const NETFLIX = dbRow("a0000000-0000-4000-8000-000000000002", "Netflix", "15.99", "monthly", 45, "Decide whether it still earns that.");
const CLOUD = dbRow("a0000000-0000-4000-8000-000000000003", "Cloud Storage", "99.99", "yearly", 91, "Your photos live here.");
const FREEBIE = dbRow("a0000000-0000-4000-8000-000000000004", "Free Trial", "12.50", "monthly", 0, "You never opened it.");
const UNSCORED = dbRow("a0000000-0000-4000-8000-000000000005", "Pending Thing", "5.00", "weekly", null, null);

type Op = [method: string, args: unknown[]];
type Result = { data: unknown; error: { message: string } | null };

/**
 * Fake Supabase client. Each `from()` chain records its operations; when the
 * chain is awaited, `respond(ops)` decides the result, so a test can answer the
 * list query and the delete query differently, or hold one back.
 */
function installClient(respond: (ops: Op[]) => Result | Promise<Result>, user: { id: string } | null = { id: USER_ID }) {
  const chains: Op[][] = [];
  const from = jest.fn((table: string) => {
    const ops: Op[] = [["from", [table]]];
    chains.push(ops);
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "insert", "update", "delete", "eq", "is", "order", "single", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => {
        ops.push([method, args]);
        return chain;
      };
    }
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(respond(ops)).then(resolve, reject);
    return chain;
  });
  jest.mocked(createClient).mockReturnValue({
    from,
    // The yearly SQL baseline (Issue #12) is covered in graveyard-totals.test.tsx.
    rpc: jest.fn(async () => ({ data: 0, error: null })),
    auth: {
      getUser: jest.fn(async () => ({ data: { user }, error: user ? null : { message: "Auth session missing!" } })),
    },
  } as never);
  const isDelete = (ops: Op[]) => ops.some(([m]) => m === "delete");
  return {
    lists: () => chains.filter((ops) => !isDelete(ops)),
    deletes: () => chains.filter(isDelete),
  };
}

const has = (ops: Op[], method: string, ...args: unknown[]) =>
  ops.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args));
const isDeleteOp = (ops: Op[]) => ops.some(([m]) => m === "delete");

/** Answers the list query with `rows` and every delete with success. */
function withRows(rows: unknown[]) {
  return installClient((ops) =>
    isDeleteOp(ops)
      ? { data: [{ id: (ops.find(([m, a]) => m === "eq" && a[0] === "id")?.[1][1] as string) ?? "" }], error: null }
      : { data: rows, error: null },
  );
}

function renderGraveyard() {
  return render(
    <SubscriptionProvider>
      <GraveyardView />
    </SubscriptionProvider>,
  );
}

const cardNames = () =>
  within(screen.getByRole("list")).getAllByRole("listitem").map((li) => within(li).getByRole("checkbox").getAttribute("aria-label"));

describe("Graveyard list from Supabase", () => {
  beforeEach(() => jest.mocked(createClient).mockReset());

  it("shows a loading state, then the signed-in user's subscriptions from Supabase", async () => {
    const { lists } = withRows([NETFLIX, GYM]);
    renderGraveyard();

    expect(screen.getByRole("status")).toHaveTextContent(/digging up/i);

    expect(await screen.findByRole("checkbox", { name: "Cancel Netflix" })).toBeInTheDocument();
    expect(lists()).toHaveLength(1);
    expect(has(lists()[0], "from", "subscriptions")).toBe(true);
    expect(has(lists()[0], "eq", "user_id", USER_ID)).toBe(true);
  });

  it("renders name, cost, AI score, and verdict on each text card", async () => {
    withRows([GYM]);
    renderGraveyard();

    const card = (await screen.findByRole("checkbox", { name: "Cancel Unused Gym" })).closest("li")!;
    expect(within(card).getByText("Unused Gym")).toBeInTheDocument();
    expect(within(card).getByText(/\$49\.00\/mo/)).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Importance score 12 out of 100" })).toHaveTextContent("12");
    expect(within(card).getByText(/Three visits this year\./)).toBeInTheDocument();
    expect(card.querySelector("img:not([role]), canvas, video")).toBeNull();
  });

  it("never shows the prototype sample subscriptions as the user's own", async () => {
    withRows([NETFLIX]);
    renderGraveyard();

    await screen.findByRole("checkbox", { name: "Cancel Netflix" });
    for (const sample of ["Spotify Premium", "Adobe Creative Cloud"]) {
      expect(screen.queryByText(sample)).not.toBeInTheDocument();
    }
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("maps snake_case rows to camelCase: numeric cost, score 0 kept, unscored kept", async () => {
    withRows([UNSCORED, CLOUD, FREEBIE]);
    renderGraveyard();

    const freebie = (await screen.findByRole("checkbox", { name: "Cancel Free Trial" })).closest("li")!;
    expect(within(freebie).getByRole("img", { name: "Importance score 0 out of 100" })).toHaveTextContent("0");
    expect(within(freebie).getByText(/\$12\.50\/mo · \$150\.00 a year/)).toBeInTheDocument();

    const pending = screen.getByRole("checkbox", { name: "Cancel Pending Thing" }).closest("li")!;
    expect(within(pending).queryByRole("img", { name: /Importance score/ })).not.toBeInTheDocument();
    expect(within(pending).getByText(/not scored yet/i)).toBeInTheDocument();
    expect(within(pending).getByRole("checkbox")).not.toBeChecked();
  });

  it("sorts by AI score ascending: 0 first, unscored last", async () => {
    withRows([CLOUD, UNSCORED, NETFLIX, FREEBIE, GYM]);
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });

    expect(cardNames()).toEqual([
      "Cancel Free Trial",
      "Cancel Unused Gym",
      "Cancel Netflix",
      "Cancel Cloud Storage",
      "Cancel Pending Thing",
    ]);
  });

  it("opens stored scores under 30 already marked to cancel", async () => {
    withRows([GYM, NETFLIX]);
    renderGraveyard();

    expect(await screen.findByRole("checkbox", { name: "Cancel Unused Gym" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).not.toBeChecked();
  });

  it("tells the user to confess when the list is empty, with a link to /confess", async () => {
    withRows([]);
    renderGraveyard();

    expect(await screen.findByText(/nothing buried yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Confess a subscription" })).toHaveAttribute("href", "/confess");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows an accessible error instead of crashing when loading fails, and retries", async () => {
    let fail = true;
    installClient(() => (fail ? { data: null, error: { message: "network down" } } : { data: [NETFLIX], error: null }));
    renderGraveyard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your subscriptions.");
    expect(screen.queryByText(/nothing buried yet/i)).not.toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("checkbox", { name: "Cancel Netflix" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the sign-in message when there is no signed-in user", async () => {
    installClient(() => ({ data: [], error: null }), null);
    renderGraveyard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to manage your subscriptions.");
    // Retrying cannot sign anyone in, so no retry is offered.
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("keeps totals and bulk actions off rows that are not on screen while the list cannot load", async () => {
    let fail = false;
    installClient(() => (fail ? { data: null, error: { message: "network down" } } : { data: [GYM], error: null }));
    const { rerender } = render(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("checkbox", { name: "Cancel Unused Gym" });
    expect(within(screen.getByText("TOTAL MONEY BLED:").closest("section")!).getByText("$588.00")).toBeInTheDocument();

    // Leave and come back while Supabase is down: the gym is still in shared state, but not on screen.
    fail = true;
    rerender(<SubscriptionProvider>{null}</SubscriptionProvider>);
    rerender(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("alert");

    const totalCard = screen.getByText("TOTAL MONEY BLED:").closest("section")!;
    expect(within(totalCard).queryByText("$588.00")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kill all" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Spare all" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Generate my poster" })).toBeDisabled();
  });

  it("clears an old delete error when the list is reloaded", async () => {
    let failLoad = false;
    installClient((ops) => {
      if (isDeleteOp(ops)) return { data: null, error: { message: "permission denied" } };
      return failLoad ? { data: null, error: { message: "network down" } } : { data: [NETFLIX], error: null };
    });
    const { rerender } = render(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Netflix from the list" }));
    });
    expect(await screen.findByText("Couldn't delete Netflix. Try again.")).toBeInTheDocument();

    failLoad = true;
    rerender(<SubscriptionProvider>{null}</SubscriptionProvider>);
    rerender(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByText("Couldn't load your subscriptions.");
    failLoad = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await screen.findByRole("checkbox", { name: "Cancel Netflix" });
    expect(screen.queryByText("Couldn't delete Netflix. Try again.")).not.toBeInTheDocument();
  });

  it("ignores a stale response that arrives after a newer load", async () => {
    let releaseFirst!: (r: Result) => void;
    let call = 0;
    installClient(() => {
      call += 1;
      if (call === 1) return new Promise<Result>((resolve) => (releaseFirst = resolve));
      return { data: [NETFLIX], error: null };
    });

    const { rerender } = render(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    // Leave the Graveyard while the first load is pending, then come back: a second load starts.
    rerender(<SubscriptionProvider>{null}</SubscriptionProvider>);
    rerender(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });

    await act(async () => releaseFirst({ data: [CLOUD], error: null }));

    expect(screen.queryByRole("checkbox", { name: "Cancel Cloud Storage" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).toBeInTheDocument();
  });

  it("keeps the user's cancel toggles when the Graveyard reloads", async () => {
    withRows([NETFLIX]);
    const { rerender } = render(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: "Cancel Netflix" }));
    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).toBeChecked();

    rerender(<SubscriptionProvider>{null}</SubscriptionProvider>);
    rerender(
      <SubscriptionProvider>
        <GraveyardView />
      </SubscriptionProvider>,
    );

    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).toBeChecked());
  });
});

describe("Graveyard delete", () => {
  beforeEach(() => jest.mocked(createClient).mockReset());

  it("deletes that row from Supabase for the signed-in user and removes its card", async () => {
    const { deletes } = withRows([GYM, NETFLIX]);
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Netflix from the list" }));
    });

    expect(deletes()).toHaveLength(1);
    expect(has(deletes()[0], "eq", "id", NETFLIX.id)).toBe(true);
    expect(has(deletes()[0], "eq", "user_id", USER_ID)).toBe(true);
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Cancel Netflix" })).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Cancel Unused Gym" })).toBeInTheDocument();
  });

  it("does not cancel, toggle, or change the savings of any other row", async () => {
    withRows([GYM, NETFLIX, CLOUD]);
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });
    const totalCard = screen.getByText("TOTAL MONEY BLED:").closest("section")!;
    // Only the gym (score 12) starts marked: $49.00 x 12.
    expect(within(totalCard).getByText("$588.00")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Netflix from the list" }));
    });
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Cancel Netflix" })).not.toBeInTheDocument());

    expect(screen.getByRole("checkbox", { name: "Cancel Unused Gym" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Cancel Cloud Storage" })).not.toBeChecked();
    expect(within(totalCard).getByText("$588.00")).toBeInTheDocument();
  });

  it("keeps the card and shows an accessible error when the delete fails", async () => {
    installClient((ops) =>
      isDeleteOp(ops) ? { data: null, error: { message: "permission denied" } } : { data: [NETFLIX], error: null },
    );
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Netflix from the list" }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete Netflix. Try again.");
    expect(screen.getByRole("checkbox", { name: "Cancel Netflix" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Netflix from the list" })).toBeEnabled();
  });

  it("sends one delete while it is pending, however many times the button is clicked", async () => {
    let release!: (r: Result) => void;
    const { deletes } = installClient((ops) =>
      isDeleteOp(ops) ? new Promise<Result>((resolve) => (release = resolve)) : { data: [NETFLIX], error: null },
    );
    renderGraveyard();
    const button = await screen.findByRole("button", { name: "Delete Netflix from the list" });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    // The delete query starts after the auth check resolves; wait for it, then make sure no second one follows.
    await waitFor(() => expect(deletes()).toHaveLength(1));
    fireEvent.click(button);
    await act(async () => {});
    expect(deletes()).toHaveLength(1);

    await act(async () => release({ data: [{ id: NETFLIX.id }], error: null }));
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Cancel Netflix" })).not.toBeInTheDocument());
  });

  it("shows the empty state after the last row is deleted", async () => {
    withRows([NETFLIX]);
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Netflix" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete Netflix from the list" }));
    });

    expect(await screen.findByRole("link", { name: "Confess a subscription" })).toHaveAttribute("href", "/confess");
  });
});
