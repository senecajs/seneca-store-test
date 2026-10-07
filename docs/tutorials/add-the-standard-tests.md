# Add the standard store tests to your store plugin

In this tutorial you write a small entity store plugin and run the
standard store tests against it. The finished files are in
[docs/examples/tiny-store](../examples/tiny-store/). You need Node.js 18
or later, and a basic knowledge of Seneca plugins (see the Seneca
tutorial [Writing a plugin](https://github.com/senecajs/seneca/blob/master/docs/tutorials/writing-a-plugin.md)).

## 1. What a store plugin is

Applications use entities through seneca-entity:

```js
const foo = await seneca.entity('foo').data$({ p1: 'v1' }).save$()
const same = await seneca.entity('foo').load$(foo.id)
```

seneca-entity turns each call into a message, `sys:entity,cmd:save`
with the entity in `msg.ent`, or `cmd:load`, `cmd:list`,
`cmd:remove` with the query in `msg.q` and a template entity of the
type in `msg.qent`. A store plugin provides the actions for these
messages. It does not add them itself: it describes itself as an object
with `save`, `load`, `list`, `remove`, `close` and `native`
functions and hands it to `seneca.export('entity/init')`, which adds
the actions and a close hook.

The standard tests drive the store through the entity API, exactly as
an application would, and check the behaviour every store must share:
ids, merging, sorting, skipping and limiting, removing, and upserts.

## 2. Create the plugin

Create a directory `tiny-store` with a `package.json`:

```json
{
  "name": "tiny-store",
  "version": "0.1.0",
  "private": true,
  "description": "Example entity store plugin for the @seneca/store-test tutorial",
  "main": "tiny-store.js",
  "license": "MIT"
}
```

and `tiny-store.js`. The data lives in one `Map` per entity type,
keyed by the type's canon string (`zone/base/name`, with `-` for a
missing part):

```js
/* A minimal entity store plugin, written for the tutorial in
 * docs/tutorials/add-the-standard-tests.md. Records are kept in memory,
 * one Map per entity type, so it is only good for tests and examples.
 *
 * It implements the complete store protocol that the standard tests
 * check: save (insert, update, merge or replace, upsert$), load, list and
 * remove with the sort$, skip$, limit$, fields$, all$ and load$
 * qualifiers, native$ access and close.
 */
'use strict'

function tiny_store(options) {
  const seneca = this

  // seneca-entity exports the function that registers a store, and the
  // default id generator (a 6 character random string).
  const init = seneca.export('entity/init')
  const generate_id = seneca.export('entity/generate_id')

  // canon string 'zone/base/name' -> Map of id -> record
  const tables = new Map()

  function table(ent) {
    const key = ent.canon$({ string: true })
    if (!tables.has(key)) {
      tables.set(key, new Map())
    }
    return tables.get(key)
  }
```

The store object has the six functions. `save` is the one with the
rules: a new entity (no `id`) is inserted with a generated id, or with
`id$` when given, unless `upsert$` names fields that match an existing
record; an entity with an `id` is updated, merging into the existing
record by default, or replacing it when the `merge` option or the
`merge$` directive is `false`. Every reply is a fresh entity made from
a copy of the record, so that the caller's objects and the stored data
cannot alias each other.

```js
  const store = {
    // The plugin name; also used in the log entries written by init.
    name: 'tiny-store',

    // msg.ent is the entity to save, msg.q holds the save$ directives
    // (id$, merge$, upsert$); id$ and merge$ are also set on msg.ent.
    save(msg, reply) {
      const ent = msg.ent
      const q = msg.q || {}
      const rows = table(ent)

      // Public fields only (no $ fields), and a copy, so that later
      // changes to the caller's entity do not change the stored record.
      const data = structuredClone(ent.data$(false))

      // No id: a new entity, unless upsert$ finds an existing match.
      if (null == ent.id) {
        const match = upsert_match(rows, q.upsert$, data)
        if (match) {
          Object.assign(match, data)
          return reply(null, ent.make$(structuredClone(match)))
        }

        data.id = null == ent.id$ ? generate_id() : ent.id$
        rows.set(data.id, data)
        return reply(null, ent.make$(structuredClone(data)))
      }

      // An id: update the record, or insert when it does not exist yet.
      // Merge into the existing record unless the plugin option merge
      // or the merge$ directive is false, in which case replace it.
      const prev = rows.get(ent.id)
      const merge = !(false === options.merge || false === ent.merge$)
      const row = prev && merge ? Object.assign(prev, data) : data
      rows.set(ent.id, row)
      return reply(null, ent.make$(structuredClone(row)))
    },

    // msg.qent is an entity of the type being queried, msg.q the query.
    load(msg, reply) {
      const list = select(table(msg.qent), msg.q)
      const row = list[0]
      reply(null, row ? msg.qent.make$(structuredClone(row)) : null)
    },

    list(msg, reply) {
      const list = select(table(msg.qent), msg.q)
      reply(
        null,
        list.map((row) => msg.qent.make$(structuredClone(row))),
      )
    },

    // Removes the first match, or every match with all$: true. With
    // load$: true (and not all$) the removed entity is returned.
    remove(msg, reply) {
      const q = msg.q || {}
      const rows = table(msg.qent)
      let list = select(rows, q)
      if (true !== q.all$) {
        list = list.slice(0, 1)
      }
      for (const row of list) {
        rows.delete(row.id)
      }
      const removed = true !== q.all$ && true === q.load$ ? list[0] : null
      reply(null, removed ? msg.qent.make$(structuredClone(removed)) : null)
    },

    // Called once when the Seneca instance closes.
    close(msg, reply) {
      reply()
    },

    // Whatever "the driver" is; here, the Maps.
    native(msg, reply) {
      reply(null, tables)
    },
  }
```

`init` registers the actions and returns the plugin's tag; return the
plugin name and tag from the definition function:

```js
  // Register the store: adds the role:entity actions for save, load,
  // list, remove and native, and a close hook.
  const meta = init(seneca, options, store)

  return { name: store.name, tag: meta.tag }
}
```

The helpers implement the query rules: an id or list of ids, or an
object of field values (an array value matches any of its elements),
then `sort$`, `skip$`, `limit$` and `fields$`, in that order.
Invalid qualifier values are ignored. The last lines give the
definition function the plugin's name, which Seneca uses to register it,
and declare the options.

```js
// Find the record matching the data on the public upsert$ fields. Private
// fields (ending in $) are ignored, and every named field must be present
// in the data, otherwise there is no match and a new record is inserted.
function upsert_match(rows, upsert, data) {
  const fields = Array.isArray(upsert)
    ? upsert.filter((f) => !f.includes('$'))
    : []

  if (0 === fields.length || !fields.every((f) => f in data)) {
    return null
  }

  for (const row of rows.values()) {
    if (fields.every((f) => f in row && equal(row[f], data[f]))) {
      return row
    }
  }

  return null
}

// Apply a query: an id, an array of ids, or an object of field values
// (a value that is an array matches any of its elements) with the sort$,
// skip$, limit$ and fields$ qualifiers. Invalid qualifier values (not a
// positive integer) are ignored.
function select(rows, q) {
  if ('string' === typeof q || 'number' === typeof q) {
    return rows.has(q) ? [rows.get(q)] : []
  }

  if (Array.isArray(q)) {
    return q.filter((id) => rows.has(id)).map((id) => rows.get(id))
  }

  q = q || {}

  let list = [...rows.values()].filter((row) =>
    Object.keys(q).every((f) => f.includes('$') || matches(row[f], q[f])),
  )

  if (q.sort$) {
    const [field, dir] = Object.entries(q.sort$)[0]
    const sign = dir < 0 ? -1 : 1
    list.sort((a, b) => sign * compare(a[field], b[field]))
  }

  if (Number.isInteger(q.skip$) && 0 < q.skip$) {
    list = list.slice(q.skip$)
  }

  if (Number.isInteger(q.limit$) && 0 < q.limit$) {
    list = list.slice(0, q.limit$)
  }

  if (Array.isArray(q.fields$)) {
    list = list.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([f]) => 'id' === f || q.fields$.includes(f),
        ),
      ),
    )
  }

  return list
}

function matches(value, cond) {
  return Array.isArray(cond)
    ? cond.some((c) => equal(value, c))
    : equal(value, cond)
}

function equal(a, b) {
  return a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : a === b
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Plugin options with their defaults (validated by Seneca 4 as a shape).
tiny_store.defaults = {
  // Merge saved fields into the existing record (true), or replace the
  // record (false). The merge$ directive on save$ overrides it per call.
  merge: true,
}

// Seneca registers a plugin under the name of its definition function.
// Give the function the plugin's name (a hyphen is not valid in an
// identifier), so that seneca.has_plugin('tiny-store') is true.
Object.defineProperty(tiny_store, 'name', { value: 'tiny-store' })

module.exports = tiny_store
```

## 3. Install the test dependencies

The tests need @seneca/store-test, a Seneca version, seneca-entity and
a test runner. @seneca/store-test works with @hapi/lab, used here, and
with the Node.js test runner (see
[Run the standard tests with node:test](../how-to/run-with-node-test.md)).

```sh
npm install --save-dev @seneca/store-test seneca seneca-entity @hapi/lab
```

## 4. Write the test

Create `test/tiny-store.test.js`. Each group of the standard tests is a
function that takes a `settings` object with the Seneca instance to
test and the script to register the tests with:

```js
/* Runs the standard store tests against tiny-store with @hapi/lab.
 * From the repository root:
 *   npx lab -v docs/examples/tiny-store/test
 */
'use strict'

const Seneca = require('seneca')
const TinyStore = require('../tiny-store')

// In your own plugin: const Shared = require('@seneca/store-test')
const Shared = require('../../../..')

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())

function makeSeneca(store_opts = {}) {
  return (
    Seneca()
      .test()
      // mem_store: false stops seneca-entity loading seneca-mem-store
      .use('entity', { mem_store: false })
      .use(TinyStore, store_opts)
  )
}

// Plugin loading and a key-value smoke test. test.init loads the plugin
// with seneca.use('..'): the package in the directory above this test
// directory, resolved from the module that first required seneca (this
// file), as in a real plugin repository.
const test_opts = {
  seneca: Seneca().test().use('entity', { mem_store: false }),
  name: 'tiny-store',
}
Shared.test.init(lab, test_opts)
Shared.test.keyvalue(lab, test_opts)

// The standard groups share one instance.
const seneca = makeSeneca()
Shared.basictest({ seneca, script: lab })
Shared.sorttest({ seneca, script: lab })
Shared.limitstest({ seneca, script: lab })
Shared.upserttest({ seneca, script: lab })

// mergetest needs an instance whose store replaces instead of merging.
const seneca_replace = makeSeneca({ merge: false })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: lab })

// Close every instance when the tests are done, whether they passed or
// not, so that the process exits.
lab.after(async () => {
  for (const instance of [test_opts.seneca, seneca, seneca_replace]) {
    await new Promise((resolve) => instance.close(resolve))
  }
})
```

In your own plugin repository, `require('@seneca/store-test')` replaces
the relative path.

Three instances are created. `test.init` loads the plugin into the
first with `seneca.use('..')`, the package in the directory above
`test/`, and checks that `seneca.has_plugin('tiny-store')` is true;
`test.keyvalue` then runs a short save, load and remove check on it.
The second instance is shared by `basictest`, `sorttest`,
`limitstest` and `upserttest`: every group clears the entity types it
uses before its tests. The third has `merge: false`, so that
`mergetest` can check that saves replace instead of merge.

## 5. Run the tests

In this repository, from its root:

```sh
npx lab -v docs/examples/tiny-store/test
```

In your plugin, with the test in `test/`, `npx lab -v -P test`. The
output on Node.js 24 with seneca 4.0.0-rc5, seneca-entity 28.1.0 and
@hapi/lab 25:

```
store-init
  ✔ 1) load-store-plugin (122 ms)
  ✔ 2) clear-data (4 ms)
store-keyvalue
  ✔ 3) save-load-auto-id (16 ms)
  ✔ 4) save-load-given-id (10 ms)
  ✔ 5) remove (7 ms)
Basic Tests
  Load
    ✔ 6) should load an entity qqq (2 ms)
    ✔ 7) should return null for non existing entity (1 ms)
    ✔ 8) should support filtering (1 ms)
    ✔ 9) should filter with AND (2 ms)
    ✔ 10) should filter with AND 2 (2 ms)
    ✔ 11) should support different attribute types (3 ms)
    ✔ 12) should not mix attributes from entity to query for filtering (2 ms)
    ✔ 13) should reload current entity if no query provided and id present (1 ms)
    ✔ 14) should do nothing if no query provided and id not present (1 ms)
  Save
    ✔ 15) should save an entity to store (and generate an id) (4 ms)
    ✔ 16) should save an entity to store (with provided id) (2 ms)
    ✔ 17) should update an entity if id provided (3 ms)
    ✔ 18) should update an entity if id provided (2 ms)
    ✔ 19) should save an entity if id provided but original doesn't exist (2 ms)
    ✔ 20) should support different attribute types (4 ms)
    ✔ 21) should allow dublicate attributes (3 ms)
    ✔ 22) should not save modifications to entity after save completes (2 ms)
    ✔ 23) should not backport modification to saved entity to the original one (1 ms)
    ✔ 24) should clear an attribute if = null (4 ms)
    when the id$ arg passed to #save$ is undefined
      ✔ 25) should generate a new id and save the entity (3 ms)
    when the id$ arg passed to #save$ is null
      ✔ 26) should generate a new id and save the entity (3 ms)
    when the provided id is null
      ✔ 27) should generate a new id and save the entity (3 ms)
    when the provided id is undefined
      ✔ 28) should generate a new id and save the entity (4 ms)
  List
    ✔ 29) should load all elements if no params (2 ms)
    ✔ 30) should load all elements if no params 2 (1 ms)
    ✔ 31) should load all elements if no query provided (1 ms)
    ✔ 32) should list entities by id (2 ms)
    ✔ 33) should list entities by integer property (2 ms)
    ✔ 34) should list entities by string property (1 ms)
    ✔ 35) should list entities by two properties (1 ms)
    ✔ 36) should support opaque ids (array) (1 ms)
    ✔ 37) should support opaque ids (single id) (1 ms)
    ✔ 38) should support opaque ids (string) (1 ms)
    ✔ 39) should filter with AND (1 ms)
    ✔ 40) should not mix attributes from entity to query for filtering (1 ms)
  Remove
    ✔ 41) should delete only an entity (2 ms)
    ✔ 42) should delete all entities if all$ = true (3 ms)
    ✔ 43) should delete an entity by property (3 ms)
    ✔ 44) should delete entities filtered by AND (2 ms)
    ✔ 45) should return deleted entity if load$: true (2 ms)
    ✔ 46) should never return deleted entities if all$: true (1 ms)
    ✔ 47) should not delete current ent (only uses query) (2 ms)
    ✔ 48) should delete current entity if no query present (4 ms)
  Native
    ✔ 49) should prived direct access to the driver (1 ms)
Sorting
  Load
    ✔ 50) should support ascending order (2 ms)
    ✔ 51) should support descending order (1 ms)
  List
    ✔ 52) should support ascending order (1 ms)
    ✔ 53) should support descending order (1 ms)
  Remove
    ✔ 54) should support ascending order (2 ms)
    ✔ 55) should support descending order (2 ms)
Limits
  ✔ 56) check setup correctly (1 ms)
  Load
    ✔ 57) should support skip and sort (1 ms)
    ✔ 58) should return empty array when skipping all the records (1 ms)
    ✔ 59) should not be influenced by limit (1 ms)
    ✔ 60) should ignore skip < 0 (1 ms)
    ✔ 61) should ignore limit < 0 (2 ms)
    ✔ 62) should ignore invalid qualifier values (2 ms)
  List
    ✔ 63) should support limit, skip and sort (1 ms)
    ✔ 64) should return empty array when skipping all the records (2 ms)
    ✔ 65) should return correct number of records if limit is too high (1 ms)
    ✔ 66) should ignore skip < 0 (2 ms)
    ✔ 67) should ignore limit < 0 (1 ms)
    ✔ 68) should ignore invalid qualifier values (2 ms)
  Remove
    ✔ 69) should support limit, skip and sort (4 ms)
    ✔ 70) should not be impacted by limit > 1 (3 ms)
    ✔ 71) should work with all$: true (2 ms)
    ✔ 72) should not delete anyithing when skipping all the records (3 ms)
    ✔ 73) should delete correct number of records if limit is too high (3 ms)
    ✔ 74) should ignore skip < 0 (2 ms)
    ✔ 75) should ignore limit < 0 (2 ms)
    ✔ 76) should ignore invalid qualifier values (2 ms)
Upserts
  matches on 1 upsert$ field
    ✔ 77) updates the entity (5 ms)
    ✔ 78) shouldn't mutate the original entity after save completes (3 ms)
  matches on 1 upsert$ field, some data$ fields missing
    ✔ 79) retains the entity fields missing from data$ (3 ms)
  matches on 1 upsert$ field, save$ includes id$ the field
    ✔ 80) updates the fields and ignores the id$ qualifier (3 ms)
  matches on 2 upsert$ fields
    ✔ 81) updates the entity (4 ms)
  no match, 1 upsert$ field
    ✔ 82) creates a new entity (5 ms)
  no match, 1 upsert$ field, save$ includes the id$ field
    ✔ 83) creates a new entity with the given id (6 ms)
  no match, 2 upsert$ fields
    ✔ 84) creates a new entity (4 ms)
  bombarding the store with near-parallel upserts
    ✔ 85) has no race condition - creates a single new entity (6 ms)
  entity matches on a private field
    ✔ 86) creates a new entity (3 ms)
  entity matches on a private and a public field
    ✔ 87) matches by the public field and updates the entity (2 ms)
  empty upsert$ array
    ✔ 88) creates a new document (5 ms)
  entity matches on a field with the `undefined` value
    ✔ 89) creates a new document (5 ms)
  some upsert$ fields are blank in existing entities
    ✔ 90) creates a new entity (3 ms)
  fields in upsert$ are not present in the data$ object
    ✔ 91) creates a new entity because it can never match (4 ms)
  upserting on the id field, match exists
    ✔ 92) updates the matching entity (3 ms)
    ✔ 93) works with load$ after the update (3 ms)
  upserting on the id field, no match
    ✔ 94) creates a new document with that id (4 ms)
    ✔ 95) works with load$ after the creation (3 ms)
  upserting on the id and some field, match exists
    ✔ 96) updates the matching entity (9 ms)
    ✔ 97) works with load$ after the update (4 ms)
  upserting on the id and some field, match does not exist
    ✔ 98) creates a new document with that id (4 ms)
    ✔ 99) works with load$ after the creation (5 ms)
  save$ invoked on a saved entity instance, match exists
    ✔ 100) completely ignores the upsert$ directive (4 ms)
  happy path
    ✔ 101) is happy (5 ms)
Testing the merge option
  ✔ 102) should allow to not merge during update with merge$: false (3 ms)
  merge:false as plugin option
    ✔ 103) should update an entity if id provided (3 ms)
    ✔ 104) should allow to merge during update with merge$: true (2 ms)


104 tests complete
Test duration: 16265 ms
Leaks: No issues
```

The 104 tests take about 16 seconds: the groups wait for `seneca.ready`
before clearing data, and Seneca waits a short interval each time so
that pending messages can be queued.

## 6. What happened

* `test.init` resolved `'..'` from the module that first required
  `seneca`, the test file, and loaded `tiny-store/package.json`'s
  `main`. Seneca registered the plugin under the definition function's
  name, which is why the file sets that name to `tiny-store`.
* Every `save$`, `load$`, `list$` and `remove$` in the tests became a
  `sys:entity` message, routed to the actions `init` added, which
  called the store object's functions.
* The `Basic Tests`, `Sorting`, `Limits` and `Upserts` groups ran on
  one instance; each cleared the `foo`, `zen/moon/bar`, `players`,
  `racers`, `users`, `customers` and `products` types first.
* `Testing the merge option` ran on the `merge: false` instance and
  checked that a plain save replaces the record, and that `merge$: true`
  still merges.

## Next steps

* Run only some groups, or skip single tests:
  [Run a subset of the groups](../how-to/run-a-subset-of-the-groups.md).
* Understand what each test expects:
  [Test groups](../reference/test-groups.md) and
  [Fixtures](../reference/fixtures.md).
* When a test fails:
  [Debug a failing standard test](../how-to/debug-a-failing-standard-test.md).
* Keep the plugin working on Seneca 3 and 4:
  [Support Seneca 3 and 4 in one test file](../how-to/support-seneca-3-and-4.md).
* Why the suite exists and how it drives the store protocol:
  [Why a shared conformance suite](../explanation/why-a-shared-conformance-suite.md).
