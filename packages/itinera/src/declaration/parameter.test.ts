import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const loose = resolve(__dirname, "loose.ts");

const valueRequest = `
import { input } from "../step/request.js";
import { Step } from "../step.js";
import { integer } from "../value/token.js";

export class Charge extends Step {
  constructor(@input("amount", integer) readonly amount: number) {
    super();
  }

  override run(): never {
    throw new Error("unused");
  }
}
`;

const request = `
import { stepReporter, type StepReporter } from "../step/request.js";
import { Step } from "../step.js";

export class Ship extends Step {
  override run(@stepReporter() reporter: StepReporter): never {
    throw new Error("unused");
  }
}
`;

const sources = [
  { name: "a request of a value", source: valueRequest },
  { name: "a request of anything else", source: request },
];

function isLoose(file: string): boolean {
  return resolve(file) === loose;
}

function diagnosticsOf(
  source: string,
  options: ts.CompilerOptions,
): readonly string[] {
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.readFile = (file) => (isLoose(file) ? source : read(file));
  host.fileExists = (file) => isLoose(file) || exists(file);
  const program = ts.createProgram([loose], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
}

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2024,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  skipLibCheck: true,
  types: ["node"],
  noEmit: true,
};

describe("a request decorator", () => {
  it.each(sources)(
    "compiles, in $name, with the compiler option strictNullChecks",
    ({ source }) => {
      expect(diagnosticsOf(source, options)).toEqual([]);
    },
  );

  it.each(sources)(
    "does not compile, in $name, without the compiler option strictNullChecks",
    ({ source }) => {
      expect(
        diagnosticsOf(source, { ...options, strictNullChecks: false }).join(
          "\n",
        ),
      ).toContain("itinera needs the compiler option strictNullChecks");
    },
  );
});
