# Test groups

Every test in every group, with the behaviour it asserts of the store.
The names are the exact test titles, so you can run one test with
`lab -g '<title>'` (see [Run a subset of the groups](../how-to/run-a-subset-of-the-groups.md)).
The data each group creates is described in [Fixtures](fixtures.md).

All queries go through the seneca-entity API, so what reaches the store
is what seneca-entity sends: a string or number id becomes `{ id }` for
`load$` and `remove$`, an empty query (`{}` or none, and no id on the
entity) makes `load$` and `remove$` return without calling the store,
`undefined` query values are dropped, and the `save$` options object is
passed to the store as `msg.q` with `id$` and `merge$` also copied onto
the entity.

## Basic Tests

Registered by `basictest`. The `Load` and `List` sections create their
data once (`before`); `Save` and `Remove` recreate it before every test
(`beforeEach`).

### Load

Data: `foo1 { p1: 'v1' }`, `foo2 { p1: 'v2', p2: 'z2' }` of type `foo`, and
one `zen/moon/bar` entity from the [bar template](fixtures.md#the-bar-template).

| Test | Asserts |
| ---- | ------- |
| `should load an entity qqq` | `load$('foo1')` returns the entity with `id` `foo1` and `p1` `v1`. |
| `should return null for non existing entity` | `load$('does-not-exist-at-all-at-all')` returns `null`. |
| `should support filtering` | `load$({ p1: 'v2' })` returns `foo2` with both fields. |
| `should filter with AND` | `load$({ p1: 'v2', p2: 'z2' })` returns `foo2`: all fields must match. |
| `should filter with AND 2` | `load$({ p1: 'v2', p2: 'a' })` returns `null`. |
| `should support different attribute types` | `load$({ str: 'aaa' })` on `zen/moon/bar` returns an entity with an `id` that passes the [bar checks](fixtures.md#the-bar-template): strings, integers, decimals, booleans, dates, arrays and objects round trip. |
| `should not mix attributes from entity to query for filtering` | With `p1 = 'v1'` set on the query entity, `load$({ p2: 'z2' })` returns `foo2`: only the query decides. |
| `should reload current entity if no query provided and id present` | With `id = 'foo2'` set on the entity, `load$()` returns `foo2`. |
| `should do nothing if no query provided and id not present` | With only `p1` set and no id, `load$()` gives no entity (seneca-entity does not call the store). |

### Save

Data before each test: `foo` `to-be-updated { p1: 'v1', p2: 'v2', p3: 'v3' }`
and `products` `product-to-be-updated { price: '1.95' }`.

| Test | Asserts |
| ---- | ------- |
| `should save an entity to store (and generate an id)` | Saving `{ p1, p2 }` gives an entity with a non null `id`; `load$(id)` returns the same fields. |
| `should save an entity to store (with provided id)` | With `id$ = 'existing'` the saved and loaded entity has `id` `existing`. |
| `should update an entity if id provided` (first) | Saving `{ id: 'to-be-updated', p1: 'z1', p2: 'z2', p3: 'v3' }` updates the record: the reply and a fresh `load$` have the new values. |
| `should update an entity if id provided` (second) | Saving `{ id: 'product-to-be-updated', label: 'lorem ipsum' }` keeps `price` `'1.95'` and adds `label`: the default save merges into the existing record. |
| `should save an entity if id provided but original doesn't exist` | Saving with `id = 'will-be-inserted'` inserts a record with that id. |
| `should support different attribute types` | Saving the bar template plus a random `mark` returns and reloads an entity that passes the bar checks and keeps `mark`. |
| `should allow dublicate attributes` | Saving `{ p2: 'v2' }` only; the loaded entity has `p2` and no `p1` or `p3`. |
| `should not save modifications to entity after save completes` | After saving `int_arr: [37]`, pushing to the original entity's array leaves the returned entity at `[37]`: the store copies the data. |
| `should not backport modification to saved entity to the original one` | Pushing to the returned entity's array leaves the original at `[37]`. |
| `should clear an attribute if = null` | Saving `p1 = null` and `p2 = undefined` on a loaded entity: the reply and a reload have `p1` `null` and `p2` unchanged (`'v2'`). `null` is stored, `undefined` is ignored. |
| `when the id$ arg passed to #save$ is undefined` / `should generate a new id and save the entity` | `save$({ id$: undefined })` generates a string id and stores the fields. |
| `when the id$ arg passed to #save$ is null` / `should generate a new id and save the entity` | `save$({ id$: null })` generates a string id. |
| `when the provided id is null` / `should generate a new id and save the entity` | `data$({ id: null, ... })` then `save$()` generates a string id. |
| `when the provided id is undefined` / `should generate a new id and save the entity` | `data$({ id: undefined, ... })` then `save$()` generates a string id. |

### List

Data (once): `foo1`, `foo2` and the bar entity as in `Load`.

| Test | Asserts |
| ---- | ------- |
| `should load all elements if no params` | `list$({})` on `zen/moon/bar` returns one entity that passes the bar checks. |
| `should load all elements if no params 2` | `list$({})` on `foo` returns 2 entities. |
| `should load all elements if no query provided` | `list$()` returns 2 entities. |
| `should list entities by id` | `list$({ id: 'foo1' })` returns `[foo1]` with no `p2` or `p3`. |
| `should list entities by integer property` | `list$({ int: 11 })` on `zen/moon/bar` returns the bar entity. |
| `should list entities by string property` | `list$({ p2: 'z2' })` returns `[foo2]`. |
| `should list entities by two properties` | `list$({ p2: 'z2', p1: 'v2' })` returns `[foo2]`. |
| `should support opaque ids (array)` | `list$(['foo1', 'foo2'])` returns both, in any order. |
| `should support opaque ids (single id)` | `list$(['foo2'])` returns `[foo2]`. |
| `should support opaque ids (string)` | `list$('foo2')` returns `[foo2]`: a string query is an id (the store receives the string). |
| `should filter with AND` | `list$({ p2: 'z2', p1: 'v1' })` returns `[]`. |
| `should not mix attributes from entity to query for filtering` | With `p1 = 'v1'` on the query entity, `list$({ p2: 'z2' })` returns `[foo2]`. |

### Remove

Data before each test: `foo1`, `foo2` and the bar entity.

| Test | Asserts |
| ---- | ------- |
| `should delete only an entity` | `remove$('foo1')` leaves 1 `foo`. |
| `should delete all entities if all$ = true` | `remove$({ all$: true })` replies with nothing and leaves 0. |
| `should delete an entity by property` | `remove$({ p1: 'v1' })` leaves only `foo2`. |
| `should delete entities filtered by AND` | `remove$({ p1: 'v1', p2: 'z2' })` matches nothing; 2 remain. |
| `should return deleted entity if load$: true` | `remove$({ p1: 'v2', load$: true })` replies with the removed entity (`p1` `v2`, `p2` `z2`). |
| `should never return deleted entities if all$: true` | `remove$({ all$: true, load$: true })` replies with nothing. |
| `should not delete current ent (only uses query)` | With `id = 'foo2'` on the entity, `remove$({ p1: 'v1' })` removes `foo1` and keeps `foo2`. |
| `should delete current entity if no query present` | On a loaded `foo2`, `remove$()` removes it (seneca-entity sends `{ id: 'foo2' }`); `foo1` remains. |

### Native

| Test | Asserts |
| ---- | ------- |
| `should prived direct access to the driver` | `native$()` replies with a truthy value (the driver, client or connection). |

## Sorting

Registered by `sorttest`. Before each test: `foo` entities
`{ p1: 'v1', p2: 'v1' }`, `{ p1: 'v2', p2: 'v3' }`, `{ p1: 'v3', p2: 'v2' }`
with generated ids, created in that order.

| Section | Test | Asserts |
| ------- | ---- | ------- |
| Load | `should support ascending order` | `load$({ sort$: { p1: 1 } })` returns the `v1` entity. |
| Load | `should support descending order` | `load$({ sort$: { p1: -1 } })` returns `v3`. |
| List | `should support ascending order` | `list$({ sort$: { p1: 1 } })` returns `v1, v2, v3`. |
| List | `should support descending order` | `list$({ sort$: { p1: -1 } })` returns `v3, v2, v1`. |
| Remove | `should support ascending order` | `remove$({ sort$: { p1: 1 } })` removes the first of the sorted list (`v1`); `v2, v3` remain. |
| Remove | `should support descending order` | `remove$({ sort$: { p1: -1 } })` removes `v3`; `v1, v2` remain. |

## Limits

Registered by `limitstest`. Before each test: `foo` entities with `p1`
`v1`, `v3`, `v2`, created in that order. All sorted queries sort by
`p1` ascending.

| Section | Test | Asserts |
| ------- | ---- | ------- |
| | `check setup correctly` | `list$({})` returns 3. |
| Load | `should support skip and sort` | `{ skip$: 1, sort$ }` returns `v2`. |
| Load | `should return empty array when skipping all the records` | `{ skip$: 3 }` returns nothing. |
| Load | `should not be influenced by limit` | `{ limit$: 2, sort$ }` returns `v1`. |
| Load | `should ignore skip < 0` | `{ skip$: -1, sort$ }` returns `v1`. |
| Load | `should ignore limit < 0` | `{ limit$: -1, sort$ }` returns `v1`. |
| Load | `should ignore invalid qualifier values` | `{ limit$: 'A', skip$: 'B', sort$ }` returns `v1`. |
| List | `should support limit, skip and sort` | `{ limit$: 1, skip$: 1, sort$ }` returns `[v2]`. |
| List | `should return empty array when skipping all the records` | `{ limit$: 2, skip$: 3 }` returns `[]`. |
| List | `should return correct number of records if limit is too high` | `{ limit$: 5, skip$: 2, sort$ }` returns `[v3]`. |
| List | `should ignore skip < 0` | `{ skip$: -1, sort$ }` returns all 3, sorted. |
| List | `should ignore limit < 0` | `{ limit$: -1, sort$ }` returns all 3, sorted. |
| List | `should ignore invalid qualifier values` | `{ limit$: 'A', skip$: 'B', sort$ }` returns all 3, sorted. |
| Remove | `should support limit, skip and sort` | `{ limit$: 1, skip$: 1, sort$ }` removes `v2`; `v1, v3` remain. |
| Remove | `should not be impacted by limit > 1` | `{ limit$: 2, sort$ }` without `all$` removes one entity (`v1`); `v2, v3` remain. |
| Remove | `should work with all$: true` | `{ all$: true, limit$: 2, skip$: 1, sort$ }` removes `v2` and `v3`; `v1` remains. |
| Remove | `should not delete anyithing when skipping all the records` | `{ all$: true, limit$: 2, skip$: 3 }` removes nothing. |
| Remove | `should delete correct number of records if limit is too high` | `{ all$: true, limit$: 5, skip$: 2, sort$ }` removes `v3`; `v1, v2` remain. |
| Remove | `should ignore skip < 0` | `{ skip$: -1, sort$ }` removes `v1`; `v2, v3` remain. |
| Remove | `should ignore limit < 0` | `{ all$: true, limit$: -1, sort$ }` removes everything. |
| Remove | `should ignore invalid qualifier values` | `{ limit$: 'A', skip$: 'B', sort$ }` removes `v1`; `v2, v3` remain. |

The order of operations a store must follow: filter, then sort, then
skip, then limit. Without `all$`, `remove$` removes at most one entity,
the first of the sorted and skipped list.

## Upserts

Registered by `upserttest`. Before every test the group waits for
`ready` and clears all fixture types; it clears again after every test.
Every test installs itself as the instance's error handler
(`seneca.test(done)`), so an error anywhere fails the test directly.
Lists are sorted by the test before comparison, so the store's list
order does not matter. The directive is `save$({ upsert$: [fields] })`.

| Section | Test | Asserts |
| ------- | ---- | ------- |
| `matches on 1 upsert$ field` (players `richard` and `bob`, 0 points) | `updates the entity` | Saving `{ username: 'richard', points: 9999 }` with `upsert$: ['username']` updates richard's record (same id) and leaves bob alone; still 2 players. |
| | `shouldn't mutate the original entity after save completes` | The upsert reply has richard's id and `points_history [37]`; pushing to the reply's array does not change the original entity. |
| `matches on 1 upsert$ field, some data$ fields missing` (racers with `points` and `favorite_car`) | `retains the entity fields missing from data$` | Upserting `{ username: 'richard', favorite_car: 'bmw m3 e46' }` on `['username']` keeps `points` `37` and updates the car. |
| `matches on 1 upsert$ field, save$ includes id$ the field` (user `elvis@no1.com`) | `updates the fields and ignores the id$ qualifier` | `save$({ id$: new_id, upsert$: ['email'] })` with a new `username` updates the existing user: 1 user, new username, id unchanged. |
| `matches on 2 upsert$ fields` (customers richard gear and richard sinatra) | `updates the entity` | Upserting on `['first_name', 'last_name']` with `credits: 1234` updates gear only. |
| `no match, 1 upsert$ field` (product `a macchiato espressionado`) | `creates a new entity` | Upserting `b toothbrush` on `['label']` inserts a second product with a different id. |
| `no match, 1 upsert$ field, save$ includes the id$ field` | `creates a new entity with the given id` | `save$({ id$: '6095a6f73a861890cc1f4e23', upsert$: ['email'] })` on an empty `users` type inserts a user with that id. |
| `no match, 2 upsert$ fields` (customer frank sinatra) | `creates a new entity` | Upserting frank nixon on both name fields inserts a second customer. |
| `bombarding the store with near-parallel upserts` | `has no race condition - creates a single new entity` | Three parallel upserts of the same user on `['email']` result in exactly one user. Most databases need a unique index on `users.email` for this. |
| `entity matches on a private field` (product with `psst$: 'private'`) | `creates a new entity` | `upsert$: ['psst$']` cannot match (private fields are not stored): a second product is inserted. |
| `entity matches on a private and a public field` | `matches by the public field and updates the entity` | `upsert$: ['psst$', 'label']` matches on `label` and updates the price; still 1 product. |
| `empty upsert$ array` | `creates a new document` | `upsert$: []` inserts. |
| ``entity matches on a field with the `undefined` value`` | `creates a new document` | Both records have `label: undefined`, which seneca-entity strips, so there is nothing to match: 2 products. |
| `some upsert$ fields are blank in existing entities` (existing `label: null`) | `creates a new entity` | Upserting `{ price: '3.40', label: 'a toothbrush' }` on `['price', 'label']` inserts: `null` does not match a value. |
| `fields in upsert$ are not present in the data$ object` | `creates a new entity because it can never match` | Upserting `{ price: '2.95', label: null }` on `['label']` inserts a product with `label` `null`. |
| `upserting on the id field, match exists` (player with `id: 'some_id'`) | `updates the matching entity` | Saving `{ id: 'some_id', ..., points: 9999 }` with `upsert$: ['id']` updates that player: an entity with an id is updated by id. |
| | `works with load$ after the update` | `load$('some_id')` returns the updated player. |
| `upserting on the id field, no match` | `creates a new document with that id` | Saving `{ id: 'some_id', username: 'jim', ... }` inserts a user with id `some_id`; the existing user keeps its id. |
| | `works with load$ after the creation` | `load$('some_id')` returns the new user. |
| `upserting on the id and some field, match exists` | `updates the matching entity`, `works with load$ after the update` | As above with `upsert$: ['id', 'username']`. |
| `upserting on the id and some field, match does not exist` | `creates a new document with that id`, `works with load$ after the creation` | Saving `{ id: 'some_id', username: 'richard', email: 'rr@voxgig.com' }` with `upsert$: ['id', 'username']` inserts a second richard with id `some_id`. |
| `save$ invoked on a saved entity instance, match exists` | `completely ignores the upsert$ directive` | Calling `save$({ upsert$: ['label'] })` on an entity that already has an id updates by id; the other product is untouched. |
| `happy path` | `is happy` | With the promise API (`seneca.entity('foo')`): two saves, then an upsert on `['x']` returns the first entity's id, and the list has `{ x: 1, y: 55 }` and `{ x: 2, y: 33 }`. |

## Testing the merge option

Registered by `mergetest`, on the `senecaMergeFalse` instance. The
nested section recreates `foo` `to-be-updated { p1: 'v1', p2: 'v2', p3: 'v3' }`
before each of its tests.

| Test | Asserts |
| ---- | ------- |
| `should allow to not merge during update with merge$: false` | `save$({ merge$: false })` of `{ id: 'to-be-updated', p1: 'z1', p2: 'z2' }` gives an entity with `p1`, `p2` and no `p3`, on the reply and on reload. |
| `merge:false as plugin option` / `should update an entity if id provided` | A plain `save$()` of `{ id: 'to-be-updated', p1: 'z1', p2: 'z2' }` replaces the record: `p3` is gone from the reply and from a reload. |
| `merge:false as plugin option` / `should allow to merge during update with merge$: true` | `save$({ merge$: true })` keeps `p3`; the reply has no `merge$` field. |

See [Test merge versus replace semantics](../how-to/test-merge-versus-replace.md).

## Sql support

Registered by `sqltest`. Once, before the tests: `products` `apple 200`
and `pear 100` (`label`, `price`).

| Test | Asserts |
| ---- | ------- |
| `should accept a string query` | `list$({ native$: 'SELECT * FROM products ORDER BY price' })` returns 2 entities with `entity$` `-/-/products`: pear 100, then apple 200. |
| `should accept and array with query and parameters` | `list$({ native$: ['SELECT * FROM products WHERE price >= ? AND price <= ?', 0, 150] })` returns `[pear]`. |

## Sql extended support

Registered by `extended`. Once, before the tests, the `product` type
(singular) is cleared and `apple 100`, `pear 200`, `cherry 300` (`name`,
`price`) are created. All sorted queries sort by `price` ascending.

| Test | Query | Expected names |
| ---- | ----- | -------------- |
| `use not equal ne$` | `{ price: { ne$: 200 } }` | apple, cherry |
| `use not equal ne$ string` | `{ name: { ne$: 'pear' } }` | apple, cherry |
| `use eq$` | `{ price: { eq$: 200 } }` | pear |
| `use eq$ string` | `{ name: { eq$: 'pear' } }` | pear |
| `use gte$` | `{ price: { gte$: 200 } }` | pear, cherry |
| `use gt$` | `{ price: { gt$: 200 } }` | cherry |
| `use lte$` | `{ price: { lte$: 200 } }` | apple, pear |
| `use lt$` | `{ price: { lt$: 200 } }` | apple |
| `use in$` | `{ price: { in$: [200, 300] } }` | pear, cherry |
| `use in$ string` | `{ name: { in$: ['cherry', 'pear'] } }` | pear, cherry |
| `use in$ one matching` | `{ price: { in$: [200, 500, 700] } }` | pear |
| `use in$ no matching` | `{ price: { in$: [250, 500, 700] } }` | none |
| `use nin$ three matching` | `{ price: { nin$: [250, 500, 700] } }` | all 3 |
| `use nin$ one matching` | `{ price: { nin$: [200, 500, 300] } }` | apple |
| `use complex in$ and nin$` | `{ price: { nin$: [250, 500, 300], in$: [200, 300] } }` | pear |
| `use nin$ string` | `{ name: { nin$: ['cherry', 'pear'] } }` | apple |
| `use or$` | `{ or$: [{ name: 'cherry' }, { price: 200 }] }` | pear, cherry |
| `use and$` | `{ and$: [{ name: 'cherry' }, { price: 300 }] }` | cherry |
| `use and$ & or$` | `{ or$: [{ price: { gte$: 200 } }, { and$: [{ name: 'cherry' }, { price: 300 }] }] }` | pear, cherry |
| `use and$ & or$ and limit$` | the same with `limit$: 1, fields$: ['name']` | pear, without `price` |
| `use and$ & or$ and limit$, fields$ and skip$` | `{ price: { gte$: 200 }, limit$: 1, fields$: ['name', 'id'], skip$: 1 }` | cherry, without `price` |

## store-init and store-keyvalue

Registered by `test.init` and `test.keyvalue`; see
[Functions and settings](api.md#testinitscript-opts).
