# Changes

## 7.0.0 2026-11-20

First release under the name `@seneca/store-test`. Version 6.1.0 was
prepared in the repository but never published; its changes are part
of this release.

* Seneca 4: the peer dependencies are `seneca` `^4.0.0` and
  `@seneca/entity` `^29.0.0`. Seneca 3 users stay on
  `seneca-store-test@6`.
* Renamed from `seneca-store-test` to `@seneca/store-test`.
* Node.js 24 or later (`engines.node` `>=24`).
* Removed the dependency on `seneca-promisify`: promises are built into
  Seneca 4, and `upserttest` no longer loads the plugin (D4).
* `test.init` and `upserttest` wait with `await seneca.ready()`.
* The test file and the examples load `@seneca/entity` and
  `@seneca/mem-store` by their full names (B14). The development
  dependencies are `seneca` `^4.0.0`, `@seneca/entity` `^29.0.0` and
  `@seneca/mem-store` `^10.0.0`, in place of `seneca-entity` 28 and
  `seneca-mem-store` 9 (B11).
* Any test runner. `settings.script` can be the `node:test` module: the
  tests are registered with a one argument function that returns a
  promise instead of a promisified two argument function, which
  node:test treats as callback style. @hapi/lab is required only when
  no script is given. @hapi/code is now a regular dependency (it was
  required at load time but listed as a development dependency).
* A test function that returns a rejected promise before calling
  `done` fails the test instead of timing out.
* Fixed a `beforeEach` hook in `upserttest` that registered the
  `clearDb` factory instead of a clearing hook.
* `npm test` runs the suite again. It had been `echo fix-test` since
  6.0.0. It now runs @hapi/lab 25 against @seneca/mem-store, then runs
  the documentation examples. Removed coveralls and `.travis.yml`.
* Documentation reorganized under `docs/` (Diátaxis): a tutorial with a
  complete example store plugin, how-to guides, a reference for every
  function, setting, test group and fixture, and an explanation of the
  suite. The README is a landing page. The guide "Move a store's tests
  to Seneca 4" lists the changes a store's own tests need.


## 4.0.0

* Provide standard upsert test.
* Updated dependencies.


## 1.1.1 2016-05-09

* Fixed the native$ tests
* Removed peerDependencies from package.json


## 1.1.0: 2016-04-01

* Better behavior definition through tests
* Test enhancements and fixes
* Added the `sqltest` testing layer - direct queries made using the native$
* Added the `extended` testing layer - tests that define extended query support (ne$, eq$, lte$, lt$, gte$, gt$, in$, nin$, or$, and$)
