function visitConfess(grantMicrophone: boolean) {
  cy.visit("/confess", {
    onBeforeLoad(win) {
      const stop = cy.stub().as("discardAudio");
      const getUserMedia = grantMicrophone
        ? cy.stub().resolves({ getTracks: () => [{ stop, kind: "audio" }] })
        : cy.stub().rejects(new DOMException("Permission denied", "NotAllowedError"));

      Object.defineProperty(win.navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia },
      });
    },
  });
}

describe("voice confession", () => {
  it("moves from Ready to Recording to Processing and opens Review", () => {
    visitConfess(true);

    cy.contains("h2", "Say what you pay for.").should("be.visible");
    cy.get("[role='status']").should("have.attr", "aria-live", "polite").and("have.text", "Ready");

    cy.get("button[aria-label='Start voice input']").click();

    cy.get("[role='status']").should("have.text", "Recording…");
    cy.get("button[aria-label='Recording']").should("be.disabled");
    cy.get("button[aria-label='Skip option to text']").should("be.disabled");

    cy.get("[role='status']", { timeout: 6000 }).should("have.text", "Processing…");
    cy.get("button[aria-label='Processing']").should("be.disabled");

    cy.url({ timeout: 6000 }).should("include", "/review");
    cy.contains("h2", "Check the paperwork.").should("be.visible");
    cy.get("@discardAudio").should("have.been.called");
  });

  it("stays on Confess when the microphone is blocked, and the skip link still opens Review", () => {
    visitConfess(false);

    cy.get("button[aria-label='Start voice input']").click();
    cy.get("[role='status']").should("have.text", "Microphone blocked");
    cy.url().should("include", "/confess");

    cy.get("button[aria-label='Skip option to text']").should("be.enabled").click();
    cy.url().should("include", "/review");
    cy.contains("h2", "Check the paperwork.").should("be.visible");
  });
});
