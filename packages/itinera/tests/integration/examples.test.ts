import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const directory = join(__dirname, "..", "..", "examples");
const examples = readdirSync(directory);

describe("the examples", () => {
  it.each(examples)("run %s to the end", async (example) => {
    const ran = (await import(join(directory, example))) as {
      default?: unknown;
    };
    await expect(Promise.resolve(ran.default)).resolves.toBeUndefined();
  });
});
