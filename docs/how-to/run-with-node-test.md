# Run the standard tests with node:test

How to run the standard store tests with the Node.js test runner
(`node:test`) instead of @hapi/lab.

## 1. Pass the node:test module as the script

The groups register their tests through `script.describe`, `script.it`,
`script.before`, `script.beforeEach` and `script.afterEach`. The
`node:test` module exports functions with those names and the same
shape, so it can be passed as `settings.script` directly. @hapi/lab is
not loaded when a script is given, so it does not need to be installed.

The complete file, [docs/examples/mem-store-node-test.js](../examples/mem-store-node-test.js),
runs the groups against seneca-mem-store:

```js
/* Runs the standard store tests against seneca-mem-store with the Node.js
 * test runner instead of @hapi/lab. From the repository root:
 *   node docs/examples/mem-store-node-test.js
 */
'use strict'

const test = require('node:test')
const Seneca = require('seneca')

// In your own plugin: const Shared = require('@seneca/store-test')
const Shared = require('../..')

function makeSeneca(store_opts = {}) {
  return (
    Seneca()
      .test()
      // mem_store: false stops seneca-entity loading its own mem-store
      .use('entity', { mem_store: false })
      .use('mem-store', store_opts)
  )
}

const seneca = makeSeneca()
const seneca_replace = makeSeneca({ merge: false })

// node:test exports describe, it, before, beforeEach and afterEach, which
// is all a test group needs from the script.
Shared.basictest({ seneca, script: test })
Shared.sorttest({ seneca, script: test })
Shared.limitstest({ seneca, script: test })
Shared.upserttest({ seneca, script: test })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: test })

test.after(async () => {
  await new Promise((resolve) => seneca.close(resolve))
  await new Promise((resolve) => seneca_replace.close(resolve))
})
```

## 2. Run it

A file that uses `node:test` runs its tests when executed directly:

```sh
node docs/examples/mem-store-node-test.js
```

or, for a plugin with its tests in `test/`, through the runner, which
also sets the exit code from the results:

```sh
node --test test/
```

The output starts:

```
▶ Basic Tests
  ▶ Load
    ✔ should load an entity qqq (2.879561ms)
    ✔ should return null for non existing entity (1.87094ms)
    ✔ should support filtering (3.180859ms)
    ✔ should filter with AND (2.453674ms)
    ✔ should filter with AND 2 (2.553137ms)
    ✔ should support different attribute types (3.74583ms)
    ✔ should not mix attributes from entity to query for filtering (1.577097ms)
    ✔ should reload current entity if no query provided and id present (1.383522ms)
    ✔ should do nothing if no query provided and id not present (0.308448ms)
  ✔ Load (155.093597ms)
```

and ends:

```
✔ Testing the merge option (250.009965ms)
ℹ tests 99
ℹ suites 41
ℹ pass 99
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15821.973618
```

## 3. Useful options

* `--test-name-pattern='Sorting'` runs the tests and suites whose names
  match.
* `--test-timeout=5000` gives every test a timeout. node:test has none
  by default, so a test whose assertion fails inside an entity callback
  (see [Debug a failing standard test](debug-a-failing-standard-test.md))
  would otherwise wait until the whole run is killed. lab's default is
  2000 ms.
* `--test-reporter=spec` or `tap` chooses the output format.

## 4. Close the instances

node:test does not exit while a Seneca instance holds open handles, so
close every instance in a top level `after` hook, as the example does.

## 5. test.init and test.keyvalue

These take the script as their first argument and work the same way:

```js
const test_opts = { seneca: Seneca().test().use('entity', { mem_store: false }), name: 'my-store' }
Shared.test.init(test, test_opts)
Shared.test.keyvalue(test, test_opts)
```

## Why this works

Each group wraps its callback style tests in a function that takes one
argument and returns a promise. node:test treats a two argument test
function as callback style and fails it when it also returns a promise,
which is what happened with the promisified wrapper used before
@seneca/store-test 6.1.0, so use 6.1.0 or later with node:test.
