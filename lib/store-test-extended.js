/* Copyright (c) 2014-2019 Richard Rodger, MIT License */
'use strict'

var Util = require('util')

var assert = require('chai').assert
var Async = require('async')
var Lab = require('@hapi/lab')

function apiv2(settings) {
  var si = settings.seneca
  var script = settings.script || Lab.script()

  var describe = script.describe
  var before = script.before
  var it = make_it(script)

  describe('Sql extended support', function () {
    before(function () {
      return new Promise((done) => {
        var Product = si.make('product')

        Async.series(
          [
            function clear(next) {
              Product.remove$({ all$: true }, next)
            },
            function create(next) {
              var products = [
                Product.make$({ name: 'apple', price: 100 }),
                Product.make$({ name: 'pear', price: 200 }),
                Product.make$({ name: 'cherry', price: 300 }),
              ]

              function saveproduct(product, saved) {
                product.save$(saved)
              }

              Async.forEach(products, saveproduct, next)
            },
          ],
          function (err) {
            assert(!err)
            done()
          }
        )
      })
    })

    it('use not equal ne$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { ne$: 200 }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('apple', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use not equal ne$ string', function (done) {
      var product = si.make('product')

      product.list$(
        { name: { ne$: 'pear' }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('apple', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use eq$', function (done) {
      var product = si.make('product')

      product.list$({ price: { eq$: 200 } }, function (err, lst) {
        assert(!err)

        assert.equal(1, lst.length)
        assert.equal('pear', lst[0].name)
        done()
      })
    })

    it('use eq$ string', function (done) {
      var product = si.make('product')

      product.list$({ name: { eq$: 'pear' } }, function (err, lst) {
        assert(!err)

        assert.equal(1, lst.length)
        assert.equal('pear', lst[0].name)
        done()
      })
    })

    it('use gte$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { gte$: 200 }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('pear', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use gt$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { gt$: 200 }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('cherry', lst[0].name)
          done()
        }
      )
    })

    it('use lte$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { lte$: 200 }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('apple', lst[0].name)
          assert.equal('pear', lst[1].name)
          done()
        }
      )
    })

    it('use lt$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { lt$: 200 }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('apple', lst[0].name)
          done()
        }
      )
    })

    it('use in$', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { in$: [200, 300] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('pear', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use in$ string', function (done) {
      var product = si.make('product')

      product.list$(
        { name: { in$: ['cherry', 'pear'] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('pear', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use in$ one matching', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { in$: [200, 500, 700] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('pear', lst[0].name)
          done()
        }
      )
    })

    it('use in$ no matching', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { in$: [250, 500, 700] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(0, lst.length)
          done()
        }
      )
    })

    it('use nin$ three matching', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { nin$: [250, 500, 700] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(3, lst.length)
          done()
        }
      )
    })

    it('use nin$ one matching', function (done) {
      var product = si.make('product')

      product.list$(
        { price: { nin$: [200, 500, 300] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('apple', lst[0].name)
          done()
        }
      )
    })

    it('use complex in$ and nin$', function (done) {
      var product = si.make('product')

      product.list$(
        {
          price: { nin$: [250, 500, 300], in$: [200, 300] },
          sort$: { price: 1 },
        },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('pear', lst[0].name)
          done()
        }
      )
    })

    it('use nin$ string', function (done) {
      var product = si.make('product')

      product.list$(
        { name: { nin$: ['cherry', 'pear'] }, sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('apple', lst[0].name)
          done()
        }
      )
    })

    it('use or$', function (done) {
      var product = si.make('product')

      product.list$(
        { or$: [{ name: 'cherry' }, { price: 200 }], sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('pear', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use and$', function (done) {
      var product = si.make('product')

      product.list$(
        { and$: [{ name: 'cherry' }, { price: 300 }], sort$: { price: 1 } },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('cherry', lst[0].name)
          done()
        }
      )
    })

    it('use and$ & or$', function (done) {
      var product = si.make('product')

      product.list$(
        {
          or$: [
            { price: { gte$: 200 } },
            { and$: [{ name: 'cherry' }, { price: 300 }] },
          ],
          sort$: { price: 1 },
        },
        function (err, lst) {
          assert(!err)

          assert.equal(2, lst.length)
          assert.equal('pear', lst[0].name)
          assert.equal('cherry', lst[1].name)
          done()
        }
      )
    })

    it('use and$ & or$ and limit$', function (done) {
      var product = si.make('product')

      product.list$(
        {
          or$: [
            { price: { gte$: 200 } },
            { and$: [{ name: 'cherry' }, { price: 300 }] },
          ],
          sort$: { price: 1 },
          limit$: 1,
          fields$: ['name'],
        },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('pear', lst[0].name)
          assert(!lst[0].price)
          done()
        }
      )
    })

    it('use and$ & or$ and limit$, fields$ and skip$', function (done) {
      var product = si.make('product')

      product.list$(
        {
          price: { gte$: 200 },
          sort$: { price: 1 },
          limit$: 1,
          fields$: ['name', 'id'],
          skip$: 1,
        },
        function (err, lst) {
          assert(!err)

          assert.equal(1, lst.length)
          assert.equal('cherry', lst[0].name)
          assert(!lst[0].price)
          done()
        }
      )
    })
  })

  return script
}

module.exports = apiv2

function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function (x, fin) {
        func(fin)
      })
    )
  }
}
