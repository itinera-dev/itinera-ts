import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import {
  classCarriedBy,
  boolean,
  number,
  string,
} from "../../../src/value/token.js";
import type { PlainValue } from "../../../src/value.js";
import { typeFromMetadata } from "../../../src/declaration/metadata.js";

class Payment {
  constructor(readonly cents: number) {}

  static fromValue(value: PlainValue): Payment {
    return new Payment(Number(value));
  }

  toValue(): PlainValue {
    return this.cents;
  }
}

class Plain {
  readonly cents = 1;
}

interface Order {
  readonly id: string;
}

function marked(): MethodDecorator {
  return () => undefined;
}

class Declared {
  @marked()
  take(
    amount: number,
    name: string,
    paid: boolean,
    payment: Payment,
    plain: Plain,
    order: Order,
    either: number | string,
  ): unknown {
    return [amount, name, paid, payment, plain, order, either];
  }

  undecorated(amount: number): number {
    return amount;
  }
}

function read(index: number): StandardSchemaV1 {
  return typeFromMetadata(Declared, "take", index, "Declared.take");
}

describe("typeFromMetadata", () => {
  it.each([
    ["number", 0, number],
    ["string", 1, string],
    ["boolean", 2, boolean],
  ])("reads %s as its token", (_, index, token) => {
    expect(read(index)).toBe(token);
  });

  it("reads a class that serialises itself as a schema carrying it", () => {
    expect(classCarriedBy(read(3))).toBe(Payment);
  });

  it.each([
    ["a class with no fromValue", 4],
    ["an interface", 5],
    ["a union", 6],
  ])("refuses what the metadata cannot say: %s", (_, index) => {
    expect(() => read(index)).toThrow(
      `Declared.take: the type of parameter ${String(index + 1)} cannot be read from the metadata, so its request must write it`,
    );
  });

  it("names the compiler option when nothing was recorded", () => {
    expect(() =>
      typeFromMetadata(Declared, "undecorated", 0, "Declared.undecorated"),
    ).toThrow(
      "Declared.undecorated: a request that writes no type needs the compiler option emitDecoratorMetadata",
    );
  });
});
