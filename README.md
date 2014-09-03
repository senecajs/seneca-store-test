seneca-store-test - a [Seneca](http://senecajs.org) plugin
======================================================

## Seneca Store-Test Plugin

This module provides a standard set of tests for Seneca data stores. It is used to verify that a store meets the minimum requirements needed for the Seneca data message patterns. See the [Seneca Data Entities](http://senecajs.org/data-entities.html) article for more information.

[![Build Status](https://travis-ci.org/rjrodger/seneca-store-test.png?branch=master)](https://travis-ci.org/rjrodger/seneca-store-test)

[![NPM](https://nodei.co/npm/seneca-store-test.png)](https://nodei.co/npm/seneca-store-test/)
[![NPM](https://nodei.co/npm-dl/seneca-store-test.png)](https://nodei.co/npm-dl/seneca-store-test/)

For a gentle introduction to Seneca itself, see the
[senecajs.org](http://senecajs.org) site.

If you're using this plugin module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.2.2

Tested on: Seneca 0.5.19, Node 0.10.29


### Usage

This module is included as a development dependency by Seneca data store plugins. For a simple example, see the [seneca-mem-store](https://github.com/rjrodger/seneca-mem-store) plugin test cases.


## Testing

This module itself does not contain any direct reference to Seneca, as
it is a Seneca store plugin dependency. However, Seneca is needed to test it, so
the test script will perform an _npm install seneca_ (if needed). This is not
saved to _package.json_.

```sh
npm test
```
