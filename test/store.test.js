/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

var Seneca = require('seneca')
var MemStore = require('seneca-mem-store')
var Shared = require('..')

var Lab = require('lab')
var lab = exports.lab = Lab.script()

var si = Seneca({
  log: 'silent',
  default_plugins: { 'mem-store': false }
})
si.use(MemStore)

var merge = Seneca({
  log: 'silent',
  default_plugins: { 'mem-store': false }
})
merge.use(MemStore, { merge: false })

if (si.version >= '2.0.0') {
  si.use('entity')
}

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
