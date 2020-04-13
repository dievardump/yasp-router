import { writable } from 'svelte/store';
import { compiler, parser_to_end } from '../utils';

export default class Link {
  constructor(to, params, basename, locationInfos) {
    this.basename = basename;
    this.setTo(to);
    this.params = params;
    this.locationInfos = locationInfos;

    this.compileHref();
    this.active = this.test();

    this._store = writable({
      active: this.active,
      href: this.href,
    });

    this.store = {
      subscribe: this._store.subscribe,
      update: (params) => this.updateParams(params),
    };
  }

  setTo(to) {
    if (to[0] !== '#' && to.indexOf(this.basename) === -1) {
      to = this.basename + to;
    }

    this.to = to.replace('//', '/');
    this.compiler = compiler(this.to);
    return this;
  }

  compileHref() {
    this.href = this.compiler(this.params);
    this.parser = parser_to_end(this.href);
    return this;
  }

  test() {
    if (this.href[0] === '#') {
      return !!this.parser(this.locationInfos.hash);
    } else {
      return !!this.parser(this.locationInfos.pathname);
    }
  }

  update() {
    this.compileHref();
    this.active = this.test();

    this._store.update((data) => {
      data.active = this.active;
      data.href = this.href;
      return data;
    });

    return this;
  }

  updateParams(params) {
    this.params = params;
    this.update();
    return this;
  }

  /**
   * Update link with current location infos
   */
  updateLocation(locationInfos) {
    this.locationInfos = locationInfos;
    this.update();
  }
}
