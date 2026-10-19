import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

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
        {
          paths: [
            {
              name: "ts-results-es",
              importNames: ["None", "Option", "Some"],
              message:
                "Import None, Option and Some from itinera's option module, so that one copy of their types is used.",
            },
          ],
        },
      ],
    },
  },
);
