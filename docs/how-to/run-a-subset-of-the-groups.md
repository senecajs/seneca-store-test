# Run a subset of the groups

How to run only the test groups your store supports, run a single test
while working on it, and skip tests that do not apply.

## Call only the groups you need

Each group is a separate function; a group you do not call does not
run. A typical key-value or document store runs these:

```js
Shared.basictest({ seneca, script: lab })
Shared.sorttest({ seneca, script: lab })
Shared.limitstest({ seneca, script: lab })
Shared.upserttest({ seneca, script: lab })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: lab })
```

Add `sqltest` only when the store runs SQL given in `native$`, and
`extended` only when it implements the `ne$`, `gte$`, `in$`, `or$` and
related operators (see [Test groups](../reference/test-groups.md)).
Leave out `mergetest` if the store has no option to replace records
instead of merging.

## Run one test or one section

With @hapi/lab, `-g` runs the tests whose full title matches a pattern.
The full title includes the section names, so both of these work:

```sh
npx lab -v -P test -g 'should support opaque ids'
npx lab -v -P test -g 'Sorting List'
```

With the Node.js test runner use `--test-name-pattern`, matched against
test and suite names:

```sh
node --test --test-name-pattern='Sorting' test/
```

The titles are listed in [Test groups](../reference/test-groups.md).

## Skip single tests

Tests are registered through `script.it(name, options, fn)`. Pass a
script that marks the tests you name as skipped and forwards everything
else:

```js
const skip = ['should prived direct access to the driver']

const script = Object.assign({}, lab, {
  it: (name, opts, fn) =>
    lab.it(name, Object.assign({}, opts, { skip: skip.includes(name) }), fn),
})

Shared.basictest({ seneca, script })
```

lab reports `49 tests complete (1 skipped)` for `basictest` and
`sorttest` with that script. With node:test the same wrapper works,
since `it(name, { skip: true }, fn)` is also how node:test skips a
test.

Skip a test only when the behaviour is genuinely outside your store's
scope, and say so in your README: applications rely on every store
behaving the same way.

## Run the groups in a single file with your own tests

The groups register into the script you pass, next to your own tests.
Use `before` and `after` hooks on that script for connections:

```js
lab.before(async () => { await new Promise((r) => seneca.ready(r)) })
lab.after(async () => { await new Promise((r) => seneca.close(r)) })
```

The groups clear their own data before running, so the order in which
you call them does not matter, but data your own tests leave in the
fixture types (see [Fixtures](../reference/fixtures.md)) is cleared by
the next group.
