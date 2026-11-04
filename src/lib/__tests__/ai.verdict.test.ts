import { InvalidVerdictError, parseVerdictResponse } from "@/lib/ai/verdict";

const VALID = JSON.stringify({ score: 25, verdict: "This subscription costs more than the value it provides." });

describe("parseVerdictResponse", () => {
  it("accepts JSON with an integer score from 0 to 100 and a verdict, returned in camelCase", () => {
    expect(parseVerdictResponse(VALID)).toEqual({
      aiScore: 25,
      verdict: "This subscription costs more than the value it provides.",
    });
  });

  it.each([0, 100])("accepts the boundary score %d", (score) => {
    expect(parseVerdictResponse(JSON.stringify({ score, verdict: "Edge case." })).aiScore).toBe(score);
  });

  it("trims surrounding whitespace from the verdict", () => {
    expect(parseVerdictResponse(JSON.stringify({ score: 70, verdict: "  Keep it.  " })).verdict).toBe("Keep it.");
  });

  it.each([
    ["an empty string", ""],
    ["plain text", "Score: 25. Kill it."],
    ["truncated JSON", '{"score": 25, "verdict": "Kill'],
    ["JSON wrapped in prose", 'Here you go: {"score": 25, "verdict": "Kill it."}'],
  ])("rejects %s as malformed JSON", (_label, raw) => {
    expect(() => parseVerdictResponse(raw)).toThrow(InvalidVerdictError);
  });

  it.each([
    ["null", "null"],
    ["an array", JSON.stringify([25, "Kill it."])],
    ["a number", "25"],
    ["a string", JSON.stringify("Kill it.")],
  ])("rejects %s instead of an object", (_label, raw) => {
    expect(() => parseVerdictResponse(raw)).toThrow(InvalidVerdictError);
  });

  it.each([
    ["the score", { verdict: "Kill it." }],
    ["the verdict", { score: 25 }],
    ["both fields", {}],
  ])("rejects output that is missing %s", (_label, value) => {
    expect(() => parseVerdictResponse(JSON.stringify(value))).toThrow(InvalidVerdictError);
  });

  it.each([-1, 101, 1000, -50])("rejects the out-of-range score %d", (score) => {
    expect(() => parseVerdictResponse(JSON.stringify({ score, verdict: "Out of range." }))).toThrow(InvalidVerdictError);
  });

  it.each([
    ["a numeric string", '"25"'],
    ["a word", '"high"'],
    ["a boolean", "true"],
    ["null", "null"],
    ["an object", '{"value": 25}'],
    ["a fraction", "25.5"],
  ])("rejects a score that is %s", (_label, scoreJson) => {
    const raw = `{"score": ${scoreJson}, "verdict": "Bad type."}`;
    expect(() => parseVerdictResponse(raw)).toThrow(InvalidVerdictError);
  });

  it("rejects NaN and Infinity even if a caller hands over a pre-parsed value", () => {
    expect(() => parseVerdictResponse({ score: Number.NaN, verdict: "Not a number." })).toThrow(InvalidVerdictError);
    expect(() => parseVerdictResponse({ score: Number.POSITIVE_INFINITY, verdict: "Infinite." })).toThrow(
      InvalidVerdictError,
    );
  });

  it.each([
    ["empty", ""],
    ["only whitespace", "   "],
    ["a number", 42],
    ["null", null],
    ["an array", ["Kill it."]],
  ])("rejects a verdict that is %s", (_label, verdict) => {
    expect(() => parseVerdictResponse(JSON.stringify({ score: 25, verdict }))).toThrow(InvalidVerdictError);
  });

  it("rejects a verdict longer than the 500 characters the database allows", () => {
    expect(() => parseVerdictResponse(JSON.stringify({ score: 25, verdict: "x".repeat(501) }))).toThrow(
      InvalidVerdictError,
    );
  });

  it("rejects unexpected extra fields, so a model cannot smuggle in other values", () => {
    const raw = JSON.stringify({ score: 25, verdict: "Kill it.", user_id: "someone-else" });
    expect(() => parseVerdictResponse(raw)).toThrow(InvalidVerdictError);
  });

  it("rejects the camelCase aiScore key: the model contract is `score`", () => {
    expect(() => parseVerdictResponse(JSON.stringify({ aiScore: 25, verdict: "Kill it." }))).toThrow(
      InvalidVerdictError,
    );
  });
});
