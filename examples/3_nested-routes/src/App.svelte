<script>
  import { Router, Route, Link } from "yasp-router";
  import Home from "../../components/Home.svelte";
  import About from "../../components/About.svelte";
  import Contact from "../../components/Contact.svelte";
</script>

<a class="back" href="/">&lt; Back to examples</a>
<ul class="menu">
  <li>
    <Link to="/">Home</Link>
  </li>
  <li>
    <Link to="landing">Landing</Link>
  </li>
  <li>
    <Link to="about">About</Link>
  </li>
  <li>
    <Link to="contact">Contact</Link>
  </li>
</ul>

<p class="description">Routes can be nested without problems.</p>
<main>
  <section class="content">
    <!--
      exact means "only the / path"
      else will match all routes as all routes start with a /
    -->
    <Route path="/" exact={true} component={Home} />
    <Route path="/landing" let:match>
      <h1>Landing page</h1>
      <Link to="/landing/article-1">Article 1</Link>
      <Link to="/landing/article-2">Article 2</Link>
      <div style="margin-top: 10px;">
        <Route path="/landing/article-1">Content article 1</Route>
        <Route path="/landing/article-2">Content article 2</Route>
      </div>
    </Route>
    <Route path="about" component={About} />
    <Route path="contact" component={Contact} />
  </section>
  <aside>
    <Route path="/landing">
      <h1>Landing aside</h1>
      <div>
        <Route path="/landing/article-1">Similar content article 1</Route>
        <Route path="/landing/article-2">Similar content article 2</Route>
      </div>
    </Route>
    <!-- content can also be aded directly as Route child -->
    <Route path="about">
      <h3>About</h3>
      <p>about aside</p>
    </Route>
    <Route path="contact">
      <h3>Contact</h3>
      <p>contact aside</p>
    </Route>
  </aside>
</main>
