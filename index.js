/*! routes-http 0.5.0 Original author Alan Plum <me@pluma.io>. Released into the Public Domain under the UNLICENSE. @preserve */
var httperr = require('httperr');
var router = require('routes');
var parseUrl = require('url').parse;
var normalize = require('path').normalize;

module.exports = function() {
  var routes = router();

  handleRequest._router = routes;
  handleRequest.addRoute = function(path, fn) {
    if (fn.addRoute) {
      routes.addRoute(path, function(req, res, opts, handleError) {
        if (typeof opts === 'function') {
          handleError = opts;
          opts = undefined;
        }
        opts = opts || {};
        opts.splats = opts.splats || [];
        opts.splats.unshift('/');
        return fn(req, res, opts, handleError);
      });
      path += '*';
    }
    routes.addRoute(path, fn);
    return this;
  };

  handleRequest.addRoutes = function(routeMap) {
    if (Array.isArray(routeMap)) {
      routeMap.forEach(function(pair) {
        this.addRoute.apply(this, pair);
      }.bind(this));
    } else {
      Object.keys(routeMap).forEach(function(path) {
        this.addRoute(path, routeMap[path]);
      }.bind(this));
    }
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
      try {
        runRoute();
      } catch(err) {
        handleError(err);
      }
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
      var route = routes.match(normalize(pathname));
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
