/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";

var assert   = require('chai').assert

var async    = require('async')
var _        = require('lodash')
var gex      = require('gex')
var readline = require('readline')

var Lab = require('lab');


var testpassed = function () {
  readline.moveCursor(process.stdout, 55, -1)
  console.log("PASSED")
}

var bartemplate = {
  name$:'bar',
  base$:'moon',
  zone$:'zen',

  str:'aaa',
  int:11,
  dec:33.33,
  bol:false,
  wen:new Date(2020,1,1),
  arr:[2,3],
  obj:{a:1,b:[2],c:{d:3}}
}

var barverify = function(bar) {
  assert.equal('aaa', bar.str)
  assert.equal(11,    bar.int)
  assert.equal(33.33, bar.dec)
  assert.equal(false, bar.bol)
  assert.equal(new Date(2020,1,1).toISOString(), _.isDate(bar.wen) ? bar.wen.toISOString() : bar.wen )

  assert.equal(''+[2,3],''+bar.arr)
  assert.deepEqual({a:1,b:[2],c:{d:3}},bar.obj)
}



var scratch = {}

var verify = exports.verify = function(cb,tests){
  return function(error, out) {
    if( error ) {
      return cb(error);
    }

    try {
      tests(out)
    }
    catch (ex) {
      return cb(ex)
    }

    cb()
  }
}


function basictest (settings) {
  var si = settings.seneca
  var must_merge = !!settings.must_merge
  var script = settings.script || Lab.script()

  var describe = script.describe
  var it = script.it

  describe('basics', function () {

    it('should load non existing entity from store', function (done) {

      var foo0 = si.make('foo')
      foo0.load$('does-not-exist-at-all-at-all', verify(done, function(out){
        assert.isNull(out)
      }))

    })

    it('should save an entity to store', function (done) {

      var foo1 = si.make({name$:'foo'}) ///si.make('foo')
      foo1.p1 = 'v1'
      foo1.p3 = 'v3'

      foo1.save$(verify(done, function(foo1){
        assert.isNotNull(foo1.id)
        assert.equal('v1',foo1.p1)
        assert.equal('v3',foo1.p3)
        scratch.foo1 = foo1
      }))

    })

    it('should load an existing entity from store', function (done) {

      scratch.foo1.load$( scratch.foo1.id, verify(done, function(foo1){
        assert.isNotNull(foo1.id)
        assert.equal('v1',foo1.p1)
        scratch.foo1 = foo1
      }))

    })

    it('should save the same entity again to store', function (done) {

      scratch.foo1.p1 = 'v1x'
      scratch.foo1.p2 = 'v2'

      // test merge behaviour
      delete scratch.foo1.p3

      scratch.foo1.save$(verify(done, function(foo1){
        assert.isNotNull(foo1.id)
        assert.equal('v1x',foo1.p1)
        assert.equal('v2',foo1.p2)

        if( must_merge ) {
          assert.equal('v3',foo1.p3)
        }

        scratch.foo1 = foo1
      }))

    })

    it('should load again the same entity', function (done) {

      scratch.foo1.load$(scratch.foo1.id, verify(done, function(foo1){
        assert.isNotNull(foo1.id)
        assert.equal('v1x',foo1.p1)
        assert.equal('v2',foo1.p2)
        scratch.foo1 = foo1
      }))

    })

    it('should save an entity with different type of properties', function (done) {

      scratch.bar = si.make( bartemplate )
      var mark = scratch.bar.mark = Math.random()

      scratch.bar.save$(verify(done, function(bar){
        assert.isNotNull(bar.id)
        barverify(bar)
        assert.equal( mark, bar.mark )
        scratch.bar = bar
      }))

    })

    it('should save an entity with a prexisting name', function (done) {

      scratch.foo2 = si.make({name$:'foo'})
      scratch.foo2.p2 = 'v2'

      scratch.foo2.save$(verify(done, function(foo2){
        assert.isNotNull(foo2.id)
        assert.equal('v2',foo2.p2)
        scratch.foo2 = foo2
      }))

    })

    it('should save an entity with an id', function (done) {

      scratch.foo2 = si.make({name$:'foo'})
      scratch.foo2.id$ = '0201775f-27c4-7428-b380-44b8f4c529f3'

      scratch.foo2.save$(verify(done, function(foo2){
        assert.isNotNull(foo2.id)
        assert.equal('0201775f-27c4-7428-b380-44b8f4c529f3', foo2.id)
        scratch.foo2 = foo2
      }))

    })

    it('should load a list of entities with one element', function (done) {

      scratch.barq = si.make('zen', 'moon','bar')
      scratch.barq.list$({}, verify(done, function(res){
        assert.ok(1 <= res.length)
        barverify(res[0])
      }))

    })

    it('should load a list of entities with more than one element', function (done) {

      scratch.foo1.list$({}, verify(done, function(res){
        assert.ok(2 <= res.length)
      }))

    })

    it('should load an element by id', function (done) {

      scratch.barq.list$({id:scratch.bar.id}, verify(done, function(res){
        assert.equal(1, res.length)
        barverify(res[0])
      }))

    })

    it('should load an element by integer property', function (done) {

      scratch.bar.list$({mark:scratch.bar.mark}, verify(done, function(res){
        assert.equal(1, res.length)
        barverify(res[0])
      }))

    })

    it('should load an element by string property', function (done) {

      scratch.foo1.list$({p2:'v2'}, verify(done, function(res){
        assert.ok(2 <= res.length)
      }))
    })


    it('Load an element by two properties', function (done) {

      scratch.foo1.list$({p2:'v2',p1:'v1x'}, verify(done, function(res){
        assert.ok(1 <= res.length)
        res.forEach(function(foo){
          assert.equal('v2',foo.p2)
          assert.equal('v1x',foo.p1)
        })
      }))

    })

    it('should delete an element by name', function (done) {

      var foo = si.make({name$:'foo'})

      foo.remove$( {all$:true}, function(err, res){
        assert.isNull(err)

        foo.list$({},verify(done, function(res){
          assert.equal(0,res.length)
        }))
      })

    })

    it('should delete an element by property', function (done) {

      scratch.bar.remove$({mark:scratch.bar.mark}, function(err,res){
        assert.isNull(err)

        scratch.bar.list$({mark:scratch.bar.mark}, verify(done, function(res){
          assert.equal(0, res.length )
        }))
      })

    })

  })

  return script
}


exports.basictest = basictest



module.exports.sorttest = function(si, done) {
  console.log('SORT')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('foo')
        // clear 'foo' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('foo')
        cl.p1 = 'v1'
        cl.p2 = 'v1'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('foo')
        cl.p1 = 'v2'
        cl.p2 = 'v2'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('foo')
        cl.p1 = 'v3'
        cl.p2 = 'v3'

        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listasc: function (cb) {
        console.log('listasc')

        var cl = si.make({name$: 'foo'})
        cl.list$({sort$: { p1: 1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
          cb()
        })
      },

      listdesc: function (cb) {
        console.log('listdesc')

        var cl = si.make({name$: 'foo'})
        cl.list$({sort$: { p1: -1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(lst[0].p1, 'v3')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v1')
          cb()
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}


exports.limitstest = function(si,done) {

  console.log('LIMITS')

  async.series(
    {

      remove: function (cb) {
        console.log('remove')

        var cl = si.make$('foo')
        // clear 'foo' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        console.log('insert1st')

        var cl = si.make$('foo')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        console.log('insert2nd')

        var cl = si.make$('foo')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        console.log('insert3rd')

        var cl = si.make$('foo')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listall: function (cb) {
        console.log('listall')

        var cl = si.make({name$: 'foo'})
        cl.list$({}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        console.log('listlimit1skip1')

        var cl = si.make({name$: 'foo'})
        cl.list$({limit$: 1, skip$: 1, sort$: { p1: 1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.equal('v2', lst[0].p1);
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        console.log('listlimit2skip3')

        var cl = si.make({name$: 'foo'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        console.log('listlimit5skip2')

        var cl = si.make({name$: 'foo'})
        cl.list$({limit$: 5, skip$: 2, sort$: { p1: 1 }}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          assert.equal('v3', lst[0].p1);
          cb()
        })
      }
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}


exports.sqltest = function(si,done) {
  si.ready(function(){
    assert.isNotNull(si)

    var Product = si.make('product')
    var products = []

    async.series(
      {
        setup: function(cb) {

          products.push( Product.make$({name:'apple',price:100}) )
          products.push( Product.make$({name:'pear',price:200}) )

          var i = 0
          function saveproduct(){
            return function(cb) {
              products[i].save$(cb)
              i++
            }
          }

          async.series([
            saveproduct(),
            saveproduct(),
          ],cb)
        },


        query_string: function( cb ) {
          Product.list$("SELECT * FROM product ORDER BY price",function(err,list){
            var s = _.map(list,function(p){return p.toString()}).toString()
            assert.ok(
              gex("$-/-/product:{id=*;name=apple;price=100},$-/-/product:{id=*;name=pear;price=200}").on( s ) )
            cb()
          })
        },

        query_params: function( cb ) {
          Product.list$(["SELECT * FROM product WHERE price >= ? AND price <= ?",0,1000],function(err,list){
            var s = _.map(list,function(p){return p.toString()}).toString()
            assert.ok(
              gex("$-/-/product:{id=*;name=apple;price=100},$-/-/product:{id=*;name=pear;price=200}").on( s ) )
            cb()
          })
        },

        teardown: function(cb) {
          products.forEach(function(p){
            p.remove$()
          })
          cb()
        }
      },
      function(err,out){
        if( err ) {
          console.dir( err )
        }
        si.__testcount++
        assert(err === null || err === undefined)
        done && done()
      }
    )
  })
}

exports.closetest = function(si,testcount,done) {
  var RETRY_LIMIT = 10
  var retryCnt = 0

  function retry(){
    //console.log(testcount+' '+si.__testcount)
    if( testcount <= si.__testcount || retryCnt > RETRY_LIMIT ) {
      console.log('CLOSE')
      si.close()
      done && done()
    }
    else {
      retryCnt++
      setTimeout(retry, 500);
    }
  }
  retry()
}
