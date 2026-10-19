import { describe, expect, it, onTestFinished, vi } from "vitest";
import { inOrder } from "./order.js";

describe("inOrder", () => {
  it("gives what each item gives, in order, starting each once the one before has settled", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const seen: string[] = [];
    const giving = inOrder([30, 10, 20], async (wait) => {
      seen.push(`start ${String(wait)}`);
      await new Promise((settled) => setTimeout(settled, wait));
      seen.push(`end ${String(wait)}`);
      return wait * 2;
    });
    await vi.runAllTimersAsync();
    expect(await giving).toEqual([60, 20, 40]);
    expect(seen).toEqual([
      "start 30",
      "end 30",
      "start 10",
      "end 10",
      "start 20",
      "end 20",
    ]);
  });

  it("stops at the first item that throws", async () => {
    const started: string[] = [];
    const given = inOrder(["a", "b", "c"], async (item) => {
      started.push(item);
      if (item === "b") {
        throw new Error("b failed");
      }
      return Promise.resolve(item);
    });
    await expect(given).rejects.toThrow("b failed");
    expect(started).toEqual(["a", "b"]);
  });
});
