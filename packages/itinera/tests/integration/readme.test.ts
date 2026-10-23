import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = join(__dirname, "..", "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

it("shows the first workflow example in the package overview as it is", () => {
  const overview = read("README.md");
  const shown = /```ts\n([\s\S]*?)```/.exec(overview)?.[1];
  expect(shown).toBe(read("examples/first-workflow.ts"));
});
