import { pathToRegexp, compile } from 'path-to-regexp';
import queryString from 'query-string';

/**
 * routeParser
 * Inspired from https://github.com/pillarjs/path-match
 *
 * parse a pathname given a path (see https://www.npmjs.com/package/path-to-regexp)
 *
 * returns an object if the path matches, populated with the possible params
 */
function routeParser(options) {
  options = options || {};

  return function (path) {
    var keys = [];
    var re = pathToRegexp(path, keys, options);

    return function (pathname) {
      var m = re.exec(pathname);
      if (!m) return false;

      let params = {};

      var key, param;
      for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        param = m[i + 1];
        if (!param) continue;
        params[key.name] = decodeURIComponent(param);
        if (key.repeat)
          params[key.name] = params[key.name].split(key.delimiter);
      }

      return {
        path: m[0],
        params,
      };
    };
  };
}

/**
 * Return a function that will be able to compile an uri
 * given a path and an object of parameters
 *
 * See https://www.npmjs.com/package/path-to-regexp#compile-reverse-path-to-regexp
 * @param {String} path
 *
 * usage: compiler('/path/:param')({ param: 1}) // => '/path/1'
 */
function compiler(path) {
  return compile(path, { encode: encodeURIComponent });
}

const parser = routeParser({
  // path-to-regexp options
  sensitive: false,
  strict: false,
  end: false,
});

const parser_to_end = routeParser({
  // path-to-regexp options
  sensitive: false,
  strict: false,
  end: true,
});

/**
 * Get current location parts used by the Router
 * @param {Object} options
 */
function getLocationInfos() {
  // @TODO: change to make it SSR friendly?!
  const pathname = location.pathname;
  const hash = location.hash || '#'; // if hash === ''
  const search = location.search;
  const query = queryString.parse(location.search || '');

  return {
    pathname,
    hash,
    search,
    query,
  };
}

/**
 * Guess the BaseName to add before Links
 * Will look for a base
 * Else will use location.pathname
 */
function guessBasename() {
  try {
    const _base = document.querySelector('head base');
    if (_base) {
      return _base.href.replace(location.origin, '');
    }

    return location.pathname;
  } catch (e) {
    return '';
  }
}

export { parser, parser_to_end, compiler, getLocationInfos, guessBasename };
