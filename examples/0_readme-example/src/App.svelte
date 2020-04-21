<script>
  import { Router, Route, Link, configure, router } from "yasp-router";

  // console log every time the route stores changes
  $: console.log($router);
</script>

<style>
  main,
  .content {
    margin-top: 30px;
  }
</style>

<div>
  <a class="back" href="/">&lt; Back to examples</a>
</div>

<!-- Links can be defined outside a Router as they don't depend of it -->
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
