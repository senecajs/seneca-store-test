/* Runs the standard store tests against tiny-store with @hapi/lab.
 * From the repository root:
 *   npx lab -v docs/examples/tiny-store/test
 */
'use strict'

const Seneca = require('seneca')
const TinyStore = require('../tiny-store')

// In your own plugin: const Shared = require('@seneca/store-test')
const Shared = require('../../../..')

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())

function makeSeneca(store_opts = {}) {
  return (
    Seneca()
      .test()
      // mem_store: false stops seneca-entity loading seneca-mem-store
      .use('entity', { mem_store: false })
      .use(TinyStore, store_opts)
  )
}

// Plugin loading and a key-value smoke test. test.init loads the plugin
// with seneca.use('..'): the package in the directory above this test
// directory, resolved from the module that first required seneca (this
// file), as in a real plugin repository.
const test_opts = {
  seneca: Seneca().test().use('entity', { mem_store: false }),
  name: 'tiny-store',
}
Shared.test.init(lab, test_opts)
Shared.test.keyvalue(lab, test_opts)

// The standard groups share one instance.
const seneca = makeSeneca()
Shared.basictest({ seneca, script: lab })
Shared.sorttest({ seneca, script: lab })
Shared.limitstest({ seneca, script: lab })
Shared.upserttest({ seneca, script: lab })

// mergetest needs an instance whose store replaces instead of merging.
const seneca_replace = makeSeneca({ merge: false })
Shared.mergetest({ senecaMergeFalse: seneca_replace, script: lab })

// Close every instance when the tests are done, whether they passed or
// not, so that the process exits.
lab.after(async () => {
  for (const instance of [test_opts.seneca, seneca, seneca_replace]) {
    await new Promise((resolve) => instance.close(resolve))
  }
})
