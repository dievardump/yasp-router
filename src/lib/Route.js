import { writable } from 'svelte/store';
import { parser, parser_to_end } from '../utils';

export default class Route {
  constructor(id, path, exact, is, group) {
    this.id = id;
    this.path = path;
    this.exact = exact;
    this.is = is;
    this.group = group;
    this.match = false;

    this.useHash = path[0] == '#';
    this.parser = parser(path);
    this.parser_to_end = parser_to_end(path);

    let store_data = {
      match: this.match,
    };

    // set a readable store for the Route components to see
    let { subscribe, update } = writable(store_data);

    this.updateStore = update;
    this.store = { subscribe };
  }

  /**
   * Tells if this route matches the given path
   *
   * specify if current path is an exact match
   * also returns params if there are
   */
  test(path) {
    // force trailing slash, as it is forced on all routes and links paths
    if (path === '#') {
      path = '#/';
    }

    // if the route match
    const match = this.parser(path);
    if (match) {
      // if the route is the exact route for given url
      const is_exact = !!this.parser_to_end(path);
      // if the route should only be shown when it's the exact one
      if (!this.exact || is_exact) {
        return {
          is_matching: true,
          is_exact: is_exact,
          params: match.params,
          path: match.path,
        };
      }
    }

    return { is_matching: false };
  }

  /**
   * Update current route match property
   * And the store associated to the route
   * so Route component can update
   */
  updateMatch(match) {
    this.match = match;
    this.updateStore((store_data) => {
      return {
        ...store_data,
        match,
      };
    });
  }
}
