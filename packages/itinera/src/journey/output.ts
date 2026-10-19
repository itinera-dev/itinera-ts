import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Option } from "../option.js";
import type { Optional, RequestType } from "../value/token.js";
import type { DataBag } from "./data-bag.js";
import type { Read } from "./read.js";

/**
 * The shape of a journey's output: under each key, the type its value is
 * read as, one of itinera's tokens or any other Standard Schema validator,
 * wrapped in `optional` when the data bag may hold no value under the key.
 *
 * {@includeCode ../../examples/output.ts}
 */
export type OutputShape = Readonly<Record<string, RequestType>>;

/**
 * What a journey's output of the shape `S` reads as: under each key, a value
 * of its type, or an `Option` of one for a type wrapped in `optional`.
 *
 * {@includeCode ../../examples/output.ts}
 */
export type Output<S extends OutputShape> = {
  readonly [K in keyof S]: S[K] extends Optional<infer T>
    ? Option<StandardSchemaV1.InferInput<T>>
    : S[K] extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<S[K]>
      : never;
};

/**
 * Why a journey's output could not be read.
 *
 * {@includeCode ../../examples/output.ts}
 */
export type OutputProblem = JourneyWasAborted | ValueAbsent | ValueOfOtherType;

/**
 * The journey was aborted, and an aborted journey has no data bag.
 *
 * {@includeCode ../../examples/output.ts}
 */
export interface JourneyWasAborted {
  /** Tells this problem from the others. */
  readonly kind: "aborted";
}

/**
 * The data bag holds no value under a key whose type is not wrapped in
 * `optional`.
 *
 * {@includeCode ../../examples/output.ts}
 */
export interface ValueAbsent {
  /** Tells this problem from the others. */
  readonly kind: "absent";
  /** The key the output reads. */
  readonly key: string;
}

/**
 * The data bag holds a value under a key that its type refuses.
 *
 * {@includeCode ../../examples/output.ts}
 */
export interface ValueOfOtherType {
  /** Tells this problem from the others. */
  readonly kind: "other type";
  /** The key the output reads. */
  readonly key: string;
}

/**
 * What reading a journey's output throws when it cannot be read: the
 * journey was aborted, or a key of the output's shape holds no value, or a
 * value its type refuses.
 *
 * {@includeCode ../../examples/output.ts}
 */
export class OutputError extends Error {
  /** Names the kind of error, as every error's `name` does. */
  override readonly name = "OutputError";

  /** Why the output could not be read. */
  readonly problem: OutputProblem;

  /** The error of an output that could not be read, as `problem` says. */
  constructor(problem: OutputProblem) {
    super(messageOf(problem));
    this.problem = problem;
  }
}

function messageOf(problem: OutputProblem): string {
  switch (problem.kind) {
    case "aborted":
      return "the journey was aborted, so it has no data bag to read";
    case "absent":
      return `the data bag holds no value under "${problem.key}"`;
    case "other type":
      return `the value under "${problem.key}" is not of the type the output reads`;
  }
}

/**
 * The output of the shape `shape` read from `dataBag`, key by key in the
 * shape's order.
 *
 * @throws OutputError on the first key that holds no value, or a value its
 * type refuses.
 */
export function outputOf<S extends OutputShape>(
  dataBag: DataBag,
  shape: S,
): Output<S> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(shape).map((entry) => readEntry(dataBag, entry)),
    ),
  ) as Output<S>;
}

function readEntry(
  dataBag: DataBag,
  [key, type]: readonly [string, RequestType],
): [string, unknown] {
  return [key, valueOf(key, dataBag.read(key, type))];
}

function valueOf(key: string, read: Read<unknown>): unknown {
  switch (read.kind) {
    case "present":
      return read.value;
    case "absent":
      throw new OutputError({ kind: "absent", key });
    case "other type":
      throw new OutputError({ kind: "other type", key });
  }
}
