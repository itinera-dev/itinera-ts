# itinera-ts

The TypeScript implementation of [Itinera](https://github.com/itinera-dev/spec), a workflow framework that keeps business rules separate from flow control.

## Learning it

[The Itinera book for TypeScript](https://itinera-dev.org/book/typescript/) teaches Itinera from a first workflow onwards, and every example in it compiles and runs. [The Itinera site](https://itinera-dev.org/) explains why Itinera exists, and [the specification](https://github.com/itinera-dev/spec) defines what every implementation does. [The API reference](https://itinera-dev.org/itinera-ts/) documents each item, with an example.

## Status

`0.1.0-beta.4`, the first release, implements tier 1 of specification 0.1.0, with the capabilities `async`, `testing` and `value-conversions`, and passes the conformance cases `v0.1.0-rc.16`. It is a beta, not yet meant for production: until `0.1.0`, features may be added and its API may still change. [CHANGELOG.md](https://github.com/itinera-dev/itinera-ts/blob/main/CHANGELOG.md) says what each release implements.

## Using it

Applications depend on one package, `itinera`, installed with `npm install itinera@next reflect-metadata` while every version is a pre-release under the dist-tag `next`, and import each concept from a subpath of its own, such as `itinera/step`. Test support is the subpath `itinera/testing`, which an application reaches only when it imports it.

The package works with `import` and `require` alike, on Node 22.12 and later. Applications declare their workflows mainly as classes marked with decorators, which need TypeScript 5.5 or later with `experimentalDecorators`, `emitDecoratorMetadata` and `strict` turned on, and a compiler that records decorator metadata, such as `tsc` or swc. Applications whose compiler records none, such as esbuild, Vite or tsx, put the same classes together with the builder instead, which needs only TypeScript 5.5 or later with `strict`.

## Conformance

Each release states the specification version, tier, capabilities and conformance cases it implements, and carries the report of those cases as a release asset.

To run the cases yourself, check out [itinera-dev/conformance](https://github.com/itinera-dev/conformance) at the tag pinned in [conformance.json](https://github.com/itinera-dev/itinera-ts/blob/main/conformance.json), then run `npm run conformance` from this repository with:

- `ITINERA_CONFORMANCE_CASES` set to that checkout's `cases` directory;
- `ITINERA_CONFORMANCE_TAGS` set to a Cucumber tag expression selecting the scenarios to run;
- `ITINERA_CONFORMANCE_REPORT` set to the file the Cucumber JSON report is written to.

## Contributing

See the [contributor guide](https://github.com/itinera-dev/itinera-ts/blob/main/docs/contributing.md) for how work arrives here, how to build and test, and the plan being implemented, and the [organisation's contributing guide](https://github.com/itinera-dev/.github/blob/main/CONTRIBUTING.md) for the rules every itinera-dev repository follows.

Built with AI under the terms of [A manifesto for software engineering with AI](https://marlon-sousa.com/blog/manifesto/); see [how Itinera is built](https://github.com/itinera-dev/.github/blob/main/CONTRIBUTING.md#how-itinera-is-built).

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](https://github.com/itinera-dev/itinera-ts/blob/main/LICENSE-APACHE) or <https://www.apache.org/licenses/LICENSE-2.0>)
- MIT license ([LICENSE-MIT](https://github.com/itinera-dev/itinera-ts/blob/main/LICENSE-MIT) or <https://opensource.org/licenses/MIT>)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
