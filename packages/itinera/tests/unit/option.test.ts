// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- compares the re-exports with the originals
import * as results from "ts-results-es";
import { describe, expect, it } from "vitest";
import * as option from "../../src/option.js";

describe("option", () => {
  it.each([
    ["None", option.None, results.None],
    ["Option", option.Option, results.Option],
    ["Some", option.Some, results.Some],
  ])("re-exports %s from ts-results-es itself", (_, ours, theirs) => {
    expect(ours).toBe(theirs);
  });
});
