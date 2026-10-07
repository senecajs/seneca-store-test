/* Runs the standard store tests against seneca-mem-store with the Node.js
 * test runner instead of @hapi/lab. From the repository root:
 *   node docs/examples/mem-store-node-test.js
 */
'use strict'

const test = require('node:test')
const Seneca = require('seneca')

// In your own plugin: const Shared = require('@seneca/store-test')
const Shared = require('../..')

function makeSeneca(store_opts = {}) {
  return (
    Seneca()
      .test()
      // mem_store: false stops seneca-entity loading its own mem-store
      .use('entity', { mem_store: false })
      .use('mem-store', store_opts)
  )
}

const seneca = makeSeneca()
const seneca_replace = makeSeneca({ merge: false })

// node:test exports describe, it, before, beforeEach and afterEach, which
// is all a test group needs from the script.
Shared.basictest({ seneca, script: test })
Shared.sorttest({ seneca, script: test })
Shared.limitstest({ seneca, script: test })
Shared.upserttest({ seneca, script: test })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: test })

test.after(async () => {
  await new Promise((resolve) => seneca.close(resolve))
  await new Promise((resolve) => seneca_replace.close(resolve))
})
