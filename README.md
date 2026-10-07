![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/store-test

The standard test suite for Seneca entity store plugins. Every official
store (seneca-mem-store, the SQL and document stores) runs these tests
to prove that it implements the entity store protocol the same way:
ids, merging, sorting, skipping and limiting, removing and upserts. It
works with Seneca 3 and Seneca 4 (tested with the 4.0.0 prerelease),
with seneca-entity, and with @hapi/lab or the Node.js test runner.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-store-test/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-store-test/actions/workflows/build.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/27eadf997922c38f4618/maintainability)](https://codeclimate.com/github/senecajs/seneca-store-test/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/17224/branches/388397/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=17224&bid=388397)

## Install

```sh
npm install --save-dev @seneca/store-test
```

Versions up to 6.0.0 were published as `seneca-store-test`; from the
next version the package is `@seneca/store-test`. Your tests also need
`seneca`, `seneca-entity` and a test runner (`@hapi/lab`, or Node.js
`node:test` with no extra package).

## Quick Example

In your store plugin's test file:

```js
const Seneca = require('seneca')
const Shared = require('@seneca/store-test')
const MyStore = require('..')

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())

function makeSeneca(store_opts = {}) {
  return Seneca()
    .test()
    .use('entity', { mem_store: false })
    .use(MyStore, store_opts)
}

const seneca = makeSeneca()

Shared.basictest({ seneca, script: lab })
Shared.sorttest({ seneca, script: lab })
Shared.limitstest({ seneca, script: lab })
Shared.upserttest({ seneca, script: lab })

// Replace instead of merge on update: a separately configured instance.
const seneca_replace = makeSeneca({ merge: false })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: lab })

// Close the instances when the tests are done, passed or failed.
lab.after(async () => {
  for (const instance of [seneca, seneca_replace]) {
    await new Promise((resolve) => instance.close(resolve))
  }
})
```

Run with `npx lab -v -P test`. With the Node.js test runner, pass
`script: require('node:test')` instead and run `node --test test/`.

## More Examples

* [Add the standard store tests to your store plugin](docs/tutorials/add-the-standard-tests.md):
  a complete small store plugin and its test, with the real output.
* [Run a subset of the groups](docs/how-to/run-a-subset-of-the-groups.md)
* [Test merge versus replace semantics](docs/how-to/test-merge-versus-replace.md)
* [Debug a failing standard test](docs/how-to/debug-a-failing-standard-test.md)
* [Support Seneca 3 and 4 in one test file](docs/how-to/support-seneca-3-and-4.md)
* [Run the standard tests with node:test](docs/how-to/run-with-node-test.md)

The example programs are in [docs/examples](docs/examples/), and
[test/store.test.js](test/store.test.js) runs the suite against
seneca-mem-store.

## Motivation

Applications use one entity API and choose the store by configuration,
so every store must behave the same way in the details applications
depend on. A shared, executable suite pins those details down once.
See [Why a shared conformance suite](docs/explanation/why-a-shared-conformance-suite.md).

## Support

* Post a [GitHub issue][github issue] for problems with the suite.
* The Seneca documentation: [senecajs.org](https://senecajs.org) and the
  [seneca repository docs](https://github.com/senecajs/seneca/blob/master/docs/README.md).
* Commercial support and sponsorship: [Voxgig](https://www.voxgig.com).

## API

Full documentation: [docs/README.md](docs/README.md), with a
[feature index](docs/README.md#feature-index).

| Function | Group | Needs |
| -------- | ----- | ----- |
| [`basictest(settings)`](docs/reference/api.md#basictestsettings) | Basic Tests: load, save, list, remove, native | `settings.seneca` |
| [`sorttest(settings)`](docs/reference/api.md#sorttestsettings) | Sorting: `sort$` | `settings.seneca` |
| [`limitstest(settings)`](docs/reference/api.md#limitstestsettings) | Limits: `skip$`, `limit$` | `settings.seneca` |
| [`upserttest(settings)`](docs/reference/api.md#upserttestsettings) | Upserts: `upsert$` | `settings.seneca` |
| [`mergetest(settings)`](docs/reference/api.md#mergetestsettings) | Testing the merge option: replace versus merge | `settings.senecaMergeFalse` |
| [`sqltest(settings)`](docs/reference/api.md#sqltestsettings) | Sql support: SQL in `native$` | `settings.seneca` |
| [`extended(settings)`](docs/reference/api.md#extendedsettings) | Sql extended support: `ne$`, `gte$`, `in$`, `or$` and more | `settings.seneca` |
| [`test.init(script, opts)`](docs/reference/api.md#testinitscript-opts) | store-init: plugin loading, clearing data | `opts.seneca`, `opts.name` |
| [`test.keyvalue(script, opts)`](docs/reference/api.md#testkeyvaluescript-opts) | store-keyvalue: save, load, remove with promises | `opts.seneca`, `opts.ent0` |
| [`verify(callback, tests)`](docs/reference/api.md#verifycallback-tests) | Helper for callback style assertions | |

| Setting | Meaning |
| ------- | ------- |
| [`seneca`](docs/reference/api.md#the-settings-object) | Instance with seneca-entity and the store loaded. |
| [`senecaMergeFalse`](docs/reference/api.md#the-settings-object) | Instance whose store replaces on update (`merge: false`). |
| [`script`](docs/reference/api.md#the-settings-object) | A `@hapi/lab` script or the `node:test` module; default: a new lab script. |

What every test asserts: [Test groups](docs/reference/test-groups.md).
The data they use: [Fixtures](docs/reference/fixtures.md).

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can
help in any way, be it with documentation, examples, extra testing, or
new features please get in touch.

### Running tests

```sh
npm install
npm test
```

`npm test` runs the suite against seneca-mem-store with @hapi/lab
(including lint, leak detection and an 80% coverage threshold), then
the documentation examples (`npm run test-examples`). It passes on
Node.js 24 and 22 with the `seneca` development dependency
(`^4.0.0-rc5`). To run it against another Seneca version:

```sh
npm install --no-save seneca@3 && npm test
npm install    # restore the development dependency
```

`npm run test-some -- 'Sorting'` runs the tests whose title matches.

The GitHub Actions workflow change for Node.js 24 and 22 is provided as
a patch in [.patches](.patches/README.md), because workflow files need
a credential scope the contributing session did not have; apply it with
`git am .patches/*.patch`.

## Background

The suite started in 2014 as the test file of the first Seneca stores
and became its own package so that every store could share it. Version
1.1.0 added the `sqltest` and `extended` groups, 4.0.0 the upsert
tests, 4.1.0 the separate `mergetest` group, and 6.1.0 Seneca 4 support
and the ability to run with `node:test`. Changes are listed in
[CHANGES.md](CHANGES.md). Versions up to 6.0.0 were published as
`seneca-store-test`; from the next version the package is
`@seneca/store-test`.

| @seneca/store-test | Seneca | seneca-entity | Node.js | Runner |
| ----------------- | ------ | ------------- | ------- | ------ |
| 6.1.x | 3.38, 4.0.0-rc5, 4.0.0 | 28 | 18 or later; tested on 24 and 22 | @hapi/lab 25, node:test |
| 6.0.x | 3 (not 3.28 with seneca-entity 27) | 27 | 18 or later | @hapi/lab 25 |
| 5.x | 3 | 18 | | @hapi/lab 25 |

Licensed under [MIT][].

[npm-badge]: https://img.shields.io/npm/v/@seneca/store-test.svg
[npm-url]: https://npmjs.com/package/@seneca/store-test
[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[github issue]: https://github.com/senecajs/seneca-store-test/issues
