# Yet Another Svelte Package: Router

Router for Svelte 3

## Features

- Nesting
- All matching routes render (and not only the first match)
- Routes using URI or Hash
- Grouped routes with fallback
- Default Router so you don't need a top-level Router
- Several Routers can be used at the same time
- Auto detection of basename and if path starts with a #
- Seemlessly forces hashtag use in env without location.origin
- Uses [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) for path matching, building and parameters matching
- Decodes location query string with [query-string](https://www.npmjs.com/package/query-string)

## Installing

> npm install --save-dev yasp-router

## Examples

### very quick example

```html
<script>
	import {Router, Route, Link} from 'yasp-router';
</script>

<style>
  main,
  .content {
    margin-top: 30px;
  }
</style>

<Link to="/">Home</Link>
<Link route="landing">Landing Page</Link>
<Link route="about">About</Link>
<main>
  <!-- exact=true else "/" matches all routes -->
  <Route path="/" exact={true}>Home Content</Route>
  <!--named route, link can point to it using route="landing" -->
  <Route path="/landing" is="landing" let:match>
    Landing Page
    <!-- just for info so you know what match contains -->
    <pre>match: {JSON.stringify(match)}</pre>
    <Link to="/landing/post-1">Post 1</Link>
    <Link to="/landing/post-2">Post 2</Link>
    <Route path="/landing/:slug" let:match>
      <div class="content">
        Content with slug "{match.params.slug}"
        <!-- just for info so you know what match contains -->
        <pre>match: {JSON.stringify(match)}</pre>
      </div>
    </Route>
  </Route>
  <!--named route, link can point to it using route="about" -->
  <Route path="/about" is="about">About Content</Route>
</main>

```

### Shipped with this package

The directory `examples` contains examples of different usage of this package. To list some :

- Simple Routing (URI or Hash)
- Route Nesting
- Routes with parameters
- Named routes
- ...

The best way to test those is to clone this repository and launch the examples directory's server that's in it

```
git clone git@gitlab.com:dievardump/yasp-router.git
cd yasp-router
npm install
cd examples
npm run dev
```

This should create a local server accessible to http://localhost:3333 (if you kept the default port)

## Components & methods

This package provides 3 Components and 3 methods to use

Components :

- Link
- Route
- Router

Methods:

- configure
- goTo
- goToPath

### `<Link ({to:string} or {route:string} or {action:string}) {params?:object} {navigateOptions?:object}>`

> Either {to} or {route} must be defined. At least one of them and ONLY one of them. After the component instantiation, those can't change, only {params} can

When a link is active, it will have two html properties (`aria-current="page"` and `data-active="active"`) that you can use to target this element for styling

#### Parameters

| Parameter         | Optional | Description                                                                                  | Default |
| ----------------- | -------- | -------------------------------------------------------------------------------------------- | ------- |
| `to`              |          | Path the link navigates to. (only if `route` is not defined)                                 |         |
| `route`           |          | Name of the route it navigates to. (only if `to` is not defined)                             |         |
| `action`          |          | Action to perform when the Link is clicked: `forward`, `back`, or `go` using params.go value |         |
| `params`          | optional | Parameters used to build the the path.                                                       | `false` |
| `navigateOptions` | optional | Options to use when changing location. See method `goTo` to see the options.                 | `false` |

> Any prop given to Link not part of the parameters listed here will be added to the anchor using `{...props}`.

#### How `{params}` is used

Link's path are build using `path-to-regexp` and therefore supports parameters.

```html
<Link path="/blog/:slug" params={{slug: 'post-1' }}>
```

will construct a link to `/blog/post-1`

### `<Route {path:string} {component?:Component} {exact?:boolean} {is?:string} {group?:string} {order?:number} {fallback?:boolean}>`

### Parameters

| Parameter   | Optional | Description                                                                   | Default |
| ----------- | -------- | ----------------------------------------------------------------------------- | ------- |
| `path`      |          | the path for this Route to match                                              |         |
| `component` | optional | The component to render if the Route matches.                                 |         |
| `exact`     | optional | if the path must be exactly matched                                           | `false` |
| `is`        | optional | name of the route that you can use to target this route path with `Link`      |         |
| `group`     | optional | Name of the group this route is in.                                           |         |
| `order`     | optional | Only if in a group. Order of the Route in its group. Used to sort the routes. |         |
| `fallback`  | optional | Only if in a group. Declare this route as group fallback if none matches in.  | `false` |

> Any prop given to Route not part of the parameters listed here will be added to to the `component` using `{...props}` (or to the slot using `{props}` and accessible with `let:props`).

> if several route in the same group are set as fallback, the first one met according to order will be rendered

#### Properties

Added to the remaining properties, Route will pass two objects: `routeInfos` and `match`

- `routeInfos` contains some of the property of this route that the component might wish to use.
  - `path`
  - `is`
  - `exact`
  - `group` if in a group
  - `fallback` if in a group
- `match` contains information about the current matching state.
  - `is_matching` if the route is matching or not. It can actually be `false`, if this route is shown because of fallback
  - `is_exact` if the match is exact
  - `path` the actual part of the path that was matched for this route to render
  - `params` if the match contains parameters
  - `location` window.location that triggered the match
  - `is_fallback` only if a grouped route, will be true if this route is shown only as fallback route

#### examples

```html
<Route path="/blog/:slug" component="{Blog}" {blogInfos} />
```

With the URL `/blog/post-1` is equivalent to :

```
<Blog
  routeInfos={{
    path: '/blog/:slug',
    exact: false,
    is: null
  }}

  match={{
      is_matching:true,
      is_exact: true,
      path: '/blog/post-1',
      params: { slug: 'post-1' },
      location: { pathname: '/blog/post-1', hash: '#', query: '' },
  }}

  {blogInfos} />
```

### `<Router {basename?:string}>`

Declares a `Router` context. Most of the time you won't have to use it, as Routes and Groups will be added to a default Router if none is declared.

You will use it if you need to have Routers with differents `basename`

#### Parameters

| Parameter  | Optional | Description                                                                                  | Default |
| ---------- | -------- | -------------------------------------------------------------------------------------------- | ------- |
| `basename` | optional | When Link and Routes are added to a router, their path will be prefixed with its `basename`. |         |

> If `basename` is not set, the Router will guess the basename using the `<base>` html tag, or if not here, `location.pathname` at the first page load

### `configure(options:object)`

Allow you to set default values for all routers.

- `options`
  - `forceHash` (default: false) - force links' and routes' paths to start with a `#` (add it automatically at the start of paths if not present)
  - `basename` - force the default basename used when creating a Router without `basename` property.

### `goTo(href:string, options?:object)`

Navigates to the given href and triggers the Routes matching process.

- `options`
  - `reload` if true uses `location.href` to set the new location
  - `replaceState` if true uses `history.replaceState` to change location
  - `scrollToTop` if true, calls `window.scrollTo(0, 0)` when changing location

### `goToPath(path:string, params?:object, options?:object)`

Construct a new href using path and params, then calls `goTo(href, options)`.

## Author

Simon Fremaux / dievardump (dievardump@gmail.com)
