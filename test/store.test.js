/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var seneca = require('seneca')

var shared = require('..')


var si = seneca({log:'silent'})

si.__testcount = 0
var testcount = 0


describe('mem', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('sort', function(done){
    testcount++
    shared.sorttest(si,done)
  })

  it('limits', function(done){
    testcount++
    shared.limitstest(si,done)
  })


  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})
