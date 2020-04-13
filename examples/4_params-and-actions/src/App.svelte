<script>
  import { Router, Route, Link } from "../../../src/index.js";
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
    <!--for dynamic parameters -->
    <Link to="page/:page_id" params={{ page_id: 1 }}>Page 1</Link>
  </li>
  <li>
    <Link to="page/2">Page 2</Link>
  </li>
  <li>
    <Link to="about">About</Link>
  </li>
  <li>
    <Link to="contact">Contact</Link>
  </li>
</ul>

<p class="description">
  Links and Routes can have dynamic paths with parameters : ('/page/:page_id', {'{ page_id: 1 }'})
  => /page/1.
  <br />
  This package uses
  <a href="https://www.npmjs.com/package/path-to-regexp" target="_blank">
    path-to-regex
  </a>
  under the hood.
</p>

<main>
  <section class="content">
    <!-- exact, else will match all routes-->
    <Route path="/" exact={true} component={Home} />
    <Route path="page/:page_id" let:match>
      <h1>Page {match.params.page_id}</h1>
      <Link action="back">Link Action: back</Link>
      <p>Page content: this is page {match.params.page_id}</p>
    </Route>
    <Route path="about" component={About} />
    <Route path="contact" component={Contact} />
  </section>

  <aside>
    <Route path="page/:page_id" let:match>
      <h1>Page {match.params.page_id}</h1>
      <p>Page aside: this is page {match.params.page_id}</p>
    </Route>
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
