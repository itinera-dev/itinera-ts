import { LocalExecutor } from "itinera/executor";
import type { Dispatching } from "./model/report.js";
import { RecordingDispatcherFactory } from "./record.js";
import type { Recorders } from "./recorders.js";

/** The name of the recording reporter the runner's own dispatchers hold. */
export const runnersRecorder = "the runner's recorder";

/** The executor the scenario runs its journeys with, dispatching as it says. */
export function executorOf(
  dispatching: Dispatching,
  recorders: Recorders,
): LocalExecutor {
  switch (dispatching.kind) {
    case "default":
      return new LocalExecutor();
    case "unstated":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(runnersRecorder), {
          kind: "makes",
          holding: { kind: "adds reporters" },
        }),
      );
    case "holding":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(dispatching.reporter), {
          kind: "makes",
          holding: dispatching.holding,
        }),
      );
    case "failing factory":
      return new LocalExecutor(
        new RecordingDispatcherFactory(recorders.make(runnersRecorder), {
          kind: "fails",
        }),
      );
  }
}
