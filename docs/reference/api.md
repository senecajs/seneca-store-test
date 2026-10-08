# Functions and settings

Everything exported by `require('@seneca/store-test')`, with the settings
each function accepts. The behaviour that each group asserts is listed in
[Test groups](test-groups.md); the data they use is in
[Fixtures](fixtures.md).

## The settings object

Every test group takes one `settings` object:

| Setting | Type | Used by | Meaning |
| ------- | ---- | ------- | ------- |
| `seneca` | Seneca instance | `basictest`, `sorttest`, `limitstest`, `upserttest`, `sqltest`, `extended` | An instance with seneca-entity and the store under test loaded, with the store's default (merging) save behaviour. Required. |
| `senecaMergeFalse` | Seneca instance | `mergetest` | An instance whose store is configured to replace instead of merge on update (`merge: false` for seneca-mem-store). Required by `mergetest`. |
| `script` | test script | all groups | Where the tests are registered: a `@hapi/lab` script (`Lab.script()`), or the `node:test` module. Optional: when omitted a new lab script is created with `require('@hapi/lab').script()`, which needs `@hapi/lab` to be installed. |

The script must provide `describe`, `it`, `before`, `beforeEach` and
`afterEach`. Tests are registered with `script.it(name, options, fn)`
where `fn` takes one argument and returns a promise, so any runner with
that shape works. Each group returns the script it registered with.

The same instance can be passed to several groups: the groups clear the
entity types they use before their tests (see
[Fixtures](fixtures.md#clearing)), and `upserttest` also clears after
each test.

## basictest(settings)

Registers the `Basic Tests` group: load, save, list, remove and native
access. 44 tests. Needs `settings.seneca`.

```js
Shared.basictest({ seneca, script: lab })
```

## sorttest(settings)

Registers the `Sorting` group: the `sort$` qualifier on load, list and
remove. 6 tests. Needs `settings.seneca`.

## limitstest(settings)

Registers the `Limits` group: the `skip$` and `limit$` qualifiers,
combined with `sort$`, on load, list and remove, including invalid
values. 21 tests. Needs `settings.seneca`.

## upserttest(settings)

Registers the `Upserts` group: the `upsert$` directive of `save$`, 25
tests. Needs `settings.seneca` and fails immediately (`settings.seneca`
assertion) when it is missing.

On Seneca 3 the group loads `seneca-promisify` into the instance
(`seneca.use('promisify')`), because its last test uses the promise
based entity API, which seneca-entity implements with `seneca.post`.
This mutates the instance you pass in. On Seneca 4 promises are built
in and nothing is loaded.

Before every test the group waits for `ready` and clears the data; it
clears again after every test.

## mergetest(settings)

Registers the `Testing the merge option` group, 3 tests. Needs
`settings.senecaMergeFalse`: an instance whose store replaces the
stored record on update instead of merging into it. See
[Test merge versus replace semantics](../how-to/test-merge-versus-replace.md).

## sqltest(settings)

Registers the `Sql support` group, 2 tests, for stores that accept a SQL
string, or an array of a SQL string and parameters, in the `native$`
query qualifier. The store must have a `products` table with `label`
and `price` columns. Needs `settings.seneca`.

## extended(settings)

Registers the `Sql extended support` group, 21 tests, for stores that
support the comparison and logical query operators `ne$`, `eq$`, `gte$`,
`gt$`, `lte$`, `lt$`, `in$`, `nin$`, `or$` and `and$`, together with
`sort$`, `limit$`, `skip$` and `fields$`. Uses the `product` entity type
(singular). Needs `settings.seneca`. Implemented in
`lib/store-test-extended.js`.

## verify(callback, tests)

A helper for callback style tests. Returns a `(err, out)` callback that
passes `err` to `callback` when there is one, otherwise runs
`tests(out)` and passes any assertion error it throws to `callback`,
or calls `callback()` with no arguments when `tests` returns normally.

```js
it('loads foo1', function (done) {
  seneca.make('foo').load$('foo1', Shared.verify(done, function (foo) {
    Assert.equal(foo.p1, 'v1')
  }))
})
```

## test.init(script, opts)

Registers the `store-init` group: loading the plugin and clearing its
data. Unlike the groups above it takes the script as its first argument
and an options object as the second:

| Option | Type | Meaning |
| ------ | ---- | ------- |
| `seneca` | Seneca instance | An instance with seneca-entity loaded, but not yet the store. Required. |
| `name` | string | The name the plugin registers under; `seneca.has_plugin(name)` must be true after loading. Required. |
| `options` | object | Plugin options passed to `seneca.use('..', options)`. Optional. |
| `ent0` | string | The entity type (canon) used for the data checks. Default `'test0'`; the default is written back to `opts.ent0`, so pass the same `opts` object to `test.keyvalue`. |

Tests:

* `load-store-plugin`: `seneca.use('..', opts.options)`, then waits for
  `ready` (callback form, which also works on Seneca 4.0.0-rc5) and
  asserts `seneca.has_plugin(opts.name)`. The plugin is loaded by the
  relative module name `..`: Seneca resolves it from the module that
  first required `seneca`, which in a plugin repository is the test file
  in `test/`, so `..` is the package root and its `main` file. Seneca
  registers a plugin loaded this way under the name of its definition
  function, so give that function the plugin's name
  (`Object.defineProperty(define, 'name', { value: 'my-store' })`).
* `clear-data`: `remove$({ all$: true })` on `ent0`, then asserts that
  `list$()` returns an empty array.

## test.keyvalue(script, opts)

Registers the `store-keyvalue` group: 3 promise style tests of the
minimum a store must do. Takes `opts.seneca` (with the store loaded, for
example by `test.init`) and `opts.ent0`. The tests use
`seneca.entity(ent0)`, the promise based entity API, so on Seneca 3 the
instance must have `seneca-promisify` loaded.

* `save-load-auto-id`: a load of an unknown id gives nothing; two saves
  generate distinct ids; each save and load returns a new object with
  the same id and data; updating with `data$` keeps the id and the loaded
  data includes the new fields.
* `save-load-given-id`: the same with ids supplied through `id$`.
* `remove`: removing by id works, is idempotent (removing the same id
  twice does not fail), and leaves other entities alone.

## Groups that share an instance

| Group | Entity types used |
| ----- | ----------------- |
| `basictest` | `foo`, `zen/moon/bar`, `products` |
| `sorttest` | `foo` |
| `limitstest` | `foo` |
| `upserttest` | `foo`, `players`, `racers`, `users`, `customers`, `products` |
| `mergetest` | `foo` |
| `sqltest` | `products` |
| `extended` | `product` |
| `test.init`, `test.keyvalue` | `ent0` (default `test0`) |

A store that keeps its data in tables or collections needs one for each
type it is tested with. The race condition test in `upserttest` needs a
unique index on `users.email` in most databases (see
[Test groups: Upserts](test-groups.md#upserts)).
