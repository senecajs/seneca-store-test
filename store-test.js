/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

var assert = require('chai').assert
var async = require('async')
var _ = require('lodash')
var lab = require('lab')

var bartemplate = {
  name$: 'bar',
  base$: 'moon',
  zone$: 'zen',

  str: 'aaa',
  int: 11,
  dec: 33.33,
  bol: false,
  wen: new Date(2020, 1, 1),
  arr: [ 2, 3 ],
  obj: {
    a: 1,
    b: [2],
    c: { d: 3 }
  }
}

var barverify = function (bar) {
  assert.equal(bar.str, 'aaa')
  assert.equal(bar.int, 11)
  assert.equal(bar.dec, 33.33)
  assert.equal(bar.bol, false)
  assert.equal(_.isDate(bar.wen) ? bar.wen.toISOString() : bar.wen, new Date(2020, 1, 1).toISOString())
  assert.equal('' + bar.arr, '' + [ 2, 3 ])
  assert.deepEqual(bar.obj, {
    a: 1,
    b: [2],
    c: { d: 3 }
  })
}

function verify (cb, tests) {
  return function (error, out) {
    if (error) {
      return cb(error)
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

function clearDb (si) {
  return function clear (done) {
    async.series([
      function clearFoo (next) {
        si.make('foo').remove$({ all$: true }, next)
      },
      function clearBar (next) {
        si.make('zen', 'moon', 'bar').remove$({ all$: true }, next)
      }
    ], done)
  }
}

function createEntities (si, name, data) {
  return function create (done) {
    async.each(data, function (el, next) {
      si.make$(name, el).save$(next)
    }, done)
  }
}

function basictest (settings) {
  var si = settings.seneca
  var merge = settings.senecaMerge
  var script = settings.script || lab.script()

  var describe = script.describe
  var it = script.it
  var before = script.before
  var beforeEach = script.beforeEach

  describe('Basic Tests', function () {
    describe('Load', function () {
      before(clearDb(si))
      before(createEntities(si, 'foo', [{
        id$: 'foo1',
        p1: 'v1'
      }, {
        id$: 'foo2',
        p1: 'v2',
        p2: 'z2'
      }]))
      before(createEntities(si, 'bar', [ bartemplate ]))

      it('should load an entity', function (done) {
        var foo = si.make('foo')
        foo.load$('foo1', verify(done, function (foo1) {
          assert.isNotNull(foo1)
          assert.equal(foo1.id, 'foo1')
          assert.equal(foo1.p1, 'v1')
        }))
      })

      it('should return null for non existing entity', function (done) {
        var foo = si.make('foo')
        foo.load$('does-not-exist-at-all-at-all', verify(done, function (out) {
          assert.isNull(out)
        }))
      })

      it('should support filtering', function (done) {
        var foo = si.make('foo')
        foo.load$({ p1: 'v2' }, verify(done, function (foo1) {
          assert.isNotNull(foo1)
          assert.equal(foo1.id, 'foo2')
          assert.equal(foo1.p1, 'v2')
          assert.equal(foo1.p2, 'z2')
        }))
      })

      it('should filter with AND', function (done) {
        var foo = si.make('foo')
        foo.load$({ p1: 'v2', p2: 'z2' }, verify(done, function (foo1) {
          assert.isNotNull(foo1)
          assert.equal(foo1.id, 'foo2')
          assert.equal(foo1.p1, 'v2')
          assert.equal(foo1.p2, 'z2')
        }))
      })

      it('should filter with AND 2', function (done) {
        var foo = si.make('foo')
        foo.load$({ p1: 'v2', p2: 'a' }, verify(done, function (foo1) {
          assert.isNull(foo1)
        }))
      })

      it('should support different attribute types', function (done) {
        var bar = si.make('zen', 'moon', 'bar')

        bar.load$({ str: 'aaa' }, verify(done, function (bar1) {
          assert.isNotNull(bar1)
          assert.isNotNull(bar1.id)
          barverify(bar1)
        }))
      })

      it('should not mix attributes from entity to query for filtering', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.load$({ p2: 'z2' }, verify(done, function (foo1) {
          assert.ok(foo1)
          assert.equal(foo1.id, 'foo2')
          assert.equal(foo1.p1, 'v2')
          assert.equal(foo1.p2, 'z2')
        }))
      })

      it('should reload current entity if no query provided and id present', function (done) {
        var foo = si.make('foo')
        foo.id = 'foo2'
        foo.load$(verify(done, function (foo1) {
          assert.ok(foo1)
          assert.equal(foo1.id, 'foo2')
          assert.equal(foo1.p1, 'v2')
          assert.equal(foo1.p2, 'z2')
        }))
      })

      it('should do nothing if no query provided and id not present', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v2'
        foo.load$(verify(done, function (foo1) {
          assert.notOk(foo1)
        }))
      })
    })

    describe('Save', function () {
      beforeEach(clearDb(si))
      beforeEach(createEntities(si, 'foo', [{
        id$: 'to-be-updated',
        p1: 'v1',
        p2: 'v2',
        p3: 'v3'
      }]))

      it('should save an entity to store (and generate an id)', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)

          foo1.load$(foo1.id, verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, foo1.id)
            assert.equal(foo2.p1, 'v1')
            assert.equal(foo2.p2, 'v2')
          }))
        })
      })

      it('should save an entity to store (with provided id)', function (done) {
        var foo = si.make('foo')
        foo.id$ = 'existing'
        foo.p1 = 'v1'
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'existing')

          foo1.load$('existing', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'existing')
            assert.equal(foo2.p1, 'v1')
            assert.equal(foo2.p2, 'v2')
          }))
        })
      })

      it('should update an entity if id provided', function (done) {
        var foo = si.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'to-be-updated')
          assert.equal(foo1.p1, 'z1')
          assert.equal(foo1.p2, 'z2')
          assert.equal(foo1.p3, 'v3')

          foo1.load$('to-be-updated', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'to-be-updated')
            assert.equal(foo2.p1, 'z1')
            assert.equal(foo2.p2, 'z2')
            assert.equal(foo2.p3, 'v3')
          }))
        })
      })

      it('should save an entity if id provided but original doesn\'t exist', function (done) {
        var foo = si.make('foo')
        foo.id = 'will-be-inserted'
        foo.p1 = 'z1'
        foo.p2 = 'z2'
        foo.p3 = 'z3'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'will-be-inserted')
          assert.equal(foo1.p1, 'z1')
          assert.equal(foo1.p2, 'z2')
          assert.equal(foo1.p3, 'z3')

          foo1.load$('will-be-inserted', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'will-be-inserted')
            assert.equal(foo2.p1, 'z1')
            assert.equal(foo2.p2, 'z2')
            assert.equal(foo2.p3, 'z3')
          }))
        })
      })

      it('should allow to not merge during update with merge$: false', function (done) {
        var foo = si.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$({ merge$: false }, function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'to-be-updated')
          assert.equal(foo1.p1, 'z1')
          assert.equal(foo1.p2, 'z2')
          assert.notOk(foo1.p3)

          foo1.load$('to-be-updated', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'to-be-updated')
            assert.equal(foo2.p1, 'z1')
            assert.equal(foo2.p2, 'z2')
            assert.notOk(foo1.p3)
          }))
        })
      })

      it('should support different attribute types', function (done) {
        var bar = si.make(bartemplate)
        var mark = bar.mark = Math.random()

        bar.save$(function (err, bar) {
          assert.isNull(err)
          assert.isNotNull(bar)
          assert.isNotNull(bar.id)
          barverify(bar)
          assert.equal(bar.mark, mark)

          bar.load$(bar.id, verify(done, function (bar1) {
            assert.isNotNull(bar1)
            assert.equal(bar1.id, bar.id)
            barverify(bar1)
            assert.equal(bar1.mark, mark)
          }))
        })
      })

      it('should allow dublicate attributes', function (done) {
        var foo = si.make('foo')
        foo.p2 = 'v2'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.p2, 'v2')

          foo.load$(foo1.id, verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, foo1.id)
            assert.equal(foo2.p2, 'v2')
            assert.notOk(foo2.p1)
            assert.notOk(foo2.p3)
          }))
        })
      })

      it('should not save modifications to entity after save completes', function (done) {
        var foo = si.make('foo')
        foo.p3 = [ 'a' ]
        foo.save$(verify(done, function (foo1) {
          assert.deepEqual(foo1.p3, [ 'a' ])
          // now that foo is in the database, modify the original data
          foo.p3.push('b')
          assert.deepEqual(foo1.p3, [ 'a' ])
        }))
      })

      it('should not backport modification to saved entity to the original one', function (done) {
        var foo = si.make('foo')
        foo.p3 = [ 'a' ]
        foo.save$(verify(done, function (foo1) {
          assert.deepEqual(foo1.p3, [ 'a' ])
          // now that foo is in the database, modify the original data
          foo1.p3.push('b')
          assert.deepEqual(foo.p3, [ 'a' ])
        }))
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
          foo1.p2 = undefined
          foo1.save$(function (err, foo2) {
            if (err) {
              return done(err)
            }

            assert.notOk(foo2.p1)
            assert.notOk(foo2.p2)

            foo.load$(foo1.id, verify(done, function (foo3) {
              assert.ok(foo3)
              assert.notOk(foo3.p1)
              assert.notOk(foo3.p2)
            }))
          })
        })
      })
    })

    describe('With Option merge:false', function () {
      beforeEach(clearDb(merge))
      beforeEach(createEntities(merge, 'foo', [{
        id$: 'to-be-updated',
        p1: 'v1',
        p2: 'v2',
        p3: 'v3'
      }]))

      it('should provide senecaMerge', function (done) {
        assert(merge, 'Implementor should provide a seneca instance with the store configured to default to merge:false')
        done()
      })

      it('should update an entity if id provided', function (done) {
        var foo = merge.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$(function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'to-be-updated')
          assert.equal(foo1.p1, 'z1')
          assert.equal(foo1.p2, 'z2')
          assert.notOk(foo1.p3)

          foo1.load$('to-be-updated', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'to-be-updated')
            assert.equal(foo2.p1, 'z1')
            assert.equal(foo2.p2, 'z2')
            assert.notOk(foo2.p3)
          }))
        })
      })

      it('should allow to merge during update with merge$: true', function (done) {
        var foo = merge.make('foo')
        foo.id = 'to-be-updated'
        foo.p1 = 'z1'
        foo.p2 = 'z2'

        foo.save$({ merge$: true }, function (err, foo1) {
          assert.isNull(err)
          assert.isNotNull(foo1.id)
          assert.equal(foo1.id, 'to-be-updated')
          assert.equal(foo1.p1, 'z1')
          assert.equal(foo1.p2, 'z2')
          assert.equal(foo1.p3, 'v3')
          assert.notOk(foo1.merge$)

          foo1.load$('to-be-updated', verify(done, function (foo2) {
            assert.isNotNull(foo2)
            assert.equal(foo2.id, 'to-be-updated')
            assert.equal(foo2.p1, 'z1')
            assert.equal(foo2.p2, 'z2')
            assert.equal(foo1.p3, 'v3')
            assert.notOk(foo1.merge$)
          }))
        })
      })
    })

    describe('List', function () {
      before(clearDb(si))
      before(createEntities(si, 'foo', [{
        id$: 'foo1',
        p1: 'v1'
      }, {
        id$: 'foo2',
        p1: 'v2',
        p2: 'z2'
      }]))
      before(createEntities(si, 'bar', [ bartemplate ]))

      it('should load all elements if no params', function (done) {
        var bar = si.make('zen', 'moon', 'bar')
        bar.list$({}, verify(done, function (res) {
          assert.lengthOf(res, 1)
          barverify(res[0])
        }))
      })

      it('should load all elements if no params 2', function (done) {
        var foo = si.make('foo')
        foo.list$({}, verify(done, function (res) {
          assert.lengthOf(res, 2)
        }))
      })

      it('should load all elements if no query provided', function (done) {
        var foo = si.make('foo')
        foo.list$(verify(done, function (res) {
          assert.lengthOf(res, 2)
        }))
      })

      it('should list entities by id', function (done) {
        var foo = si.make('foo')
        foo.list$({ id: 'foo1' }, verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].p1, 'v1')
          assert.notOk(res[0].p2)
          assert.notOk(res[0].p3)
        }))
      })

      it('should list entities by integer property', function (done) {
        var bar = si.make('zen', 'moon', 'bar')
        bar.list$({ int: bartemplate.int }, verify(done, function (res) {
          assert.lengthOf(res, 1)
          barverify(res[0])
        }))
      })

      it('should list entities by string property', function (done) {
        var foo = si.make('foo')
        foo.list$({ p2: 'z2' }, verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].p1, 'v2')
          assert.equal(res[0].p2, 'z2')
        }))
      })

      it('should list entities by two properties', function (done) {
        var foo = si.make('foo')
        foo.list$({ p2: 'z2', p1: 'v2' }, verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].p1, 'v2')
          assert.equal(res[0].p2, 'z2')
        }))
      })

      it('should support opaque ids (array)', function (done) {
        var foo = si.make('foo')
        foo.list$([ 'foo1', 'foo2' ], verify(done, function (res) {
          assert.lengthOf(res, 2)
          assert.equal(res[0].p1, 'v1')
          assert.notOk(res[0].p2)
          assert.notOk(res[0].p3)
          assert.equal(res[1].p1, 'v2')
          assert.equal(res[1].p2, 'z2')
          assert.equal(res[1].p3)
        }))
      })

      it('should support opaque ids (single id)', function (done) {
        var foo = si.make('foo')
        foo.list$([ 'foo2' ], verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].p1, 'v2')
          assert.equal(res[0].p2, 'z2')
          assert.equal(res[0].p3)
        }))
      })

      it('should support opaque ids (string)', function (done) {
        var foo = si.make('foo')
        foo.list$('foo2', verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].p1, 'v2')
          assert.equal(res[0].p2, 'z2')
          assert.equal(res[0].p3)
        }))
      })

      it('should filter with AND', function (done) {
        var foo = si.make('foo')
        foo.list$({ p2: 'z2', p1: 'v1' }, verify(done, function (res) {
          assert.lengthOf(res, 0)
        }))
      })

      it('should not mix attributes from entity to query for filtering', function (done) {
        var foo = si.make('foo')
        foo.p1 = 'v1'
        foo.list$({ p2: 'z2' }, verify(done, function (res) {
          assert.lengthOf(res, 1)
          assert.equal(res[0].id, 'foo2')
          assert.equal(res[0].p1, 'v2')
          assert.equal(res[0].p2, 'z2')
        }))
      })
    })

    describe('Remove', function () {
      beforeEach(clearDb(si))
      beforeEach(createEntities(si, 'foo', [{
        id$: 'foo1',
        p1: 'v1'
      }, {
        id$: 'foo2',
        p1: 'v2',
        p2: 'z2'
      }]))
      beforeEach(createEntities(si, 'bar', [ bartemplate ]))

      it('should delete only an entity', function (done) {
        var foo = si.make('foo')
        foo.remove$({}, function (err, res) {
          assert.isNull(err)
          assert.notOk(res)

          foo.list$({}, verify(done, function (res) {
            assert.lengthOf(res, 1)
          }))
        })
      })

      it('should delete all entities if all$ = true', function (done) {
        var foo = si.make('foo')
        foo.remove$({ all$: true }, function (err, res) {
          assert.isNull(err)
          assert.notOk(res)

          foo.list$({}, verify(done, function (res) {
            assert.lengthOf(res, 0)
          }))
        })
      })

      it('should delete an entity by property', function (done) {
        var foo = si.make('foo')
        foo.remove$({ p1: 'v1' }, function (err, res) {
          assert.isNull(err)

          foo.list$({}, verify(done, function (res) {
            assert.lengthOf(res, 1)
            assert.equal('v2', res[0].p1)
          }))
        })
      })

      it('should delete entities filtered by AND', function (done) {
        var foo = si.make('foo')
        foo.remove$({ p1: 'v1', p2: 'z2' }, function (err) {
          assert.isNull(err)

          foo.list$({}, verify(done, function (res) {
            assert.lengthOf(res, 2)
          }))
        })
      })

      it('should return deleted entity if load$: true', function (done) {
        var foo = si.make('foo')
        foo.remove$({ p1: 'v2', load$: true }, verify(done, function (res) {
          assert.ok(res)
          assert.equal(res.p1, 'v2')
          assert.equal(res.p2, 'z2')
        }))
      })

      it('should never return deleted entities if all$: true', function (done) {
        var foo = si.make('foo')
        foo.remove$({ all$: true, load$: true }, verify(done, function (res) {
          assert.notOk(res)
        }))
      })

      it('should not delete current ent (only uses query)', function (done) {
        var foo = si.make('foo')
        foo.id = 'foo2'
        foo.remove$({ p1: 'v1' }, function (err) {
          if (err) {
            return done(err)
          }

          foo.list$(verify(done, function (res) {
            assert.lengthOf(res, 1)
            assert.equal(res[0].id, 'foo2')
          }))
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
            foo.list$({}, verify(done, function (res) {
              assert.lengthOf(res, 1)
              assert.equal(res[0].id, 'foo1')
            }))
          })
        })
      })
    })

    describe('Native', function () {
      it('should prived direct access to the driver', function (done) {
        var foo = si.make('foo')
        foo.native$(verify(done, function (driver) {
          assert.isObject(driver)
        }))
      })
    })
  })

  return script
}

function sorttest (settings) {
  var si = settings.seneca
  var script = settings.script || lab.script()

  var describe = script.describe
  var it = script.it
  var beforeEach = script.beforeEach

  describe('Sorting', function () {
    beforeEach(clearDb(si))
    beforeEach(createEntities(si, 'foo', [
      { p1: 'v1', p2: 'v1' },
      // make sure this is not in alphabetical order,
      // otherwise insertion order will be similar to the order we use for tests
      // possibly leading to false positives
      { p1: 'v2', p2: 'v3' },
      { p1: 'v3', p2: 'v2' }
    ]))

    describe('Load', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.load$({ sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v1')
        }))
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.load$({ sort$: { p1: -1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v3')
        }))
      })
    })

    describe('List', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 3)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
        }))
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.list$({ sort$: { p1: -1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 3)
          assert.equal(lst[0].p1, 'v3')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v1')
        }))
      })
    })

    describe('Remove', function () {
      it('should support ascending order', function (done) {
        var cl = si.make('foo')
        cl.remove$({ sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.equal(lst.length, 2)
            assert.equal(lst[0].p1, 'v2')
            assert.equal(lst[1].p1, 'v3')
          }))
        })
      })

      it('should support descending order', function (done) {
        var cl = si.make('foo')
        cl.remove$({ sort$: { p1: -1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.equal(lst.length, 2)
            assert.equal(lst[0].p1, 'v1')
            assert.equal(lst[1].p1, 'v2')
          }))
        })
      })
    })
  })

  return script
}

function limitstest (settings) {
  var si = settings.seneca
  var script = settings.script || lab.script()

  var describe = script.describe
  var it = script.it
  var beforeEach = script.beforeEach

  describe('Limits', function () {
    beforeEach(clearDb(si))
    beforeEach(createEntities(si, 'foo', [
      { p1: 'v1' },
      // make sure this is not in alphabetical order,
      // otherwise insertion order will be similar to the order we use for tests
      // possibly leading to false positives
      { p1: 'v3' },
      { p1: 'v2' }
    ]))

    it('check setup correctly', function (done) {
      var cl = si.make('foo')
      cl.list$({}, verify(done, function (lst) {
        assert.lengthOf(lst, 3)
      }))
    })

    describe('Load', function () {
      it('should support skip and sort', function (done) {
        var cl = si.make('foo')
        cl.load$({ skip$: 1, sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v2')
        }))
      })

      it('should return empty array when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.load$({ skip$: 3 }, verify(done, function (foo) {
          assert.notOk(foo)
        }))
      })

      it('should not be influenced by limit', function (done) {
        var cl = si.make('foo')
        cl.load$({ limit$: 2, sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v1')
        }))
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.load$({ skip$: -1, sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v1')
        }))
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.load$({ limit$: -1, sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v1')
        }))
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.load$({ limit$: 'A', skip$: 'B', sort$: { p1: 1 } }, verify(done, function (foo) {
          assert.ok(foo)
          assert.equal(foo.p1, 'v1')
        }))
      })
    })

    describe('List', function () {
      it('should support limit, skip and sort', function (done) {
        var cl = si.make('foo')
        cl.list$({ limit$: 1, skip$: 1, sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 1)
          assert.equal(lst[0].p1, 'v2')
        }))
      })

      it('should return empty array when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.list$({ limit$: 2, skip$: 3 }, verify(done, function (lst) {
          assert.lengthOf(lst, 0)
        }))
      })

      it('should return correct number of records if limit is too high', function (done) {
        var cl = si.make('foo')
        cl.list$({ limit$: 5, skip$: 2, sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 1)
          assert.equal(lst[0].p1, 'v3')
        }))
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.list$({ skip$: -1, sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 3)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
        }))
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.list$({ limit$: -1, sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 3)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
        }))
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.list$({ limit$: 'A', skip$: 'B', sort$: { p1: 1 } }, verify(done, function (lst) {
          assert.lengthOf(lst, 3)
          assert.equal(lst[0].p1, 'v1')
          assert.equal(lst[1].p1, 'v2')
          assert.equal(lst[2].p1, 'v3')
        }))
      })
    })

    describe('Remove', function () {
      it('should support limit, skip and sort', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 1, skip$: 1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 2)
            assert.equal(lst[0].p1, 'v1')
            assert.equal(lst[1].p1, 'v3')
          }))
        })
      })

      it('should not be impacted by limit > 1', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 2, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 2)
            assert.equal(lst[0].p1, 'v2')
            assert.equal(lst[1].p1, 'v3')
          }))
        })
      })

      it('should work with all$: true', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: 2, skip$: 1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 1)
            assert.equal(lst[0].p1, 'v1')
          }))
        })
      })

      it('should not delete anyithing when skipping all the records', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: 2, skip$: 3 }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 3)
          }))
        })
      })

      it('should delete correct number of records if limit is too high', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: 5, skip$: 2, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 2)
            assert.equal(lst[0].p1, 'v1')
            assert.equal(lst[1].p1, 'v2')
          }))
        })
      })

      it('should ignore skip < 0', function (done) {
        var cl = si.make('foo')
        cl.remove$({ skip$: -1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 2)
            assert.equal(lst[0].p1, 'v2')
            assert.equal(lst[1].p1, 'v3')
          }))
        })
      })

      it('should ignore limit < 0', function (done) {
        var cl = si.make('foo')
        cl.remove$({ all$: true, limit$: -1, sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 0)
          }))
        })
      })

      it('should ignore invalid qualifier values', function (done) {
        var cl = si.make('foo')
        cl.remove$({ limit$: 'A', skip$: 'B', sort$: { p1: 1 } }, function (err) {
          if (err) {
            return done(err)
          }

          cl.list$({ sort$: { p1: 1 } }, verify(done, function (lst) {
            assert.lengthOf(lst, 2)
            assert.equal(lst[0].p1, 'v2')
            assert.equal(lst[1].p1, 'v3')
          }))
        })
      })
    })
  })

  return script
}

function sqltest (settings) {
  var si = settings.seneca
  var script = settings.script || lab.script()

  var describe = script.describe
  var before = script.before
  var it = script.it

  var Product = si.make('product')
  describe('Sql support', function () {
    before(function before (done) {
      before(clearDb(si))
      before(createEntities, 'product', [
        { name: 'apple', price: 100 },
        { name: 'pear', price: 200 }
      ])
    })

    it('should accept a string query', function (done) {
      Product.list$({ native$: 'SELECT * FROM product ORDER BY price' }, verify(done, function (list) {
        assert.lengthOf(list, 2)

        assert.equal(list[0].entity$, '-/-/product')
        assert.equal(list[0].name, 'apple')
        assert.equal(list[0].price, 100)

        assert.equal(list[1].entity$, '-/-/product')
        assert.equal(list[1].name, 'pear')
        assert.equal(list[1].price, 200)
      }))
    })

    it('should accept and array with query and parameters', function (done) {
      Product.list$({ native$: [ 'SELECT * FROM product WHERE price >= ? AND price <= ?', 0, 1000 ] }, verify(done, function (list) {
        assert.lengthOf(list, 2)

        assert.equal(list[0].entity$, '-/-/product')
        assert.equal(list[0].name, 'apple')
        assert.equal(list[0].price, 100)

        assert.equal(list[1].entity$, '-/-/product')
        assert.equal(list[1].name, 'pear')
        assert.equal(list[1].price, 200)
      }))
    })
  })

  return script
}

module.exports = {
  basictest: basictest,
  sorttest: sorttest,
  limitstest: limitstest,
  sqltest: sqltest,
  apiv2: require('./lib/store-test-v2'),
  verify: verify
}
