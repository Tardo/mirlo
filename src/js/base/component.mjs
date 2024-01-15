import ComponentStateHandler from './state';
import app from './app';

export default class extends HTMLElement {
  useServices = [];
  useStateBinds = [];
  fetchData = {};
  #data = {};
  #parentComponent = null;
  #root_state = {};
  #state_binds = {};
  #sdom = null;
  options = {};
  state = null;
  events = {};

  constructor() {
    super();
    this.#sdom = this.attachShadow({mode: 'open'});
    this.mirlo = {};
    const state_handler = Object.assign({}, ComponentStateHandler, {
      component_obj: this,
    });
    this.state = new Proxy(this.#root_state, state_handler);
    this.renderTemplate();
  }

  connectedCallback() {
    this.onWillStart().then(() => this.onStart(...arguments));
  }

  disconnectedCallback() {
    this.onRemove(...arguments);
  }

  attributeChangedCallback() {
    this.onAttributeChanged(...arguments);
  }

  async onWillStart() {
    app.assignServices(this);
    const fetch_entries = Object.entries(this.fetchData);
    if (fetch_entries.length && !this.requests) {
      throw Error("Need 'requests' service to use 'fetchData'");
    }
    await Promise.all(
      fetch_entries.map(([key, value]) =>
        this.requests.postJSON(value.endpoint, value.data).then(result => {
          this.data[key] = result;
          return result;
        }),
      ),
    );
  }

  onStart() {
    // Assign Events
    Object.entries(this.events).forEach(([key, value]) => {
      const [event_name, ...event_rest] = key.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_targets = (event_target && this.queryAll(event_target)) || [
        this,
      ];
      dom_targets.forEach(dom_target =>
        dom_target.addEventListener(event_name, value.bind(this)),
      );
    });
  }

  onRemove() {
    // Override me
  }

  onAttributeChanged(name, old_value, new_value) {
    this.options[name] = new_value;
  }

  onStateChanged(prop, old_value, new_value) {
    const value_typeof = typeof new_value;
    if (
      old_value !== new_value &&
      (value_typeof === 'string' || value_typeof === 'number')
    ) {
      this.useStateBinds
        .filter(x => x.prop === prop)
        .forEach(bind => {
          const targets = (bind.selector && this.queryAll(bind.selector)) || [
            this,
          ];
          for (const target of targets) {
            this.constructor.updateStateBind(target, bind.attribute, new_value);
          }
        });
    }
  }

  renderTemplate() {
    const template = document.getElementById(
      `template-${this.tagName.toLowerCase()}`,
    );
    if (template) {
      const node = document.importNode(template.content, true);
      this.sdom.appendChild(node);
    }
  }

  getChild(child_id) {
    return this.sdom.getElementById(child_id);
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

  get sdom() {
    return this.#sdom;
  }

  get data() {
    return this.#data;
  }

  queryAll(selector) {
    return this.sdom.querySelectorAll(selector);
  }
  query(selector) {
    return this.shadowRoot.querySelector(selector);
  }
}
