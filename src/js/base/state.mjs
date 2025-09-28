// @flow strict
import type Component from "./component";

export type MirloStateHandler = {
  _component_obj: Component | null,
  ...,
}

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
const state_proxy_handler: MirloStateHandler = {
  /** Relation to the mirlo component */
  _component_obj: null,

  set(target: {...}, prop: string, value: mixed): boolean {
    // $FlowFixMe[invalid-computed-prop]
    // $FlowFixMe[object-this-reference]
    this._component_obj?.onStateChanged(prop, target[prop], String(value));
    return Reflect.set(...arguments);
  },
};

export default state_proxy_handler;
