/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards the CI contract from Issue #49: what the pull-request checks run, and
// that the required check names (build-and-test, db-test) stay the same.
const root = join(__dirname, "..");
// Normalized so a Windows checkout (CRLF) parses the same as CI.
const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8").replace(/\r\n/g, "\n");
const scripts: Record<string, string> = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;

/** The text of one job under `jobs:`, from its key to the next job key. */
function job(name: string): string {
  const jobs = workflow.slice(workflow.indexOf("\njobs:"));
  const start = jobs.search(new RegExp(`\\n  ${name}:\\n`));
  if (start === -1) throw new Error(`job ${name} not found`);
  const rest = jobs.slice(start + 1);
  const next = rest.slice(1).search(/\n  [A-Za-z0-9_-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** The `run:` commands of a job, in order. */
function runs(jobText: string): string[] {
  const commands: string[] = [];
  const lines = jobText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s+run:\s*(.*)$/);
    if (!match) continue;
    if (match[1] === "|" || match[1] === ">") {
      const indent = lines[i].search(/\S/);
      while (i + 1 < lines.length && (lines[i + 1].trim() === "" || lines[i + 1].search(/\S/) > indent)) {
        if (lines[i + 1].trim()) commands.push(lines[i + 1].trim());
        i++;
      }
    } else {
      commands.push(match[1].trim());
    }
  }
  return commands;
}

const order = (commands: string[], command: string) => {
  const index = commands.indexOf(command);
  if (index === -1) throw new Error(`"${command}" is not a CI step`);
  return index;
};

describe("CI workflow", () => {
  it("runs on pull requests and pushes to main", () => {
    expect(workflow).toMatch(/pull_request:\s*\n\s+branches: \[ "main" \]/);
    expect(workflow).toMatch(/push:\s*\n\s+branches: \[ "main" \]/);
  });

  it("keeps the required check names build-and-test and db-test", () => {
    expect(() => job("build-and-test")).not.toThrow();
    expect(() => job("db-test")).not.toThrow();
  });

  describe("build-and-test", () => {
    const commands = runs(job("build-and-test"));

    it("keeps the existing guardrails", () => {
      for (const command of [
        "npm ci",
        "npm audit --audit-level=high",
        "npm run lint",
        "npx @google/design.md lint DESIGN.md",
        "npm test",
        "npm run build",
      ]) {
        expect(commands).toContain(command);
      }
    });

    it("type-checks the app and the Cypress project", () => {
      expect(order(commands, "npm run typecheck")).toBeGreaterThan(order(commands, "npm ci"));
    });

    it("runs the Cypress E2E suite headlessly after the unit tests and build", () => {
      const e2e = order(commands, "npm run test:e2e");
      expect(e2e).toBeGreaterThan(order(commands, "npm test"));
      expect(e2e).toBeGreaterThan(order(commands, "npm run build"));
    });

    it("lets a failing step fail the job", () => {
      expect(job("build-and-test")).not.toMatch(/continue-on-error/);
      expect(commands.join("\n")).not.toMatch(/\|\|\s*(true|exit 0|:)\b/);
    });

    it("gives Cypress local placeholder Supabase settings, never repository secrets", () => {
      const text = job("build-and-test");
      expect(text).not.toMatch(/\$\{\{\s*secrets\./);
      expect(text).toMatch(/NEXT_PUBLIC_SUPABASE_URL: http:\/\/127\.0\.0\.1:54321/);
      expect(text).toMatch(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: \S+/);
      expect(text).not.toMatch(/SUPABASE_SECRET_KEY/);
    });
  });

  describe("db-test", () => {
    it("keeps Supabase start and the pgTAP tests", () => {
      const commands = runs(job("db-test"));
      expect(commands).toContain("npm ci");
      expect(commands.some((c) => c.startsWith("npx supabase start"))).toBe(true);
      expect(commands).toContain("npm run test:db");
    });
  });
});

describe("test:e2e script", () => {
  it("turns on the E2E auth harness for the dev server it starts", () => {
    expect(scripts["test:e2e"]).toMatch(/SUBKILLER_E2E_AUTH=1/);
    expect(scripts["test:e2e"]).toMatch(/next dev/);
    expect(scripts["test:e2e"]).toMatch(/cypress:run/);
  });

  it("does not use a POSIX-only inline env assignment, so it also runs on Windows", () => {
    // `VAR=1 next dev` needs a POSIX shell; npm runs scripts with cmd.exe on Windows.
    // Every inline assignment must go through cross-env.
    const assignments = [...` ${scripts["test:e2e"]}`.matchAll(/(\S*)\s+"?([A-Z_]+=\S+)/g)];
    expect(assignments.length).toBeGreaterThan(0);
    for (const [, before, assignment] of assignments) {
      expect({ assignment, before: before.replace(/"/g, "") }).toEqual({ assignment, before: "cross-env" });
    }
  });

  it("runs Cypress headlessly", () => {
    expect(scripts["cypress:run"]).toMatch(/^cypress run\b/);
  });
});
