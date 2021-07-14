/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

const Seneca = require('seneca')
const MemStore = require('seneca-mem-store')
const Shared = require('..')

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())

const si = makeSenecaForTest()

Shared.basictest({
  seneca: si,
  script: lab,
})

Shared.sorttest({
  seneca: si,
  script: lab,
})

Shared.limitstest({
  seneca: si,
  script: lab,
})

Shared.upserttest({
  seneca: si,
  script: lab,
})

const si_replace = makeSenecaForTest({
  mem_store_opts: { merge: false },
})

Shared.mergetest({
  senecaMergeFalse: si_replace,
  script: lab,
})

function makeSenecaForTest(opts = {}) {
  const si = Seneca({
    default_plugins: { 'mem-store': false },
  })

  if (si.version >= '2.0.0') {
    si.use('entity')
  }

  const { mem_store_opts = {} } = opts
  si.use(MemStore, mem_store_opts)

  si.test()

  return si
}
