describe("SubKiller homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads with the SubKiller title and heading", () => {
    cy.title().should("eq", "SubKiller");
    cy.get("h1").should("have.text", "SubKiller");
  });

  it("shows the Google login gate", () => {
    cy.contains("h2", "Time to face the damage.").should("be.visible");
    cy.contains("button", "Log in with Google")
      .should("be.visible")
      .and("have.attr", "type", "button")
      .and("have.attr", "aria-label", "Log in with Google");
    cy.contains("TOTAL MONEY BLED").should("not.exist");
  });
});
