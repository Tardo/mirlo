/** Boot Mirlo **/
class App {
  #registry = {
    components: {},
    services: {},
  };
  #services = {};

  registerComponent(name, component) {
    if (Object.hasOwn(this.#registry.components, name)) {
      console.warn(`Already exists a component called '${name}'!`);
      return;
    }
    this.#registry.components[name] = component;
    customElements.define(`mirlo-${name}`, component);
  }
  getComponentClass(name) {
    return this.#registry.components[name];
  }

  registerService(name, service, force = false) {
    if (Object.hasOwn(this.#registry.services, name) && !force) {
      console.warn(`Already exists a service called '${name}'!`);
      return;
    }
    this.#registry.services[name] = service;
    this.#initializeService(name);
  }
  getServiceClass(name) {
    return this.#registry.services[name];
  }
  getService(name) {
    return this.#services[name];
  }

  #initializeService(service_name) {
    this.#services[service_name] = new this.#registry.services[service_name]();
    const service = this.#services[service_name];
    return service.onInit();
  }

  assignServices(component) {
    for (const service_name of component.useServices) {
      component[service_name] = this.#services[service_name];
    }
  }
}

export default new App();
