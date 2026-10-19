import { describe, expectTypeOf, it } from "vitest";
import type { AsValue, PlainValue, SerialisesItself, Value } from "./value.js";

class Payment implements SerialisesItself {
  constructor(readonly cents: number) {}

  toValue(): Value {
    return { cents: this.cents };
  }
}

class Data {
  readonly cents = 1250;
}

interface Order {
  readonly id: string;
  readonly coupon?: string;
  readonly lines: readonly { readonly sku: string }[];
  readonly payment: Payment;
}

function asValue<T>(value: T & AsValue<T>): T {
  return value;
}

declare const order: Order;
declare const withMethod: { readonly id: string; total(): number };

describe("Value", () => {
  it("accepts plain data", () => {
    expectTypeOf<PlainValue>().toExtend<Value>();
  });

  it("accepts an object that serialises itself", () => {
    expectTypeOf<Payment>().toExtend<Value>();
  });

  it("accepts an object that serialises itself inside plain data", () => {
    expectTypeOf<{ payments: Payment[] }>().toExtend<Value>();
  });

  it("refuses undefined", () => {
    expectTypeOf<undefined>().not.toExtend<Value>();
  });

  it("refuses a function", () => {
    expectTypeOf<() => void>().not.toExtend<Value>();
  });

  it("refuses a symbol", () => {
    expectTypeOf<symbol>().not.toExtend<Value>();
  });

  it("refuses a bigint", () => {
    expectTypeOf<bigint>().not.toExtend<Value>();
  });

  it("refuses a Date", () => {
    expectTypeOf<Date>().not.toExtend<Value>();
  });

  it("refuses a Map", () => {
    expectTypeOf<Map<string, number>>().not.toExtend<Value>();
  });

  it("refuses a Date inside plain data", () => {
    expectTypeOf<{ when: Date }>().not.toExtend<Value>();
  });
});

describe("PlainValue", () => {
  it("refuses an object that serialises itself", () => {
    expectTypeOf<Payment>().not.toExtend<PlainValue>();
  });
});

describe("AsValue", () => {
  it("accepts an interface with an optional property", () => {
    expectTypeOf(asValue(order)).toEqualTypeOf<Order>();
  });

  it("accepts objects that serialise themselves inside a list", () => {
    expectTypeOf(asValue({ payments: [new Payment(1)] })).toExtend<{
      payments: readonly Payment[];
    }>();
  });

  it("accepts every Value", () => {
    expectTypeOf(asValue<Value>(null)).toEqualTypeOf<Value>();
  });

  it("refuses a Date", () => {
    // @ts-expect-error: a Date is not a value
    asValue(new Date());
  });

  it("refuses undefined inside an object", () => {
    // @ts-expect-error: undefined is not a value
    asValue({ id: "R-1", coupon: undefined });
  });

  it("refuses a method", () => {
    // @ts-expect-error: a method is not a value
    asValue(withMethod);
  });

  it("refuses a bigint inside a list", () => {
    // @ts-expect-error: a bigint is not a value
    asValue([1n]);
  });

  it("refuses unknown", () => {
    // @ts-expect-error: unknown may be anything
    asValue(order as unknown);
  });

  it("lets an instance whose members are all data through, for the run-time check", () => {
    expectTypeOf(asValue(new Data())).toEqualTypeOf<Data>();
  });
});
