import { setContext, getContext, onDestroy } from 'svelte';
import { getLocationInfos, guessBasename, compiler } from './utils';
import Router from './lib/Router';
import Link from './lib/Link';

// CONTEXT_KEY used for contexts
const CONTEXT_KEY = {};

// list of all active routerstick
const routers = [];

// list of all links
const links = [];

// named routes liste
const namedRoutes = [];

// save locationInfos
let locationInfos = getLocationInfos();

// default basename for routers
let defaultBasename = guessBasename();

let forceHash = window.location.origin === 'null';

let defaultRouter = null;

function configure(options) {
  if (undefined !== options.useHash) {
    forceHash = options.useHash;
  }

  if (undefined !== options.basename) {
    defaultBasename = options.basename;
  }
}

/**
 * Used on window location change (goTo or popstate)
 */
function onStateChanged() {
  // location changed
  locationInfos = getLocationInfos();

  // location changed
  // triggers route matching process on all routers
  updateRouters();

  // go through all Link stores, and update with the new path
  updateLinks();
}
/**
 * Go through all known routers
 * and call the change method
 */
function updateRouters() {
  routers.forEach((router) => router.change(locationInfos));
}

// Returns Router for current Route or Group
function getCurrentRouter() {
  const context = getContext(CONTEXT_KEY);
  if (context) {
    return context.router;
  }

  return getDefaultRouter();
}

function getDefaultRouter() {
  if (!defaultRouter) {
    defaultRouter = registerRouter(defaultBasename, false);
  }

  return defaultRouter;
}

// goes to given path
function goToPath(path, params = {}, options = {}) {
  goTo(compiler(path)(params), options);
}

// change browser location to href
function goTo(href, options = {}) {
  if (history && !options.reload) {
    // else check if we can play with history
    if (options.replaceState) {
      history.replaceState({ page: href }, '', href);
    } else {
      history.pushState({ page: href }, '', href);
    }

    if (options.scrollToTop) {
      window.scrollTo(0, 0);
    }

    onStateChanged();
  } else {
    // else go to page the hard way
    location.href = href;
  }
}

// register a new Router
function registerRouter(basename, set_context = true) {
  const router = new Router(basename || defaultBasename, locationInfos);
  routers.push(router);

  // do not set context for default router
  if (set_context) {
    setContext(CONTEXT_KEY, {
      router,
    });
  }

  if (routers.length === 1) {
    window.addEventListener('popstate', onStateChanged);
  }

  onDestroy(() => {
    unregisterRouter(router);
  });

  return router;
}

// unregister a Router
function unregisterRouter(router) {
  const index = routers.indexOf(router);
  if (index !== -1) {
    routers.splice(index, 1);
  }

  if (routers.length === 0) {
    window.removeEventListener('popstate', onStateChanged);
  }
}

// register a new Route
function registerRoute(path, exact, is, routeGroup) {
  const router = getCurrentRouter();

  // force non empty path
  if (path === '') {
    path = '/';
  }

  // force # is hash env
  if (forceHash && path[0] !== '#') {
    path = '#' + path;
  }

  // force trailing /
  if (path[path.length - 1] !== '/') {
    path = path + '/';
  }

  const route = router.registerRoute(path, exact, is, routeGroup);

  if (is) {
    const namedRoute = namedRoutes[is] || { route: null, links: [] };
    if (namedRoute.route) {
      throw new Error(
        `Route name [${is}] already associated with another route with path [${namedRoutes[is].route.path}]`
      );
    }

    namedRoute.route = route;
    namedRoute.links.forEach((link) => link.setTo(route.path).update());
    namedRoutes[is] = namedRoute;
  }

  // unregister the route from the router when component is destroyed
  onDestroy(() => {
    router.unregisterRoute(route);
    if (is) {
      namedRoutes[is].route = null;
      namedRoutes[is].links.forEach((link) => link.setTo('/').update());
    }
  });

  return route.store;
}

// register a link
function registerLink(to, params, route) {
  const router = getCurrentRouter();
  let basename = router.basename || defaultBasename;

  // force non empty path
  if (to === '') {
    to = '/';
  }

  // force # is hash env
  if (forceHash && to[0] !== '#') {
    to = '#' + to;
  }

  // force trailing /
  if (to[to.length - 1] !== '/') {
    to = to + '/';
  }

  const link = new Link(to, params, basename, locationInfos);
  links.push(link);

  // add to namedRoutes
  if (route) {
    const namedRoute = namedRoutes[route] || { route: null, links: [] };
    namedRoute.links.push(link);
    if (namedRoute.route) {
      link.setTo(namedRoute.route.path);
    }

    namedRoutes[route] = namedRoute;
  }

  // unregister the link from the app when component is destroyed
  onDestroy(() => {
    // unregister the link when it is destroyed
    unregisterLink(link);
    // remove from namedRoutes
    if (route) {
      const index = namedRoutes[route].links.indexOf(link);
      if (index !== -1) {
        namedRoutes[route].links.splice(index, 1);
      }
    }
  });

  return link.store;
}

// unregister a link
function unregisterLink(link) {
  const index = links.indexOf(link);
  if (index !== -1) {
    links.splice(index, 1);
  }
}

// go through all links and updates according to the last known location
function updateLinks() {
  links.forEach((link) => link.updateLocation(locationInfos));
}

export {
  configure,
  registerRouter,
  registerRoute,
  registerLink,
  goToPath,
  goTo,
};
