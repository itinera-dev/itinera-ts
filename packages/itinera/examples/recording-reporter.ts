import assert from "node:assert/strict";
import { DefaultDispatcherFactory, RecordingReporter } from "itinera/unstable";

export default (async () => {
  const recorder = new RecordingReporter();
  const dispatcher = new DefaultDispatcherFactory().create();
  dispatcher.add(recorder);
  await dispatcher.setGlobalMetadata("tenant", "acme");
  await dispatcher.setGlobalMetadata("region", "eu");
  await dispatcher.setGlobalMetadata("tenant", "globex");
  assert.deepEqual(
    [...recorder.globalMetadata],
    [
      ["tenant", "globex"],
      ["region", "eu"],
    ],
  );
  assert.deepEqual(recorder.events, []);
  assert.deepEqual(recorder.path, []);
})();
