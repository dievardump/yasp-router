export default class Group {
  constructor(name) {
    this.name = name;
    this.routes = [];
  }

  /**
   * Register a route to the Group
   */
  registerRoute(route) {
    const index = this.routes.indexOf(route);
    if (index === -1) {
      this.routes.push(route);
      // order routes
      this.routes.sort((a, b) => {
        return a.group.order - b.group.order;
      });
    }
  }

  /**
   * Unregister a Route from the Group
   */
  unregisterRoute(route) {
    const index = this.routes.indexOf(route);
    if (index !== -1) {
      this.routes.splice(index, 1);
    }
  }
}
