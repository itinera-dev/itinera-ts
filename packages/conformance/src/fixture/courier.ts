/**
 * The courier workflow: packs a parcel and dispatches it, asynchronously,
 * with the labels and the courier its service providers supply.
 */
import {
  type Contributor,
  contributor,
  type DataBag,
  dataBag,
  type JourneyId,
  journeyId,
} from "itinera/journey";
import {
  type Provided,
  provider,
  providerReporter,
  type ProviderReporter,
  service,
  serviceType,
} from "itinera/service";
import {
  attempt,
  type Attempt,
  input,
  type Outcome,
  Step,
  step,
} from "itinera/step";
import { string } from "itinera/value";
import {
  fromWorkflow,
  idGenerator,
  withStep,
  Workflow,
  workflow,
} from "itinera/workflow";

/** Labels the parcels of a journey. */
interface Labels {
  label(parcel: string): string;
}

/** Carries parcels, as far as it reaches: the parcel's carriage, or nothing. */
interface Courier {
  carry(parcel: string): string | undefined;
}

const LABELS = serviceType<Labels>("Labels");
const COURIER = serviceType<Courier>("Courier");

/** Labels each parcel for the journey it travels in. */
class Printer implements Labels {
  constructor(private readonly journey: JourneyId) {}

  label(parcel: string): string {
    return `${parcel} for ${this.journey}`;
  }
}

/** A vehicle that carries parcels of up to `reach` letters. */
class Vehicle implements Courier {
  constructor(
    private readonly name: string,
    private readonly reach: number,
  ) {}

  carry(parcel: string): string | undefined {
    return parcel.length <= this.reach
      ? `${parcel} by ${this.name}`
      : undefined;
  }
}

/** Packs the parcel the initial data names. */
@step()
class Pack extends Step {
  constructor(@input("parcel", string) readonly parcel: string) {
    super();
  }

  override run(
    @service("labels", LABELS) labels: Labels,
    @contributor() contributor: Contributor,
  ): Promise<Outcome> {
    contributor.contribute("packed", labels.label(this.parcel));
    return Promise.resolve(this.succeed());
  }
}

/** Dispatches the parcel, which may be retried while the courier cannot reach it. */
@step()
class Dispatch extends Step {
  constructor(@input("parcel", string) readonly parcel: string) {
    super();
  }

  override run(
    @service("courier", COURIER) courier: Courier,
    @service("labels", LABELS) labels: Labels,
    @contributor() contributor: Contributor,
  ): Promise<Outcome> {
    const carried = courier.carry(this.parcel);
    if (carried === undefined) {
      return Promise.resolve(this.fail("unreachable"));
    }
    contributor.contribute("dispatched", carried);
    contributor.contribute("labelled", labels.label(this.parcel));
    return Promise.resolve(this.succeed());
  }
}

/** The courier workflow, whose steps and one provider are asynchronous. */
@workflow({ name: "courier" })
@withStep(Pack, { name: "pack" })
@withStep(Dispatch, { name: "dispatch", retryBudget: 1 })
export class Couriers extends Workflow {
  /** The journey's labels, made once and lent to every step and attempt. */
  @provider(LABELS)
  labels(@journeyId() id: JourneyId): Provided<Labels> {
    return this.provide(new Printer(id));
  }

  /**
   * A courier for each attempt to dispatch, of the company the data bag
   * names: a van, which reaches parcels of up to five letters, on a first
   * attempt, and a lorry, which reaches every parcel, on later ones. No
   * company cannot be sent.
   */
  @provider(COURIER, { perAttempt: true, steps: ["dispatch"] })
  async courier(
    @attempt() attempt: Attempt,
    @fromWorkflow("company", string) company: string,
    @providerReporter() reporter: ProviderReporter,
  ): Promise<Provided<Courier>> {
    if (company === "none") {
      throw new Error("no courier");
    }
    const [vehicle, reach] = attempt.isFirst()
      ? ["van", 5]
      : ["lorry", Number.POSITIVE_INFINITY];
    await reporter.info(`sending the ${company} ${vehicle}`);
    return this.provide(new Vehicle(`${company} ${vehicle}`, reach));
  }

  @idGenerator()
  parcelId(@dataBag() data: DataBag): string {
    const parcel = data.read("parcel", string).option();
    return `parcel-${parcel.unwrapOr("unnamed")}`;
  }
}
