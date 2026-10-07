# Fixtures

The data the test groups create, the entity types they use, and the
helpers that create and clear it. A store that keeps data in tables or
collections needs one for every type listed here.

## Entity types

| Type (canon) | Fields used | Groups |
| ------------ | ----------- | ------ |
| `foo` (`-/-/foo`) | `p1`, `p2`, `p3`, `int_arr`, `x`, `y` | `basictest`, `sorttest`, `limitstest`, `upserttest` (happy path), `mergetest` |
| `zen/moon/bar` | the [bar template](#the-bar-template) fields and `mark` | `basictest` |
| `products` | `label`, `price` (a string such as `'3.40'`, or a number in `sqltest`) | `basictest`, `upserttest`, `sqltest` |
| `players` | `username`, `points`, `points_history` | `upserttest` |
| `racers` | `username`, `points`, `favorite_car` | `upserttest` |
| `users` | `username`, `email` | `upserttest` |
| `customers` | `first_name`, `last_name`, `credits` | `upserttest` |
| `product` | `name`, `price` (number) | `extended` |
| `test0` (or `opts.ent0`) | `a`, `b`, `c` | `test.init`, `test.keyvalue` |

Fixture ids are strings (`foo1`, `to-be-updated`, `some_id`,
`6095a6f73a861890cc1f4e23`), and generated ids must be strings too:
several tests assert `typeof id === 'string'`.

## The bar template

`bartemplate` is saved as a `zen/moon/bar` entity and checked by
`barverify`:

```js
{
  name$: 'bar', base$: 'moon', zone$: 'zen',
  str: 'aaa',
  int: 11,
  dec: 33.33,
  bol: false,
  wen: new Date(2020, 1, 1),   // 1 February 2020, local time
  arr: [2, 3],
  obj: { a: 1, b: [2], c: { d: 3 } },
}
```

`barverify(bar)` asserts:

* `str`, `int`, `dec` and `bol` are equal to the template values.
* `new Date(bar.wen)` has the template's time: a `Date`, an ISO string
  or a millisecond timestamp all pass.
* `arr` and `obj` deep equal the template values. A string value is
  parsed as JSON first, because SQL stores often return JSON columns as
  text.

## Clearing

`clearDb(seneca)` returns a hook that waits for `seneca.ready` and then
runs `remove$({ all$: true })` on, in order: `foo`, `zen/moon/bar`,
`players`, `racers`, `users`, `customers`, `products`. It is used as a
`before` or `beforeEach` hook by `basictest`, `sorttest`, `limitstest`
and `mergetest`, and as both `beforeEach` and `afterEach` by
`upserttest`. `extended` clears `product` itself; `test.init` clears
`ent0` in its `clear-data` test.

Because every group clears before it runs, several groups can share one
Seneca instance, and data left by a failed test does not leak into the
next group. Data created by your own tests on these types is cleared too.

## Creating

`createEntities(seneca, name, data)` returns a hook that saves every
element of `data` with `seneca.make$(name, el).save$()`, all in
parallel. Elements with an `id$` field get that id; the others get
generated ids.

## Data per group

| Group | Section | Created | When |
| ----- | ------- | ------- | ---- |
| Basic Tests | Load, List | `foo`: `{ id$: 'foo1', p1: 'v1' }`, `{ id$: 'foo2', p1: 'v2', p2: 'z2' }`; one bar | once |
| Basic Tests | Save | `foo`: `{ id$: 'to-be-updated', p1: 'v1', p2: 'v2', p3: 'v3' }`; `products`: `{ id$: 'product-to-be-updated', price: '1.95' }` | before each test |
| Basic Tests | Remove | `foo1`, `foo2` and one bar | before each test |
| Sorting | | `foo`: `{ p1: 'v1', p2: 'v1' }`, `{ p1: 'v2', p2: 'v3' }`, `{ p1: 'v3', p2: 'v2' }` | before each test |
| Limits | | `foo`: `{ p1: 'v1' }`, `{ p1: 'v3' }`, `{ p1: 'v2' }` | before each test |
| Upserts | each section | its own `players`, `racers`, `users`, `customers` or `products`, listed in [Test groups: Upserts](test-groups.md#upserts) | before each test |
| Testing the merge option | `merge:false as plugin option` | `foo`: `{ id$: 'to-be-updated', p1: 'v1', p2: 'v2', p3: 'v3' }` | before each test |
| Sql support | | `products`: `{ label: 'apple', price: 200 }`, `{ label: 'pear', price: 100 }` | once |
| Sql extended support | | `product`: `{ name: 'apple', price: 100 }`, `{ name: 'pear', price: 200 }`, `{ name: 'cherry', price: 300 }` | once |

The sorting and limits data is deliberately not created in sorted
order, so that a store returning insertion order fails the sort tests.

## Indexes

The `has no race condition - creates a single new entity` test in
`upserttest` runs three upserts on `users.email` at the same time and
expects one user. In most databases that needs a unique index on the
`email` field of the `users` table or collection; create it in your
test setup.
