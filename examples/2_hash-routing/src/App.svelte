<script>
  import { Router, Route, Link } from "../../../src/index.js";
  import Home from "../../components/Home.svelte";
  import About from "../../components/About.svelte";
  import Contact from "../../components/Contact.svelte";
</script>

<a class="back" href="/">&lt; Back to examples</a>
<ul class="menu">
  <li>
    <Link to="#">Home</Link>
  </li>
  <li>
    <Link to="#about">About</Link>
  </li>
  <li>
    <Link to="#contact">Contact</Link>
  </li>
</ul>

<p class="description">
  The Router can be configured to use hash instead of pathname (useHash = true
  when declaring the Router)
</p>
<main>
  <section class="content">
    <!-- exact, else will match all routes-->
    <Route path="#" exact={true} component={Home} />
    <Route path="#about" component={About} />
    <Route path="#contact" component={Contact} />
  </section>
  <aside>
    <Route path="#about">
      <h3>About</h3>
      <p>about aside</p>
    </Route>
    <Route path="#contact">
      <h3>Contact</h3>
      <p>contact aside</p>
    </Route>
  </aside>
</main>
