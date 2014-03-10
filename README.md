# Synopsis

**routes-http** is a simple HTTP request router for node.js based on [routes](https://github.com/aaronblohowiak/routes.js).

[![stability 2 - unstable](http://b.repl.ca/v1/stability-2_--_unstable-yellow.png)
](http://nodejs.org/api/documentation.html#documentation_stability_index) [![license - Unlicense](http://b.repl.ca/v1/license-Unlicense-lightgrey.png)](http://unlicense.org/) [![Flattr this](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=pluma&url=https://github.com/pluma/routes-http)

[![Build Status](https://travis-ci.org/pluma/routes-http.png?branch=master)](https://travis-ci.org/pluma/routes-http) [![Coverage Status](https://coveralls.io/repos/pluma/routes-http/badge.png?branch=master)](https://coveralls.io/r/pluma/routes-http?branch=master) [![Dependencies](https://david-dm.org/pluma/routes-http.png?theme=shields.io)](https://david-dm.org/pluma/routes-http)

[![NPM status](https://nodei.co/npm/routes-http.png?compact=true)](https://npmjs.org/package/routes-http)

# Features

## Simple but powerful

*routes-http* is just a thin wrapper around *routes*. This means if you've used *routes* or routes-based routers before, you can start using *routes-http* right away:

```javascript
var routes = require('routes-http')();
routes.addRoute('/foo/:arg/*', function(req, res, opts) {
    console.log(opts);
});
// … more code …
req.url = '/foo/bar/qux/baz';
routes(req, res);
/*
{
    params: {arg: 'bar'},
    splats: ['qux/baz']
}
*/
```

## Chaining API

You can create a router and add all your routes in a single line. No more repeating yourself! The following is perfectly valid:

```javascript
var routes = require('routes-http')()
    .addRoute('/foo', function(req, res) {/* … */})
    .addRoute('/bar', function(req, res) {/* … */})
    .addRoute('/qux', function(req, res) {/* … */});
// … more code …
routes(req, res);
```

Or simply:

```javascript
var routes = require('routes-http')().addRoutes({
    '/foo': function(req, res) {/* … */},
    '/bar': function(req, res) {/* … */},
    '/qux': function(req, res) {/* … */}
});
```

## Semantic error-handling

*routes-http* uses [httperr](https://github.com/pluma/httperr) for its own errors and allows you to provide an error handler that will be used for all errors, including matching errors:

```javascript
var routes = require('routes-http')();
routes.addRoute('/foo', function(req, res) {/* … */});
// … more code …
req.url = 'http://localhost/foo';
routes(req, res, function(err) {
    console.error(err);
});
/*
{ [NotFound]
    title: 'Not Found',
    name: 'NotFound',
    code: 'NOT_FOUND',
    statusCode: 404
}
*/
```

## Pain-free nesting

Want to use a separate router for each namespace of your app? No problem. Nesting routes is as simple as defining normal routes. They don't even need to know about each other or that they are nested in order to work:

```javascript
var router = require('routes-http'),
    routes = router(),
    childRoutes = router();

routes.addRoute('/hello/', childRoutes); // Always use a trailing slash!
childRoutes.addRoute('/world', function(req, res) {
    res.end('Hello from /hello/world !');
});
```

## HTTP method dispatching

Want to have different views for each HTTP method? Just specify an object instead of a function:

```javascript
var routes = require('routes-http')();
routes.addRoute('/foo', {
    GET: function(req, res) {res.end('You used GET');},
    POST: function(req, res) {res.end('You used POST')}
});

/* … more code … */

routes(req, res, function(err) {
    if (err.statusCode === 405) {
        res.writeHead(err.statusCode, err.title, {'Allow': err.allowed.join(', ')});
        res.write('You used ' + req.method + '\n');
        res.write('Allowed methods: ' + err.allowed.join(', ') + '\n');
    } else {
        res.writeHead(err.statusCode, err.title);
    }
    res.end(err.statusCode + ' ' + err.title);
});
```

```sh
$ curl http://localhost:8000/foo
You used GET
$ curl -X POST http://localhost:8000/foo
You used POST
$ curl -X DELETE http://localhost:8000/foo
You used DELETE
Allowed methods: GET, POST
405 Method Not Allowed
```

## Minimalistic requirements

Want to use the router without passing in request and response objects? You can do that.

```javascript
var routes = require('routes-http')();
routes.addRoute('/foo', function() {/* … */});
routes({url: 'http://localhost/foo'}); // Works!
routes('/foo'); // Also works!
```

```javascript
var routes = require('routes-http')();
routes.addRoute('/foo', function(url, data) {/* … */});
routes('/foo', {proprietary: 'data-structure'}); // Works!
```

# Basic Usage Example

```javascript
var router = require('routes-http'),
    http = require('http'),
    routes = router();

routes.addRoute('/hello/world', function(req, res) {
    res.end('Hello world!');
});
routes.addRoute('/throws', function(req, res) {
    throw new Error();
});

http.createServer(function(req, res) {
    routes(req, res, function(err) {
        if (err.statusCode && err.title) {
            res.writeHead(err.statusCode, err.title);
            res.end(err.statusCode + ' ' + err.title);
        } else {
            res.writeHead(500, 'Internal Server Error');
            res.end('An error occurred');
        }
    });
}).listen(8000);
```

```sh
$ curl http://localhost:8000/hello/world
Hello World!
$ curl http://localhost:8000/does/not/exist
404 Not Found
$ curl Http://localhost:8000/throws
An error occurred
```

# Install

## With NPM

```sh
npm install routes-http
```

## From source

```sh
git clone https://github.com/pluma/routes-http.git
cd routes-http
npm install
make test
```

# API

## routes(req, [res], [handleError:Function])

Resolves the given request and invokes the matching view if possible.

If the route can not be resolved, a `404 Not Found` error will be raised.

If a `handleError` function is passed, the function will be called with the `Error` object if an error is thrown by the view or the route resolution fails.

The matched view will be invoked with the following arguments:

### req

The original request.

### res

The original response.

### opts

An object with two properties:

#### opts.params

An object containing the matched route params. For child routes, the object will contain params matched by their parent routes as well, but child routes will take precedence over parent routes when params are named identically.

Example:

```javascript
childRoutes.addRoute('/:foo', function(req, res, opts) {/* … */});
routes.addRoute('/:foo/', childRoutes);
routes({url: '/qux/bar'}); // opts.params = {'foo': 'bar'}
```

#### opts.splats

An array containing the matched route splats. For child routes, the array will contain splats matched by their parent routes as well, with child routes' splats appearing at the end of the array.

Example:

```javascript
childRoutes.addRoute('/*', function(req, res, opts) {/* … */});
routes.addRoute('/*/foo/', childRoutes);
routes({url: '/qux/foo/bar'}); // opts.splats = ['qux', 'bar']
```

## routes.addRoutes({path: view})

Invokes `routes.addRoute` for each key/value pair.

Note that because JavaScript object key order can not be guaranteed this is not recommended if you have paths that depend on the resolution order.

Example:

The following may produce inconsistent results:

```javascript
routes.addRoutes({
    '/:foo/': function(req, res, opts) {/* … */},
    '/:bar/': function(req, res, opts) {/* … */}
});
```

## routes.addRoutes([[path:String, view]])

Invokes `routes.addRoute` for each pair of `path` and `view` in the given array.

## routes.addRoute(path:String, view:Function)

Adds a route with the given path. The route will resolve to the given function, invoking it when the route is matched.

## routes.addRoute(path:String, view:Object)

Adds a route with the given path. The object is expected to have methods named after the HTTP methods supported by the view that will be invoked when the route is matched with the respective HTTP method.

If the route is resolved, but the view object has no matching property for the request's HTTP method, a `405 Method Not Allowed` error will be raised with an array containing the names of the supported HTTP methods as its `allowed` property.

Example:

```javascript
routes.addRoute('/foo/bar', {
    GET: function(req, res) { // Always use uppercase!
        res.end('You have sent a GET request.');
    },
    POST: function(req, res) {
        res.end('You have sent a POST request');
    }
});
```

## routes.addRoute(path:String, view:routes)

Adds a route with the given path prefix. When the route is matched, the prefix will be replaced by a slash and the resulting URL will be passed to the given routes function.

Example:

```javascript
childRoutes.addRoute('/bar', function(req, res) {
    res.end('You have accessed /foo/bar !');
});
childRoutes.addRoute('/', function(req, res) {
    res.end('You have accessed /foo/ !');
});
routes.addRoute('/foo/', childRoutes); // Always use a trailing slash!
```

# Unlicense

This is free and unencumbered public domain software. For more information, see http://unlicense.org/ or the accompanying [UNLICENSE](https://github.com/pluma/routes-http/blob/master/UNLICENSE) file.
