/**
 * Zod, which itinera's type tokens are built on, for an application's own
 * schemas.
 *
 * Import `z` from here rather than from `zod`, so that the application and
 * itinera share one copy of Zod: an ESM application importing `zod` itself
 * loads a second copy beside the one itinera loads. A schema from any copy
 * of Zod, or from any other library that implements Standard Schema, is
 * accepted wherever a request names its type.
 *
 * Zod's declarations name the global `URL`, so a project compiles them with
 * Node's types or the DOM library, or with `skipLibCheck`.
 *
 * {@includeCode ../examples/schema.ts}
 *
 * @module
 */
export { z } from "zod";
