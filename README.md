![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# seneca-store-test
[![Build Status][travis-badge]][travis-url]
[![Gitter chat][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

This module provides a standard set of tests for Seneca data stores. It is used to verify that a store meets the minimum requirements needed for the Seneca data message patterns. 
See the [Seneca Data Entities](http://senecajs.org/tutorials/understanding-data-entities.html) article for more information.

This module is included as a development dependency by Seneca data store plugins. For a simple example, see the [seneca-mem-store](https://github.com/senecajs/seneca-mem-store) plugin test cases.

- __Version__: 1.0.0
- __Tested on__: [Seneca][seneca-github] 0.7
- __Node__: 0.10, 0.12, 4
- __License__: [MIT][]

If you're using this module, and need help, you can:

- Post a [github issue](https://github.com/rjrodger/seneca-store-test/issues)
- Tweet to [@senecajs](http://twitter.com/senecajs)
- Ask on the [Gitter][gitter-url]

seneca-store-test's source can be read in an annotated fashion by,
- running `npm run annotate`
- viewing [online](http://rjrodger.github.io/seneca-store-test/doc/store-test.html)

The annotated source can be found locally at [./doc/store-test.html]().

## Install

```sh
npm install seneca-store-test
```

## Test

```sh
npm run test
```

## License
Copyright Richard Rodger and other contributors 2015, Licensed under [MIT][].

[travis-badge]: https://travis-ci.org/rjrodger/seneca-store-test.svg?branch=master
[travis-url]: https://travis-ci.org/rjrodger/seneca-store-test
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard
[MIT]: ./LICENSE
[seneca-github]: https://github.com/senecajs/seneca
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca