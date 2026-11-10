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

  /**
   * The whole number in the cell under this column, which the row must
   * have.
   *
   * @throws ModelError when the cell holds anything else.
   */
  count(column: string): number {
    const cell = this.required(column);
    if (!/^\d+$/.test(cell)) {
      throw new ModelError(`"${cell}" under ${column} is not a whole number`);
    }
    return Number(cell);
  }

  /**
   * Refuses a column its sentence does not define, which would otherwise
   * add or check nothing.
   *
   * @throws ModelError when the row's table has one.
   */
  refuseColumnsBeyond(known: readonly string[]): void {
    const unknown = this.columns().find(isNotIn(known));
    if (unknown !== undefined) {
      throw new ModelError(`"${unknown}" is not a column of this table`);
    }
  }
}

function isNotIn(known: readonly string[]): (column: string) => boolean {
  return (column) => isNotAmong(column, known);
}

function isNotAmong(column: string, known: readonly string[]): boolean {
  return !known.includes(column);
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
