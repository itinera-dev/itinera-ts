import { describe, it } from "vitest";
import { type DataBag, dataBag } from "itinera/journey";
import {
  onStepFailure,
  onStepSuccess,
  onWorkflowSuccess,
  type OnSuccess,
  role,
  StepPolicy,
  stepPolicy,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/policy";
import { provider, serviceType } from "itinera/service";
import {
  type Outcome,
  type RescueOutcome,
  RescueStep,
  rescueStep,
  Step,
  step,
} from "itinera/step";
import {
  idGenerator,
  inputAdapter,
  key,
  type Supplied,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

interface Gateway {
  take(amount: number): string;
}

const gateway: Gateway = { take: String };

interface Messages {
  tell(message: string): void;
}

@step()
class Charge extends Step {
  override run(): Outcome {
    return this.succeed();
  }
}

class Remind extends StepPolicy<Messages> {
  reminded(messages: Messages): OnSuccess {
    messages.tell("charged");
    return this.keepDefault();
  }
}

@stepPolicy({ name: "remind" })
class Reminder extends StepPolicy<Messages> {
  @onStepSuccess()
  reminded(@role<Messages>() messages: Messages): OnSuccess {
    messages.tell("charged");
    return this.keepDefault();
  }
}

@workflowPolicy({ name: "notify" })
class Notify extends WorkflowPolicy<Messages> {
  @onWorkflowSuccess()
  notified(@role<Messages>() messages: Messages): void {
    messages.tell("done");
  }
}

describe("invalid-lifecycle", () => {
  it("a failure hook cannot finish the workflow", () => {
    @stepPolicy({ name: "lenient" })
    class Lenient extends StepPolicy {
      // @ts-expect-error a failure hook cannot finish the workflow
      @onStepFailure()
      forgiven(): OnSuccess {
        return this.finishWorkflow();
      }
    }
    class Forgiving extends StepPolicy {
      forgiven(): OnSuccess {
        return this.finishWorkflow();
      }
    }
    // @ts-expect-error a failure hook cannot finish the workflow
    Forgiving.builder("forgiving").onStepFailure("forgiven");
    return Lenient;
  });
});

describe("role-not-provided", () => {
  it("a policy cannot be attached to a workflow that does not provide its role", () => {
    // @ts-expect-error notify requests Messages, which Orders does not implement
    @workflow({ name: "orders", policies: [Notify] })
    class Orders extends Workflow {}
    // @ts-expect-error remind requests Messages, which Shop does not implement
    @withStep(Charge, { name: "charge", policies: [Reminder] })
    class Shop extends Workflow {}
    class Kiosk extends Workflow {}
    // @ts-expect-error notify requests Messages, which Kiosk does not implement
    Kiosk.builder().policy(Notify);
    Kiosk.builder().step(
      // @ts-expect-error remind requests Messages, which Kiosk does not implement
      Charge.builder("charge").policy(
        Remind.builder("remind").onStepSuccess("reminded", role<Messages>()),
      ),
    );
    return [Orders, Shop];
  });
});

describe("bag-write", () => {
  it("an adapter cannot write through its access to the data bag", () => {
    class Orders extends Workflow {
      @inputAdapter({ steps: ["charge"] })
      pricing(@key() inputKey: string, @dataBag() data: DataBag): Supplied {
        // @ts-expect-error the access to the data bag has no method that writes
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- the call does not compile, which is what the proof shows
        data.set(inputKey, 1);
        return this.fromDataBag();
      }
    }
    return Orders;
  });
});

describe("no-instance", () => {
  it("a service provider cannot return what this.provide(...) does not make", () => {
    const GATEWAY = serviceType<Gateway>("Gateway");
    class Shop extends Workflow {
      // @ts-expect-error a provider returns this.provide(instance), never nothing
      @provider(GATEWAY)
      nothing(): void {}

      // @ts-expect-error a provider returns this.provide(instance), never a bare instance
      @provider(GATEWAY)
      bare(): Gateway {
        return gateway;
      }
    }
    class Kiosk extends Workflow {
      nothing(): void {}

      bare(): Gateway {
        return gateway;
      }
    }
    // @ts-expect-error a provider returns this.provide(instance), never nothing
    Kiosk.builder().provider("nothing", GATEWAY, {});
    // @ts-expect-error a provider returns this.provide(instance), never a bare instance
    Kiosk.builder().provider("bare", GATEWAY, {});
    return Shop;
  });
});

describe("rescue-skip", () => {
  it("a rescue step cannot skip", () => {
    class Skipping extends Step {
      override run(): Outcome {
        return this.skip();
      }
    }
    // @ts-expect-error a rescue step that may skip is not a rescue step
    @rescueStep()
    class Renew extends RescueStep {
      // @ts-expect-error a rescue step's run returns a success or a failure, never a skip
      override run(): Outcome {
        return new Skipping().run();
      }
    }
    class Skips extends RescueStep {
      override run(): RescueOutcome {
        return this.succeed();
      }

      skipping(): unknown {
        // @ts-expect-error a rescue step has no skip, even for its own class
        return this.skip;
      }
    }
    @withStep(Charge, {
      name: "charge",
      // @ts-expect-error a step that may skip is not a rescue step
      rescue: Skipping,
    })
    class Orders extends Workflow {}
    // @ts-expect-error a step that may skip is not a rescue step
    Charge.builder("charge").rescue(Skipping);
    return [Renew, Skips, Orders];
  });
});

describe("unexpected-result", () => {
  it("a step's run cannot return anything but an outcome", () => {
    class Unfinished extends Step {
      // @ts-expect-error a step's run returns an outcome, never undefined
      override run(): undefined {
        return undefined;
      }
    }
    class Later extends Step {
      // @ts-expect-error an asynchronous run resolves to an outcome, never null
      override async run(): Promise<null> {
        return Promise.resolve(null);
      }
    }
    return [Unfinished, Later];
  });

  it("a rescue step's run cannot return anything but a rescue outcome", () => {
    class Renew extends RescueStep {
      // @ts-expect-error a rescue step's run returns a rescue outcome, never null
      override run(): null {
        return null;
      }
    }
    return Renew;
  });

  it("a step hook cannot return anything but keepDefault() or a lifecycle", () => {
    @stepPolicy({ name: "audit" })
    class Audit extends StepPolicy {
      // @ts-expect-error a step hook returns keepDefault() or a lifecycle, never text
      @onStepSuccess()
      said(): string {
        return "done";
      }

      // @ts-expect-error a step hook returns keepDefault() or a lifecycle, never null
      @onStepFailure()
      nothing(): null {
        return null;
      }
    }
    class Ledger extends StepPolicy {
      said(): string {
        return "done";
      }

      nothing(): null {
        return null;
      }
    }
    // @ts-expect-error a step hook returns keepDefault() or a lifecycle, never text
    Ledger.builder("ledger").onStepSuccess("said");
    // @ts-expect-error a step hook returns keepDefault() or a lifecycle, never null
    Ledger.builder("ledger").onStepFailure("nothing");
    return Audit;
  });

  it("an input adapter cannot return anything but what supply() or fromDataBag() make", () => {
    class Orders extends Workflow {
      // @ts-expect-error an input adapter returns supply(value) or fromDataBag(), never undefined
      @inputAdapter({ steps: ["charge"] })
      pricing(): undefined {
        return undefined;
      }
    }
    class Kiosk extends Workflow {
      pricing(): undefined {
        return undefined;
      }
    }
    // @ts-expect-error an input adapter returns supply(value) or fromDataBag(), never undefined
    Kiosk.builder().inputAdapter("pricing", { steps: ["charge"] });
    return Orders;
  });

  it("a service provider cannot return a null-like value", () => {
    const GATEWAY = serviceType<Gateway>("Gateway");
    class Shop extends Workflow {
      // @ts-expect-error a provider returns this.provide(instance), never null
      @provider(GATEWAY)
      none(): null {
        return null;
      }
    }
    class Kiosk extends Workflow {
      none(): null {
        return null;
      }
    }
    // @ts-expect-error a provider returns this.provide(instance), never null
    Kiosk.builder().provider("none", GATEWAY, {});
    return Shop;
  });

  it("a step's constructor cannot return anything but the step", () => {
    @step()
    class Charging extends Step {
      constructor() {
        super();
        // @ts-expect-error a constructor makes its own step, never null
        return null;
      }

      override run(): Outcome {
        return this.succeed();
      }
    }
    return Charging;
  });

  it("a policy's constructor cannot return anything but the policy", () => {
    @stepPolicy({ name: "audit" })
    class Audit extends StepPolicy {
      constructor() {
        super();
        // @ts-expect-error a constructor makes its own policy, never null
        return null;
      }

      @onStepSuccess()
      checked(): OnSuccess {
        return this.keepDefault();
      }
    }
    @workflowPolicy({ name: "closing" })
    class Closing extends WorkflowPolicy {
      constructor() {
        super();
        // @ts-expect-error a constructor makes its own policy, never null
        return null;
      }

      @onWorkflowSuccess()
      closed(): void {
        gateway.take(0);
      }
    }
    return [Audit, Closing];
  });
});

describe("non-string-journey-id", () => {
  it("an ID generator cannot return anything but a string", () => {
    class Orders extends Workflow {
      // @ts-expect-error an ID generator returns a string, never a number
      @idGenerator()
      numbered(): number {
        return 7;
      }
    }
    class Kiosk extends Workflow {
      numbered(): number {
        return 7;
      }
    }
    // @ts-expect-error an ID generator returns a string, never a number
    Kiosk.builder().idGenerator("numbered");
    return Orders;
  });
});
