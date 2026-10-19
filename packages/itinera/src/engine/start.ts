import { Refusal } from "../executor/refusal.js";
import type { WorkflowInstance } from "../instance.js";
import type { Dispatcher, DispatcherFactory, Reporter } from "../report.js";
import type { PlainValue, Value } from "../value.js";
import { capture } from "../value/capture.js";
import { Failures, Guard } from "./guard.js";
import { messageOf } from "./message.js";

/** What a journey starts with, once nothing refused it. */
interface Started {
  /** The initial data, captured. */
  readonly data: ReadonlyMap<string, PlainValue>;
  /** The journey's dispatcher, holding the instance's reporters, guarded. */
  readonly dispatcher: Dispatcher;
  /** The failures of the guarded reporters. */
  readonly failures: Failures;
}

const handed = new WeakSet<object>();

/** The key of the journey ID's own entry of global metadata. */
const journeyIdKey = "journey_id";

/**
 * Does everything that comes before the journey, in order: refuses an
 * instance handed over before, captures the initial data and global
 * metadata, makes the dispatcher, adds the guarded reporters, then sets the
 * journey ID and the initial global metadata.
 *
 * @throws Refusal when any of it refuses the instance or fails.
 */
export async function start(
  instance: WorkflowInstance,
  factory: DispatcherFactory,
): Promise<Started> {
  if (handed.has(instance)) {
    throw new Refusal({ kind: "instance ran" });
  }
  handed.add(instance);
  const data = captured(instance.initialData, isAnyKey);
  const metadata = captured(instance.takeGlobalMetadata(), isNotReserved);
  if (data.refused.length > 0 || metadata.refused.length > 0) {
    throw new Refusal({
      kind: "initial values",
      initialData: data.refused,
      initialGlobalMetadata: metadata.refused,
    });
  }
  const dispatcher = await made(factory);
  const failures = new Failures();
  await added(dispatcher, instance.takeReporters(), failures);
  await introduced(
    dispatcher,
    [[journeyIdKey, instance.journeyId], ...metadata.values],
    failures,
  );
  return { data: data.values, dispatcher, failures };
}

/** Values by key once captured, and the keys whose values were refused. */
interface Captured {
  readonly values: Map<string, PlainValue>;
  readonly refused: string[];
}

function captured(
  given: ReadonlyMap<string, Value>,
  isAccepted: (key: string) => boolean,
): Captured {
  return [...given].reduce<Captured>(
    (so, entry) => withEntry(so, entry, isAccepted),
    { values: new Map(), refused: [] },
  );
}

function withEntry(
  so: Captured,
  [key, value]: readonly [string, Value],
  isAccepted: (key: string) => boolean,
): Captured {
  const kept = capture(value);
  if (kept.isOk() && isAccepted(key)) {
    so.values.set(key, kept.value);
  } else {
    so.refused.push(key);
  }
  return so;
}

function isAnyKey(): boolean {
  return true;
}

function isNotReserved(key: string): boolean {
  return key !== journeyIdKey;
}

async function made(factory: DispatcherFactory): Promise<Dispatcher> {
  try {
    return await factory.create();
  } catch (error) {
    throw new Refusal({
      kind: "dispatcher factory failed",
      error,
      errorMessage: messageOf(error),
    });
  }
}

async function added(
  dispatcher: Dispatcher,
  reporters: readonly Reporter[],
  failures: Failures,
): Promise<void> {
  try {
    for (const reporter of reporters) {
      await dispatcher.add(new Guard(reporter, failures));
    }
  } catch (error) {
    throw new Refusal({
      kind: "dispatcher failed",
      error,
      errorMessage: messageOf(error),
    });
  }
}

async function introduced(
  dispatcher: Dispatcher,
  entries: readonly (readonly [string, PlainValue])[],
  failures: Failures,
): Promise<void> {
  try {
    for (const [key, value] of entries) {
      await dispatcher.setGlobalMetadata(key, value);
    }
  } catch (thrown) {
    throw notSet(failures.first?.error ?? thrown);
  }
  if (failures.first !== undefined) {
    throw notSet(failures.first.error);
  }
}

function notSet(error: unknown): Refusal {
  return new Refusal({
    kind: "global metadata not set",
    error,
    errorMessage: messageOf(error),
  });
}
