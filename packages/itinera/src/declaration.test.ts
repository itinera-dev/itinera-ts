import { describe, expect, it } from "vitest";
import {
  refuseConstructorParameters,
  refuseMethodParameters,
  requireMetadata,
} from "./declaration.js";

function marked(): MethodDecorator {
  return () => undefined;
}

class Recorded {
  @marked()
  withDefault(size = 1): number {
    return size;
  }

  withoutMetadata(size = 1): number {
    return size;
  }
}

describe("requireMetadata", () => {
  it("accepts a decorated method, whose parameters the compiler recorded", () => {
    expect(() => {
      requireMetadata(Recorded.prototype, "withDefault");
    }).not.toThrow();
  });

  it("names the compiler option when nothing was recorded", () => {
    expect(() => {
      requireMetadata(Recorded.prototype, "withoutMetadata");
    }).toThrow(
      "Recorded.withoutMetadata: itinera's decorators need the compiler option emitDecoratorMetadata",
    );
  });
});

describe("refuseMethodParameters", () => {
  it("counts a parameter with a default value from what the compiler recorded", () => {
    expect(() => {
      refuseMethodParameters(Recorded.prototype, "withDefault");
    }).toThrow("Recorded.withDefault has a parameter with no request");
  });

  it("misses a parameter with a default value where nothing was recorded", () => {
    expect(() => {
      refuseMethodParameters(Recorded.prototype, "withoutMetadata");
    }).not.toThrow();
  });
});

describe("refuseConstructorParameters", () => {
  it("accepts a class whose constructor takes nothing", () => {
    expect(() => {
      refuseConstructorParameters(Recorded);
    }).not.toThrow();
  });
});
