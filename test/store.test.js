/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

var seneca = require('seneca')
var memStore = require('seneca-mem-store')
var shared = require('..')

var Lab = require('lab')
var lab = exports.lab = Lab.script()

var si = seneca({
  log: 'silent',
  default_plugins: { 'mem-store': false }
})
si.use(memStore)

var merge = seneca({
  log: 'silent',
  default_plugins: { 'mem-store': false }
})
merge.use(memStore, { merge: false })

shared.basictest({
  seneca: si,
  senecaMerge: merge,
  script: lab
})

shared.sorttest({
  seneca: si,
  script: lab
})

shared.limitstest({
  seneca: si,
  script: lab
})
