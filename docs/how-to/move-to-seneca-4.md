# Move a store's tests to Seneca 4

How to move a store plugin, and its standard tests, from Seneca 3 to
Seneca 4. @seneca/store-test 7 supports Seneca 4 only. A store that
stays on Seneca 3 keeps `seneca-store-test` 6.0.0, the last version
published under that name.

## 1. Dependencies

Declare Seneca 4 and the entity plugin as peer dependencies, and test
with the same versions:

```json
{
  "peerDependencies": {
    "seneca": "^4.0.0",
    "@seneca/entity": "^29.0.0"
  },
  "devDependencies": {
    "@hapi/lab": "^25.2.0",
    "@seneca/entity": "^29.0.0",
    "@seneca/store-test": "^7.0.0",
    "seneca": "^4.0.0"
  },
  "engines": {
    "node": ">=24"
  }
}
```

Install them with:

```sh
npm install --save-dev seneca@^4 @seneca/entity @seneca/store-test @hapi/lab
```

Remove `seneca-entity`, `seneca-mem-store`, `seneca-promisify` and
`seneca-store-test` from every dependency section. The published
versions of `seneca-entity` (up to 28) and `seneca-mem-store` (up to 9)
build their options with Gubu, and Seneca 4 stops at load time with
`plugin_gubu_shape` when it meets them. `seneca-promisify` is not
needed: promises are built into Seneca 4. Do not use an open range such
as `>=3` or `>=4` for `seneca`: it would also admit Seneca 5.

## 2. Create the instance

```js
function makeSeneca(store_opts = {}) {
  return Seneca()
    .test()
    .use('@seneca/entity', { mem_store: false })
    .use(MyStore, store_opts)
}
```

Load plugins by their full package names. A short name such as
`use('entity')` or `use('mem-store')` finds an installed
`seneca-entity` or `seneca-mem-store` first, and those are the Seneca 3
releases. `mem_store: false` stops @seneca/entity loading
@seneca/mem-store next to your store.

Remove `use('promisify')`, version checks such as
`seneca.version.startsWith('3.')`, and the
`default_plugins: { 'mem-store': false }` option seen in older test
files: Seneca 4 does not read `default_plugins`.

## 3. Wait for ready

```js
await seneca.ready()
```

The promise form of `ready` works on Seneca 4.0.0. The callback form,
`seneca.ready(fn)`, works too.

## 4. Errors

Seneca 4 passes the error that an action replies to the caller as it
is. Seneca 3 wrapped it: the message was
`seneca: Action cmd:save,sys:entity failed: <message>.` and the
original error was in `err.orig`. The standard tests only check that
`err` is `null`, so they are not affected. In your own tests, assert on
the error your store replies, for example on its `code`, and not on
`err.orig`, `err.seneca` or the wrapped message:

```js
expect(err.code).to.equal('entity-id-exists')
```

## 5. Closing

`seneca.export('entity/init')` adds the store's `close` function as a
prior on the close action for you. If your plugin needs further
shutdown work, register it with `this.destroy(fn)`, or as a prior on
`sys:seneca,cmd:close`, the Seneca 4 name of the Seneca 3 pattern
`role:seneca,cmd:close`.

Close every instance at the end of the test file so that the process
exits (connection pools keep it alive otherwise):

```js
lab.after(async () => {
  await seneca.close()
})
```

## 6. Options

* Plugin `defaults` must be plain values, or a function that builds
  them with the `valid` builders that Seneca passes in:
  `MyStore.defaults = ({ valid }) => ({ ... })`. Seneca 4 rejects Gubu
  shapes. A Joi schema is not rejected, but it is not used for
  validation either: it becomes the option value.
* A plain-object default is closed: Seneca 4 rejects an option key that
  the defaults do not name, also inside nested objects. Options that
  your store passes through to a database driver need
  `valid.Open({})`, and an option whose default is `null` needs
  `valid.Skip(valid.Any())`.
* Remove `legacy.transport`, `legacy.error_codes`, `legacy.validate`
  and the other `legacy.*` flags from test instances. Seneca 4 ignores
  them and prints a deprecation warning for each one. Only
  `legacy.meta` and `legacy.builtin_actions` remain.

## 7. Run the tests

```sh
npm install
npm test
```

Run with `node --trace-deprecation` (for example
`NODE_OPTIONS=--trace-deprecation npm test`) to find the code that
causes a `SENECA_DEP_*` warning. There is no Seneca 3 run to keep: test
on Node.js 24 or later with the `seneca` development dependency
`^4.0.0`.

The [Seneca 4 migration guide](https://github.com/senecajs/seneca/blob/main/docs/how-to/migrate-from-seneca-3.md)
lists every change between the two versions.
