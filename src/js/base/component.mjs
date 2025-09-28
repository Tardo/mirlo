// @flow strict
import { default as RequestsService, HTTP_METHOD} from '@mirlo/services/requests';
import ComponentStateBinderHandler from './state';
import {getService} from './app';

import type Service from './service';
import type { MirloStateHandler } from "./state.mjs";

/**
 * The active component.
 * @private
 */
let active_component: Component | null = null;

/**
 * Class representing a Base Component node.
 * See {@tutorial Components}.
 * @tutorial components
 */
class Component extends HTMLElement {
  /**
   * The root state.
   * @type {(Object|Proxy)}
   * @private
   */
  #root_state: {[string]: mixed} = {};
  /**
   * The queue of the state binds changes.
   * @type {Array}
   * @private
   */
  #queue_state_changes: Array<MirloComponentState> = [];
  /**
   * The rAF handler for state binds changes.
   * @type {Number}
   * @private
   */
  #queue_state_raf = 0;
  /**
   * The Shadow Root of the node
   * @type {NodeList}
   * @private
   */
  #sdom: HTMLElement | ShadowRoot;
  /**
   * The store of fetchData.
   * @type Object
   * @private
   */
  #netdata: {[string]: mixed} = {};
  /**
   * The root element of the component.
   * @type {HTMLElement}
   */
  root: HTMLElement | ShadowRoot;
  /**
   * The object for mirlo purpuoses.
   * @type {Object}
   * @property {Object} options - The component options.
   */
  mirlo: MirloComponentBase = {
    options: {},
    state: {},
    _events: null,
    _fetch_data: null,
    _state_binds: null,
    _is_unsafe: false,
    _external_rel_styles: null,
    _skip_queue_state_raf: false,
  };

  /**
   * Create a Component node.
   * @hideconstructor
   */
  constructor() {
    super();
    active_component = this;
    this.onSetup();
    active_component = null;
    [
      '_events',
      '_fetch_data',
      '_state_binds',
      '_is_unsafe',
      '_external_rel_styles',
      '_skip_queue_state_raf',
    ].forEach(item => Object.freeze(this.mirlo[item]));
    if (!this.mirlo._is_unsafe) {
      this.#sdom = this.attachShadow({mode: 'closed'});
    }
    this.root = this.#sdom || this;
    this.renderTemplate();
  }

  /**
   * Invoked when the component node is attached to the page.
   * @private
   */
  connectedCallback() {
    // $FlowFixMe[incompatible-call]
    this.onWillStart().then(
      () =>
        window.requestAnimationFrame(() => {
          this.mirlo._skip_queue_state_raf = true;
          this.onStart(...arguments);
          this.mirlo._skip_queue_state_raf = false;
        }),
      this.root,
    );
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
  onWillStart(): Promise<mixed> {
    if (this.mirlo._state_binds) {
      const state_handler: MirloStateHandler = {
        _component_obj: null,
      };
      Object.assign(state_handler, ComponentStateBinderHandler, {
        _component_obj: this,
      });
      // $FlowFixMe[prop-missing]
      this.mirlo.state = new Proxy(this.#root_state, state_handler);
    } else {
      this.mirlo.state = this.#root_state;
    }

    return this.#fetchData();
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
            if (dom_target) {
              dom_target.addEventListener(ename, callback_bind);
            }
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
  onAttributeChanged(name: string, old_value: string, new_value: string) {
    this.mirlo.options[name] = new_value;
  }

  /**
   * Invoked when the component state change.
   * @param {string} prop - The property name.
   * @param {string} old_value - The old value.
   * @param {string} new_value - The new value.
   */
  onStateChanged(prop: string, old_value: string, new_value: string) {
    if (
      old_value !== new_value &&
      this.mirlo._state_binds &&
      Object.hasOwn(this.mirlo._state_binds, prop)
    ) {
      // $FlowFixMe[incompatible-use]
      const bind: MirloComponentBind = this.mirlo._state_binds[prop];
      if (bind) {
        let targets;
        if (typeof bind.id === "string") {
          targets = [this.queryId(bind.id)];
        } else if (typeof bind.selector === "string") {
          targets = [this.query(bind.selector)];
        } else if (typeof bind.selectorAll === "string") {
          targets = Array.from(this.queryAll(bind.selectorAll));
        } else {
          targets = [this];
        }
        this.#queue_state_changes.push(
          ...targets.map(target => {
            return [target, bind.attribute, new_value];
          }),
        );

        if (this.#queue_state_raf === 0 && this.#queue_state_changes.length) {
          if (this.mirlo._skip_queue_state_raf) {
            this.#queueStateFlush();
          } else {
            this.#queue_state_raf = window.requestAnimationFrame(
              () => this.#queueStateFlush(),
              this.root,
            );
          }
        }
      }
    }
  }

  /**
   * Fetch data from the configured endpoints.
   * @returns {Promise}
   * @private
   */
  async #fetchData(): Promise<mixed> {
    let res;
    if (this.mirlo._fetch_data) {
      const fetch_data_entries = Object.entries(this.mirlo._fetch_data);
      const service: Service | void = getService('requests');
      if (service instanceof RequestsService) {
        const requests: RequestsService = service;
        res = await Promise.all(
          fetch_data_entries.map(([key, value]) =>
            requests
              .queryJSON(
                value.endpoint,
                {
                  body: value.data,
                  method: value.method ?? HTTP_METHOD.POST,
                },
                value.cache_name,
              )
              .then(result => {
                this.#netdata[key] = result;
                Object.freeze(this.#netdata[key]);
                return result;
              }),
          ),
        );
      }
    }
    return res;
  }

  /**
   * Process the queue of the state binds changes.
   * @private
   */
  #queueStateFlush() {
    this.#queue_state_changes.forEach(item =>
      this.constructor.updateStateBind(...item),
    );
    this.#queue_state_changes = [];
    this.#queue_state_raf = 0;
  }

  /**
   * Render the associated template.
   * A template is created using the node 'template' with an 'id' like "template-mirlo-<component name>".
   */
  renderTemplate() {
    const template = document.getElementById(
      `template-${this.tagName.toLowerCase()}`,
    );
    if (template instanceof HTMLTemplateElement) {
      const tmpl_node = template.content.cloneNode(true);
      if (this.mirlo._external_rel_styles) {
        this.mirlo._external_rel_styles.forEach(href => {
          const dom_el_link = document.createElement('link');
          dom_el_link.setAttribute('type', 'text/css');
          dom_el_link.setAttribute('rel', 'stylesheet');
          dom_el_link.setAttribute('href', href);
          tmpl_node.prepend(dom_el_link);
        });
      }
      this.root.appendChild(tmpl_node);
    }
  }

  /**
   * Update the node with the state bind change.
   * @param {HTMLElement} node - The node.
   * @param {string} attr - The attribute name.
   * @param {string} value - The value.
   */
  static updateStateBind(node: HTMLElement | null, attr: string, value: string) {
    if (!node) {
      return;
    }

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
   */
  static getActiveComponent(): Component | null {
    if (!active_component) {
      throw new Error(
        'No active component. Hook functions must be used in the constructor.',
      );
    }
    return active_component;
  }

  /**
   * Configure component events.
   * @param  {Object} event_defs - The event definition.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useEvents(event_defs: {[string]: MirloComponentEvent}) {
    const comp = this.getActiveComponent();
    if (comp) {
      comp.mirlo._events = event_defs;
    }
  }

  /**
   * Configure component fetch data.
   * @param  {Object} fetch_defs - The fetch data definition.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useFetchData(fetch_defs: {[string]: MirloFetchData}) {
    const comp = this.getActiveComponent();
    if (comp) {
      comp.mirlo._fetch_data = fetch_defs;
    }
  }

  /**
   * Configure component state binds.
   * @param  {Object} state_defs - The state bind definition.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useStateBinds(state_defs: {[string]: MirloComponentBind}) {
    const comp = this.getActiveComponent();
    if (comp) {
      comp.mirlo._state_binds = state_defs;
    }
  }

  /**
   * Add external styles. Only useful if not uses {@link disableShadow}
   * @param  {...string} rel_hrefs - The href of the stylesheet link.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static useStyles(...rel_hrefs: Array<string>) {
    const comp = this.getActiveComponent();
    if (comp) {
      comp.mirlo._external_rel_styles = rel_hrefs;
    }
  }

  /**
   * Disable Shadow Root.
   * Not recommended if html templates are used.
   * @throws Will throw an error if the method is called outside allocation time.
   */
  static disableShadow() {
    const comp = this.getActiveComponent();
    if (comp) {
      comp.mirlo._is_unsafe = true;
    }
  }

  /**
   * Get Fetch Data results.
   * @param {string} ref_name = The fetch data reference name.
   * @type {Object}
   */
  getFetchData(ref_name: string): mixed {
    return this.#netdata[ref_name];
  }

  /**
   * Query all nodes using an CSS selector.
   * @param {string} selector - The CSS selector.
   * @returns {NodeList}
   */
  queryAll(selector: string): NodeList<HTMLElement> {
    return this.root.querySelectorAll(selector);
  }

  /**
   * Query a node using an CSS selector.
   * @param {string} selector - The CSS selector.
   * @returns {HTMLElement}
   */
  query(selector: string): HTMLElement | null {
    return this.root.querySelector(selector);
  }

  /**
   * Query a node using its id.
   * @param {string} el_id - The id of the node.
   * @returns {HTMLElement}
   */
  queryId(el_id: string): HTMLElement | null {
    if (this.mirlo._is_unsafe) {
      return document.getElementById(el_id);
    }
    // $FlowFixMe[prop-missing]
    return this.root.getElementById(el_id);
  }
}

export default Component;
