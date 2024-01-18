const registry = {
  components: {},
  services: {},
};
const services = {};

// COMPONENTS

export function registerComponent(name, component) {
  if (Object.hasOwn(registry.components, name)) {
    console.warn(`Already exists a component called '${name}'!`);
    return;
  }
  registry.components[name] = component;
  customElements.define(`mirlo-${name}`, component);
}

export function getComponentClass(name) {
  return registry.components[name];
}

// SERVICES

function initializeService(service_name) {
  services[service_name] = new registry.services[service_name]();
  const service = services[service_name];
  return service.onInit();
}

export function registerService(name, service, force = false) {
  if (Object.hasOwn(registry.services, name) && !force) {
    console.warn(`Already exists a service called '${name}'!`);
    return;
  }
  registry.services[name] = service;
  initializeService(name);
}
export function getServiceClass(name) {
  return registry.services[name];
}
export function getService(name) {
  return services[name];
}
