import ComponentStateBinderHandler from './state';
import {getService} from './app';

/**
 * The active component.
 * @private
 */
let active_component = null;

/**
 * Class representing a Component node.
 * @extends HTMLElement
 */
class Component extends HTMLElement {
  /**
   * The root state.
   * @type {(Object|Proxy)}
   * @private
   */
  #root_state = {};
  /**
   * The queue of the state binds changes.
   * @type {Array}
   * @private
   */
  #queue_state_changes = [];
  /**
   * The rAF handler for state binds changes.
   * @type {Number}
   * @private
   */
  #queue_state_raf = null;
  /**
   * The Shadow Root of the node
   * @type {NodeList}
   * @private
   */
  #sdom = null;
  /**
   * The store of fetchData.
   * @type Object
   * @private
   */
  #netdata = {};
  /**
   * The object for mirlo purpuoses.
   * @type {Object}
   * @property {Object} options - The component options.
   */
  mirlo = {
    options: {},
    _events: null,
    _fetch_data: null,
    _state_binds: null,
  };

  /**
   * Create a Component node.
   */
  constructor() {
    super();
    this.#sdom = this.attachShadow({mode: 'closed'});
    this.#renderTemplate();
    active_component = this;
    this.onSetup();
    active_component = null;
  }

  /**
   * Invoked when the component node is attached to the page.
   * @private
   */
  connectedCallback() {
    this.onWillStart().then(() => this.onStart(...arguments));
  }

  /**
   * Invoked when the component node is dettached from the page.
   * @private
   */
  disconnectedCallback() {
    this.onRemove(...arguments);
  }

  /**
   * Invoked when the component node change the attributes.
   * @private
   */
  attributeChangedCallback() {
    this.onAttributeChanged(...arguments);
  }

  /**
   * Invoked when the component is allocated. Use this method to call 'Hook Functions' and configure the component.
   */
  onSetup() {
    // Override me
  }

  /**
   * Invoked when the component is attached to the page. Used to call promises and wait for them before full initialization.
   * @returns {Promise}
   */
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

  /**
   * Invoked when 'onWillStart' promise finish. Here you can manipulate the component node.
   */
  onStart() {
    // Assign Events
    if (this.mirlo._events) {
      Object.entries(this.mirlo._events).forEach(([selector, event_def]) => {
        const {mode, events} = event_def;
        let dom_targets;
        if (selector) {
          if (mode === 'id') {
            dom_targets = [this.queryId(selector)];
          } else {
            dom_targets = this.queryAll(selector);
          }
        } else {
          dom_targets = [this];
        }
        Object.entries(events).forEach(([ename, callback]) => {
          const callback_bind = callback.bind(this);
          for (const dom_target of dom_targets) {
            dom_target.addEventListener(ename, callback_bind);
          }
        });
      });
    }
  }

  /**
   * Invoked when the component is removed from the page.
   */
  onRemove() {
    // Override me
  }

  /**
   * Invoked when the component changes an attribute.
   * @param {string} name - The attribute name.
   * @param {string} old_value - The old value.
   * @param {string} new_value - The new value.
   */
  onAttributeChanged(name, old_value, new_value) {
    this.mirlo.options[name] = new_value;
  }

  /**
   * Invoked when the component state change.
   * @param {string} prop - The property name.
   * @param {any} old_value - The old value.
   * @param {any} new_value - The new value.
   */
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
          targets = Array.from(this.queryAll(bind.selectorAll));
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

  /**
   * Process the queue of the state binds changes.
   * @private
   */
  #queueStateFlush() {
    this.#queue_state_changes.forEach(([target, attribute, value]) =>
      this.constructor.updateStateBind(target, attribute, value),
    );
    this.#queue_state_changes = [];
    this.#queue_state_raf = null;
  }

  /**
   * Render the associated template.
   * A template is created using the node 'template' with an 'id' like "template-mirlo-<component name>".
   */
  #renderTemplate() {
    const template = document.getElementById(
      `template-${this.tagName.toLowerCase()}`,
    );
    if (template) {
      this.#sdom.appendChild(template.content.cloneNode(true));
    }
  }

  /**
   * Update the node with the state bind change.
   * @param {HTMLElement} node - The node.
   * @param {string} attr - The attribute name.
   * @param {string} value - The value.
   */
  static updateStateBind(node, attr, value) {
    if (!attr) {
      node.textContent = value;
    } else if (attr === 'html') {
      node.innerHTML = value;
    } else {
      node.setAttribute(attr, value);
    }
  }

  /**
   * Gets the active allocated component.
   * @returns {Component}
   * @throws Will throw an error if the method is called outside allocation time.
   * @private
   */
  static #getActiveComponent() {
    if (!active_component) {
      throw new Error(
        'No active component. Hook functions must be used in the constructor.',
      );
    }
    return active_component;
  }

  /**
   * Configure component events.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useEvents(event_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._events = event_defs;
  }

  /**
   * Configure component fetch data.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useFetchData(fetch_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._fetch_data = fetch_defs;
  }

  /**
   * Configure component state binds.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useStateBinds(state_defs) {
    const comp = this.#getActiveComponent();
    comp.mirlo._state_binds = state_defs;
  }

  /**
   * Shadow Root.
   * @type {ShadowRoot}
   */
  get sdom() {
    return this.#sdom;
  }

  /**
   * Fetch data results.
   * @type {Object}
   */
  get netdata() {
    return this.#netdata;
  }

  /**
   * Query all nodes using an CSS selector.
   * @param {string} selector - The CSS selector.
   * @returns {NodeList}
   */
  queryAll(selector) {
    return this.#sdom.querySelectorAll(selector);
  }

  /**
   * Query a node using an CSS selector.
   * @param {string} selector - The CSS selector.
   * @returns {HTMLElement}
   */
  query(selector) {
    return this.#sdom.querySelector(selector);
  }

  /**
   * Query a node using its id.
   * @param {string} el_id - The id of the node.
   * @returns {HTMLElement}
   */
  queryId(el_id) {
    return this.#sdom.getElementById(el_id);
  }
}

export default Component;
