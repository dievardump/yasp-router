<script>
  import { Router, Route, Link } from "../../../src/index.js";
  import Home from "../../components/Home.svelte";
  import About from "../../components/About.svelte";
  import Contact from "../../components/Contact.svelte";
</script>

<a class="back" href="/">&lt; Back to examples</a>
<ul class="menu">
  <li>
    <Link route="home">Home</Link>
  </li>
  <li>
    <Link route="page" params={{ page_id: 1 }}>Page 1</Link>
  </li>
  <li>
    <Link route="page" params={{ page_id: 2 }}>Page 2</Link>
  </li>
</ul>

<p class="description">
  Route can be named, and Links can directly point to those routes by naming
  them.
  <br />
  The Route's path will then be used as path to render the right href for the
  Link
</p>

<main>
  <section class="content">
    <!-- exact, else will match all routes-->
    <Route is="home" path="/" exact={true} component={Home} />
    <Route is="page" path="page/:page_id" let:match>
      <h1>Page {match.params.page_id}</h1>
      <p>Page content: this is page {match.params.page_id}</p>
    </Route>
  </section>

  <aside>
    <Route path="page/:page_id" let:match>
      <h1>Page {match.params.page_id}</h1>
      <p>Page aside: this is page {match.params.page_id}</p>
    </Route>
  </aside>
</main>
