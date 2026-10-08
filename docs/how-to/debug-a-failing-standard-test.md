# Debug a failing standard test

How to find out what a failing standard test expected, and why your
store did something else.

## 1. Read the report

@hapi/lab lists the failed tests at the end of the run, with the
assertion message and the line in `store-test.js` where it was made:

```
Failed tests:

  1) store-init load-store-plugin:

      has_plugin: Expected false to be true

      at /home/user/seneca-store-test/store-test.js:2920:66
```

Look the test up by its title in [Test groups](../reference/test-groups.md),
which states what it asserts and what data it created
([Fixtures](../reference/fixtures.md)). Here `test.init` loaded the
plugin but `seneca.has_plugin(opts.name)` was false: Seneca registers a
plugin loaded from a relative path under its definition function's
name, so either pass that name as `opts.name` or set the function's
name to the plugin name.

## 2. A timeout usually hides an assertion

Most tests in `basictest`, `sorttest`, `limitstest` and `mergetest`
assert inside the entity callback. When such an assertion fails, the
error is thrown inside Seneca's action callback. Seneca logs it as an
`act/ERR` entry and the test never calls `done`, so lab reports a
timeout after its default 2000 ms:

```
216/jk/- ERROR	act/ERR/s	od/2o	cmd:save,sys:entity	{cmd:'save',q:{},sys:'	mem-store/entity_save/14

act_callback

Error: Expected true to equal specified value: false
    at internals.equal (node_modules/@hapi/code/lib/index.js:305:17)
    at Seneca.<anonymous> (node_modules/@seneca/store-test/store-test.js:191:35)
    ...
    Action call arguments and location: {  cmd: 'save',  q: {},  sys: 'entity',  ent: Entity {    'entity$': '-/-/foo',    id: 'to-be-updated',    p1: 'z1',    p2: 'z2'  },  name: 'foo',  base: undefined,  zone: undefined}

  merge:false as plugin option
    ✖ 2) should update an entity if id provided

Failed tests:

  2) Testing the merge option merge:false as plugin option should update an entity if id provided:

      Timed out (2000ms) - Testing the merge option merge:false as plugin option should update an entity if id provided
```

Read the `act/ERR` entry above the timeout: it has the assertion
(`Expected true to equal specified value: false`, line 191 of
`store-test.js`: `expect('p3' in foo1).to.equal(false)`) and the message
that was being handled (a `save` of `to-be-updated` with `p1` and `p2`).
In this run `mergetest` was given an instance whose store still merged,
so `p3` survived the save.

The `Upserts` group and the `store-init` and `store-keyvalue` groups do
not have this shape: they install the test's `done` as Seneca's error
handler (`seneca.test(done)`) or use promises, so the assertion fails
the test directly.

## 3. Run only that test

```sh
npx lab -v -P test -g 'should update an entity if id provided'
```

`-g` matches the full title, section names included; with node:test use
`--test-name-pattern`. See
[Run a subset of the groups](run-a-subset-of-the-groups.md).

## 4. Watch the messages

Make the instance print every message it handles:

```js
const seneca = Seneca().test('print').use('entity', { mem_store: false }).use(MyStore)
```

Each `sys:entity` message is printed with its `ent` or `q` and `qent`,
and each reply with its result, so you can see what seneca-entity sent
to your store and what came back. For a quieter view, log the arguments
inside the store function that the failing test exercises.

## 5. Compare with seneca-mem-store

seneca-mem-store passes every group except `sqltest` and `extended`.
When a test's expectation is not obvious, run the same group against it
and read its implementation (`dist/mem-store.js` and `dist/intern.js`
in the package) to see how it handles that case.

## Common causes

| Symptom | Likely cause |
| ------- | ------------ |
| `Expected ... to be a string` on a generated id | Ids are numbers or ObjectIds; the entity `id` must be a string. |
| `should clear an attribute if = null` fails | `null` fields are dropped on save, or come back as `undefined`. Store `null`; ignore only `undefined`. |
| `should support different attribute types` fails on `arr` or `obj` | Arrays and objects are not round tripped. A JSON string is accepted; anything else must deep equal. For `wen`, a `Date`, ISO string or timestamp is accepted. |
| `should not save modifications to entity after save completes` fails | The store keeps a reference to the entity's data instead of a copy. |
| `should not mix attributes from entity to query for filtering` fails | The store adds the query entity's fields (`msg.qent`) to the query. Use only `msg.q`. |
| Sorting tests fail with the right set but the wrong order | Sorting after limiting, or sorting by insertion order. Filter, sort, skip, then limit. |
| `should ignore limit < 0` or `should ignore invalid qualifier values` fails | `limit$`, `skip$` are applied without checking that they are positive integers. |
| `should not be impacted by limit > 1` fails on remove | `remove$` without `all$: true` removed more than one entity. |
| `should return deleted entity if load$: true` fails | `remove$` does not reply with the removed entity when `load$` is true (and `all$` is not). |
| `has no race condition - creates a single new entity` fails | Upserts are not atomic. Create a unique index on `users.email` in the test setup (see [Fixtures: Indexes](../reference/fixtures.md#indexes)). |
| `entity matches on a private field` inserts nothing new | Fields ending in `$` were stored or used for matching. Ignore them. |
| `mergetest` first test fails with `Expected true to equal specified value: false` | The `senecaMergeFalse` instance still merges. See [Test merge versus replace semantics](test-merge-versus-replace.md). |
| `load-store-plugin` fails on `has_plugin` | The plugin name differs from the definition function's name; see step 1. |
| Everything times out on Seneca 4.0.0-rc5 | A test or hook uses `await seneca.ready()` on an idle instance, which hangs on rc5. Use `await new Promise((r) => seneca.ready(r))`. |
