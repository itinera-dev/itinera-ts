import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: [
      {
        find: /^itinera\/(.*)$/,
        replacement: fileURLToPath(
          new URL("packages/itinera/src/$1.ts", import.meta.url),
        ),
      },
    ],
  },
  test: {
    typecheck: { enabled: true },
  },
});
