<script>
  import { registerRoute } from "../boot.js";

  export let path = "";
  export let component = null;
  export let exact = false;
  export let is = null;
  export let group = null;
  export let order = +Infinity;
  export let fallback = false;

  let routeGroup = false;
  if (group) {
    routeGroup = { name: group, order, fallback };
  }

  // this is a custom store, automatically updated when location changes
  const route = registerRoute(path, exact, is, routeGroup);

  // passed to the mounted component/slot
  const routeInfos = { path, is, exact };
  if (group) {
    routeInfos.group = group;
    routeInfos.fallback = fallback;
  }

  // passed to the mounted component/slot
  let props = {};
  $: {
    const {
      path,
      component,
      exact,
      is,
      group,
      order,
      fallback,
      ...rest
    } = $$props;
    props = rest;
  }
</script>

{#if $route.match}
  {#if component}
    <svelte:component
      this={component}
      {routeInfos}
      match={$route.match}
      {...props}>
      <slot />
    </svelte:component>
  {:else}
    <slot {routeInfos} match={$route.match} {props} />
  {/if}
{/if}
