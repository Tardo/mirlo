import ComponentStateHandler from './state';

export default class {
  useServices = [];
  fetchData = {};
  #data = {};
  #parentComponent = null;
  #childrens = [];
  #root_state = {};
  #dom_el = null;
  #dom_childs = null;
  #need_update_dom_childs = false;
  state = null;
  events = {};

  constructor(parentComponent, target, options) {
    this.options = options || {};
    this.parentComponent = parentComponent;
    this.dom_el = target;
    const state_handler = Object.assign({}, ComponentStateHandler, {
      component_obj: this,
    });
    this.state = new Proxy(this.#root_state, state_handler);
  }

  async onWillStart() {
    const fetch_entries = Object.entries(this.fetchData);
    if (fetch_entries.length && !this.requests) {
      throw Error("Need 'requests' service to use 'fetchData'");
    }
    return await Promise.all(
      fetch_entries.map(([key, value]) =>
        this.requests.postJSON(value.endpoint, value.data).then(result => {
          this.data[key] = result;
          return result;
        }),
      ),
    );
  }

  onStart() {
    Object.entries(this.events).forEach(([key, value]) => {
      const [event_name, ...event_rest] = key.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_target =
        (event_target && this.query(event_target)) || this.dom_el;
      dom_target.addEventListener(event_name, value.bind(this));
    });
  }

  updateDomChildList() {
    this.#dom_childs = {};
    this.queryAll('[id]').forEach(child => {
      this.#dom_childs[child.id] = child;
    });
    this.#need_update_dom_childs = true;
  }

  needUpdateDomChilList() {
    return this.#need_update_dom_childs;
  }

  onRemove() {
    // Override me
  }

  onStateChanged(prop, new_value) {
    const value_typeof = typeof new_value;
    if (value_typeof === 'string' || value_typeof === 'number') {
      this.queryAll(`[data-component-state-binds*='${prop}-']`).forEach(
        dom_el => {
          dom_el.dataset.componentStateBinds.split(' ').forEach(bind => {
            const [field, type] = bind.split('-');
            if (field === prop) {
              this.constructor.updateStateBind(dom_el, type, new_value);
            }
          });
        },
      );
    }
  }

  static updateStateBind(node, type, value) {
    if (!type) {
      node.textContent = value;
    } else if (type === 'html') {
      node.innerHTML = value;
    } else {
      node.setAttribute(type, value);
    }
  }

  destroy() {
    this.#childrens.forEach(component => component.destroy());
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
   * @returns {Component}
   */
  get parentComponent() {
    return this.#parentComponent;
  }

  set parentComponent(value) {
    if (this.#parentComponent) {
      this.#parentComponent.removeChildrenComponent(this);
    }
    this.#parentComponent = value;
    if (this.#parentComponent) {
      this.#parentComponent.addChildrenComponent(this);
    }
  }

  get dom_el() {
    return this.#dom_el;
  }

  set dom_el(value) {
    if (this.#dom_el) {
      delete this.#dom_el.mirlo;
    }
    this.#dom_el = value;
    this.#dom_el.mirlo = {
      component_obj: this,
    };
  }

  get dom_childs() {
    if (!this.#dom_childs) {
      this.updateDomChildList();
    }
    return this.#dom_childs;
  }

  get data() {
    return this.#data;
  }

  addChildrenComponent(component) {
    this.#childrens.push(component);
  }

  removeChildrenComponent(component) {
    this.#childrens = this.#childrens.filter(item => item !== component);
  }

  queryAll(selector) {
    return this.dom_el.querySelectorAll(selector);
  }
  query(selector) {
    return this.dom_el.querySelector(selector);
  }
}
