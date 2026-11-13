describe("SubKiller homepage", () => {
  beforeEach(() => {
    cy.setCookie("subkiller-e2e-signed-out", "1");
  });

  it("loads the signed-out login gate", () => {
    cy.visit("/");

    cy.title().should("eq", "SubKiller");
    cy.get("h1").should("have.text", "SubKiller");
    cy.contains("h2", "Time to face the damage.").should("be.visible");
    cy.get("button[aria-label='Log in with Google']")
      .should("be.visible")
      .and("be.enabled")
      .and("have.attr", "type", "button");
    cy.contains("button", "Log in with Google").should("be.visible");
  });

  for (const path of ["/confess", "/review", "/graveyard"]) {
    it(`sends a signed-out visitor from ${path} back to the login gate`, () => {
      cy.visit(path);

      cy.location("pathname").should("eq", "/");
      cy.get("button[aria-label='Log in with Google']").should("be.visible").and("be.enabled");
      cy.contains("h2", "Time to face the damage.").should("be.visible");
    });
  }
});
