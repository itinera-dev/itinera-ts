import assert from "node:assert/strict";
import {
  type Outcome,
  Step,
  step,
  stepReporter,
  type StepReporter,
} from "itinera/unstable";

@step()
class Ship extends Step {
  override async run(@stepReporter() reporter: StepReporter): Promise<Outcome> {
    await reporter.info("parcel handed over", { carrier: "post" });
    await reporter.setGlobalMetadata("carrier", "post");
    return this.succeed();
  }
}

class Reported implements StepReporter {
  readonly lines: string[] = [];

  info(message: string): Promise<void> {
    return this.record(`info: ${message}`);
  }

  warning(message: string): Promise<void> {
    return this.record(`warning: ${message}`);
  }

  error(message: string): Promise<void> {
    return this.record(`error: ${message}`);
  }

  setGlobalMetadata(key: string): Promise<void> {
    return this.record(`metadata: ${key}`);
  }

  private record(line: string): Promise<void> {
    this.lines.push(line);
    return Promise.resolve();
  }
}

const reporter = new Reported();

export default (async () => {
  assert.deepEqual(await new Ship().run(reporter), { kind: "success" });
  assert.deepEqual(reporter.lines, [
    "info: parcel handed over",
    "metadata: carrier",
  ]);
})();
