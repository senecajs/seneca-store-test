/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var seneca = require('seneca')

var shared = require('..')


var Lab = require('lab');
var lab = exports.lab = Lab.script()

var describe = lab.describe
var it = lab.it

var si = seneca({log:'silent'})

si.__testcount = 0
var testcount = 0


shared.basictest({
  seneca: si,
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