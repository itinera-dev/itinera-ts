import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../package.json";

const modules = Object.entries(manifest.exports).filter(isModule);

function isModule([subpath]: [string, unknown]): boolean {
  return subpath !== "./package.json";
}

function moduleName(subpath: string): string {
  return subpath === "." ? "index" : subpath.slice("./".length);
}

describe.each(modules)("the subpath %s", (subpath, target) => {
  const name = moduleName(subpath);

  it("is imported from its ESM layer and required from its CommonJS module", () => {
    expect(target).toEqual({
      import: { types: `./dist/${name}.d.mts`, default: `./dist/${name}.mjs` },
      require: { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` },
    });
  });

  it("has an ESM layer that only re-exports its CommonJS module", () => {
    const layer = readFileSync(
      join(__dirname, "..", "src", `${name}.mts`),
      "utf8",
    );
    expect(layer).toBe(`export * from "./${name}.js";\n`);
  });
});
