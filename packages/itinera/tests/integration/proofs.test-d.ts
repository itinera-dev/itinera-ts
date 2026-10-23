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
