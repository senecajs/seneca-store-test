## 6.1.0

* Seneca 4 prerelease support. The test groups run on seneca 4.0.0-rc5
  and 4.0.0 as well as on Seneca 3 (verified with 3.38.0). `upserttest`
  loads seneca-promisify only on Seneca 3, where seneca-entity's promise
  API needs it; on Seneca 4 promises are built in and the plugin is not
  loaded. `test.init` waits for `ready` with the callback form, which
  also works on 4.0.0-rc5.
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
  6.0.0, when the `seneca@plugin` dist-tag (Seneca 3.28) stopped working
  with seneca-entity 27. It now runs @hapi/lab 25 against seneca-mem-store
  on Node.js 24 and 22, with the development dependencies seneca
  ^4.0.0-rc5, seneca-entity ^28.1.0 and seneca-mem-store ^9.4.0, and
  then runs the documentation examples. Removed coveralls and
  `.travis.yml`; the GitHub Actions workflow change (Node.js 24 and 22,
  branches master and main) is provided in `.patches/`.
* Documentation reorganized under `docs/` (Diátaxis): a tutorial with a
  complete example store plugin, how-to guides, a reference for every
  function, setting, test group and fixture, and an explanation of the
  suite. The README is a landing page.


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
