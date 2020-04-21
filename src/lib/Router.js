import Group from './Group';
import Route from './Route';

export default class Router {
  constructor(basename, locationInfos) {
    this.basename = basename;
    this.locationInfos = locationInfos;

    this.groups = {};
    this.routes = [];

    this.routes_id = 0;
    this.groups_id = 0;
    this.waiting_for_tick = false;
  }

  /**
   * Pass through all the routes
   * and update them according of their match to the current location path
   */
  change(locationInfos = null) {
    // update locationInfos if provided
    if (locationInfos) {
      this.locationInfos = locationInfos;
    }

    // go throug all routes
    // update match for the one that have a change
    const routes = this.routes;
    for (let i = 0; i < routes.length; i++) {
      if (!routes[i].group) {
        this.testRoute(routes[i]);
      }
    }

    const groups = this.groups;
    Object.keys(groups).forEach((group_name) =>
      this.testGroup(groups[group_name])
    );
  }

  /**
   * Register a new Route in the router
   */
  registerRoute(path, exact, is, routeGroup = null) {
    const routes = this.routes;

    const id = 'route_' + this.routes_id++;

    if (path[0] !== '#') {
      path = (this.basename + path).replace('//', '/');
    }

    const route = new Route(id, path, exact, is, routeGroup);
    routes.push(route);

    if (routeGroup) {
      const groups = this.groups;
      if (!groups[routeGroup.name]) {
        this.registerGroup(routeGroup.name);
      }

      const group = groups[routeGroup.name];
      group.registerRoute(route);

      //trigger group matching process
      this.testGroup(group);
    } else {
      // triggers the route matching process
      this.testRoute(route);
    }

    return route;
  }

  /**
   * Unregister a route from the Router
   */
  unregisterRoute(route) {
    // remove route from routes
    const routes = this.routes;
    const index = routes.indexOf(route);
    if (index !== -1) {
      routes.splice(index, 1);
    }

    // if grouped route, remove from it
    if (route.group && groups[route.group]) {
      const groups = this.groups;
      groups[route.group].unregisterRoute(route);
      // redo group matching if not empty
      if (groups.routes.length !== 0) {
        this.testGroup(groups[route.group]);
      } else {
        // else unregister group
        unregisterGroup(route.group);
      }
    }
  }

  /**
   * Register a Group in the Router
   */
  registerGroup(group_name) {
    const groups = this.groups;
    if (!groups[group_name]) {
      groups[group_name] = new Group(group_name);
    }

    return groups[group_name];
  }

  /**
   * Unregister a Group from the router
   */
  unregisterGroup(group_name) {
    const groups = this.groups;
    delete groups[group_name];
  }

  /**
   * Test a route against current location
   *
   * returns the corresponding match object
   */
  getRouteMatch(route) {
    let current_path = this.locationInfos.pathname;
    if (route.useHash) {
      current_path = this.locationInfos.hash;
    }

    const route_match = route.test(current_path);
    return route_match;
  }

  /**
   * Test a route and update its matching state
   */
  testRoute(route) {
    const route_match = this.getRouteMatch(route);

    if (route_match && route_match.is_matching) {
      // if the route was not already matching
      // or the part of the path that match is not the same (else if makes no sens to update the route)
      if (!route.match || route_match.path !== route.match.path) {
        let match = {
          is_matching: route_match.is_matching,
          is_exact: route_match.is_exact || false,
          params: route_match.params || null,
          path: route_match.path || null,
          location: { ...this.locationInfos },
        };

        route.updateMatch(match);
      }
    } else if (route.match) {
      // else if route was currently matching, set to false
      route.updateMatch(false);
    }
  }

  /**
   * Test routes from a Group
   * if one matches, show this one
   * if none match, and there is a fallback, show this one
   * all others are hidden
   */
  testGroup(group) {
    const routes = group.routes;

    let fallback = null;
    let is_fallback = false;
    // go through group routes
    // if there is one or more matches, select the first one
    const match = { id: null };
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const route_match = this.getRouteMatch(route);
      if (route_match.is_matching) {
        match.id = route.id;
        match.route_match = route_match;
        break;
      }

      // save the fallback route
      if (!fallback && route.group.fallback) {
        fallback = route;
      }
    }

    // If no route matches, but the group is set to fallback to last route
    if (null === match.id && fallback) {
      match.id = fallback.id;
      match.route_match = { is_matching: false };
      is_fallback = true;
    }

    // go again through all group routes and select the right one - if there is one -
    // deactivate the one that might have been selected
    routes.forEach((route) => {
      if (route.id === match.id) {
        const route_match = match.route_match;
        // if the route was not already matching
        // or the part of the path that match is not the same (else if makes no sens to update the route)
        if (!route.match || route_match.path !== route.match.path) {
          route.updateMatch({
            is_matching: route_match.is_matching,
            is_exact: route_match.is_exact || false,
            path: route_match.path || null,
            params: route_match.params || null,
            location: { ...this.locationInfos },
            is_fallback,
          });
        }
      } else if (route.match) {
        route.updateMatch(false);
      }
    });
  }
}
