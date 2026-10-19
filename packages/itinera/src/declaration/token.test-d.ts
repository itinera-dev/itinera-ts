import { describe, expectTypeOf, it } from "vitest";
import type { Place } from "./parameter.js";
import type { MethodKey, ParametersOf, Token, Tokens } from "./token.js";

class Till {
  readonly opened = "today";

  counted(amount: number, note?: string): string {
    return `${String(amount)} ${note ?? ""}`;
  }

  async closed(): Promise<string> {
    return Promise.resolve("closed");
  }

  emptied(): number {
    return 0;
  }
}

describe("Tokens", () => {
  it("asks one request per parameter, an optional one included", () => {
    expectTypeOf<
      Tokens<ParametersOf<Till, "counted">, Place<Till, "counted">>
    >().toEqualTypeOf<
      readonly [
        Token<number, Place<Till, "counted">>,
        Token<string | undefined, Place<Till, "counted">>,
      ]
    >();
  });
});

describe("MethodKey", () => {
  it("names the methods returning the type, or a promise of it, and no field", () => {
    expectTypeOf<MethodKey<Till, string>>().toEqualTypeOf<
      "counted" | "closed"
    >();
  });
});
