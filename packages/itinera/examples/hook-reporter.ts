import assert from "node:assert/strict";
import {
  type HookReporter,
  hookReporter,
  onWorkflowSuccess,
  WorkflowPolicy,
  workflowPolicy,
} from "itinera/unstable";

@workflowPolicy({ name: "notify" })
class Notify extends WorkflowPolicy {
  @onWorkflowSuccess()
  async paid(@hookReporter() reporter: HookReporter): Promise<void> {
    await reporter.info("customer told", { channel: "email" });
    await reporter.setGlobalMetadata("channel", "email");
  }
}

class Reported implements HookReporter {
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
  await new Notify().paid(reporter);
  assert.deepEqual(reporter.lines, [
    "info: customer told",
    "metadata: channel",
  ]);
})();
