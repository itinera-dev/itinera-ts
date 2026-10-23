import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const option = {
  name: "ts-results-es",
  importNames: ["None", "Option", "Some"],
  message:
    "Import None, Option and Some from itinera's option module, so that one copy of their types is used.",
};

export default defineConfig(
  { ignores: ["packages/*/dist", "packages/itinera/api"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { paths: [option] },
      ],
    },
  },
  {
    files: ["packages/*/src/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [option],
          patterns: [
            {
              group: ["**/tests", "**/tests/**"],
              message:
                "Only tests import from tests, so that the build, which compiles src alone, never needs them.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/*/tests/integration/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [option],
          patterns: [
            {
              group: ["**/src", "**/src/**"],
              message:
                "An integration test imports only the subpaths applications write, such as itinera/step.",
            },
          ],
        },
      ],
    },
  },
);
