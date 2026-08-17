![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] plugin

# @seneca/store-test

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca-store-test
```

## Quick Example

```js
var StoreTest = require('seneca-store-test')
StoreTest.basictest(seneca, {})
```

## More Examples

See [test/](test/) for usage examples.

## Motivation

Standard test suite for Seneca data store plugins.

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]

## API

See [source](https://github.com/senecajs/seneca-store-test) for available test suites.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests

```sh
npm run test
```

## Background

Used by all official Seneca store plugins to verify compliance.

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Build](https://github.com/senecajs/seneca-store-test/workflows/build/badge.svg)](https://github.com/senecajs/seneca-store-test/actions?query=workflow%3Abuild)
[![Dependency Status][david-badge]][david-url]
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Maintainability](https://api.codeclimate.com/v1/badges/27eadf997922c38f4618/maintainability)](https://codeclimate.com/github/senecajs/seneca-store-test/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/17224/branches/388397/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=17224&bid=388397)
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
