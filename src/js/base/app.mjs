// @flow strict
/**
 * Mirlo
 * @module mirlo
 * @see Component
 * @see Service
 */

import typeof ComponentCtor from './component'
import typeof ServiceCtor from './service'
import type Component from './component'
import type Service from './service'

/**
 * This are the internal registry for classes.
 * @type Object
 * @property {Object} components - The components.
 * @property {Object} services - The services.
 * @const
 * @private
 */
export type MirloRegistry = {
  components: {[string]: ComponentCtor},
  services: {[string]: ServiceCtor},
};
const registry: MirloRegistry = {
  components: {},
  services: {},
};
/**
 * This are the allocated services.
 * @const
 * @private
 */
const services: {[string]: Service} = {};

/**
 * Register a new component.
 * @param {string} name - The name for the component.
 * @param {Component} component - The class of the component to allocate.
 */
export function registerComponent(name: string, component: ComponentCtor) {
  if (Object.hasOwn(registry.components, name)) {
    console.warn(`Already exists a component called '${name}'!`);
    return;
  }
  registry.components[name] = component;
  customElements.define(`mirlo-${name}`, component);
}

/**
 * Get the component class.
 * @param {string} name - The component name.
 * @returns {Component}
 */
export function getComponentClass(name: string): ComponentCtor | void {
  return registry.components[name];
}

/**
 * Instantiate a service.
 * @param {string} service_name - The service name.
 * @private
 */
function initializeService(service_name: string) {
  services[service_name] = new registry.services[service_name]();
}

/**
 * Register a new service.
 * @param {string} name - The service name.
 * @param {Service} service - The service class.
 * @param {boolean} force - Indicates if the service overwrite an existing one.
 */
export function registerService(name: string, service: ServiceCtor, force: boolean = false) {
  if (!force && Object.hasOwn(registry.services, name)) {
    console.warn(`Already exists a service called '${name}'!`);
    return;
  }
  registry.services[name] = service;
  initializeService(name);
}

/**
 * Get the service class.
 * @param {string} name - The service name.
 * @returns {Service}
 */
export function getServiceClass(name: string): ServiceCtor | void {
  return registry.services[name];
}

/**
 * Get the service instance.
 * @param {string} name - The component name.
 * @returns {Service}
 */
export function getService(name: string): Service | void {
  return services[name];
}
