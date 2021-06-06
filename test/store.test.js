/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

const Seneca = require('seneca')
const MemStore = require('seneca-mem-store')
const Shared = require('..')

const Lab = require('@hapi/lab')
const lab = (exports.lab = Lab.script())
const before = lab.before


const si = makeSeneca()
  .use(MemStore)

const merge = makeSeneca()
  .use(MemStore, { merge: false })


Shared.basictest({
  seneca: si,
  senecaMerge: merge,
  script: lab
})

Shared.sorttest({
  seneca: si,
  script: lab
})

Shared.limitstest({
  seneca: si,
  script: lab
})

Shared.upserttest({
  seneca: si,
  script: lab
})


function makeSeneca() {
  const si = Seneca({
    default_plugins: { 'mem-store': false }
  })

  si.test()

  if (si.version >= '2.0.0') {
    si.use('entity')
  }

  return si
}

