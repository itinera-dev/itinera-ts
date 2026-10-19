import { isDeepStrictEqual } from "node:util";
import type { PlainValue } from "itinera/value";
import type { Line } from "./line.js";

/** Whether the event carries this message: as its message, its error's or its reason's. */
export function carriesMessage(line: Line, message: string): boolean {
  return (
    line.cells.get("message") === message ||
    line.cells.get("error") === message ||
    line.carried.includes(message)
  );
}

/**
 * Whether the event carries this value: within the values it carries, or
 * written within the text it carries. The names it gives, such as a step's
 * or a key's, are not data.
 */
export function carriesValue(line: Line, value: PlainValue): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const values = [
    ...(line.data.kind === "is" ? [line.data.value] : []),
    ...line.carried,
  ];
  const texts = [line.cells.get("message"), line.cells.get("error")];
  return (
    values.some(holding(value)) ||
    (text !== "" &&
      (texts.some(containing(text)) || values.some(holdingText(text))))
  );
}

function holding(value: PlainValue): (carried: PlainValue) => boolean {
  return (carried) => holds(carried, value);
}

function holds(carried: PlainValue, value: PlainValue): boolean {
  return (
    isDeepStrictEqual(carried, value) ||
    (typeof carried === "object" &&
      carried !== null &&
      Object.values(carried).some(holding(value)))
  );
}

function containing(text: string): (cell: string | undefined) => boolean {
  return (cell) => contains(cell, text);
}

function contains(cell: string | undefined, text: string): boolean {
  return cell?.includes(text) === true;
}

function holdingText(text: string): (carried: PlainValue) => boolean {
  return (carried) => holdsText(carried, text);
}

function holdsText(carried: PlainValue, text: string): boolean {
  if (typeof carried === "string") {
    return carried.includes(text);
  }
  if (typeof carried !== "object" || carried === null) {
    return false;
  }
  return (
    Object.keys(carried).some(containing(text)) ||
    Object.values(carried).some(holdingText(text))
  );
}
