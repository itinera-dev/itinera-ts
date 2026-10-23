import assert from "node:assert/strict";
import type { SerialisesItself } from "itinera/value";

class Payment implements SerialisesItself {
  constructor(readonly cents: number) {}

  toValue(): { readonly cents: number } {
    return { cents: this.cents };
  }

  static fromValue(value: { readonly cents: number }): Payment {
    return new Payment(value.cents);
  }
}

const payment = new Payment(1250);

assert.equal(Payment.fromValue(payment.toValue()).cents, 1250);
