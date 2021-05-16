/* Copyright (c) 2014-2019 Richard Rodger, MIT License */
'use strict'

var Util = require('util')

var Assert = require('chai').assert
var Async = require('async')
var Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const Nid = require('nid')

var ExtendedTests = require('./lib/store-test-extended')
const { fetchProp } = require('./lib/common')

const expect = Code.expect

var bartemplate = {
  name$: 'bar',
  base$: 'moon',
  zone$: 'zen',

  str: 'aaa',
  int: 11,
  dec: 33.33,
  bol: false,
  wen: new Date(2020, 1, 1),
  arr: [2, 3],
  obj: {
    a: 1,
    b: [2],
    c: { d: 3 },
  },
}

var barverify = function (bar) {
  Assert.equal(bar.str, 'aaa')
  Assert.equal(bar.int, 11)
  Assert.equal(bar.dec, 33.33)
  Assert.equal(bar.bol, false)

  Assert.equal(
    isDate(bar.wen) ? bar.wen.toISOString() : bar.wen,
    new Date(2020, 1, 1).toISOString()
  )

  Assert.equal('' + bar.arr, '' + [2, 3])
  Assert.deepEqual(bar.obj, {
    a: 1,
    b: [2],
    c: { d: 3 },
  })
}

function verify(cb, tests) {
  return function (error, out) {
    if (error) {
      return cb(error)
    }

    try {
      tests(out)
    } catch (ex) {
      return cb(ex)
    }

    cb()
  }
}

function clearDb(si) {
  return () => {
    return new Promise((done) => {
      si.ready(function () {
        Async.series(
          [
            function clearFoo(next) {
              si.make('foo').remove$({ all$: true }, next)
            },

            function clearBar(next) {
              si.make('zen', 'moon', 'bar').remove$({ all$: true }, next)
            },

            function clearPlayers(next) {
              si.make('players').remove$({ all$: true }, next)
            },

            function clearRacers(next) {
              si.make('racers').remove$({ all$: true }, next)
            },

            function clearUsers(next) {
              si.make('users').remove$({ all$: true }, next)
            },

            function clearCustomers(next) {
              si.make('customers').remove$({ all$: true }, next)
            },

            function clearProducts(next) {
              si.make('products').remove$({ all$: true }, next)
            }
          ],
          done
        )
      })
    })
  }
}

function createEntities(si, name, data) {
  return () => {
    return new Promise((done) => {
      Async.each(
        data,
        function (el, next) {
          si.make$(name, el).save$(next)
        },
        done
      )
    })
  }
}

function basictest(settings) {
  var si = settings.seneca

  var merge = settings.senecaMerge
  var script = settings.script || Lab.script()

  var describe = script.describe
  var it = make_it(script)
  var before = script.before
  var beforeEach = script.beforeEach

  describe('Basic Tests', function () {
    describe('Load', function () {
      before(clearDb(si))
      before(
        createEntities(si, 'foo', [
          {
            id$: 'foo1',
            p1: 'v1',
          },
          {
            id$: 'foo2',
            p1: 'v2',
            p2: 'z2',
          },
        ])
      )
      before(createEntities(si, 'bar', [bartemplate]))

      it('should load an entity qqq', function (done) {
        var foo = si.make('foo')
        foo.load$(
          'foo1',
          verify(done, function (foo1) {
            Assert.isNotNull(foo1)
            Assert.equal(foo1.id, 'foo1')
            Assert.equal(foo1.p1, 'v1')
          })
        )
      })

      it('should return null for non existing entity', function (done) {
        var foo = si.make('foo')
        foo.load$(
          'does-not-exist-at-all-at-all',
          verify(done, function (out) {
            Assert.isNull(out)
          })
        )
      })

      it('should support filtering', function (done) {
        var foo = si.make('foo')
        foo.load$(
          { p1: 'v2' },
          verify(done, function (foo1) {
            Assert.isNotNull(foo1)
            Assert.equal(foo1.id, 'foo2')
            Assert.equal(foo1.p1, 'v2')
            Assert.equal(foo1.p2, 'z2')
          })
        )
      })

      it('should filter with AND', function (done) {
        var foo = si.make('foo')
        foo.load$(
          { p1: 'v2', p2: 'z2' },
          verify(done, function (foo1) {
            Assert.isNotNull(foo1)
            Assert.equal(foo1.id, 'foo2')
            Assert.equal(foo1.p1, 'v2')
            Assert.equal(foo1.p2, 'z2')
          })
        )
      })

      it('should filter with AND 2', function (done) {
        var foo = si.make('foo')
        foo.load$(
          { p1: 'v2', p2: 'a' },
          verify(done, function (foo1) {
            Assert.isNull(foo1)
          })
        )
      })

      it('should support different attribute types', function (done) {
        var bar = si.make('zen', 'moon', 'bar')

        bar.load$(
          { str: 'aaa' },
          verify(done, function (bar1) {
            Assert.isNotNull(bar1)
            Assert.isNotNull(bar1.id)
            barverify(bar1)
          })
        )
      })

      it('should not mix attributes from entity to query for filtering', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.load$(
          { p2: 'z2' },
          verify(done, function (foo1) {
            Assert.ok(foo1)
            Assert.equal(foo1.id, 'foo2')
            Assert.equal(foo1.p1, 'v2')
            Assert.equal(foo1.p2, 'z2')
          })
        )
      })

      it('should reload current entity if no query provided and id present', function (done) {
        var foo = si.make('foo')
        foo.id = 'foo2'
        foo.load$(
          verify(done, function (foo1) {
            Assert.ok(foo1)
            Assert.equal(foo1.id, 'foo2')
            Assert.equal(foo1.p1, 'v2')
            Assert.equal(foo1.p2, 'z2')
          })
        )
      })

      it('should do nothing if no query provided and id not present', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v2'
        foo.load$(
          verify(done, function (foo1) {
            Assert.notOk(foo1)
          })
        )
      })
    })

    describe('Save', function () {
      beforeEach(clearDb(si))

      beforeEach(
        createEntities(si, 'foo', [
          {
            id$: 'to-be-updated',
            p1: 'v1',
            p2: 'v2',
            p3: 'v3',
          },
        ])
      )

      it('should save an entity to store (and generate an id)', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)

          foo1.load$(
            foo1.id,
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, foo1.id)
              Assert.equal(foo2.p1, 'v1')
              Assert.equal(foo2.p2, 'v2')
            })
          )
        })
      })

      it('should save an entity to store (with provided id)', function (done) {
        var foo = si.make('foo')
        foo.id$ = 'existing'
        foo.p1 = 'v1'
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'existing')

          foo1.load$(
            'existing',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'existing')
              Assert.equal(foo2.p1, 'v1')
              Assert.equal(foo2.p2, 'v2')
            })
          )
        })
      })

      it('should update an entity if id provided', function (done) {
        var foo = si.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'
        foo.p3 = 'v3'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'to-be-updated')
          Assert.equal(foo1.p1, 'z1')
          Assert.equal(foo1.p2, 'z2')
          Assert.equal(foo1.p3, 'v3')

          foo1.load$(
            'to-be-updated',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'to-be-updated')
              Assert.equal(foo2.p1, 'z1')
              Assert.equal(foo2.p2, 'z2')
              Assert.equal(foo2.p3, 'v3')
            })
          )
        })
      })

      it("should save an entity if id provided but original doesn't exist", function (done) {
        var foo = si.make('foo')
        foo.id = 'will-be-inserted'
        foo.p1 = 'z1'
        foo.p2 = 'z2'
        foo.p3 = 'z3'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'will-be-inserted')
          Assert.equal(foo1.p1, 'z1')
          Assert.equal(foo1.p2, 'z2')
          Assert.equal(foo1.p3, 'z3')

          foo1.load$(
            'will-be-inserted',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'will-be-inserted')
              Assert.equal(foo2.p1, 'z1')
              Assert.equal(foo2.p2, 'z2')
              Assert.equal(foo2.p3, 'z3')
            })
          )
        })
      })

      it('should allow to not merge during update with merge$: false', function (done) {
        var foo = si.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$({ merge$: false }, function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'to-be-updated')
          Assert.equal(foo1.p1, 'z1')
          Assert.equal(foo1.p2, 'z2')
          Assert.notOk(foo1.p3)

          foo1.load$(
            'to-be-updated',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'to-be-updated')
              Assert.equal(foo2.p1, 'z1')
              Assert.equal(foo2.p2, 'z2')
              Assert.notOk(foo1.p3)
            })
          )
        })
      })

      it('should support different attribute types', function (done) {
        var bar = si.make(bartemplate)
        var mark = (bar.mark = Math.random().toString())

        bar.save$(function (err, bar) {
          Assert.isNull(err)
          Assert.isNotNull(bar)
          Assert.isNotNull(bar.id)
          barverify(bar)
          Assert.equal(bar.mark, mark)

          bar.load$(
            bar.id,
            verify(done, function (bar1) {
              Assert.isNotNull(bar1)
              Assert.equal(bar1.id, bar.id)
              barverify(bar1)
              Assert.equal(bar1.mark, mark)
            })
          )
        })
      })

      it('should allow dublicate attributes', function (done) {
        var foo = si.make('foo')
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.p2, 'v2')

          foo.load$(
            foo1.id,
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, foo1.id)
              Assert.equal(foo2.p2, 'v2')
              Assert.notOk(foo2.p1)
              Assert.notOk(foo2.p3)
            })
          )
        })
      })

      it('should not save modifications to entity after save completes', function (done) {
        var foo = si.make('foo')
        foo.int_arr = [37]
        foo.save$(
          verify(done, function (foo1) {
            Assert.deepEqual(foo1.int_arr, [37])
            // now that foo is in the database, modify the original data
            foo.int_arr.push(43)
            Assert.deepEqual(foo1.int_arr, [37])
          })
        )
      })

      it('should not backport modification to saved entity to the original one', function (done) {
        var foo = si.make('foo')
        foo.int_arr = [37]
        foo.save$(
          verify(done, function (foo1) {
            Assert.deepEqual(foo1.int_arr, [37])
            // now that foo is in the database, modify the original data
            foo1.int_arr.push(43)
            Assert.deepEqual(foo.int_arr, [37])
          })
        )
      })

      it('should clear an attribute if = null', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          if (err) {
            return done(err)
          }

          foo1.p1 = null

          // NOTE: undefined has no effect
          foo1.p2 = undefined

          foo1.save$(function (err, foo2) {
            if (err) {
              return done(err)
            }

            expect(foo2.p1).to.equal(null)
            expect(foo2.p2).to.equal('v2')

            foo.load$(
              foo1.id,
              verify(done, function (foo3) {
                expect(foo3).to.be.instanceof(Object)
                expect(foo3.p1).to.equal(null)
                expect(foo3.p2).to.equal('v2')
              })
            )
          })
        })
      })
    })

    describe('With Option merge:false', function () {
      beforeEach(clearDb(merge))
      beforeEach(
        createEntities(merge, 'foo', [
          {
            id$: 'to-be-updated',
            p1: 'v1',
            p2: 'v2',
            p3: 'v3',
          },
        ])
      )

      it('should provide senecaMerge', function (done) {
        Assert(
          merge,
          'Implementor should provide a seneca instance with the store configured to default to merge:false'
        )
        done()
      })

      it('should update an entity if id provided', function (done) {
        var foo = merge.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$(function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'to-be-updated')
          Assert.equal(foo1.p1, 'z1')
          Assert.equal(foo1.p2, 'z2')
          Assert.notOk(foo1.p3)

          foo1.load$(
            'to-be-updated',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'to-be-updated')
              Assert.equal(foo2.p1, 'z1')
              Assert.equal(foo2.p2, 'z2')
              Assert.notOk(foo2.p3)
            })
          )
        })
      })

      it('should allow to merge during update with merge$: true', function (done) {
        var foo = merge.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'
        foo.p3 = 'v3'

        foo.save$({ merge$: true }, function (err, foo1) {
          Assert.isNull(err)
          Assert.isNotNull(foo1.id)
          Assert.equal(foo1.id, 'to-be-updated')
          Assert.equal(foo1.p1, 'z1')
          Assert.equal(foo1.p2, 'z2')
          Assert.equal(foo1.p3, 'v3')
          Assert.notOk(foo1.merge$)

          foo1.load$(
            'to-be-updated',
            verify(done, function (foo2) {
              Assert.isNotNull(foo2)
              Assert.equal(foo2.id, 'to-be-updated')
              Assert.equal(foo2.p1, 'z1')
              Assert.equal(foo2.p2, 'z2')
              Assert.equal(foo1.p3, 'v3')
              Assert.notOk(foo1.merge$)
            })
          )
        })
      })
    })

    describe('List', function () {
      before(clearDb(si))
      before(
        createEntities(si, 'foo', [
          {
            id$: 'foo1',
            p1: 'v1',
          },
          {
            id$: 'foo2',
            p1: 'v2',
            p2: 'z2',
          },
        ])
      )
      before(createEntities(si, 'bar', [bartemplate]))

      it('should load all elements if no params', function (done) {
        var bar = si.make('zen', 'moon', 'bar')
        bar.list$(
          {},
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            barverify(res[0])
          })
        )
      })

      it('should load all elements if no params 2', function (done) {
        var foo = si.make('foo')
        foo.list$(
          {},
          verify(done, function (res) {
            Assert.lengthOf(res, 2)
          })
        )
      })

      it('should load all elements if no query provided', function (done) {
        var foo = si.make('foo')
        foo.list$(
          verify(done, function (res) {
            Assert.lengthOf(res, 2)
          })
        )
      })

      it('should list entities by id', function (done) {
        var foo = si.make('foo')
        foo.list$(
          { id: 'foo1' },
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].p1, 'v1')
            Assert.notOk(res[0].p2)
            Assert.notOk(res[0].p3)
          })
        )
      })

      it('should list entities by integer property', function (done) {
        var bar = si.make('zen', 'moon', 'bar')
        bar.list$(
          { int: bartemplate.int },
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            barverify(res[0])
          })
        )
      })

      it('should list entities by string property', function (done) {
        var foo = si.make('foo')
        foo.list$(
          { p2: 'z2' },
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].p1, 'v2')
            Assert.equal(res[0].p2, 'z2')
          })
        )
      })

      it('should list entities by two properties', function (done) {
        var foo = si.make('foo')
        foo.list$(
          { p2: 'z2', p1: 'v2' },
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].p1, 'v2')
            Assert.equal(res[0].p2, 'z2')
          })
        )
      })

      it('should support opaque ids (array)', function (done) {
        var foo = si.make('foo')
        foo.list$(
          ['foo1', 'foo2'],
          verify(done, function (res) {
            Assert.lengthOf(res, 2)
            Assert.equal(res[0].p1, 'v1')
            Assert.notOk(res[0].p2)
            Assert.notOk(res[0].p3)
            Assert.equal(res[1].p1, 'v2')
            Assert.equal(res[1].p2, 'z2')
            Assert.equal(res[1].p3)
          })
        )
      })

      it('should support opaque ids (single id)', function (done) {
        var foo = si.make('foo')
        foo.list$(
          ['foo2'],
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].p1, 'v2')
            Assert.equal(res[0].p2, 'z2')
            Assert.equal(res[0].p3)
          })
        )
      })

      it('should support opaque ids (string)', function (done) {
        var foo = si.make('foo')
        foo.list$(
          'foo2',
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].p1, 'v2')
            Assert.equal(res[0].p2, 'z2')
            Assert.equal(res[0].p3)
          })
        )
      })

      it('should filter with AND', function (done) {
        var foo = si.make('foo')
        foo.list$(
          { p2: 'z2', p1: 'v1' },
          verify(done, function (res) {
            Assert.lengthOf(res, 0)
          })
        )
      })

      it('should not mix attributes from entity to query for filtering', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.list$(
          { p2: 'z2' },
          verify(done, function (res) {
            Assert.lengthOf(res, 1)
            Assert.equal(res[0].id, 'foo2')
            Assert.equal(res[0].p1, 'v2')
            Assert.equal(res[0].p2, 'z2')
          })
        )
      })
    })

    describe('Remove', function () {
      beforeEach(clearDb(si))
      beforeEach(
        createEntities(si, 'foo', [
          {
            id$: 'foo1',
            p1: 'v1',
          },
          {
            id$: 'foo2',
            p1: 'v2',
            p2: 'z2',
          },
        ])
      )
      beforeEach(createEntities(si, 'bar', [bartemplate]))

      it('should delete only an entity', function (done) {
        var foo = si.make('foo')
        foo.remove$('foo1', function (err, res) {
          Assert.isNull(err)

          foo.list$(
            {},
            verify(done, function (res) {
              Assert.lengthOf(res, 1)
            })
          )
        })
      })

      it('should delete all entities if all$ = true', function (done) {
        var foo = si.make('foo')
        foo.remove$({ all$: true }, function (err, res) {
          Assert.isNull(err)
          Assert.notOk(res)

          foo.list$(
            {},
            verify(done, function (res) {
              Assert.lengthOf(res, 0)
            })
          )
        })
      })

      it('should delete an entity by property', function (done) {
        var foo = si.make('foo')
        foo.remove$({ p1: 'v1' }, function (err, res) {
          Assert.isNull(err)

          foo.list$(
            {},
            verify(done, function (res) {
              Assert.lengthOf(res, 1)
              Assert.equal('v2', res[0].p1)
            })
          )
        })
      })

      it('should delete entities filtered by AND', function (done) {
        var foo = si.make('foo')
        foo.remove$({ p1: 'v1', p2: 'z2' }, function (err) {
          Assert.isNull(err)

          foo.list$(
            {},
            verify(done, function (res) {
              Assert.lengthOf(res, 2)
            })
          )
        })
      })

      it('should return deleted entity if load$: true', function (done) {
        var foo = si.make('foo')
        foo.remove$(
          { p1: 'v2', load$: true },
          verify(done, function (res) {
            Assert.ok(res)
            Assert.equal(res.p1, 'v2')
            Assert.equal(res.p2, 'z2')
          })
        )
      })

      it('should never return deleted entities if all$: true', function (done) {
        var foo = si.make('foo')
        foo.remove$(
          { all$: true, load$: true },
          verify(done, function (res) {
            Assert.notOk(res)
          })
        )
      })

      it('should not delete current ent (only uses query)', function (done) {
        var foo = si.make('foo')
        foo.id = 'foo2'
        foo.remove$({ p1: 'v1' }, function (err) {
          if (err) {
            return done(err)
          }

          foo.list$(
            verify(done, function (res) {
              Assert.lengthOf(res, 1)
              Assert.equal(res[0].id, 'foo2')
            })
          )
        })
      })

      it('should delete current entity if no query present', function (done) {
        var foo = si.make$('foo')
        foo.load$('foo2', function (err, foo2) {
          if (err) {
            return done(err)
          }
          foo2.remove$(function (err) {
            if (err) {
              return done(err)
            }
            foo.list$(
              {},
              verify(done, function (res) {
                Assert.lengthOf(res, 1)
                Assert.equal(res[0].id, 'foo1')
              })
            )
          })
        })
      })
    })

    describe('Native', function () {
      it('should prived direct access to the driver', function (done) {
        var foo = si.make('foo')
        foo.native$(
          verify(done, function (driver) {
            Assert.ok(driver)
          })
        )
      })
    })
  })

  return script
}

function sorttest(settings) {
  var si = settings.seneca
  var script = settings.script || Lab.script()

  var describe = script.describe
  var it = make_it(script)
  var beforeEach = script.beforeEach

  describe('Sorting', function () {
    beforeEach(clearDb(si))
    beforeEach(
      createEntities(si, 'foo', [
        { p1: 'v1', p2: 'v1' },
        // make sure this is not in alphabetical order,
        // otherwise insertion order will be similar to the order we use for tests
        // possibly leading to false positives
        { p1: 'v2', p2: 'v3' },
        { p1: 'v3', p2: 'v2' },
      ])
    )

    describe('Load', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v1')
          })
        )
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { sort$: { p1: -1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v3')
          })
        )
      })
    })

    describe('List', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 3)
            Assert.equal(lst[0].p1, 'v1')
            Assert.equal(lst[1].p1, 'v2')
            Assert.equal(lst[2].p1, 'v3')
          })
        )
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { sort$: { p1: -1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 3)
            Assert.equal(lst[0].p1, 'v3')
            Assert.equal(lst[1].p1, 'v2')
            Assert.equal(lst[2].p1, 'v1')
          })
        )
      })
    })

    describe('Remove', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.remove$({ sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.equal(lst.length, 2)
              Assert.equal(lst[0].p1, 'v2')
              Assert.equal(lst[1].p1, 'v3')
            })
          )
        })
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.remove$({ sort$: { p1: -1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.equal(lst.length, 2)
              Assert.equal(lst[0].p1, 'v1')
              Assert.equal(lst[1].p1, 'v2')
            })
          )
        })
      })
    })
  })

  return script
}

function limitstest(settings) {
  var si = settings.seneca
  var script = settings.script || Lab.script()

  var describe = script.describe
  var it = make_it(script)
  var beforeEach = script.beforeEach

  describe('Limits', function () {
    beforeEach(clearDb(si))
    beforeEach(
      createEntities(si, 'foo', [
        { p1: 'v1' },
        // make sure this is not in alphabetical order,
        // otherwise insertion order will be similar to the order we use for tests
        // possibly leading to false positives
        { p1: 'v3' },
        { p1: 'v2' },
      ])
    )

    it('check setup correctly', function (done) {
      var cl = si.make('foo')
      cl.list$(
        {},
        verify(done, function (lst) {
          Assert.lengthOf(lst, 3)
        })
      )
    })

    describe('Load', function () {
      it('should support skip and sort', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { skip$: 1, sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v2')
          })
        )
      })

      it('should return empty array when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { skip$: 3 },
          verify(done, function (foo) {
            Assert.notOk(foo)
          })
        )
      })

      it('should not be influenced by limit', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { limit$: 2, sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v1')
          })
        )
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { skip$: -1, sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v1')
          })
        )
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { limit$: -1, sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v1')
          })
        )
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.load$(
          { limit$: 'A', skip$: 'B', sort$: { p1: 1 } },
          verify(done, function (foo) {
            Assert.ok(foo)
            Assert.equal(foo.p1, 'v1')
          })
        )
      })
    })

    describe('List', function () {
      it('should support limit, skip and sort', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { limit$: 1, skip$: 1, sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 1)
            Assert.equal(lst[0].p1, 'v2')
          })
        )
      })

      it('should return empty array when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { limit$: 2, skip$: 3 },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 0)
          })
        )
      })

      it('should return correct number of records if limit is too high', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { limit$: 5, skip$: 2, sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 1)
            Assert.equal(lst[0].p1, 'v3')
          })
        )
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { skip$: -1, sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 3)
            Assert.equal(lst[0].p1, 'v1')
            Assert.equal(lst[1].p1, 'v2')
            Assert.equal(lst[2].p1, 'v3')
          })
        )
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { limit$: -1, sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 3)
            Assert.equal(lst[0].p1, 'v1')
            Assert.equal(lst[1].p1, 'v2')
            Assert.equal(lst[2].p1, 'v3')
          })
        )
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.list$(
          { limit$: 'A', skip$: 'B', sort$: { p1: 1 } },
          verify(done, function (lst) {
            Assert.lengthOf(lst, 3)
            Assert.equal(lst[0].p1, 'v1')
            Assert.equal(lst[1].p1, 'v2')
            Assert.equal(lst[2].p1, 'v3')
          })
        )
      })
    })

    describe('Remove', function () {
      it('should support limit, skip and sort', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 1, skip$: 1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 2)
              Assert.equal(lst[0].p1, 'v1')
              Assert.equal(lst[1].p1, 'v3')
            })
          )
        })
      })

      it('should not be impacted by limit > 1', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 2, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 2)
              Assert.equal(lst[0].p1, 'v2')
              Assert.equal(lst[1].p1, 'v3')
            })
          )
        })
      })

      it('should work with all$: true', function (done) {
        var cl = si.make('foo')
        cl.remove$(
          { all$: true, limit$: 2, skip$: 1, sort$: { p1: 1 } },
          function (err) {
            if (err) {
              return done(err)
            }

            cl.list$(
              { sort$: { p1: 1 } },
              verify(done, function (lst) {
                Assert.lengthOf(lst, 1)
                Assert.equal(lst[0].p1, 'v1')
              })
            )
          }
        )
      })

      it('should not delete anyithing when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: 2, skip$: 3 }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 3)
            })
          )
        })
      })

      it('should delete correct number of records if limit is too high', function (done) {
        var cl = si.make('foo')
        cl.remove$(
          { all$: true, limit$: 5, skip$: 2, sort$: { p1: 1 } },
          function (err) {
            if (err) {
              return done(err)
            }

            cl.list$(
              { sort$: { p1: 1 } },
              verify(done, function (lst) {
                Assert.lengthOf(lst, 2)
                Assert.equal(lst[0].p1, 'v1')
                Assert.equal(lst[1].p1, 'v2')
              })
            )
          }
        )
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.remove$({ skip$: -1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 2)
              Assert.equal(lst[0].p1, 'v2')
              Assert.equal(lst[1].p1, 'v3')
            })
          )
        })
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: -1, sort$: { p1: 1 } }, function (
          err
        ) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 0)
            })
          )
        })
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 'A', skip$: 'B', sort$: { p1: 1 } }, function (
          err
        ) {
          if (err) {
            return done(err)
          }

          cl.list$(
            { sort$: { p1: 1 } },
            verify(done, function (lst) {
              Assert.lengthOf(lst, 2)
              Assert.equal(lst[0].p1, 'v2')
              Assert.equal(lst[1].p1, 'v3')
            })
          )
        })
      })
    })
  })

  return script
}

function upserttest(settings) {
  Assert('seneca' in settings, 'settings.seneca')
  const si = settings.seneca

  const script = settings.script || Lab.script()

  const { describe, before, beforeEach, afterEach } = script
  const it = make_it(script)

  describe('Upserts', () => {
    beforeEach(() => new Promise((resolve, _reject) => {
      si.ready(resolve)
    }))

    beforeEach(clearDb(si))

    afterEach(clearDb(si))

    describe('save$ invoked on a new entity instance', () => {
      describe('matching entity exists', () => {
        describe('matches on 1 upsert$ field', () => {
          describe('all entity fields are also present in data$', () => {
            let id_of_richard

            beforeEach(() => new Promise(fin => {
              si.make('players')
                .data$({ username: 'richard', points: 0 })
                .save$((err, user) => {
                  if (err) {
                    return fin(err)
                  }

                  try {
                    id_of_richard = fetchProp(user, 'id')

                    return fin()
                  } catch (err) {
                    return fin(err)
                  }
                })
            }))


            let id_of_bob

            beforeEach(fin => new Promise(fin => {
              si.make('players')
                .data$({ username: 'bob', points: 0 })
                .save$((err, user) => {
                  if (err) {
                    return fin(err)
                  }

                  try {
                    id_of_bob = fetchProp(user, 'id')

                    return fin()
                  } catch (err) {
                    return fin(err)
                  }
                })
            }))

            it('updates the entity', fin => {
              si.test(fin)

              si.ready(() => {
                si.make('players')
                  .data$({ username: 'richard', points: 9999 })
                  .save$({ upsert$: ['username'] }, err => {
                    if (err) {
                      return fin(err)
                    }

                    si.make('players').list$({}, (err, players) => {
                      if (err) {
                        return fin(err)
                      }

                      expect(players.length).to.equal(2)


                      expect(players[0]).to.contain({
                        id: id_of_richard,
                        username: 'richard',
                        points: 9999
                      })


                      expect(players[1]).to.contain({
                        id: id_of_bob,
                        username: 'bob',
                        points: 0
                      })

                      return fin()
                    })
                  })
              })
            })
          })

          describe('some entity fields are missing from data$', () => {
            let id_of_richard

            beforeEach(() => new Promise(fin => {
              si.make('racers')
                .data$({ username: 'richard', points: 37, favorite_car: 'land rover' })
                .save$((err, racer) => {
                  if (err) {
                    return fin(err)
                  }

                  try {
                    id_of_richard = fetchProp(racer, 'id')

                    return fin()
                  } catch (err) {
                    return fin(err)
                  }
                })
            }))


            let id_of_bob

            beforeEach(fin => new Promise(fin => {
              si.make('racers')
                .data$({ username: 'bob', points: 20, favorite_car: 'peugeot 307' })
                .save$((err, racer) => {
                  if (err) {
                    return fin(err)
                  }

                  try {
                    id_of_bob = fetchProp(racer, 'id')

                    return fin()
                  } catch (err) {
                    return fin(err)
                  }
                })
            }))

            it('retains the entity fields missing from data$', fin => {
              si.test(fin)

              si.ready(() => {
                si.make('racers')
                  .data$({ username: 'richard', favorite_car: 'bmw m3 e46' })
                  .save$({ upsert$: ['username'] }, err => {
                    if (err) {
                      return fin(err)
                    }

                    si.make('racers').list$({}, (err, racers) => {
                      if (err) {
                        return fin(err)
                      }

                      expect(racers.length).to.equal(2)


                      expect(racers[0]).to.contain({
                        id: id_of_richard,
                        username: 'richard',
                        points: 37,
                        favorite_car: 'bmw m3 e46'
                      })


                      expect(racers[1]).to.contain({
                        id: id_of_bob,
                        username: 'bob',
                        points: 20,
                        favorite_car: 'peugeot 307'
                      })

                      return fin()
                    })
                  })
              })
            })
          })

          describe('the save$ query includes the id$ field', () => {
            beforeEach(clearDb)


            let target_user_id

            beforeEach(() => new Promise((resolve, reject) => {
              si.make('users')
                .data$({ email: 'elvis@no1.com', username: 'elvispresley' })
                .save$((err, user) => {
                  if (err) {
                    return reject(err)
                  }

                  Assert.ok(user, 'user')
                  target_user_id = fetchProp(user, 'id')

                  return resolve()
                })
            }))


            let target_user

            beforeEach(() => new Promise((resolve, reject) => {
              // Do a fresh fetch from the db.
              //
              si.make('users')
                .load$(target_user_id, (err, user) => {
                  if (err) {
                    return reject(err)
                  }

                  Assert.ok(user, 'user')
                  target_user = user

                  return resolve()
                })
            }))


            afterEach(clearDb)

            it('updates the fields and ignores the id$ qualifier', fin => {
              si.test(fin)


              const new_id = 'bbbba6f73a861890cc1f4e23'

              si.make('users')
                .data$({ email: 'elvis@no1.com', username: 'theking' })
                .save$({ id$: new_id, upsert$: ['email'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('users').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(1)

                    expect(users[0]).to.contain({
                      email: 'elvis@no1.com',
                      username: 'theking'
                    })

                    expect(users[0].id).not.to.equal(new_id)

                    return fin()
                  })
                })
            })
          })
        })

        describe('matches on 2 upsert$ fields', () => {
          beforeEach(() => new Promise(fin => {
            si.make('customers')
              .data$({ first_name: 'richard', last_name: 'gear', credits: 0 })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('customers')
              .data$({ first_name: 'richard', last_name: 'sinatra', credits: 0 })
              .save$(fin)
          }))

          it('updates the entity', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('customers')
                .data$({ first_name: 'richard', last_name: 'gear', credits: 1234 })
                .save$({ upsert$: ['first_name', 'last_name'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('customers').list$({}, (err, customers) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(customers.length).to.equal(2)


                    expect(customers[0]).to.contain({
                      first_name: 'richard',
                      last_name: 'gear',
                      credits: 1234
                    })


                    expect(customers[1]).to.contain({
                      first_name: 'richard',
                      last_name: 'sinatra',
                      credits: 0
                    })


                    return fin()
                  })
                })
            })
          })
        })
      })

      describe('many matching entities exist', () => {
        describe('matches on 1 upsert$ field', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.95' })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.70' })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'bbs tires', price: '4.10' })
              .save$(fin)
          }))

          it('updates a single matching entity', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: 'a toothbrush', price: '4.95' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(3)

                    expect(products[0]).to.contain({
                      label: 'a toothbrush',
                      price: '4.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'a toothbrush',
                      price: '3.70'
                    })

                    expect(products[2]).to.contain({
                      label: 'bbs tires',
                      price: '4.10'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('matches on 2 upsert$ fields', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.95', coolness_factor: 2 })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.70', coolness_factor: 3 })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'bbs tires', price: '4.10', coolness_factor: 7 })
              .save$(fin)
          }))

          it('updates a single matching entity', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: 'a toothbrush', price: '3.95', coolness_factor: 4 })
                .save$({ upsert$: ['label', 'price'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(3)

                    expect(products[0]).to.contain({
                      label: 'a toothbrush',
                      price: '3.95',
                      coolness_factor: 4
                    })

                    expect(products[1]).to.contain({
                      label: 'a toothbrush',
                      price: '3.70',
                      coolness_factor: 3
                    })

                    expect(products[2]).to.contain({
                      label: 'bbs tires',
                      price: '4.10',
                      coolness_factor: 7
                    })

                    return fin()
                  })
                })
            })
          })
        })
      })

      describe('no matching entity exists', () => {
        describe('1 upsert$ field', () => {
          describe('normally', () => {
            let id_of_macchiato

            beforeEach(() => new Promise(fin => {
              si.make('products')
                .data$({ label: 'a macchiato espressionado', price: '3.40' })
                .save$((err, product) => {
                  if (err) {
                    return fin(err)
                  }

                  try {
                    id_of_macchiato = fetchProp(product, 'id')

                    return fin()
                  } catch (err) {
                    return fin(err)
                  }
                })
            }))


            it('creates a new entity', fin => {
              si.test(fin)

              si.make('products')
                .data$({ label: 'b toothbrush', price: '3.40' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      id: id_of_macchiato,
                      label: 'a macchiato espressionado',
                      price: '3.40'
                    })

                    expect(products[1]).to.contain({
                      label: 'b toothbrush',
                      price: '3.40'
                    })

                    expect(products[1].id).not.to.equal(id_of_macchiato)

                    return fin()
                  })
                })
            })
          })

          describe('the save$ query includes the id$ field', () => {
            beforeEach(clearDb)

            afterEach(clearDb)

            it('creates a new entity with the given id', fin => {
              si.test(fin)


              const new_id = '6095a6f73a861890cc1f4e23'

              si.make('users')
                .data$({ email: 'frank.sinatra@gmail.com', username: 'ididitmyway' })
                .save$({ id$: new_id, upsert$: ['email'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('users').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(1)

                    const user = users[0]

                    expect(user.id).to.equal(new_id)

                    return fin()
                  })
                })
            })
          })
        })

        describe('2 upsert$ fields', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'frapuccino', price: '2.40', coolness_factor: 5 })
              .save$(fin)
          }))

          it('creates a new entity', fin => {
            si.test(fin)

            si.make('products')
              .data$({ label: 'frapuccino', price: '3.40', coolness_factor: 7 })
              .save$({ upsert$: ['label', 'price'] }, err => {
                if (err) {
                  return fin(err)
                }

                si.make('products').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[0]).to.contain({
                    label: 'frapuccino',
                    price: '2.40',
                    coolness_factor: 5
                  })

                  expect(products[1]).to.contain({
                    label: 'frapuccino',
                    price: '3.40',
                    coolness_factor: 7
                  })

                  return fin()
                })
              })
          })
        })

        describe('edge cases', () => {
          describe('bombarding the store with near-parallel upserts', () => {
            describe('1 upsert$ field', () => {
              it('does not result in a race condition - creates a single new entity', fin => {
                si.test(fin)

                const user_entity = si.entity('users')

                const upsertUser = cb => 
                  user_entity
                    .data$({ username: 'jimihendrix', email: 'jimi@experience.com' })
                    .save$({ upsert$: ['email'] }, cb)


                Async.parallel([
                  upsertUser,
                  upsertUser,
                  upsertUser
                ], err => {
                  if (err) {
                    return fin(err)
                  }

                  user_entity.list$((err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(1)

                    expect(users[0]).to.contain({
                      username: 'jimihendrix',
                      email: 'jimi@experience.com'
                    })

                    return fin()
                  })
                })

                return
              })
            })
          })
        })
      })

      describe('edge cases', () => {
        describe('entity matches on a private field', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'toothbrush', price: '3.95', psst$: 'private' })
              .save$(fin)
          }))

          it('creates a new entity', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: 'a new toothbrush', price: '5.95', psst$: 'private' })
                .save$({ upsert$: ['psst$'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: 'toothbrush',
                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'a new toothbrush',
                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('empty upsert$ array', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'toothbrush', price: '3.95' })
              .save$(fin)
          }))

          it('creates a new document', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: 'toothbrush', price: '5.95' })
                .save$({ upsert$: [] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: 'toothbrush',
                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'toothbrush',
                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('entity matches on a field with the `undefined` value', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: undefined, price: '3.95' })
              .save$(fin)
          }))

          it('creates a new document', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: undefined, price: '5.95' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      // NOTE: Seneca is stripping out fields
                      // with a value of `undefined` in a document.
                      //
                      // label: undefined,

                      price: '3.95'
                    })

                    expect(products[1]).to.contain({
                      // NOTE: Seneca is stripping out fields
                      // with a value of `undefined` in a document.
                      //
                      // label: undefined,

                      price: '5.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('entity matches on a field with the null value', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: null, price: '3.95' })
              .save$(fin)
          }))

          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'CS101 textbook', price: '134.95' })
              .save$(fin)
          }))

          it('updates the existing entity', fin => {
            si.test(fin)

            si.ready(() => {
              si.make('products')
                .data$({ label: null, price: '5.95' })
                .save$({ upsert$: ['label'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('products').list$({}, (err, products) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(products.length).to.equal(2)

                    expect(products[0]).to.contain({
                      label: null,
                      price: '5.95'
                    })

                    expect(products[1]).to.contain({
                      label: 'CS101 textbook',
                      price: '134.95'
                    })

                    return fin()
                  })
                })
            })
          })
        })

        describe('some fields in data$/upsert$ are not present in existing entities', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.40' })
              .save$(fin)
          }))

          it('creates a new entity', fin => {
            si.test(fin)

            si.make('products')
              .data$({ label: 'a toothbrush', price: '2.95', coolness_factor: 11 })
              .save$({ upsert$: ['label', 'coolness_factor'] }, err => {
                if (err) {
                  return fin(err)
                }

                si.make('products').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[1]).to.contain({
                    label: 'a toothbrush',
                    price: '2.95',
                    coolness_factor: 11
                  })


                  return fin()
                })
              })
          })
        })

        describe('fields in upsert$ are not present in the data$ object', () => {
          beforeEach(() => new Promise(fin => {
            si.make('products')
              .data$({ label: 'a toothbrush', price: '3.40' })
              .save$(fin)
          }))

          it('creates a new entity because it can never match', fin => {
            si.test(fin)

            si.make('products')
              .data$({ label: 'a toothbrush', price: '2.95' })
              .save$({ upsert$: ['label', 'coolness_factor'] }, err => {
                if (err) {
                  return fin(err)
                }

                si.make('products').list$({}, (err, products) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(products.length).to.equal(2)

                  expect(products[0]).to.contain({
                    label: 'a toothbrush',
                    price: '3.40'
                  })

                  expect(products[1]).to.contain({
                    label: 'a toothbrush',
                    price: '2.95'
                  })

                  return fin()
                })
              })
          })
        })

        describe('upserting on the id field', () => {
          describe('matching entity exists', () => {
            const id_of_richard = 'some_id'

            beforeEach(() => new Promise(fin => {
              si.make('players')
                .data$({ id: id_of_richard, username: 'richard', points: 8000 })
                .save$(fin)
            }))


            beforeEach(() => new Promise(fin => {
              si.make('players')
                .data$({ username: 'bob', points: 1000 })
                .save$(fin)
            }))

            it('updates the matching entity', fin => {
              si.test(fin)

              si.make('players')
                .data$({ id: id_of_richard, username: 'richard', points: 9999 })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('players').list$({}, (err, players) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(players.length).to.equal(2)

                    expect(players[0]).to.contain({
                      id: id_of_richard,
                      username: 'richard',
                      points: 9999
                    })

                    expect(players[1]).to.contain({
                      username: 'bob',
                      points: 1000
                    })

                    return fin()
                  })
                })
            })

            it('works with load$ after the update', fin => {
              si.test(fin)

              si.make('users')
                .data$({ id: id_of_richard, username: 'richard', points: 9999 })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('users').load$(id_of_richard, (err, user) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(user).to.contain({
                      id: id_of_richard,
                      username: 'richard',
                      points: 9999
                    })

                    return fin()
                  })
                })
            })
          })

          describe('matching entity does not exist', () => {
            const some_id = 'some_id'

            beforeEach(() => new Promise(fin => {
              si.make('users')
                .data$({ username: 'richard', email: 'rr@example.com' })
                .save$(fin)
            }))

            it('creates a new document with that id', fin => {
              si.test(fin)

              si.make('users')
                .data$({ id: some_id, username: 'jim', email: 'jhendrix@example.com' })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('users').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }


                    expect(users.length).to.equal(2)


                    expect(users[0].id).not.to.equal(some_id)

                    expect(users[0]).to.contain({
                      username: 'richard',
                      email: 'rr@example.com'
                    })


                    expect(users[1]).to.contain({
                      id: some_id,
                      username: 'jim',
                      email: 'jhendrix@example.com'
                    })


                    return fin()
                  })
                })
            })

            it('works with load$ after the creation', fin => {
              si.test(fin)

              si.make('users')
                .data$({ id: some_id, username: 'jim', email: 'jhendrix@example.com' })
                .save$({ upsert$: ['id'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('users').load$(some_id, (err, user) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(user).to.contain({
                      id: some_id,
                      username: 'jim',
                      email: 'jhendrix@example.com'
                    })

                    return fin()
                  })
                })
            })
          })
        })
      })
    })

    describe('save$ invoked as a method on an existing entity instance', () => {
      describe('a matching entity exists', () => {
        let existing_product

        beforeEach(() => new Promise(fin => {
          si.make('products')
            .data$({ label: 'a macchiato espressionado', price: '3.40' })
            .save$((err, new_product) => {
              if (err) {
                return fin(err)
              }

              existing_product = new_product

              return fin()
            })
        }))


        beforeEach(() => new Promise(fin => {
          si.make('products')
            .data$({ label: 'a macchiato espressionado', price: '7.99' })
            .save$(fin)
        }))


        it('ignores the upsert$ directive and updates the existing entity, as it normally would', fin => {
          si.test(fin)

          existing_product
            .data$({ label: 'a macchiato espressionado', price: '3.95' })
            .save$({ upsert$: ['label'] }, err => {
              if (err) {
                return fin(err)
              }

              si.make('products').list$({}, (err, products) => {
                if (err) {
                  return fin(err)
                }

                expect(products.length).to.equal(2)

                expect(products[0]).to.contain({
                  label: 'a macchiato espressionado',
                  price: '3.95'
                })

                expect(products[1]).to.contain({
                  label: 'a macchiato espressionado',
                  price: '7.99'
                })

                return fin()
              })
            })
        })
      })
    })
  })

  return script
}

function sqltest(settings) {
  var si = settings.seneca
  var script = settings.script || Lab.script()

  var describe = script.describe
  var before = script.before
  var it = make_it(script)

  var Product = si.make('products')
  describe('Sql support', function () {
    before(function before(done) {
      before(clearDb(si))
      before(createEntities, 'product', [
        { name: 'apple', price: 200 },
        { name: 'pear', price: 100 },
      ])
    })

    it('should accept a string query', function (done) {
      Product.list$(
        { native$: 'SELECT * FROM product ORDER BY price' },
        verify(done, function (list) {
          Assert.lengthOf(list, 2)

          Assert.equal(list[0].entity$, '-/-/product')
          Assert.equal(list[0].name, 'pear')
          Assert.equal(list[0].price, 100)

          Assert.equal(list[1].entity$, '-/-/product')
          Assert.equal(list[1].name, 'apple')
          Assert.equal(list[1].price, 200)
        })
      )
    })

    it('should accept and array with query and parameters', function (done) {
      Product.list$(
        {
          native$: [
            'SELECT * FROM product WHERE price >= ? AND price <= ?',
            0,
            150,
          ],
        },
        verify(done, function (list) {
          Assert.lengthOf(list, 1)

          Assert.equal(list[0].entity$, '-/-/product')
          Assert.equal(list[0].name, 'pear')
          Assert.equal(list[0].price, 100)
        })
      )
    })
  })

  return script
}

module.exports = {
  basictest: basictest,
  sorttest: sorttest,
  limitstest: limitstest,
  upserttest: upserttest,
  sqltest: sqltest,
  extended: ExtendedTests,
  verify: verify,

  test: {
    init: (lab, opts) => {
      opts.ent0 = opts.ent0 || 'test0'

      // NOTE: pass require to Seneca instance
      lab.describe('store-init', () => {
        lab.it('load-store-plugin', async () => {
          expect(opts.name).string()

          let seneca = opts.seneca
          seneca.use('..', opts.options)
          await seneca.ready()

          expect(seneca.has_plugin(opts.name), 'has_plugin').true()
        })

        lab.it('clear-data', async () => {
          let seneca = opts.seneca

          let ent0 = seneca.make(opts.ent0)
          await ent0.remove$({ all$: true })

          let list = await ent0.list$()
          expect(list.length, 'empty-list').equal(0)
        })
      })
    },

    keyvalue: (lab, opts) => {
      lab.describe('store-keyvalue', () => {
        lab.it('save-load-auto-id', async () => {
          let seneca = opts.seneca
          let ent0 = seneca.make(opts.ent0)

          // load non-existent
          let n0 = await ent0.make$().load$('not-an-id')
          expect(n0, 'not-exists').not.exists()

          // basic save and load for single entity
          let a0 = await ent0.make$({ a: 0 }).save$()
          let a0o = await ent0.make$().load$(a0.id)
          expect(a0 === ent0, 'new object').false()
          expect(a0o === ent0, 'new object').false()
          expect(a0o === a0, 'new object').false()
          expect(a0.id, 'same id').equal(a0o.id)
          expect(a0.a, 'same field').equal(a0o.a)

          // basic save and load for another entity
          let a1 = await ent0.make$({ a: 1 }).save$()
          let a1o = await ent0.make$().load$(a1.id)
          expect(a1 === ent0, 'new object').false()
          expect(a1o === ent0, 'new object').false()
          expect(a1o === a1, 'new object').false()
          expect(a1o !== a0o, 'different object').true()
          expect(a1.id, 'same id').equal(a1o.id)
          expect(a1.a, 'same field').equal(a1o.a)
          expect(a1.id, 'different ids').not.equal(a0.id)

          // basic update
          let a0u = await a0o.data$({ a: 10, b: 'b0' }).save$()
          expect(a0u.data$(), 'update data').includes({ a: 10, b: 'b0' })
          expect(a0u.id, 'same id').equal(a0.id)
          let a0uo = await ent0.make$().load$(a0.id)
          expect(a0uo.data$(), 'update data').includes({ a: 10, b: 'b0' })
          expect(a0uo.id, 'same id').equal(a0.id)

          // basic update on another entity
          let a1u = await a1o.data$({ a: 11, b: 'b1' }).save$()
          expect(a1u.data$(), 'update data').includes({ a: 11, b: 'b1' })
          expect(a1u.id, 'same id').equal(a1.id)
          let a1uo = await ent0.make$().load$(a1.id)
          expect(a1uo.data$(), 'update data').includes({ a: 11, b: 'b1' })
          expect(a1uo.id, 'same id').equal(a1.id)

          // sanity
          n0 = await ent0.make$().load$('not-an-id')
          expect(n0, 'not-exists').not.exists()
          let a0s = await ent0.make$().load$(a0.id)
          expect(a0s.data$(), 'expected data').contains({ a: 10, b: 'b0' })
          let a1s = await ent0.make$().load$(a1.id)
          expect(a1s.data$(), 'expected data').contains({ a: 11, b: 'b1' })
        })

        lab.it('save-load-given-id', async () => {
          let seneca = opts.seneca
          let ent0 = seneca.make(opts.ent0)

          // load non-existent
          let n0 = await ent0.make$().load$('not-an-id')
          expect(n0, 'not-exists').not.exists()

          let id0 = Nid()
          let id1 = Nid()

          let b0 = await ent0.make$({ id$: id0, b: 0 }).save$()
          let b0o = await ent0.make$().load$(id0)
          expect(b0 === ent0, 'new object').false()
          expect(b0o === ent0, 'new object').false()
          expect(b0o === b0, 'new object').false()
          expect(b0.b, 'same field').equal(b0o.b)

          let b1 = await ent0.make$({ id$: id1, b: 1 }).save$()
          let b1o = await ent0.make$().load$(id1)
          expect(b1 === ent0, 'new object').false()
          expect(b1o === ent0, 'new object').false()
          expect(b1o === b1, 'new object').false()
          expect(b1o !== b0o, 'different object').true()
          expect(b1.b, 'same field').equal(b1o.b)

          // basic update
          let b0u = await b0o.data$({ b: 10, c: 'c0' }).save$()
          expect(b0u.data$(), 'update data').includes({ b: 10, c: 'c0' })
          expect(b0u.id, 'same id').equal(b0.id)
          let b0uo = await ent0.make$().load$(b0.id)
          expect(b0uo.data$(), 'update data').includes({ b: 10, c: 'c0' })
          expect(b0uo.id, 'same id').equal(b0.id)

          // basic update on another entity
          let b1u = await b1o.data$({ b: 11, c: 'c1' }).save$()
          expect(b1u.data$(), 'update data').includes({ b: 11, c: 'c1' })
          expect(b1u.id, 'same id').equal(b1.id)
          let b1uo = await ent0.make$().load$(b1.id)
          expect(b1uo.data$(), 'update data').includes({ b: 11, c: 'c1' })
          expect(b1uo.id, 'same id').equal(b1.id)

          // sanity
          n0 = await ent0.make$().load$('not-an-id')
          expect(n0, 'not-exists').not.exists()
          let b0s = await ent0.make$().load$(b0.id)
          expect(b0s.data$(), 'expected data').contains({ b: 10, c: 'c0' })
          let b1s = await ent0.make$().load$(b1.id)
          expect(b1s.data$(), 'expected data').contains({ b: 11, c: 'c1' })
        })

        lab.it('remove', async () => {
          let seneca = opts.seneca
          let ent0 = seneca.make(opts.ent0)

          let c0 = await ent0.make$({ c: 0 }).save$()
          let c0o = await ent0.make$().load$(c0.id)
          expect(c0o.id).equals(c0.id)

          let c1 = await ent0.make$({ c: 1 }).save$()
          let c1o = await ent0.make$().load$(c1.id)
          expect(c1o.id).equals(c1.id)

          // should be idempotent
          await ent0.make$().remove$(c0o.id)
          await ent0.make$().remove$(c0o.id)

          let c0r = await ent0.make$().load$(c0.id)
          expect(c0r).not.exist()

          let c1r = await ent0.make$().load$(c1.id)
          expect(c1r).exist()
          expect(c1r.id).equal(c1o.id)
          expect(c1r.c).equal(c1o.c)
          expect(c1r.c).equal(c1.c)
        })
      })
    },
  },
}

function isDate(x) {
  return (
    'object' === typeof x &&
    '[object Date]' === Object.prototype.toString.call(x)
  )
}

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
