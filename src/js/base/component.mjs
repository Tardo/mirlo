import ComponentStateBinderHandler from './state';
import {getService} from './app';

let active_component = null;

export default class extends HTMLElement {
  #root_state = {};
  #queue_state_changes = [];
  #queue_state_raf = null;
  #sdom = null;
  #netdata = {};
  mirlo = {
    options: {},
    _events: null,
    _fetch_data: null,
    _state_binds: null,
  };

  constructor() {
    super();
    this.#sdom = this.attachShadow({mode: 'closed'});
    this.#renderTemplate();
    active_component = this;
    this.onSetup();
    active_component = null;
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

  onSetup() {
    // Override me
  }

  onWillStart() {
    if (this.mirlo._state_binds) {
      const state_handler = Object.assign({}, ComponentStateBinderHandler, {
        _component_obj: this,
      });
      this.mirlo.state = new Proxy(this.#root_state, state_handler);
    } else {
      this.mirlo.state = this.#root_state;
    }

    if (this.mirlo._fetch_data) {
      const fetch_data_entries = Object.entries(this.mirlo._fetch_data);
      const requests = getService('requests');
      return Promise.all(
        fetch_data_entries.map(([key, value]) =>
          requests.postJSON(value.endpoint, value.data).then(result => {
            this.#netdata[key] = result;
            return result;
          }),
        ),
      );
    }
    return Promise.resolve();
  }

  onStart() {
    // Assign Events
    if (this.mirlo._events) {
      Object.entries(this.mirlo._events).forEach(([selector, events_def]) => {
        events_def.forEach(({event, callback, mode}) => {
          const callback_bind = callback.bind(this);
          if (selector) {
            if (mode === 'id') {
              this.queryId(selector).addEventListener(event, callback_bind);
            } else {
              this.queryAll(selector).forEach(dom_target =>
                dom_target.addEventListener(event, callback_bind),
              );
            }
          } else {
            this.addEventListener(event, callback_bind);
          }
        });
      });
    }
  }

  onRemove() {
    // Override me
  }

  onAttributeChanged(name, old_value, new_value) {
    this.mirlo.options[name] = new_value;
  }

  onStateChanged(prop, old_value, new_value) {
    if (
      old_value !== new_value &&
      Object.hasOwn(this.mirlo._state_binds, prop)
    ) {
      const bind = this.mirlo._state_binds[prop];
      if (bind) {
        let targets;
        if (bind.id) {
          targets = [this.queryId(bind.id)];
        } else if (bind.selector) {
          targets = [this.query(bind.selector)];
        } else if (bind.selectorAll) {
          targets = this.queryAll(bind.selectorAll);
        } else {
          targets = [this];
        }
        this.#queue_state_changes.push(
          ...targets.map(target => {
            return [target, bind.attribute, new_value];
          }),
        );
        if (!this.#queue_state_raf && this.#queue_state_changes.length) {
          this.#queue_state_raf = window.requestAnimationFrame(
            this.#queueStateFlush.bind(this),
          );
        }
      }
    }
  }

  #queueStateFlush() {
    this.#queue_state_changes.forEach(([target, attribute, value]) =>
      this.constructor.updateStateBind(target, attribute, value),
    );
    this.#queue_state_changes = [];
    this.#queue_state_raf = null;
  }

  #renderTemplate() {
    const template = document.getElementById(
      `template-${this.tagName.toLowerCase()}`,
    );
    if (template) {
      this.#sdom.appendChild(template.content.cloneNode(true));
    }
  }

  static updateStateBind(node, attr, value) {
    if (!attr) {
      node.textContent = value;
    } else if (attr === 'html') {
      node.innerHTML = value;
    } else {
      node.setAttribute(attr, value);
    }
  }

  static #getActiveComponent() {
    if (!active_component) {
      throw new Error(
        'No active component. Hook functions must be used in the constructor.',
      );
    }
    return active_component;
  }

  static useEvents(event_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._events = event_defs;
  }

  static useFetchData(fetch_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._fetch_data = fetch_defs;
  }

  static useStateBinds(state_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._state_binds = state_defs;
  }

  get sdom() {
    return this.#sdom;
  }

  get netdata() {
    return this.#netdata;
  }

  queryAll(selector) {
    return this.#sdom.querySelectorAll(selector);
  }
  query(selector) {
    return this.#sdom.querySelector(selector);
  }
  queryId(el_id) {
    return this.#sdom.getElementById(el_id);
  }
}
