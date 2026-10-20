import { isDeepStrictEqual } from "node:util";
import { type DataTable, Then } from "@cucumber/cucumber";
import type { ListedService, ListedStep } from "itinera/unstable";
import { type Row, rows } from "../../model.js";
import { holds } from "../../unmet.js";
import type { World } from "../../world.js";

/** The columns every listing table has, then those a table may leave out. */
const columns = ["step", "position", "policies", "adapter"] as const;
const optionalColumns = [
  "services",
  "rescue",
  "rescue adapter",
  "rescue services",
] as const;

type Column = (typeof columns)[number] | (typeof optionalColumns)[number];

Then<World>("the listing is:", function (table: DataTable) {
  const expected = rows(table);
  const shown = [...columns, ...optionalColumns.filter(inTable(table))];
  const written = expected.map((row) => rowWritten(row, shown));
  const found = this.listing.map((listed) => listedWritten(listed, shown));
  holds(
    isDeepStrictEqual(found, written),
    `the listing ${JSON.stringify(written)}`,
    JSON.stringify(found),
  );
});

function inTable(table: DataTable): (column: string) => boolean {
  const [header = []] = table.raw();
  return (column) => header.includes(column);
}

function rowWritten(row: Row, shown: readonly Column[]): string[] {
  return shown.map((column) => cellWritten(row, column));
}

function cellWritten(row: Row, column: Column): string {
  return row.optional(column) ?? "";
}

function listedWritten(listed: ListedStep, shown: readonly Column[]): string[] {
  return shown.map((column) => cellOf(listed, column));
}

/** What the listing shows of the step in the column, as the table writes it. */
function cellOf(listed: ListedStep, column: Column): string {
  switch (column) {
    case "step":
      return listed.step;
    case "position":
      return String(listed.position);
    case "policies":
      return listed.policies.join(", ");
    case "adapter":
      return listed.adapter ?? "";
    case "services":
      return servicesWritten(listed.services);
    case "rescue":
      return listed.rescue?.step ?? "";
    case "rescue adapter":
      return listed.rescue?.adapter ?? "";
    case "rescue services":
      return servicesWritten(listed.rescue?.services ?? []);
  }
}

function servicesWritten(services: readonly ListedService[]): string {
  return services.map(serviceWritten).join(", ");
}

function serviceWritten({ key, provider }: ListedService): string {
  return `${key}: ${provider}`;
}
