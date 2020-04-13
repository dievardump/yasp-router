<script>
  import { registerRouter } from "../boot.js";

  export let basename = "";

  registerRouter(basename);
</script>

<slot />
