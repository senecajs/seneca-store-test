# Why a shared conformance suite

What @seneca/store-test is for, how it drives the entity store protocol,
what it does not cover, and what changed with Seneca 4.

## One API, many stores

Applications written with Seneca use entities through one API:
`make$`, `data$`, `save$`, `load$`, `list$` and `remove$`, with the
`sort$`, `skip$`, `limit$`, `fields$`, `all$`, `load$`, `merge$` and
`upsert$` qualifiers. Which database holds the data is decided by the
store plugin that is loaded, and can be changed by configuration:
@seneca/mem-store during development and tests, a SQL or document store
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
Seneca instance that has @seneca/entity and the store loaded, exactly as
an application does. @seneca/entity turns each call into a message:

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

Testing through the message path matters. @seneca/entity normalizes
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
  version 7.0.0 the wrapper that adapts the callback tests takes a
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

## Seneca 4

Version 7.0.0 of the suite supports Seneca 4 only. Seneca 3 stores keep
`seneca-store-test` 6.0.0. The differences that touched the suite:

* **Promises.** Seneca 4 has `post`, `message` and promise returning
  `ready` and `close` built in. On Seneca 3 they came from
  seneca-promisify, which `upserttest` loaded. The suite no longer
  loads it or depends on it.
* **ready.** The suite waits with `await seneca.ready()` in `test.init`
  and `upserttest`. The older groups still use the callback form,
  which works too.
* **Errors.** Seneca 3 wrapped action errors (`seneca: Action ... failed:`,
  with the original in `err.orig`); Seneca 4 delivers the original
  error. The suite asserts that `err` is `null` and otherwise forwards
  it. A store's own tests should assert on the error the store replies,
  such as its `code`, not on `err.orig`.
* **Close.** Seneca 4 closes through `sys:seneca,cmd:close`, and
  `init` registers the store's `close` function on that pattern.
* **Plugin names.** Seneca registers a plugin loaded through a module
  path, as `test.init` does with `seneca.use('..')`, under the name of
  its definition function. A store whose function is `mem_store` but
  whose name is `mem-store` is found by `has_plugin('mem-store')` only
  when the function's `name` property is set to `mem-store`. Load the
  entity plugin and other published plugins by their full package
  names, `use('@seneca/entity')`: a short name such as `entity` finds
  the Seneca 3 package `seneca-entity` first when it is installed.
* **Options.** Seneca 4 validates options strictly and ignores
  `default_plugins`. Seneca 3 test files often set
  `default_plugins: { 'mem-store': false }`; with @seneca/entity, pass
  `mem_store: false` to the entity plugin instead.
* **Dependencies.** The entity plugin is `@seneca/entity` 29 and the
  in-memory store is `@seneca/mem-store` 10. The earlier
  `seneca-entity` 28 and `seneca-mem-store` 9 build their options with
  Gubu, and Seneca 4 does not load them. The suite tests with
  `seneca` `^4.0.0` on Node.js 24 and later.

See [Move a store's tests to Seneca 4](../how-to/move-to-seneca-4.md)
for the steps.
