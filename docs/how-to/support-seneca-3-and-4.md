# Support Seneca 3 and 4 in one test file

How to keep a store plugin, and its standard tests, working on both
Seneca 3 and Seneca 4. @seneca/store-test itself runs on both: its own
suite was verified with seneca 3.38.0, 4.0.0-rc5 and 4.0.0.

## 1. Dependencies

Declare Seneca as a peer dependency with a range that includes the
Seneca 4 prerelease, and test with Seneca 4:

```json
{
  "peerDependencies": {
    "seneca": ">=3 || >=4.0.0-rc5",
    "seneca-entity": ">=27"
  },
  "devDependencies": {
    "@hapi/lab": "^25.2.0",
    "seneca": "^4.0.0-rc5",
    "seneca-entity": "^28.1.0",
    "seneca-promisify": "^3.7.2",
    "@seneca/store-test": "^6.1.0"
  }
}
```

A bare `>=3` excludes prereleases and makes `npm install` fail with
`ERESOLVE` under Seneca 4.0.0-rc5. seneca-promisify is needed on Seneca
3 only, but keep it installed so that the Seneca 3 run works.

## 2. Tell the versions apart

```js
const seneca3 = seneca.version.startsWith('3.')
```

Do not test for features with `seneca.has('sys:seneca,cmd:close')`:
Seneca 3 translates `sys:seneca` to `role:seneca`, so it answers true
on both.

## 3. Create the instance

```js
function makeSeneca(store_opts = {}) {
  const seneca = Seneca().test()

  // Promises for the entity API come from seneca-promisify on Seneca 3;
  // they are built into Seneca 4, where the plugin is a no-op.
  if (seneca.version.startsWith('3.')) {
    seneca.use('promisify')
  }

  return seneca
    .use('entity', { mem_store: false })
    .use(MyStore, store_opts)
}
```

seneca-entity is a separate plugin in both versions, and
`mem_store: false` stops it loading seneca-mem-store next to your store.
The `default_plugins: { 'mem-store': false }` option seen in older test
files is not needed: Seneca 3.38 loads only `transport` by default, and
Seneca 4 does not read `default_plugins`.

`upserttest` loads seneca-promisify itself when it runs on Seneca 3,
but `test.keyvalue` and your own promise style tests need it loaded
before they run, hence the explicit `use` above.

## 4. Wait for ready with a callback

In shared code use the callback form of `ready`:

```js
await new Promise((resolve) => seneca.ready(resolve))
```

`await seneca.ready()` hangs on an idle instance in Seneca 4.0.0-rc5
(fixed in 4.0.0), and on Seneca 3 it needs seneca-promisify. The
groups and `test.init` use the callback form.

## 5. Errors

Seneca 3 wraps an error replied by an action: the callback receives an
error whose `message` is `seneca: Action cmd:save,sys:entity failed: <message>.`
and whose `orig` is the original. Seneca 4 passes the original error
through. The standard tests only check that `err` is `null`, so they are
not affected, but your own tests should assert on the original message
in a way that works for both:

```js
expect((err.orig || err).message).to.equal('entity-id-exists')
```

## 6. Closing

`seneca.export('entity/init')` adds the store's `close` function as a
prior on the close action for you, on both versions. If your plugin
registers further close hooks itself, use the pattern of the running
version:

```js
const close_pattern = seneca.version.startsWith('3.')
  ? 'role:seneca,cmd:close'
  : 'sys:seneca,cmd:close'

seneca.add(close_pattern, function (msg, reply) {
  // release resources, then continue the chain
  this.prior(msg, reply)
})
```

Close every instance at the end of the test file so that the process
exits (connection pools keep it alive otherwise):

```js
lab.after(async () => {
  await new Promise((r) => seneca.close(r))
})
```

## 7. Options that Seneca 4 rejects

Seneca 4 validates its options strictly. Remove `legacy.transport`,
`legacy.error_codes`, `legacy.validate` and other `legacy.*` flags from
test instances; only `legacy: true|false` or
`legacy: { error, meta, builtin_actions }` are accepted. Plugin options
come only from `use()` and `options.plugin.<name>`, and plugin
`defaults` must be plain values or Gubu shapes, not Joi schemas.

## 8. Run the tests on both versions

Locally, swap the installed Seneca without changing `package.json`:

```sh
npm install --no-save seneca@3 && npm test
npm install --no-save seneca@^4.0.0-rc5 && npm test
npm install
```

In GitHub Actions, add the Seneca version to the matrix:

```yaml
strategy:
  matrix:
    node-version: [24.x, 22.x]
    seneca-version: ['3', '^4.0.0-rc5']
steps:
  - run: npm install
  - run: npm install --no-save seneca@${{ matrix.seneca-version }}
  - run: npm test
```

Seneca 3.28 (the `seneca@plugin` dist-tag) does not work with
seneca-entity 27 or later, and its dependency `norma` fails on Node.js
23 and later (`util.isError is not a function`); use `seneca@3`, which
resolves to 3.38, for the Seneca 3 run.
