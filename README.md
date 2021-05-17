![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# seneca-store-test
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Dependency Status][david-badge]][david-url]
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Gitter chat][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

## Description

This module provides a standard set of tests for Seneca data stores.

It is used to verify that a store meets the minimum requirements needed for the Seneca data message patterns.
See the [Seneca Data Entities](http://senecajs.org/tutorials/understanding-data-entities.html) article for more information.

This module is included as a development dependency by Seneca data store plugins.
For a simple example, see the [seneca-mem-store](https://github.com/senecajs/seneca-mem-store/blob/master/test/mem.test.js) plugin test cases.

- __License__: [MIT][]

If you're using this module, and need help, you can:

- Post a [github issue](https://github.com/senecajs/seneca-store-test/issues)
- Tweet to [@senecajs](http://twitter.com/senecajs)
- Ask on the [Gitter][gitter-url]

*seneca-store-test*'s source can be read in an annotated fashion by,
- running `npm run annotate`

The annotated source can be found locally at [./doc/store-test.html](./doc/store-test.html).

### Seneca compatibility

Supports Seneca versions **1.x** - **3.x**

## Install

```sh
npm install seneca-store-test
```

## Contributing
The [Senecajs org][] encourage open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## Before you test

### Passing the test for race conditions
Chances are, in order to pass the test for race conditions, you need to create  
a unique index on the users.email column/field, - whether you are testing  
a plugin meant for a SQL or a NoSQL database/store.  

That's due to the way how upserts are normally implemented in databases.  

For example, in case of MongoDb, in order for the database to be able to avert  
race conditions, a field you upsert on must have a unique index created on it.  
Without the index, your upserts will not be atomic, and as a result your plugin  
will fail the race condition tests.  

It is a case of a leaky abstraction that test suites of client store plugins  
must "know" what collection and what field is being used in a race condition  
test in seneca-store-test. We may want to come up with a better alternative  
in the future.  

## Test

```sh
npm run test
```

## License

Copyright (c) 2013-2018, Richard Rodger and other contributors.
Licensed under [MIT][].

[npm-badge]: https://img.shields.io/npm/v/seneca-store-test.svg
[npm-url]: https://npmjs.com/package/seneca-store-test
[travis-badge]: https://travis-ci.org/senecajs/seneca-store-test.svg?branch=master
[travis-url]: https://travis-ci.org/senecajs/seneca-store-test
[david-badge]: https://david-dm.org/senecajs/seneca-store-test.svg
[david-url]: https://david-dm.org/senecajs/seneca-store-test
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard
[MIT]: ./LICENSE
[seneca-github]: https://github.com/senecajs/seneca
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[Coveralls]: https://coveralls.io/github/senecajs/seneca-store-test?branch=master
[BadgeCoveralls]: https://coveralls.io/repos/github/senecajs/seneca-store-test/badge.svg?branch=master
