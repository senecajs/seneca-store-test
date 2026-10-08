# Test merge versus replace semantics

How to verify both ways a store can update an existing record: merging
the saved fields into it (the default), or replacing the record with
them.

## The two behaviours

When `save$` is called on an entity that has an `id`, the store finds
the record with that id and either:

* **merges**: fields of the entity overwrite fields of the record, and
  fields the entity does not have are kept; or
* **replaces**: the record becomes exactly the entity's fields.

The default is to merge. A store offers replacing through a plugin
option (`merge: false` in seneca-mem-store and other official stores)
and lets a single call choose with the `merge$` directive:
`ent.save$({ merge$: false })`. seneca-entity copies `merge$` onto the
entity, so the store reads it as `msg.ent.merge$`. A store decides
like this (from seneca-mem-store):

```js
const should_merge = !(false === options.merge || false === ent.merge$)
```

`null` values are part of both behaviours: a field set to `null` is
stored as `null`; a field set to `undefined` is dropped by seneca-entity
before the store sees it.

## What the tests check

`basictest` checks merging on the default instance: in
`should update an entity if id provided` (the `products` version) a save
with only `label` keeps the existing `price`, and
`should clear an attribute if = null` checks `null` versus `undefined`.

`mergetest` checks replacing, on an instance whose store is configured
to replace. Its three tests are listed in
[Test groups: Testing the merge option](../reference/test-groups.md#testing-the-merge-option):
a plain save drops the field that is not in the entity, `merge$: true`
keeps it, `merge$: false` drops it, and the reply never carries a
`merge$` field.

## Steps

1. Implement the option and the directive in your `save`, as above, and
   declare the option with its default in the plugin's `defaults`
   (`merge: true`).

2. Create a second instance configured to replace, and pass it as
   `senecaMergeFalse`:

   ```js
   const seneca_replace = Seneca()
     .test()
     .use('entity', { mem_store: false })
     .use(MyStore, { merge: false })

   Shared.mergetest({ senecaMergeFalse: seneca_replace, script: lab })
   ```

   Do not pass the default instance: the first test would fail, because
   a plain save would merge (see
   [Debug a failing standard test](debug-a-failing-standard-test.md) for
   what that failure looks like).

3. Run the tests. Both instances can live in the same test file; the
   group clears the `foo` type on its instance before each test.

If your store cannot replace (for example a column store where every
write is a merge), do not call `mergetest`, and document that `merge$`
is not supported.
