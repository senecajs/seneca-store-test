/* A minimal entity store plugin, written for the tutorial in
 * docs/tutorials/add-the-standard-tests.md. Records are kept in memory,
 * one Map per entity type, so it is only good for tests and examples.
 *
 * It implements the complete store protocol that the standard tests
 * check: save (insert, update, merge or replace, upsert$), load, list and
 * remove with the sort$, skip$, limit$, fields$, all$ and load$
 * qualifiers, native$ access and close.
 */
'use strict'

function tiny_store(options) {
  const seneca = this

  // seneca-entity exports the function that registers a store, and the
  // default id generator (a 6 character random string).
  const init = seneca.export('entity/init')
  const generate_id = seneca.export('entity/generate_id')

  // canon string 'zone/base/name' -> Map of id -> record
  const tables = new Map()

  function table(ent) {
    const key = ent.canon$({ string: true })
    if (!tables.has(key)) {
      tables.set(key, new Map())
    }
    return tables.get(key)
  }

  const store = {
    // The plugin name; also used in the log entries written by init.
    name: 'tiny-store',

    // msg.ent is the entity to save, msg.q holds the save$ directives
    // (id$, merge$, upsert$); id$ and merge$ are also set on msg.ent.
    save(msg, reply) {
      const ent = msg.ent
      const q = msg.q || {}
      const rows = table(ent)

      // Public fields only (no $ fields), and a copy, so that later
      // changes to the caller's entity do not change the stored record.
      const data = structuredClone(ent.data$(false))

      // No id: a new entity, unless upsert$ finds an existing match.
      if (null == ent.id) {
        const match = upsert_match(rows, q.upsert$, data)
        if (match) {
          Object.assign(match, data)
          return reply(null, ent.make$(structuredClone(match)))
        }

        data.id = null == ent.id$ ? generate_id() : ent.id$
        rows.set(data.id, data)
        return reply(null, ent.make$(structuredClone(data)))
      }

      // An id: update the record, or insert when it does not exist yet.
      // Merge into the existing record unless the plugin option merge
      // or the merge$ directive is false, in which case replace it.
      const prev = rows.get(ent.id)
      const merge = !(false === options.merge || false === ent.merge$)
      const row = prev && merge ? Object.assign(prev, data) : data
      rows.set(ent.id, row)
      return reply(null, ent.make$(structuredClone(row)))
    },

    // msg.qent is an entity of the type being queried, msg.q the query.
    load(msg, reply) {
      const list = select(table(msg.qent), msg.q)
      const row = list[0]
      reply(null, row ? msg.qent.make$(structuredClone(row)) : null)
    },

    list(msg, reply) {
      const list = select(table(msg.qent), msg.q)
      reply(
        null,
        list.map((row) => msg.qent.make$(structuredClone(row))),
      )
    },

    // Removes the first match, or every match with all$: true. With
    // load$: true (and not all$) the removed entity is returned.
    remove(msg, reply) {
      const q = msg.q || {}
      const rows = table(msg.qent)
      let list = select(rows, q)
      if (true !== q.all$) {
        list = list.slice(0, 1)
      }
      for (const row of list) {
        rows.delete(row.id)
      }
      const removed = true !== q.all$ && true === q.load$ ? list[0] : null
      reply(null, removed ? msg.qent.make$(structuredClone(removed)) : null)
    },

    // Called once when the Seneca instance closes.
    close(msg, reply) {
      reply()
    },

    // Whatever "the driver" is; here, the Maps.
    native(msg, reply) {
      reply(null, tables)
    },
  }

  // Register the store: adds the role:entity actions for save, load,
  // list, remove and native, and a close hook.
  const meta = init(seneca, options, store)

  return { name: store.name, tag: meta.tag }
}

// Find the record matching the data on the public upsert$ fields. Private
// fields (ending in $) are ignored, and every named field must be present
// in the data, otherwise there is no match and a new record is inserted.
function upsert_match(rows, upsert, data) {
  const fields = Array.isArray(upsert)
    ? upsert.filter((f) => !f.includes('$'))
    : []

  if (0 === fields.length || !fields.every((f) => f in data)) {
    return null
  }

  for (const row of rows.values()) {
    if (fields.every((f) => f in row && equal(row[f], data[f]))) {
      return row
    }
  }

  return null
}

// Apply a query: an id, an array of ids, or an object of field values
// (a value that is an array matches any of its elements) with the sort$,
// skip$, limit$ and fields$ qualifiers. Invalid qualifier values (not a
// positive integer) are ignored.
function select(rows, q) {
  if ('string' === typeof q || 'number' === typeof q) {
    return rows.has(q) ? [rows.get(q)] : []
  }

  if (Array.isArray(q)) {
    return q.filter((id) => rows.has(id)).map((id) => rows.get(id))
  }

  q = q || {}

  let list = [...rows.values()].filter((row) =>
    Object.keys(q).every((f) => f.includes('$') || matches(row[f], q[f])),
  )

  if (q.sort$) {
    const [field, dir] = Object.entries(q.sort$)[0]
    const sign = dir < 0 ? -1 : 1
    list.sort((a, b) => sign * compare(a[field], b[field]))
  }

  if (Number.isInteger(q.skip$) && 0 < q.skip$) {
    list = list.slice(q.skip$)
  }

  if (Number.isInteger(q.limit$) && 0 < q.limit$) {
    list = list.slice(0, q.limit$)
  }

  if (Array.isArray(q.fields$)) {
    list = list.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([f]) => 'id' === f || q.fields$.includes(f),
        ),
      ),
    )
  }

  return list
}

function matches(value, cond) {
  return Array.isArray(cond)
    ? cond.some((c) => equal(value, c))
    : equal(value, cond)
}

function equal(a, b) {
  return a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : a === b
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Plugin options with their defaults (validated by Seneca 4 as a shape).
tiny_store.defaults = {
  // Merge saved fields into the existing record (true), or replace the
  // record (false). The merge$ directive on save$ overrides it per call.
  merge: true,
}

// Seneca registers a plugin under the name of its definition function.
// Give the function the plugin's name (a hyphen is not valid in an
// identifier), so that seneca.has_plugin('tiny-store') is true.
Object.defineProperty(tiny_store, 'name', { value: 'tiny-store' })

module.exports = tiny_store
