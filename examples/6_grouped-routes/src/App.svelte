<script>
  import { Router, Route, Link } from "../../../src/index.js";
  import Home from "../../components/Home.svelte";
  import About from "../../components/About.svelte";
  import Contact from "../../components/Contact.svelte";
  import Landing from "../../components/Landing.svelte";
  import NotFound from "../../components/NotFound.svelte";
</script>

<a class="back" href="/">&lt; Back to examples</a>
<ul class="menu">
  <li>
    <Link to="/">Home</Link>
  </li>
  <li>
    <!--for dynamic parameters -->
    <Link to="about">About</Link>
  </li>
  <li>
    <Link to="contact">Contact</Link>
  </li>
  <li>
    <Link to="page/3">Landing</Link>
  </li>
  <li>
    <!-- no route for this, should fallback to /404-->
    <Link to="blogpost">Blog</Link>
  </li>
</ul>

<p class="description">
  In a group, a maximum of one Route will be shown at once. 0 if there is no
  match and no fallback route
  <br />
  On a 404, here, the `content` group will show a the NotFound Component
  <br />
  while the aside group stays blank
</p>
<main>
  <section class="content">
    <Route group="content" path="/" component={Home} exact={true} />
    <Route group="content" path="about" component={About} />
    <Route group="content" path="contact" component={Contact} />
    <Route group="content" path="page/:page_id" component={Landing} />
    <Route group="content" path="/404" component={NotFound} fallback={true} />
  </section>
  <aside>
    <!-- No aside content for /home, and there is no fallback here -->
    <Route group="aside" path="about">Aside About</Route>
    <Route group="aside" path="contact">Aside Contact</Route>
    <Route group="aside" path="page/:page_id" let:match>
      Aside page {match.params.page_id}
    </Route>
  </aside>
</main>
