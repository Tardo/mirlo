import ComponentStateHandler from './state';

export default class {
  useServices = [];
  fetchData = {};
  data = {};
  #parent = null;
  #childrens = [];
  #root_state = {};
  state = null;

  constructor(parent, target, options) {
    this.options = options || {};
    this.setParent(parent);
    this.setElement(target);
    const state_handler = Object.assign({}, ComponentStateHandler, {
      component_obj: this,
    });
    this.state = new Proxy(this.#root_state, state_handler);
  }

  onWillStart() {
    const tasks = [];
    for (const data_key in this.fetchData) {
      tasks.push(
        this.requests
          .postJSON(
            this.fetchData[data_key].endpoint,
            this.fetchData[data_key].data,
          )
          .then(result => {
            this.data[data_key] = result;
            return result;
          }),
      );
    }
    return Promise.all(tasks);
  }

  onStart() {
    for (const cevent in this.events) {
      const [event_name, ...event_rest] = cevent.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_target =
        (event_target && this.query(event_target)) || this.dom_el;
      dom_target.addEventListener(event_name, this.events[cevent].bind(this));
    }
  }

  remove() {
    this.dom_el.remove();
  }

  destroy() {
    // for (const children of this.#childrens) {
    //   children.destroy();
    // }
    this.#childrens = [];
    for (const cevent in this.events) {
      const [event_name, ...event_rest] = cevent.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_target =
        (event_target && this.query(event_target)) || this.dom_el;
      dom_target.removeEventListener(
        event_name,
        this.events[cevent].bind(this),
      );
    }
  }

  /**
   * @param {Component} parent
   */
  setParent(parent) {
    this.#parent = parent;
    if (this.#parent) {
      this.#parent.addChildren(this);
    }
  }

  /**
   * @returns {Component}
   */
  getParent() {
    return this.#parent;
  }

  addChildren(component) {
    this.#childrens.push(component);
  }

  removeChildren(component) {
    this.#childrens = this.#childrens.filter(item => item !== component);
  }

  setElement(target) {
    this.dom_el = target;
  }

  queryAll(selector) {
    return this.dom_el.querySelectorAll(selector);
  }
  query(selector) {
    return this.dom_el.querySelector(selector);
  }
}
