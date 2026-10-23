import { type DataTable, Then } from "@cucumber/cucumber";
import { rows } from "../model.js";
import {
  areExactly,
  expectedLine,
  includesInOrder,
  type Line,
  lineOf,
} from "../trace.js";
import { holds } from "../unmet.js";
import type { World } from "../world.js";

Then<World>("the events include, in order:", function (table: DataTable) {
  compare(this, table, includesInOrder, "to include, in order");
});

Then<World>("the events are exactly:", function (table: DataTable) {
  compare(this, table, areExactly, "to be exactly");
});

function compare(
  world: World,
  table: DataTable,
  agree: (lines: readonly Line[], expected: readonly Line[]) => boolean,
  how: string,
): void {
  const expected = rows(table).map(expectedLine);
  const lines = world.stream().map(lineOf);
  holds(
    agree(lines, expected),
    `the events ${how} ${written(expected)}`,
    written(lines),
  );
}

function written(lines: readonly Line[]): string {
  return lines.map(writtenLine).join("; ");
}

function writtenLine(line: Line): string {
  return JSON.stringify([
    line.event,
    Object.fromEntries(line.cells),
    line.data,
  ]);
}
