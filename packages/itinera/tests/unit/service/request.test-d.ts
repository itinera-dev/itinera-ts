import { describe, expectTypeOf, it } from "vitest";
import { type Outcome, Step, type StepClass } from "../../../src/step.js";
import { service, serviceType } from "../../../src/service/request.js";

interface PaymentGateway {
  take(amount: number): string;
}

interface Mailer {
  send(message: string): void;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

describe("service", () => {
  it("compiles on a parameter of run typed as the service", () => {
    class Charge extends Step {
      override run(
        @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
      ): Outcome {
        payments.take(1);
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a parameter of another type", () => {
    class Charge extends Step {
      override run(
        // @ts-expect-error a payment gateway is not a mailer
        @service("payments", PAYMENT_GATEWAY) payments: Mailer,
      ): Outcome {
        payments.send("charged");
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on the constructor", () => {
    class Charge extends Step {
      constructor(
        // @ts-expect-error services are given to run
        @service("payments", PAYMENT_GATEWAY) readonly payments: PaymentGateway,
      ) {
        super();
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a method other than run", () => {
    class Charge extends Step {
      override run(): Outcome {
        return this.succeed();
      }

      pay(
        // @ts-expect-error only run is given services
        @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
      ): string {
        return payments.take(1);
      }
    }
    expectTypeOf(Charge).toExtend<StepClass>();
  });

  it("does not compile on a class that is not a step", () => {
    class Pricing {
      pay(
        // @ts-expect-error only a step requests services
        @service("payments", PAYMENT_GATEWAY) payments: PaymentGateway,
      ): string {
        return payments.take(1);
      }
    }
    expectTypeOf(Pricing).toBeConstructibleWith();
  });

  it("cannot be made from a plain object", () => {
    // @ts-expect-error only serviceType makes a service type
    const made: typeof PAYMENT_GATEWAY = { name: "PaymentGateway" };
    expectTypeOf(made).not.toBeNever();
  });
});
