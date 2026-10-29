import nextJest from "next/jest.js";

// next/jest loads next.config.ts and .env files and compiles TSX with Next's SWC transform.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Cypress specs run in the browser through Cypress, not Jest.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/cypress/"],
};

export default createJestConfig(config);
