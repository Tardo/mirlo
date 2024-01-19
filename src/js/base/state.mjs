/**
 * @typedef {Object} StateProxyHandler
 */

/**
 * This is the proxy handler to use with the state binds.
 * @private
 */
export default {
  /** Relation to the mirlo component */
  _component_obj: null,

  set(target, prop, value) {
    this._component_obj.onStateChanged(prop, target[prop], value);
    return Reflect.set(...arguments);
  },
};
