<script>
  import { Router, Route, Link } from "yasp-router";
  import Home from "../../components/Home.svelte";
  import About from "../../components/About.svelte";
  import Contact from "../../components/Contact.svelte";
</script>

<a class="back" href="/">&lt; Back to examples</a>
<ul class="menu">
  <li>
    <Link to="/" id="home">Home</Link>
  </li>
  <li>
    <Link to="about">About</Link>
  </li>
  <li>
    <Link to="contact">Contact</Link>
  </li>
</ul>
<p class="description">
  This Router will render any Route that match the current URL.
</p>

<main>
  <section class="content">
    <!--
      exact means "only the / path"
      else will match all routes as all routes start with a /
    -->
    <Route path="/" exact={true} component={Home} />
    <Route path="about" component={About} />
    <Route path="contact" component={Contact} />
  </section>
  <aside>
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
