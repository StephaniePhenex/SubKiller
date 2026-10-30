describe("SubKiller homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads with the SubKiller title and heading", () => {
    cy.title().should("eq", "SubKiller");
    cy.get("h1").should("have.text", "SubKiller");
  });

  it("shows the total money bled summary", () => {
    cy.contains("TOTAL MONEY BLED").should("be.visible");
  });

  it("renders the primary call to action", () => {
    cy.contains("button", "Face the damage").should("be.visible").and("have.attr", "type", "button");
  });
});
