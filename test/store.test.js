/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'


var seneca = require('seneca')
var shared = require('..')

var Lab = require('lab')
var lab = exports.lab = Lab.script()

var si = seneca({log: 'silent'})
var merge = seneca({log: 'silent'})
merge.use('mem-store', { merge: true })

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
