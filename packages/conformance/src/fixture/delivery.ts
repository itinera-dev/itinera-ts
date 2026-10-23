/** The delivery workflow: dispatches a parcel, asynchronously. */
import { type Contributor, contributor } from "itinera/journey";
import {
  fromStep,
  onStepSuccess,
  type OnSuccess,
  onWorkflowSuccess,
  StepPolicy,
  stepPolicy,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/policy";
import { input, type Outcome, Step, step } from "itinera/step";
import { string } from "itinera/value";
import { withStep, Workflow, workflow } from "itinera/workflow";

/** Dispatches the parcel the initial data names. */
@step()
class Dispatch extends Step {
  constructor(@input("parcel", string) readonly parcel: string) {
    super();
  }

  override run(@contributor() contributor: Contributor): Promise<Outcome> {
    if (this.parcel === "") {
      return Promise.resolve(this.fail("no-parcel"));
    }
    contributor.contribute("dispatched", this.parcel);
    return Promise.resolve(this.succeed());
  }
}

/** Gives a dispatched parcel its tracking code. */
@stepPolicy({ name: "track" })
class Track extends StepPolicy {
  @onStepSuccess()
  tracked(
    @fromStep("dispatched", string) dispatched: string,
    @contributor() contributor: Contributor,
  ): Promise<OnSuccess> {
    contributor.contribute("tracking", `track ${dispatched}`);
    return Promise.resolve(this.keepDefault());
  }
}

/** Signs for a delivered parcel. */
@workflowPolicy({ name: "sign" })
class Sign extends WorkflowPolicy {
  @onWorkflowSuccess()
  signed(@contributor() contributor: Contributor): Promise<void> {
    contributor.contribute("signed", true);
    return Promise.resolve();
  }
}

/** The delivery workflow, whose step and policies are asynchronous. */
@workflow({ name: "delivery", policies: [Sign] })
@withStep(Dispatch, { name: "dispatch", policies: [Track] })
export class Delivery extends Workflow {}
