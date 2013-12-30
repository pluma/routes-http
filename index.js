/*! routes-http 0.1.0 Copyright (c) 2013 Alan Plum. MIT licensed. @preserve */
var httperr = require('httperr');
var router = require('routes');
var domain = require('domain');
var parseUrl = require('url').parse;

module.exports = function() {
  var routes = router();

  handleRequest._router = routes;
  handleRequest.addRoute = function(path, fn) {
    if (fn.addRoute) {
      path += '*';
    }
    routes.addRoute(path, fn);
    return this;
  };

  return handleRequest;

  function handleRequest(req, res, opts, handleError) {
    if (typeof res === 'function') {
      handleError = res;
      res = undefined;
    }
    if (typeof opts === 'function') {
      handleError = opts;
      opts = undefined;
    }
    if (handleError) {
      var d = domain.create();
      d.on('error', handleError);
      d.run(function() {
        process.nextTick(runRoute); // meh?
      });
    } else {
      runRoute();
    }

    function runRoute() {
      var pathname;
      opts = opts || {};
      opts.params = opts.params || {};
      opts.splats = opts.splats || [];
      if (opts && opts.splats && opts.splats.length) {
        pathname = '/' + opts.splats.pop();
      } else if (typeof req === 'string') {
        pathname = req;
      } else {
        pathname = parseUrl(req.url).pathname;
      }
      var route = routes.match(pathname);
      if (!route) {
        throw httperr.notFound();
      }
      var view = route.fn;
      if (typeof view === 'object') {
        if (!view[req.method]) {
          throw httperr.methodNotAllowed({allowed: Object.keys(view)});
        }
        view = view[req.method];
      }
      route.splats = opts.splats.concat(route.splats);
      Object.keys(opts.params).forEach(function(key) {
        route.params[key] = route.params[key] || opts.params[key];
      });
      view.call(route, req, res, {
        params: route.params,
        splats: route.splats
      }, handleError);
    }
  }
};