import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

const directory = join(__dirname, "..", "..", "examples");
const examples = readdirSync(directory, { recursive: true, encoding: "utf8" })
  .filter(isModule)
  .map(toPosix);

function isModule(path: string): boolean {
  return path.endsWith(".ts");
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

describe("the examples", () => {
  it.each(examples)("run %s to the end", async (example) => {
    const ran = (await import(join(directory, example))) as {
      default?: unknown;
    };
    await expect(Promise.resolve(ran.default)).resolves.toBeUndefined();
  });
});
