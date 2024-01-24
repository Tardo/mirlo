/**
 * Proxy handler for the components state.
 * @typedef {Object} StateProxyHandler
 * @private
 */

/**
 * This is the proxy handler to use with the state binds.
 * @type {StateProxyHandler}
 * @private
 */
const state_proxy_handler = {
  /** Relation to the mirlo component */
  _component_obj: null,

  set(target, prop, value) {
    this._component_obj.onStateChanged(prop, target[prop], value);
    return Reflect.set(...arguments);
  },
};

export default state_proxy_handler;
