import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "@/components/receipt/ScoreBadge";
import { GraveyardList } from "@/components/receipt/GraveyardList";
import { INITIAL_SUBSCRIPTIONS } from "@/components/receipt/data";
import { BLOOD, CHART, INK, MINT, WHITE } from "@/components/receipt/palette";

describe("ScoreBadge", () => {
  it.each([
    [0, BLOOD, WHITE],
    [29, BLOOD, WHITE],
    [30, CHART, INK],
    [69, CHART, INK],
    [70, MINT, INK],
    [100, MINT, INK],
  ])("renders %d with the band colour from the palette", (score, background, color) => {
    render(<ScoreBadge score={score} />);

    expect(screen.getByRole("img", { name: `Importance score ${score} out of 100` })).toHaveStyle({
      backgroundColor: background,
      color,
    });
  });

  it("shows the number itself, prominently, and is not a form control", () => {
    render(<ScoreBadge score={25} />);

    const badge = screen.getByRole("img", { name: "Importance score 25 out of 100" });
    expect(badge).toHaveTextContent("25");
    expect(badge.tagName).not.toMatch(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("gives the compact Graveyard badge the same accessible name", () => {
    render(<ScoreBadge score={41} size="compact" />);
    expect(screen.getByRole("img", { name: "Importance score 41 out of 100" })).toHaveTextContent("41");
  });
});

describe("Graveyard score badges", () => {
  it("label every row's score for screen readers", () => {
    render(<GraveyardList subscriptions={INITIAL_SUBSCRIPTIONS} onToggle={jest.fn()} onDelete={jest.fn()} />);

    for (const sub of INITIAL_SUBSCRIPTIONS) {
      expect(screen.getByRole("img", { name: `Importance score ${sub.aiScore} out of 100` })).toBeInTheDocument();
    }
  });
});
