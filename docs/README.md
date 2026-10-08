# @seneca/store-test documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure:
four sections with four different jobs. Start with the tutorial if you
are adding the standard tests to a store plugin for the first time; use
the how-to guides for specific tasks; look things up in the reference;
read the explanation to understand why the suite exists and how it
works.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Add the standard store tests to your store plugin](tutorials/add-the-standard-tests.md) | A small in-memory store plugin that passes the standard tests, and the test file that runs them. |

The programs from the tutorial and guides are in [examples](examples/):
[tiny-store](examples/tiny-store/) (the plugin, its `package.json` and
its lab test) and [mem-store-node-test.js](examples/mem-store-node-test.js).

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Run a subset of the groups](how-to/run-a-subset-of-the-groups.md) | Choosing groups, running one test with `-g`, skipping tests, hooks. |
| [Test merge versus replace semantics](how-to/test-merge-versus-replace.md) | The `merge` option and `merge$` directive, the `senecaMergeFalse` instance, what `mergetest` checks. |
| [Debug a failing standard test](how-to/debug-a-failing-standard-test.md) | Reading the report, timeouts that hide assertions, running one test, printing messages, common causes. |
| [Support Seneca 3 and 4 in one test file](how-to/support-seneca-3-and-4.md) | Dependencies, version checks, seneca-promisify, `ready`, errors, close hooks, options, running on both. |
| [Run the standard tests with node:test](how-to/run-with-node-test.md) | Passing the `node:test` module as the script, running, options, closing instances. |

## Reference

| Reference | Describes |
| --------- | --------- |
| [Functions and settings](reference/api.md) | Every exported function, the `settings` object, `test.init` and `test.keyvalue` options, `verify`. |
| [Test groups](reference/test-groups.md) | Every test in every group with the behaviour it asserts. |
| [Fixtures](reference/fixtures.md) | Entity types, the bar template, clearing and creating data, data per group, indexes. |

## Explanation

| Explanation | Topic |
| ----------- | ----- |
| [Why a shared conformance suite](explanation/why-a-shared-conformance-suite.md) | One API and many stores, how the suite drives the store protocol, its design and limits, Seneca 3 versus 4. |

## Feature index

Every function, setting and option of the package, and where it is
documented.

| Feature | Reference | Guides |
| ------- | --------- | ------ |
| `basictest(settings)`: Basic Tests group | [Functions: basictest](reference/api.md#basictestsettings), [Test groups: Basic Tests](reference/test-groups.md#basic-tests) | [Tutorial](tutorials/add-the-standard-tests.md) |
| `sorttest(settings)`: Sorting group | [Functions: sorttest](reference/api.md#sorttestsettings), [Test groups: Sorting](reference/test-groups.md#sorting) | [Tutorial](tutorials/add-the-standard-tests.md) |
| `limitstest(settings)`: Limits group | [Functions: limitstest](reference/api.md#limitstestsettings), [Test groups: Limits](reference/test-groups.md#limits) | [Tutorial](tutorials/add-the-standard-tests.md) |
| `upserttest(settings)`: Upserts group | [Functions: upserttest](reference/api.md#upserttestsettings), [Test groups: Upserts](reference/test-groups.md#upserts) | [Tutorial](tutorials/add-the-standard-tests.md), [Fixtures: Indexes](reference/fixtures.md#indexes) |
| `mergetest(settings)`: Testing the merge option group | [Functions: mergetest](reference/api.md#mergetestsettings), [Test groups: merge](reference/test-groups.md#testing-the-merge-option) | [Test merge versus replace semantics](how-to/test-merge-versus-replace.md) |
| `sqltest(settings)`: Sql support group | [Functions: sqltest](reference/api.md#sqltestsettings), [Test groups: Sql support](reference/test-groups.md#sql-support) | [Run a subset of the groups](how-to/run-a-subset-of-the-groups.md) |
| `extended(settings)`: Sql extended support group | [Functions: extended](reference/api.md#extendedsettings), [Test groups: Sql extended support](reference/test-groups.md#sql-extended-support) | [Run a subset of the groups](how-to/run-a-subset-of-the-groups.md) |
| `verify(callback, tests)` | [Functions: verify](reference/api.md#verifycallback-tests) | [Explanation: design](explanation/why-a-shared-conformance-suite.md#design-of-the-suite) |
| `test.init(script, opts)`: store-init group | [Functions: test.init](reference/api.md#testinitscript-opts) | [Tutorial](tutorials/add-the-standard-tests.md), [Debug: step 1](how-to/debug-a-failing-standard-test.md#1-read-the-report) |
| `test.keyvalue(script, opts)`: store-keyvalue group | [Functions: test.keyvalue](reference/api.md#testkeyvaluescript-opts) | [Tutorial](tutorials/add-the-standard-tests.md) |
| `settings.seneca` | [The settings object](reference/api.md#the-settings-object) | [Tutorial](tutorials/add-the-standard-tests.md) |
| `settings.senecaMergeFalse` | [The settings object](reference/api.md#the-settings-object) | [Test merge versus replace semantics](how-to/test-merge-versus-replace.md) |
| `settings.script` (lab script or `node:test`) | [The settings object](reference/api.md#the-settings-object) | [Run the standard tests with node:test](how-to/run-with-node-test.md), [Run a subset of the groups](how-to/run-a-subset-of-the-groups.md) |
| `opts.seneca`, `opts.name`, `opts.options`, `opts.ent0` of `test.init` and `test.keyvalue` | [Functions: test.init](reference/api.md#testinitscript-opts) | [Tutorial](tutorials/add-the-standard-tests.md) |
| Return value of a group (the script) | [The settings object](reference/api.md#the-settings-object) | |
| Entity types and fixture data | [Fixtures](reference/fixtures.md) | [Debug a failing standard test](how-to/debug-a-failing-standard-test.md) |
| The bar template and `barverify` | [Fixtures: the bar template](reference/fixtures.md#the-bar-template) | |
| Clearing (`clearDb`) and creating (`createEntities`) data | [Fixtures: Clearing](reference/fixtures.md#clearing), [Fixtures: Creating](reference/fixtures.md#creating) | [Run a subset of the groups](how-to/run-a-subset-of-the-groups.md) |
| Query qualifiers tested: `sort$`, `skip$`, `limit$`, `fields$`, `all$`, `load$`, `native$` | [Test groups](reference/test-groups.md) | [Tutorial](tutorials/add-the-standard-tests.md) |
| Save directives tested: `id$`, `merge$`, `upsert$` | [Test groups: Basic Tests](reference/test-groups.md#basic-tests), [Upserts](reference/test-groups.md#upserts), [merge](reference/test-groups.md#testing-the-merge-option) | [Test merge versus replace semantics](how-to/test-merge-versus-replace.md) |
| Extended operators: `ne$`, `eq$`, `gte$`, `gt$`, `lte$`, `lt$`, `in$`, `nin$`, `or$`, `and$` | [Test groups: Sql extended support](reference/test-groups.md#sql-extended-support) | |
| seneca-promisify on Seneca 3 | [Functions: upserttest](reference/api.md#upserttestsettings) | [Support Seneca 3 and 4](how-to/support-seneca-3-and-4.md) |
| Seneca 4 prerelease (`ready`, errors, close, plugin names) | [Explanation: Seneca 3 and Seneca 4](explanation/why-a-shared-conformance-suite.md#seneca-3-and-seneca-4) | [Support Seneca 3 and 4](how-to/support-seneca-3-and-4.md) |
| Dependencies: `@hapi/code` (always), `@hapi/lab` (only without a script), `chai`, `async`, `nid`, `seneca-promisify` | [The settings object](reference/api.md#the-settings-object) | [Run the standard tests with node:test](how-to/run-with-node-test.md) |

## Other documents

* [Change log](../CHANGES.md)
* [Code of conduct](../CODE_OF_CONDUCT.md)
* [License](../LICENSE)
