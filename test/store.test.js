/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

var Seneca = require('seneca')
var MemStore = require('seneca-mem-store')
var Shared = require('..')

var Lab = require('@hapi/lab')
var lab = (exports.lab = Lab.script())
var before = lab.before

var si = Seneca({
  default_plugins: { 'mem-store': false }
}).test()

var merge = Seneca({
  default_plugins: { 'mem-store': false }
}).test()

if (si.version >= '2.0.0') {
  si.use('entity')
  merge.use('entity')
}

si.use(MemStore)
merge.use(MemStore, { merge: false })

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

