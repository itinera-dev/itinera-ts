import type { DataTable } from "@cucumber/cucumber";
import { ModelError } from "./error.js";
import { scripted, type Scripted } from "./value.js";

/**
 * One row of a sentence's table, read by the column names of its header. An
 * empty cell counts as no cell, as the cases write a value not compared.
 */
export class Row {
  readonly #cells: ReadonlyMap<string, string>;

  constructor(cells: ReadonlyMap<string, string>) {
    this.#cells = cells;
  }

  /** The cell under this column, if the row has one that is not empty. */
  optional(column: string): string | undefined {
    const cell = this.#cells.get(column);
    return cell === "" ? undefined : cell;
  }

  /** The columns of the row's table, in the order of its header. */
  columns(): string[] {
    return [...this.#cells.keys()];
  }

  /** The cell under this column, which the row must have. */
  required(column: string): string {
    const cell = this.optional(column);
    if (cell === undefined) {
      throw new ModelError(`a row has no ${column}`);
    }
    return cell;
  }
}

/** The rows of a sentence's table, under its header. */
export function rows(table: DataTable): Row[] {
  return table.hashes().map(toRow);
}

function toRow(cells: Record<string, string>): Row {
  return new Row(new Map(Object.entries(cells)));
}

/** A row's key, with the value written as JSON beside it. */
export function keyAndValue(row: Row): [string, Scripted] {
  return [row.required("key"), scripted(row.required("value"))];
}
