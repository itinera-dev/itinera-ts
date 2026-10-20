/**
 * The event stream as the cases' event tables describe it: each event as a
 * line, the line a table's row expects, and how lines are compared.
 */
import { isDeepStrictEqual } from "node:util";
import type { Event } from "itinera/event";
import { eventKind, json, ModelError, type Row } from "./model.js";
import { implementationNamed } from "./model/provider.js";
import { runtimeNameOf } from "./services.js";
import { type Column, type Data, type Line, lineOf } from "./trace/line.js";

export { carriesMessage, carriesValue } from "./trace/carried.js";
export { lineOf, type Line };

const columns: readonly Column[] = [
  "step",
  "attempt",
  "key",
  "code",
  "policy",
  "hook",
  "lifecycle",
  "adapter",
  "provider",
  "implementation",
  "source",
  "cause",
  "rescue",
  "decided by",
  "message",
  "error",
];

const known = new Set<string>(["event", "data", ...columns]);

/**
 * The line a row of an event table expects, holding only its cells that
 * are not empty, since an empty cell is not compared.
 *
 * @throws ModelError when the row has a column event tables do not have,
 * or a cell that cannot be read.
 */
export function expectedLine(row: Row): Line {
  const unknown = row.columns().find(isUnknown);
  if (unknown !== undefined) {
    throw new ModelError(`event tables have no column "${unknown}"`);
  }
  return {
    event: eventKind(row.required("event")),
    cells: new Map(columns.flatMap(cellIn(row))),
    data: dataOf(row.optional("data")),
    carried: [],
  };
}

function isUnknown(column: string): boolean {
  return !known.has(column);
}

function cellIn(row: Row): (column: Column) => [Column, string][] {
  return (column) => cellOf(row, column);
}

function cellOf(row: Row, column: Column): [Column, string][] {
  const cell = row.optional(column);
  if (cell === undefined) {
    return [];
  }
  return [
    [column, column === "implementation" ? implementationIn(cell) : cell],
  ];
}

/**
 * The implementation of `labeller` a cell names, as the language names its
 * type at run time, which is what `service_provided` carries.
 */
function implementationIn(cell: string): string {
  return runtimeNameOf(implementationNamed(cell));
}

function dataOf(cell: string | undefined): Data {
  if (cell === undefined) {
    return { kind: "unstated" };
  }
  return cell === "none" ? { kind: "none" } : { kind: "is", value: json(cell) };
}

function matches(expected: Line): (line: Line) => boolean {
  return (line) => isMatched(expected, line);
}

/** Whether an event's line has every cell, and the data, the expected line states. */
function isMatched(expected: Line, line: Line): boolean {
  return (
    expected.event === line.event &&
    [...expected.cells].every(cellOfLine(line)) &&
    admits(expected.data, line.data)
  );
}

function cellOfLine(line: Line): (cell: [Column, string]) => boolean {
  return ([column, cell]) => hasCell(line, column, cell);
}

function hasCell(line: Line, column: Column, cell: string): boolean {
  return line.cells.get(column) === cell;
}

function admits(expected: Data, data: Data): boolean {
  switch (expected.kind) {
    case "unstated":
      return true;
    case "none":
      return data.kind === "none";
    case "is":
      return (
        data.kind === "is" && isDeepStrictEqual(data.value, expected.value)
      );
  }
}

/** Whether the lines include the expected ones in this order, possibly with others in between. */
export function includesInOrder(
  lines: readonly Line[],
  expected: readonly Line[],
): boolean {
  return expected.reduce(after(lines), 0) !== Infinity;
}

/**
 * The place just after the next line from `from` that matches, or past the
 * end when none does.
 */
function after(
  lines: readonly Line[],
): (from: number, expected: Line) => number {
  return (from, expected) => nextAfter(lines, from, expected);
}

function nextAfter(
  lines: readonly Line[],
  from: number,
  expected: Line,
): number {
  const found = lines.slice(from).findIndex(matches(expected));
  return found === -1 ? Infinity : from + found + 1;
}

/** Whether the lines are exactly the expected ones. */
export function areExactly(
  lines: readonly Line[],
  expected: readonly Line[],
): boolean {
  return lines.length === expected.length && expected.every(matchesAt(lines));
}

function matchesAt(
  lines: readonly Line[],
): (expected: Line, place: number) => boolean {
  return (expected, place) => isMatchedAt(lines, expected, place);
}

function isMatchedAt(
  lines: readonly Line[],
  expected: Line,
  place: number,
): boolean {
  const line = lines[place];
  return line !== undefined && isMatched(expected, line);
}

/** The kind of an event. */
export function kindOf(event: Event): string {
  return event.kind;
}

/** An event's sequence number and line, which two streams are compared by. */
export interface Numbered {
  readonly sequence: number;
  readonly line: Line;
}

/** The event's sequence number and line. */
export function numbered(event: Event): Numbered {
  return { sequence: event.sequence, line: lineOf(event) };
}
