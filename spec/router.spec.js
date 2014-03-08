/*global describe, it */
var expect = require('expect.js'),
  router = require('../');

describe('router()', function() {
  it('returns a function', function() {
    expect(router()).to.be.a('function');
  });
  it('has a method "addRoute"', function() {
    expect(router().addRoute).to.be.a('function');
  });
  it('chains addRoute calls', function() {
    var routes = router();
    expect(routes.addRoute('/foo', {})).to.equal(routes);
  });
  it('has a method "addRoutes"', function() {
    expect(router().addRoutes).to.be.a('function');
  });
});

describe('addRoutes({path: view})', function() {
  it('calls addRoute for each key/value pair', function() {
    var routes = router();
    var routeMap = {
      '/': function a() {},
      '/foo': function b() {},
      '/bar/qux': function c() {}
    };
    var pairs = {};
    routes.addRoute = function(path, view) {
      expect(routeMap).to.have.property(path, view);
      pairs[path] = view;
    };
    routes.addRoutes(routeMap);
    expect(routeMap).to.eql(pairs);
  });
});

describe('addRoutes([[path, view]])', function() {
  it('calls addRoute for each pair in sequence', function() {
    var routes = router();
    var routeList = [
      ['/', function a() {}],
      ['/foo', function b() {}],
      ['/bar/qux', function c() {}]
    ];
    var pairs = [];
    routes.addRoute = function(path, view) {
      expect(routeList.length).to.be.greaterThan(pairs.length);
      expect(routeList[pairs.length]).to.eql([path, view]);
      pairs.push([path, view]);
    };
    routes.addRoutes(routeList);
    expect(routeList).to.eql(pairs);
  });
});

describe('request as string', function() {
  it('treats the string as URL', function(done) {
    var routes = router(),
      res = {},
      callback = function(url, data) {
        expect(url).to.equal('/foo');
        expect(data).to.equal(res);
        done();
      };
    routes.addRoute('/foo', callback);
    routes('/foo', res);
  });
});

describe('called without response object', function() {
  it('passes the failure callback correctly', function(done) {
    var routes = router(),
      callback = function(err) {
        expect(err).to.be.an(Error);
        done();
      };
    routes({url: '404'}, callback);
  });
});

describe('route with no match', function() {
  it('calls the failure callback', function(done) {
    var routes = router(),
      callback = function() {
        done();
      };
    routes({url: 'http://localhost/does/not/exist'}, {}, callback);
  });
  it('throws a NotFound error', function(done) {
    var routes = router();
    expect(routes.bind(null, {url: 'http://localhost/does/not/exist'}, {}))
    .to.throwError(function(err) {
      expect(err.name).to.equal('NotFound');
      done();
    });
  });
});

describe('route with no match for method', function() {
  it('calls the failure callback', function(done) {
    var routes = router(),
      callback = function() {
        done();
      };
    routes.addRoute('/foo', {GET: function() {}});
    routes({url: 'http://localhost/foo', method: 'POST'}, {}, callback);
  });
  it('throws a MethodNotFound error', function(done) {
    var routes = router();
    routes.addRoute('/foo', {GET: function() {}});
    expect(routes.bind(null, {url: 'http://localhost/foo', method: 'POST'}, {}))
    .to.throwError(function(err) {
      expect(err.name).to.equal('MethodNotAllowed');
      expect(err.allowed).to.eql(['GET']);
      done();
    });
  });
});

describe('route with plain function', function() {
  it('calls the function', function(done) {
    var routes = router(),
      req0 = {url: 'http://localhost/foo/bar'},
      res0 = {};
    routes.addRoute('/foo/bar', function(req, res, opts, cb) {
      expect(req).to.equal(req0);
      expect(res).to.equal(res0);
      expect(opts).to.eql({params: {}, splats: []});
      expect(cb).to.equal(undefined);
      done();
    });
    routes(req0, res0);
  });
  it('normalizes the path', function(done) {
    var routes = router();
    routes.addRoute('/foo/bar', function() {
      done();
    });
    routes({url: 'http://localhost//foo/bar'});
  });
  it('passes along the failure callback', function(done) {
    var routes = router(),
      callback = function() {};
    routes.addRoute('/foo/bar', function(req, res, opts, cb) {
      expect(cb).to.equal(callback);
      done();
    });
    routes({url: 'http://localhost/foo/bar'}, {}, callback);
  });
  it('calls the failure callback when it throws', function(done) {
    var routes = router(),
      callback = function(err) {
        expect(err.message).to.equal('Hello');
        done();
      };
    routes.addRoute('/foo/bar', function() {
      throw new Error('Hello');
    });
    routes({url: 'http://localhost/foo/bar'}, {}, callback);
  });
});

describe('route with methods object', function() {
  it('calls the function for the method', function(done) {
    var routes = router();
    routes.addRoute('/foo/bar', {
      POST: function() {throw new Error('Failed');},
      GET: function() {done();}
    });
    routes({url: 'http://localhost/foo/bar', method: 'GET'}, {});
  });
});

describe('route with sub-routes', function() {
  it('resolves sub-routes', function(done) {
    var routes = router(),
      child = router(),
      req0 = {url: '/foo/bar'},
      res0 = {},
      callback = function() {};
    routes.addRoute('/foo/', child);
    child.addRoute('/bar', function(req, res, opts, cb) {
      expect(req).to.equal(req0);
      expect(res).to.equal(res0);
      expect(opts).to.eql({
        params: {},
        splats: []
      });
      expect(cb).to.equal(callback);
      done();
    });
    routes(req0, res0, callback);
  });
  it('resolves root sub-routes', function(done) {
    var routes = router(),
      child = router(),
      req0 = {url: '/foo/'},
      res0 = {},
      callback = function() {};
    routes.addRoute('/foo/', child);
    child.addRoute('/', function(req, res, opts, cb) {
      expect(req).to.equal(req0);
      expect(res).to.equal(res0);
      expect(opts).to.eql({
        params: {},
        splats: []
      });
      expect(cb).to.equal(callback);
      done();
    });
    routes(req0, res0, callback);
  });
  it('resolves duplicate params', function(done) {
    var routes = router(),
      child = router(),
      req0 = {url: '/foo/bar'},
      res0 = {};
    routes.addRoute('/:qux/', child);
    child.addRoute('/:qux', function(req, res, opts) {
      expect(opts).to.eql({
        params: {qux: 'bar'},
        splats: []
      });
      done();
    });
    routes(req0, res0);
  });
  it('merges params', function(done) {
    var routes = router(),
      child = router(),
      req0 = {url: '/foo/bar'},
      res0 = {};
    routes.addRoute('/:qux/', child);
    child.addRoute('/:baz', function(req, res, opts) {
      expect(opts).to.eql({
        params: {qux: 'foo', baz: 'bar'},
        splats: []
      });
      done();
    });
    routes(req0, res0);
  });
  it('merges splats', function(done) {
    var routes = router(),
      child = router(),
      req0 = {url: '/foo/bar'},
      res0 = {};
    routes.addRoute('/*/', child);
    child.addRoute('/*', function(req, res, opts) {
      expect(opts).to.eql({
        params: {},
        splats: ['foo', 'bar']
      });
      done();
    });
    routes(req0, res0);
  });
});
