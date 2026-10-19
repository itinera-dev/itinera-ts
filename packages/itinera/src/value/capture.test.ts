import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { capture, type NotAValue } from "./capture.js";

class Payment {
  constructor(readonly cents: number) {}

  toValue(): unknown {
    return { cents: this.cents };
  }
}

class Converting {
  constructor(readonly converted: () => unknown) {}

  toValue(): unknown {
    return this.converted();
  }
}

class Data {
  readonly cents = 1250;
}

function refusal(given: unknown): NotAValue {
  return capture(given).expectErr("captured a non-value");
}

function captured(given: unknown): unknown {
  return capture(given).expect("refused a value");
}

function cyclic(): object {
  const order: Record<string, unknown> = { id: "R-1" };
  order["self"] = order;
  return order;
}

function sparse(): unknown[] {
  const list: unknown[] = [1];
  list[2] = 3;
  return list;
}

function withExtraProperty(): unknown[] {
  return Object.assign([1, 2], { total: 3 });
}

function withHiddenProperty(): object {
  return Object.defineProperty({}, "hidden", { value: 1, enumerable: false });
}

function revoked(): object {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
}

function nested(depth: number): unknown {
  return Array.from({ length: depth }).reduce<unknown>(wrapped, null);
}

function wrapped(inner: unknown): unknown {
  return { inner };
}

class Lines extends Array<unknown> {}

function throwing(): never {
  throw new Error("cannot convert");
}

describe("capture", () => {
  it("keeps every JSON value as it is", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (given) => {
        expect(captured(given)).toStrictEqual(given);
      }),
    );
  });

  it("returns a copy that shares nothing with what was given", () => {
    const lines = [{ sku: "tea" }];
    const given = { lines };
    const copy = captured(given);
    lines.push({ sku: "milk" });
    lines[0] = { sku: "coffee" };
    expect(copy).toStrictEqual({ lines: [{ sku: "tea" }] });
  });

  it("keeps a key named __proto__ as a key", () => {
    const given: unknown = JSON.parse('{"__proto__": {"admin": true}}');
    const copy = captured(given) as object;
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.keys(copy)).toStrictEqual(["__proto__"]);
  });

  it("accepts an object without a prototype", () => {
    const given = Object.assign(Object.create(null) as object, { id: "R-1" });
    expect(captured(given)).toStrictEqual({ id: "R-1" });
  });

  it("reads a getter once and keeps what it returned", () => {
    let reads = 0;
    const given = {
      get total() {
        reads += 1;
        return reads;
      },
    };
    expect(captured(given)).toStrictEqual({ total: 1 });
    expect(reads).toBe(1);
  });

  it("turns an object that serialises itself into its value, at any depth", () => {
    const given = { payments: [new Payment(1250), new Payment(300)] };
    expect(captured(given)).toStrictEqual({
      payments: [{ cents: 1250 }, { cents: 300 }],
    });
  });

  it("calls toValue once", () => {
    let calls = 0;
    const given = new Converting(() => {
      calls += 1;
      return calls;
    });
    expect(captured(given)).toBe(1);
    expect(calls).toBe(1);
  });

  it("reads toValue once", () => {
    let reads = 0;
    const given = {
      get toValue() {
        reads += 1;
        return () => "R-1";
      },
    };
    expect(captured(given)).toBe("R-1");
    expect(reads).toBe(1);
  });

  it("accepts an object reached twice that does not contain itself", () => {
    const shared = { sku: "tea" };
    const copy = captured({ first: shared, second: shared });
    expect(copy).toStrictEqual({ first: shared, second: shared });
  });

  it("turns what toValue returns into a value in turn", () => {
    const given = new Converting(() => new Payment(1250));
    expect(captured(given)).toStrictEqual({ cents: 1250 });
  });

  it.each([
    ["NaN", NaN, "is not a finite number"],
    ["infinity", Infinity, "is not a finite number"],
    ["undefined", undefined, "is undefined"],
    ["a function", throwing, "is a function"],
    ["a symbol", Symbol("order"), "is a symbol"],
    ["a bigint", 1n, "is a bigint"],
    ["a Date", new Date(0), "is an object whose prototype is not plain"],
    ["a Map", new Map(), "is an object whose prototype is not plain"],
    [
      "a class instance",
      new Data(),
      "is an object whose prototype is not plain",
    ],
    ["a cycle", cyclic(), "contains itself"],
    [
      "a list with an empty slot",
      sparse(),
      "is a list with an empty slot or another property",
    ],
    [
      "a list with a property",
      withExtraProperty(),
      "is a list with an empty slot or another property",
    ],
    [
      "a list of another class",
      new Uint8Array(1),
      "is an object whose prototype is not plain",
    ],
    [
      "an object with a symbol key",
      { [Symbol("id")]: 1 },
      "has a symbol key or a property not enumerable",
    ],
    [
      "an object with a property not enumerable",
      withHiddenProperty(),
      "has a symbol key or a property not enumerable",
    ],
    [
      "a toValue that throws",
      new Converting(throwing),
      "threw while it was captured",
    ],
    [
      "a toValue that returns no value",
      new Converting(() => undefined),
      "is undefined",
    ],
    [
      "a toValue that returns itself",
      new Converting(function self(this: unknown) {
        return this;
      }),
      "contains itself",
    ],
    [
      "a list of a class of its own",
      Lines.from([1]),
      "is a list whose prototype is not Array.prototype",
    ],
    ["a revoked proxy", revoked(), "threw while it was captured"],
  ])("refuses %s", (_, given, problem) => {
    expect(refusal(given).problem).toBe(problem);
  });

  it("says where in what was given the problem is", () => {
    const given = { order: { lines: [{ sku: "tea" }, { quantity: NaN }] } };
    expect(refusal(given).path).toStrictEqual([
      "order",
      "lines",
      1,
      "quantity",
    ]);
  });

  it("refuses a value nested more deeply than the call stack allows", () => {
    expect(capture(nested(100_000)).isErr()).toBe(true);
  });

  it("refuses a proxy that throws where it is", () => {
    expect(refusal({ order: { lines: revoked() } }).path).toStrictEqual([
      "order",
      "lines",
    ]);
  });

  it("refuses an item whose getter throws, at its index", () => {
    const lines = Object.defineProperty([1], 0, { get: throwing });
    expect(refusal({ lines })).toStrictEqual({
      path: ["lines", 0],
      problem: "threw while it was captured",
    });
  });

  it("reads a toValue that is not a method once, as data", () => {
    let reads = 0;
    const given = {
      get toValue() {
        reads += 1;
        return reads;
      },
    };
    expect(captured(given)).toStrictEqual({ toValue: 1 });
    expect(reads).toBe(1);
  });

  it("refuses a getter that throws, at its key", () => {
    const given = {
      get total(): number {
        return throwing();
      },
    };
    expect(refusal(given)).toStrictEqual({
      path: ["total"],
      problem: "threw while it was captured",
    });
  });
});
