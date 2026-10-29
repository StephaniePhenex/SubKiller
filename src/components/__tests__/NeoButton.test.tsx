import { fireEvent, render, screen } from "@testing-library/react";
import { NeoButton } from "@/components/NeoButton";

describe("NeoButton", () => {
  it("renders an accessible button with its label", () => {
    render(<NeoButton>Face the damage</NeoButton>);

    expect(screen.getByRole("button", { name: "Face the damage" })).toBeInTheDocument();
  });

  it("defaults to type=button so it never submits a surrounding form", () => {
    render(<NeoButton>Face the damage</NeoButton>);

    expect(screen.getByRole("button", { name: "Face the damage" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when pressed", () => {
    const handleClick = jest.fn();
    render(<NeoButton onClick={handleClick}>Face the damage</NeoButton>);

    fireEvent.click(screen.getByRole("button", { name: "Face the damage" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
