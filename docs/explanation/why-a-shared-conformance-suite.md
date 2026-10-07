# Why a shared conformance suite

What @seneca/store-test is for, how it drives the entity store protocol,
what it does not cover, and what changes between Seneca 3 and 4.

## One API, many stores

Applications written with Seneca use entities through one API:
`make$`, `data$`, `save$`, `load$`, `list$` and `remove$`, with the
`sort$`, `skip$`, `limit$`, `fields$`, `all$`, `load$`, `merge$` and
`upsert$` qualifiers. Which database holds the data is decided by the
store plugin that is loaded, and can be changed by configuration:
seneca-mem-store during development and tests, a SQL or document store
in production, different stores for different entity types through the
`map` option of `init`.

That only works if every store behaves the same way in the details an
application comes to depend on: whether a generated id is a string,
whether `null` is stored and `undefined` ignored, whether saving an
entity with an id merges into the record or replaces it, whether
`remove$` without `all$` removes one entity or every match, how
`skip$: -1` is treated, and what `upsert$` matches. These details are
easy to get subtly different in a dozen independent implementations.
A shared suite pins them down once, in executable form, and every store
runs the same tests. The suite is the specification of the store
protocol; the groups in [Test groups](../reference/test-groups.md) are
its clauses.

## How the suite drives the protocol

The tests never call a store directly. They use the entity API on a
Seneca instance that has seneca-entity and the store loaded, exactly as
an application does. seneca-entity turns each call into a message:

| Call | Message |
| ---- | ------- |
| `ent.save$(opts)` | `sys:entity,cmd:save` with `ent` (the entity, including `id$` and `merge$` copied from `opts`) and `q` (the options object) |
| `ent.load$(query)` | `sys:entity,cmd:load` with `q` and `qent` (a template entity of the type) |
| `ent.list$(query)` | `sys:entity,cmd:list` with `q` and `qent` |
| `ent.remove$(query)` | `sys:entity,cmd:remove` with `q` and `qent` |
| `ent.native$()` | `sys:entity,cmd:native` |

The messages also carry `name`, `base` and `zone`, so a store can be
registered for all types or, with the `map` option, for some. The
store plugin never adds these actions itself: it gives
`seneca.export('entity/init')` an object with `save`, `load`, `list`,
`remove`, `close` and `native` functions, and `init` adds the actions
(wrapping them so that `msg.ent` and `msg.qent` are always entity
objects) and a hook on Seneca's close action.

Testing through the message path matters. seneca-entity normalizes
calls before they reach the store: a string id becomes `{ id }` for
`load$` and `remove$` but not for `list$`, an empty query on `load$` or
`remove$` returns without a message, `undefined` query values are
dropped, `undefined` entity fields are not sent. A store's behaviour is
only meaningful in combination with these rules, and the suite tests
the combination. It also means the same tests work for a store running
in another process behind a transport.

## Design of the suite

* **Groups by capability.** `basictest` is the core every store needs;
  `sorttest` and `limitstest` cover the query qualifiers; `upserttest`
  covers `upsert$`; `mergetest` covers the replace behaviour, which is
  optional and needs a separately configured instance; `sqltest` and
  `extended` cover SQL and the extended operators that only some stores
  have. A store declares what it supports by which groups it calls.
* **Fixed fixtures, cleared before each group.** The data is small and
  uses fixed ids where a test needs to know them. Every group clears the
  types it uses before it runs, so groups can share an instance and a
  failed test does not poison the next one. The sorting fixtures are
  created out of order on purpose.
* **Callback style tests with `verify`.** The suite predates promises
  in Seneca and is written in callback style; `verify(done, fn)` turns
  an entity callback into a test outcome. The `Upserts` group and the
  `store-init` and `store-keyvalue` groups are newer and use
  `seneca.test(done)` or promises.
* **Runner independence.** The tests are registered into a `script`
  passed by the caller. The script was always a @hapi/lab script; since
  version 6.1.0 the wrapper that adapts the callback tests takes a
  single argument and returns a promise, which is also what `node:test`
  expects, so the `node:test` module can be passed directly and @hapi/lab
  is only required when no script is given.
* **A library, not a command.** The suite is a dependency of each
  store's own tests, called from the store's test file, so that it can
  share the file with store specific tests, use the store's connection
  setup, and run under the store's own test runner and CI.

## What the suite does not cover

* Performance, concurrency beyond the single race condition test, and
  transactions.
* Schema or table creation: the store's test setup must provide the
  entity types in [Fixtures](../reference/fixtures.md), and a unique
  index on `users.email` for the race test. That the suite has to be
  told about a database's indexes is a known leak in the abstraction.
* Store specific features: `native$` is only checked to return
  something, and `fields$` is only exercised by `extended`.
* Type fidelity beyond the bar template, which accepts JSON strings for
  arrays and objects and any representation of a date with the right
  time, because SQL stores legitimately differ here.

## Seneca 3 and Seneca 4

The suite runs on both. The differences that touched it:

* **Promises.** Seneca 4 has `post`, `message` and promise returning
  `ready` and `close` built in; seneca-promisify, which provided them
  on Seneca 3, is a no-op there. seneca-entity's promise based entities
  (`seneca.entity(...)`) call `seneca.post`, so on Seneca 3 the instance
  needs seneca-promisify. `upserttest` loads it only when
  `seneca.version` starts with `3.`.
* **ready.** `await seneca.ready()` on an idle instance hangs in Seneca
  4.0.0-rc5. The suite waits for `ready` with the callback form
  everywhere.
* **Errors.** Seneca 3 wraps action errors (`seneca: Action ... failed:`,
  with the original in `err.orig`); Seneca 4 delivers the original
  error. The suite asserts that `err` is `null` and otherwise forwards
  it, so it reads the same on both; a store's own tests should use
  `(err.orig || err).message`.
* **Close.** Seneca 4 closes through `sys:seneca,cmd:close`, and
  `init` registers the store's `close` function on that pattern. Seneca
  3 translates `sys:seneca` to `role:seneca`, so the same registration
  works there.
* **Plugin names.** Seneca registers a plugin loaded through a module
  path, as `test.init` does with `seneca.use('..')`, under the name of
  its definition function. A store whose function is `mem_store` but
  whose name is `mem-store` is found by `has_plugin('mem-store')` only
  when the function's `name` property is set to `mem-store`.
* **Options.** Seneca 4 validates options strictly and ignores
  `default_plugins`; Seneca 3 test files often set
  `default_plugins: { 'mem-store': false }`, which is harmless but
  unnecessary on either version now (Seneca 3.38 loads only `transport`
  by default).
* **Dependencies.** Seneca 3.28, the `seneca@plugin` dist-tag that this
  package used to test with, cannot load seneca-entity 27 and later,
  and its dependency `norma` fails on Node.js 23 and later. The package
  tests with seneca 4.0.0-rc5 (and 4.0.0) and was verified against
  seneca 3.38.

See [Support Seneca 3 and 4 in one test file](../how-to/support-seneca-3-and-4.md)
for the steps.
