import { describe, it } from "vitest";
import type { ProviderName } from "./service.js";

declare function providing(provider: ProviderName): void;

describe("ProviderName", () => {
  it("is never a plain string", () => {
    // @ts-expect-error a plain string is not a provider name
    providing("payments");
  });
});
