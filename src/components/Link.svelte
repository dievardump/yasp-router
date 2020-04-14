<script>
  import { createEventDispatcher, onDestroy } from "svelte";

  import { compiler } from "../utils";
  import { goto, registerLink } from "../boot.js";

  export let to = "/";
  export let route = "";
  export let action = null;
  export let params = {};
  export let navigateOptions = {};

  let setted = 0;
  ["to", "route", "action"].forEach(name => {
    if (!!$$props[name]) setted++;
  });

  if (setted < 1) {
    throw new Error(
      "Link must have either a to, a route or an action specified"
    );
  } else if (setted > 1) {
    throw new Error(
      "Link can only have one of to, route or action specified at the same time"
    );
  }

  let props = {};
  let localProps = {};
  let href = "";

  let store = null;
  if (!action) {
    store = registerLink(to, params, route);
  }

  let use_store = !!store;

  const dispatch = createEventDispatcher();

  // handle click
  // dispatch the click event
  // and go to href
  function onClickHandler(event) {
    if (action !== null && window.history && window.history.length) {
      if (action === "back") window.history.back();
      else if (action === "forward") window.history.forward();
      else if (action === "go" && params.go) {
        window.history.go(params.go);
      }
      return;
    }

    dispatch("click", event);
    goto(href, navigateOptions);

    return false;
  }

  // update props coming from store
  function storeUpdated(store) {
    href = store.href;

    if (store.active) {
      localProps = {
        "aria-current": "page",
        "data-active": "active"
      };
    } else {
      localProps = {};
    }
  }

  /**
   *  Save properties that are not used for building the Link
   * So we can add them to the <a>
   */
  function setProps($$props) {
    const { to, route, params, ...rest } = $$props;
    props = rest;
  }

  // if params change, update store
  $: use_store && store.update(params);

  // if props change
  $: use_store && setProps($$props);

  // when store changed
  $: use_store && storeUpdated($store);
</script>

<a {href} on:click|preventDefault={onClickHandler} {...props} {...localProps}>
  <slot />
</a>
