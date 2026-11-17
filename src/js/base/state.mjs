// @flow strict
import type Component from './component';

export type MirloStateHandler = {
  _component_obj: Component | null,
  _caches: {[string]: WeakMap<{...}, {...}>},
  ...
};

/** Relation 'reactive proxy' -> 'raw object'. */
const raw_of: WeakMap<{...}, {...}> = new WeakMap();

/**
 * Get the raw object of a reactive proxy.
 * @param {*} value - The value.
 * @returns {*}
 * @private
 */
function toRaw(value: unknown): unknown {
  return (value !== null && typeof value === 'object' && raw_of.get(value)) || value;
}

/**
 * Only arrays and plain objects are made reactive.
 * @private
 */
function isObservable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  // A frozen value can't be wrapped (Proxy invariants), it is read as is
  if (Object.isFrozen(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return Array.isArray(value) || proto === Object.prototype || !proto;
}

/**
 * Wrap an array/object so any change (deep) calls 'notify'.
 * @param {Object} raw - The array/object.
 * @param {Function} notify - The change callback.
 * @param {WeakMap} cache - Relation 'raw' -> 'proxy', keeps the identity of the proxies.
 * @returns {Proxy}
 * @private
 */
function reactive(input: {...}, notify: () => void, cache: WeakMap<{...}, {...}>): {...} {
  // A proxy can be stored in the state (filter, map, spread...), never wrap a proxy
  // $FlowFixMe[incompatible-type]
  const raw: {...} = toRaw(input);
  let proxy = cache.get(raw);
  if (!proxy) {
    proxy = new Proxy(raw, {
      get(target: {...}, prop: string | symbol, receiver: unknown): unknown {
        const value = Reflect.get(target, prop, receiver);
        return isObservable(value) ? reactive(value, notify, cache) : value;
      },
      set(target: {...}, prop: string | symbol, value: unknown): boolean {
        const raw_value = toRaw(value);
        // $FlowFixMe[invalid-computed-prop]
        const changed = !Object.is(target[prop], raw_value);
        const res = Reflect.set(target, prop, raw_value);
        if (changed) {
          notify();
        }
        return res;
      },
      deleteProperty(target: {...}, prop: string | symbol): boolean {
        const had = Object.hasOwn(target, prop);
        const res = Reflect.deleteProperty(target, prop);
        if (had) {
          notify();
        }
        return res;
      },
    });
    cache.set(raw, proxy);
    raw_of.set(proxy, raw);
  }
  return proxy;
}

/**
 * Get the reactive version of a value of a list state.
 * @param {StateProxyHandler} handler - The handler of the component.
 * @param {string} prop - The state property.
 * @param {Object} raw - The array/object.
 * @param {Object} root - The root state.
 * @returns {Proxy}
 * @private
 */
export function toReactive(handler: MirloStateHandler, prop: string, raw: {...}, root: {[string]: unknown}): {...} {
  const cache = (handler._caches[prop] ??= new WeakMap());
  return reactive(raw, () => handler._component_obj?.onStateChanged(prop, root[prop], root[prop]), cache);
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
  /** Reactive proxies by state property */
  _caches: {},

  get(target: {...}, prop: string | symbol, receiver: unknown): unknown {
    const value = Reflect.get(target, prop, receiver);
    // $FlowFixMe[object-this-reference]
    const comp = this._component_obj;
    if (comp && isObservable(value) && comp.mirlo._state_binds?.[prop]?.each) {
      // $FlowFixMe[object-this-reference]
      // $FlowFixMe[incompatible-type]
      return toReactive(this, prop, value, target);
    }
    return value;
  },

  set(target: {...}, prop: string | symbol, value: unknown, receiver: unknown): boolean {
    // $FlowFixMe[object-this-reference]
    const comp = this._component_obj;
    const raw_value = toRaw(value);
    // List states keep their value, the rest are strings
    const new_value = comp?.mirlo._state_binds?.[prop]?.each ? raw_value : String(value);
    // $FlowFixMe[invalid-computed-prop]
    comp?.onStateChanged(prop, target[prop], new_value);
    return Reflect.set(target, prop, raw_value, receiver);
  },
};

export default state_proxy_handler;
