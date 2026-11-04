import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { SubscriptionProvider } from "@/components/receipt/SubscriptionState";
import { GraveyardView } from "@/components/receipt/GraveyardView";
import { BLOOD } from "@/components/receipt/palette";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";

function dbRow(id: string, name: string, cost: string, frequency: string, aiScore: number) {
  return { id, user_id: USER_ID, name, cost, frequency, feeling: "", ai_score: aiScore, verdict: "Stored.", created_at: "2026-11-04T12:00:00+00:00" };
}

// $15/month = $180/yr, $10/week = $520/yr, $120/year = $120/yr: $820/yr in all. None starts marked (all scores >= 30).
const STREAMING = dbRow("a0000000-0000-4000-8000-000000000001", "Streaming", "15.00", "monthly", 50);
const GYM = dbRow("a0000000-0000-4000-8000-000000000002", "Gym", "10.00", "weekly", 60);
const CLOUD = dbRow("a0000000-0000-4000-8000-000000000003", "Cloud", "120.00", "yearly", 80);

type Result = { data: unknown; error: { message: string } | null };
type Op = [method: string, args: unknown[]];

const FACTOR: Record<string, number> = { weekly: 52, monthly: 12, yearly: 1 };

/**
 * Fake Supabase client backed by an in-memory table. The list query returns
 * the remaining rows, a successful delete removes its row, and by default
 * `rpc("yearly_bleed")` sums the remaining rows the way the SQL function does
 * (as a numeric string). A test can pass its own `bleed()` to hold a response
 * back or return something else. Every query and RPC is recorded.
 */
function installClient({
  rows = [STREAMING, GYM, CLOUD] as ReturnType<typeof dbRow>[],
  bleed,
  failDelete = false,
}: {
  rows?: ReturnType<typeof dbRow>[];
  bleed?: () => Result | Promise<Result>;
  failDelete?: boolean;
} = {}) {
  let table = [...rows];
  const sqlSum = (): Result => ({
    data: (table.reduce((n, r) => n + Math.round(Number(r.cost) * 100) * FACTOR[r.frequency], 0) / 100).toFixed(2),
    error: null,
  });
  const answerBleed = bleed ?? sqlSum;
  const chains: Op[][] = [];
  const rpc = jest.fn(async (fn: string) => {
    if (fn !== "yearly_bleed") throw new Error(`unexpected rpc ${fn}`);
    return answerBleed();
  });
  const from = jest.fn((tableName: string) => {
    const ops: Op[] = [["from", [tableName]]];
    chains.push(ops);
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "insert", "update", "delete", "eq", "is", "order", "single", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => {
        ops.push([method, args]);
        return chain;
      };
    }
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      const isDelete = ops.some(([m]) => m === "delete");
      const id = ops.find(([m, a]) => m === "eq" && a[0] === "id")?.[1][1];
      let result: Result;
      if (!isDelete) result = { data: table, error: null };
      else if (failDelete) result = { data: null, error: { message: "permission denied" } };
      else {
        table = table.filter((r) => r.id !== id);
        result = { data: [{ id }], error: null };
      }
      return Promise.resolve(result).then(resolve, reject);
    };
    return chain;
  });
  jest.mocked(createClient).mockReturnValue({
    from,
    rpc,
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
  } as never);
  return { rpc, from, writes: () => chains.filter((ops) => ops.some(([m]) => ["insert", "update", "delete"].includes(m))) };
}

function renderGraveyard() {
  return render(
    <SubscriptionProvider>
      <GraveyardView />
    </SubscriptionProvider>,
  );
}

const totalCard = () => screen.getByText("TOTAL MONEY BLED:").closest("section")!;
/** The text of one labelled row in the top card, e.g. "Simulated savings$180.00/yr". */
const row = (label: string) => within(totalCard()).getByText(label).parentElement!.textContent;

async function loaded() {
  await screen.findByRole("checkbox", { name: "Cancel Streaming" });
  await screen.findByText("TOTAL MONEY BLED: $820.00/Year");
}

async function remove(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: `Delete ${name} from the list` }));
  });
}

describe("TOTAL MONEY BLED baseline (SQL SUM)", () => {
  beforeEach(() => jest.mocked(createClient).mockReset());

  it("shows a loading state, not a fabricated $0, until the aggregate returns", async () => {
    let release!: (r: Result) => void;
    installClient({ bleed: () => new Promise<Result>((resolve) => (release = resolve)) });
    renderGraveyard();
    await screen.findByRole("checkbox", { name: "Cancel Streaming" });

    expect(within(totalCard()).getByText(/adding up/i)).toBeInTheDocument();
    expect(within(totalCard()).queryByText(/\$0\.00/)).not.toBeInTheDocument();

    await act(async () => release({ data: "820.00", error: null }));

    expect(within(totalCard()).getByText("$820.00")).toBeInTheDocument();
    expect(within(totalCard()).queryByText(/adding up/i)).not.toBeInTheDocument();
  });

  it("is the dominant figure, read out as 'TOTAL MONEY BLED: $XXX/Year', with the monthly equivalent", async () => {
    installClient();
    renderGraveyard();
    await loaded();

    expect(screen.getByText("TOTAL MONEY BLED: $820.00/Year")).toBeInTheDocument();
    expect(within(totalCard()).getByText("$820.00")).toHaveClass("text-6xl");
    expect(row("Monthly equivalent")).toContain("$68.33/Month");
  });

  it("comes from the database aggregate, not from adding up the cards in the browser", async () => {
    // The cards add up to $820, but the SQL SUM says $1,000: the SQL figure is shown.
    const { rpc } = installClient({ bleed: () => ({ data: "1000.00", error: null }) });
    renderGraveyard();
    await screen.findByText("TOTAL MONEY BLED: $1,000.00/Year");

    expect(rpc).toHaveBeenCalledWith("yearly_bleed");
    expect(within(totalCard()).getByText("$1,000.00")).toBeInTheDocument();
    expect(row("Current waste")).toContain("$1,000.00/yr");
  });

  it("shows $0.00 for an empty account once loaded, with the confess link", async () => {
    installClient({ rows: [], bleed: () => ({ data: 0, error: null }) });
    renderGraveyard();

    expect(await screen.findByText("TOTAL MONEY BLED: $0.00/Year")).toBeInTheDocument();
    expect(row("Simulated savings")).toContain("$0.00/yr");
    expect(row("Current waste")).toContain("$0.00/yr");
    expect(screen.getByRole("link", { name: "Confess a subscription" })).toHaveAttribute("href", "/confess");
  });

  it.each([
    ["a database error", () => ({ data: null, error: { message: "function missing" } })],
    ["an invalid total", () => ({ data: "a lot", error: null })],
  ])("shows an accessible error, never NaN or $0, for %s, and retries", async (_label, bad) => {
    let fail = true;
    installClient({ bleed: () => (fail ? bad() : { data: "820.00", error: null }) });
    renderGraveyard();

    expect(await within(totalCard()).findByRole("alert")).toHaveTextContent("Couldn't add up your yearly total.");
    expect(document.body.textContent).not.toMatch(/NaN/);
    expect(within(totalCard()).queryByText(/\$0\.00/)).not.toBeInTheDocument();
    // The list itself still works.
    expect(screen.getByRole("checkbox", { name: "Cancel Streaming" })).toBeInTheDocument();

    fail = false;
    fireEvent.click(within(totalCard()).getByRole("button", { name: "Retry the yearly total" }));

    expect(await screen.findByText("TOTAL MONEY BLED: $820.00/Year")).toBeInTheDocument();
  });
});

describe("simulated savings vs current waste (client delta)", () => {
  beforeEach(() => jest.mocked(createClient).mockReset());

  it("updates in the same render as each check and uncheck, with no database call", async () => {
    const { rpc, from } = installClient();
    renderGraveyard();
    await loaded();
    const rpcCalls = rpc.mock.calls.length;
    const queries = from.mock.calls.length;

    expect(row("Simulated savings")).toContain("$0.00/yr");
    expect(row("Current waste")).toContain("$820.00/yr");

    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Streaming" }));
    expect(row("Simulated savings")).toContain("$180.00/yr");
    expect(row("Current waste")).toContain("$640.00/yr");

    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Gym" }));
    expect(row("Simulated savings")).toContain("$700.00/yr");
    expect(row("Current waste")).toContain("$120.00/yr");

    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Streaming" }));
    expect(row("Simulated savings")).toContain("$520.00/yr");
    expect(row("Current waste")).toContain("$300.00/yr");

    // The baseline and its monthly equivalent do not move with the simulator.
    expect(screen.getByText("TOTAL MONEY BLED: $820.00/Year")).toBeInTheDocument();
    expect(row("Monthly equivalent")).toContain("$68.33/Month");
    expect(rpc.mock.calls.length).toBe(rpcCalls);
    expect(from.mock.calls.length).toBe(queries);
  });

  it("never shows negative waste: killing everything leaves $0.00", async () => {
    installClient();
    renderGraveyard();
    await loaded();

    fireEvent.click(screen.getByRole("button", { name: "Kill all" }));

    expect(row("Simulated savings")).toContain("$820.00/yr");
    expect(row("Current waste")).toContain("$0.00/yr");
    expect(row("Current waste")).not.toMatch(/[−-]\$/);
  });

  it("clamps waste at $0.00 if the baseline is ever below the simulated savings", async () => {
    installClient({ bleed: () => ({ data: "100.00", error: null }) });
    renderGraveyard();
    await screen.findByText("TOTAL MONEY BLED: $100.00/Year");

    fireEvent.click(screen.getByRole("button", { name: "Kill all" }));

    expect(row("Current waste")).toContain("$0.00/yr");
    expect(document.body.textContent).not.toMatch(/NaN|−\$0\.00|-\$/);
  });
});

describe("deleting with the baseline and the simulator", () => {
  beforeEach(() => jest.mocked(createClient).mockReset());

  it("a checked row leaves both the baseline and the savings at once; the refetched SQL total agrees", async () => {
    let call = 0;
    let releaseRefetch!: (r: Result) => void;
    const { rpc } = installClient({
      bleed: () => {
        call += 1;
        if (call === 1) return { data: "820.00", error: null };
        return new Promise<Result>((resolve) => (releaseRefetch = resolve));
      },
    });
    renderGraveyard();
    await loaded();
    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Gym" }));
    expect(row("Simulated savings")).toContain("$520.00/yr");

    await remove("Gym");

    // Before the refetch returns, the local baseline already drops by the gym's $520.
    await screen.findByText("TOTAL MONEY BLED: $300.00/Year");
    expect(row("Simulated savings")).toContain("$0.00/yr");
    expect(row("Current waste")).toContain("$300.00/yr");
    expect(row("Monthly equivalent")).toContain("$25.00/Month");
    expect(rpc).toHaveBeenCalledTimes(2);

    // The refreshed SQL SUM no longer counts the gym, and nothing is subtracted twice.
    await act(async () => releaseRefetch({ data: "300.00", error: null }));
    expect(screen.getByText("TOTAL MONEY BLED: $300.00/Year")).toBeInTheDocument();
    expect(row("Current waste")).toContain("$300.00/yr");
  });

  it("an unchecked row lowers the baseline and leaves the savings alone", async () => {
    installClient();
    renderGraveyard();
    await loaded();
    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Streaming" }));

    await remove("Cloud");

    await screen.findByText("TOTAL MONEY BLED: $700.00/Year");
    expect(row("Simulated savings")).toContain("$180.00/yr");
    expect(row("Current waste")).toContain("$520.00/yr");
    expect(screen.getByRole("checkbox", { name: "Cancel Streaming" })).toBeChecked();
  });

  it("keeps the adjusted total when the refetch after a delete fails", async () => {
    let call = 0;
    installClient({
      bleed: () => {
        call += 1;
        return call === 1 ? { data: "820.00", error: null } : { data: null, error: { message: "network down" } };
      },
    });
    renderGraveyard();
    await loaded();

    await remove("Cloud");

    await screen.findByText("TOTAL MONEY BLED: $700.00/Year");
    await act(async () => {});
    expect(screen.getByText("TOTAL MONEY BLED: $700.00/Year")).toBeInTheDocument();
    expect(within(totalCard()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a failed delete changes nothing", async () => {
    installClient({ failDelete: true });
    renderGraveyard();
    await loaded();
    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Gym" }));

    await remove("Gym");

    expect(await screen.findByText("Couldn't delete Gym. Try again.")).toBeInTheDocument();
    expect(screen.getByText("TOTAL MONEY BLED: $820.00/Year")).toBeInTheDocument();
    expect(row("Simulated savings")).toContain("$520.00/yr");
    expect(row("Current waste")).toContain("$300.00/yr");
  });

  it("subtracts a row once, however many times its delete is clicked", async () => {
    installClient();
    renderGraveyard();
    await loaded();
    const button = screen.getByRole("button", { name: "Delete Cloud from the list" });

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });

    await screen.findByText("TOTAL MONEY BLED: $700.00/Year");
  });

  it("ignores a stale refetch that returns after a newer one", async () => {
    const pending: Array<(r: Result) => void> = [];
    let call = 0;
    installClient({
      bleed: () => {
        call += 1;
        if (call === 1) return { data: "820.00", error: null };
        return new Promise<Result>((resolve) => pending.push(resolve));
      },
    });
    renderGraveyard();
    await loaded();

    await remove("Cloud");
    await screen.findByText("TOTAL MONEY BLED: $700.00/Year");
    await remove("Gym");
    await screen.findByText("TOTAL MONEY BLED: $180.00/Year");
    await waitFor(() => expect(pending).toHaveLength(2));

    // The newer refetch (after both deletes) answers first; the older one arrives late with $700.
    await act(async () => pending[1]({ data: "180.00", error: null }));
    await act(async () => pending[0]({ data: "700.00", error: null }));

    expect(screen.getByText("TOTAL MONEY BLED: $180.00/Year")).toBeInTheDocument();
  });

  it("does not write to Supabase except for the delete itself", async () => {
    const { writes } = installClient();
    renderGraveyard();
    await loaded();
    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Gym" }));
    fireEvent.click(screen.getByRole("button", { name: "Spare all" }));

    await remove("Gym");
    await screen.findByText("TOTAL MONEY BLED: $300.00/Year");

    expect(writes()).toHaveLength(1);
    expect(writes()[0].some(([m]) => m === "delete")).toBe(true);
  });
});

describe("death-certificate poster", () => {
  beforeEach(() => {
    jest.mocked(createClient).mockReset();
    document.body.style.overflow = "scroll";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  async function checkStreamingAndOpen() {
    installClient();
    renderGraveyard();
    await loaded();

    const trigger = screen.getByRole("button", { name: "Generate my poster" });
    expect(trigger).toBeDisabled();
    expect(screen.getByText("Check at least one subscription to make a poster.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Cancel Streaming" }));
    expect(trigger).toBeEnabled();
    expect(screen.queryByText("Check at least one subscription to make a poster.")).not.toBeInTheDocument();

    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Certificate of Death" })).toBeInTheDocument();
    return trigger;
  }

  function stampFace() {
    const dialog = screen.getByRole("dialog", { name: "Certificate of Death" });
    const rotated = [...dialog.querySelectorAll<HTMLElement>("*")].find((el) => el.style.transform.includes("rotate(-15deg)"));
    const face = rotated?.firstElementChild as HTMLElement | undefined;
    if (!rotated || !face) throw new Error("REST IN PEACE stamp was not rendered");
    return { rotated, face };
  }

  it("opens the certificate for a checked subscription, with its yearly amount", async () => {
    await checkStreamingAndOpen();

    const dialog = screen.getByRole("dialog", { name: "Certificate of Death" });
    expect(dialog).toHaveTextContent("Streaming");
    expect(dialog).toHaveTextContent("$180.00");
    expect(dialog).toHaveTextContent("Reclaimed per year");
    expect(dialog).toHaveTextContent("That's $15.00 back every month.");
    expect(dialog).toHaveTextContent("Screenshot to flex your savings!");
    expect(within(dialog).queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
  });

  it("stamps REST IN PEACE in red, rotated about -15 degrees, with a thick red border", async () => {
    await checkStreamingAndOpen();

    const { rotated, face } = stampFace();
    expect(face).toHaveTextContent(/REST IN\s*PEACE/);
    expect(rotated).toHaveStyle({ transform: "translate(-50%, -50%) rotate(-15deg)" });
    expect(face).toHaveStyle({
      color: BLOOD,
      border: `8px solid ${BLOOD}`,
    });
  });

  it("closes on Escape, returns focus to the trigger, and restores background scrolling", async () => {
    const trigger = await checkStreamingAndOpen();

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("closes from the Close button, returns focus to the trigger, and restores background scrolling", async () => {
    const trigger = await checkStreamingAndOpen();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("scroll");
  });
});
