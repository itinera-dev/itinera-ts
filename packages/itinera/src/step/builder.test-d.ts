import { describe, it } from "vitest";
import type { Contributor } from "../journey.js";
import { contributor } from "../journey/contributor.js";
import type { Messages } from "../policy/fixtures.js";
import type { OnSuccess } from "../policy/lifecycle.js";
import { fromStep, role } from "../policy/request.js";
import { StepPolicy } from "../policy/step-policy.js";
import { service, serviceType } from "../service/request.js";
import { type Outcome, Step } from "../step.js";
import { integer, string } from "../value/token.js";
import { Workflow } from "../workflow.js";
import type { StepBuilder } from "./builder.js";
import { input } from "./request.js";

interface PaymentGateway {
  take(amount: number): string;
}

const PAYMENT_GATEWAY = serviceType<PaymentGateway>("PaymentGateway");

class Charge extends Step {
  constructor(readonly amount: number) {
    super();
  }

  override run(payments: PaymentGateway, contributing: Contributor): Outcome {
    contributing.contribute("payment", payments.take(this.amount));
    return this.succeed();
  }
}

describe("a step's requests given by position", () => {
  it("compile when each gives what its parameter accepts, in order", () => {
    Charge.builder("charge")
      .needs(input("amount", integer))
      .run(service("payments", PAYMENT_GATEWAY), contributor());
  });

  it("do not compile when one gives what its parameter does not accept", () => {
    // @ts-expect-error a string is not a number
    Charge.builder("charge").needs(input("amount", string));
  });

  it("do not compile in the wrong order", () => {
    Charge.builder("charge").run(
      // @ts-expect-error a contributor is not a payment gateway
      contributor(),
      service("payments", PAYMENT_GATEWAY),
    );
  });

  it("do not compile when a parameter is left without one", () => {
    // @ts-expect-error run takes two parameters
    Charge.builder("charge").run(service("payments", PAYMENT_GATEWAY));
  });

  it("do not compile with one too many", () => {
    // @ts-expect-error the constructor takes one parameter
    Charge.builder("charge").needs(input("amount", integer), contributor());
  });

  it("do not compile with a request for a value whose type is not written", () => {
    // @ts-expect-error a builder cannot read the type from the metadata
    Charge.builder("charge").needs(input("amount"));
  });

  it("do not compile with a request a step cannot make", () => {
    // @ts-expect-error only a hook reads what a step contributed
    Charge.builder("charge").needs(fromStep("amount", integer));
  });
});

describe("a step's policies", () => {
  class Remind extends StepPolicy<Messages> {
    reminded(messages: Messages): OnSuccess {
      messages.tell("charged");
      return this.keepDefault();
    }
  }

  function charge() {
    return Charge.builder("charge")
      .needs(input("amount", integer))
      .run(service("payments", PAYMENT_GATEWAY), contributor())
      .policy(
        Remind.builder("remind").onStepSuccess("reminded", role<Messages>()),
      );
  }

  it("compile on a workflow that implements the roles they request", () => {
    class Shop extends Workflow implements Messages {
      tell(): void {}
    }
    Shop.builder().step(charge());
  });

  it("do not compile on a workflow that does not", () => {
    class Shop extends Workflow {}
    // @ts-expect-error Shop does not tell a customer anything
    Shop.builder().step(charge());
  });

  it("cannot be forgotten by widening the step's builder", () => {
    // @ts-expect-error the builder carries the roles its policies request
    const widened: StepBuilder<typeof Charge> = charge();
    class Shop extends Workflow {}
    Shop.builder().step(widened);
  });
});
