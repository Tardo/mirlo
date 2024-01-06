import domAddEventListener from '../utils/dom_add_event_listener.mjs';
import domRemoveEventListener from '../utils/dom_remove_event_listener.mjs';
import domGetComponentObj from '../utils/dom_get_component_object';
import Component from './component.mjs';

/** Boot Mirlo **/
class App extends Component {
  #registry = {
    components: {},
    services: {},
  };
  #services = {};
  #observer = null;

  constructor(parent, target, options, internal_data) {
    super(parent, target, options);
    this.__data = internal_data;
  }

  destroy() {
    super.destroy();
    Object.values(this.#services).forEach(service => service.destroy());
    this.#services = [];
    this.#observer.disconnect();
    domRemoveEventListener('click', "[class~='dropdown']");
    domRemoveEventListener('click', '[data-dismiss]');
  }

  registerComponent(name, component) {
    if (Object.hasOwn(this.#registry.components, name)) {
      console.warn(`Already exists a component called '${name}'!`);
      return;
    }
    this.#registry.components[name] = component;
  }
  getComponentClass(name) {
    return this.#registry.components[name];
  }
  invokeComponent(name, ...args) {
    const component_cls = this.getComponentClass(name);
    if (component_cls) {
      const component = new component_cls(this, ...args);
      this.#assignServices(component);
      component.onWillStart().then(() => {
        component.onStart();
      });
    } else {
      console.warn(`The component '${name}' don't exists!`);
    }
  }

  registerService(name, service, force = false) {
    if (Object.hasOwn(this.#registry.services, name) && !force) {
      console.warn(`Already exists a service called '${name}'!`);
      return;
    }
    this.#registry.services[name] = service;
  }
  getServiceClass(name) {
    return this.#registry.services[name];
  }
  getService(name) {
    return this.#services[name];
  }

  getComponentById(id) {
    const dom_el = this.query(`#${id}`);
    if (!dom_el) {
      return undefined;
    }
    return domGetComponentObj(dom_el);
  }

  onWillStart() {
    return super
      .onWillStart()
      .then(() => {
        return this.#initializeServices();
      })
      .then(() => {
        return this.#initializeComponents(this.dom_el);
      });
  }

  onStart() {
    super.onStart();
    // Observer
    this.#observer = new MutationObserver(this.#onObserver.bind(this));
    this.#observer.observe(document.body, {childList: true, subtree: true});

    // Assign core event
    domAddEventListener(
      'click',
      "[class~='dropdown']",
      this.#onCoreClickDropdown.bind(this),
    );
    domAddEventListener(
      'click',
      '[data-dismiss]',
      this.#onCoreClickDismiss.bind(this),
    );
  }

  #initializeServices() {
    for (const service_name in this.#registry.services) {
      this.#services[service_name] = new this.#registry.services[
        service_name
      ]();
    }
    const tasks = [];
    const service_names = Object.keys(this.#services);
    for (const service_name of service_names) {
      const service = this.#services[service_name];
      tasks.push(service.onWillStart());
    }
    return Promise.all(tasks);
  }

  #initializeComponents(dom_base_el) {
    const tasks = [];
    const components = (
      dom_base_el.parentElement || dom_base_el
    ).querySelectorAll('[data-component]');
    for (const dom_el of components) {
      if (domGetComponentObj(dom_el)) {
        continue;
      }
      const component_name = dom_el.dataset.component;
      const component_cls = this.getComponentClass(component_name);
      const parent_component = dom_el.closest('[data-component]');
      const parent_component_obj =
        parent_component && domGetComponentObj(parent_component);
      const component_options = {};
      Object.keys(dom_el.dataset).forEach(optionName => {
        if (optionName.startsWith('componentOption')) {
          const componentOptionName = optionName
            .replace(/^componentOption/, '')
            .toLowerCase();
          component_options[componentOptionName] = dom_el.dataset[optionName];
        }
      });
      if (component_cls) {
        const component = new component_cls(
          parent_component_obj || this,
          dom_el,
          component_options,
        );
        this.#assignServices(component);
        tasks.push(component.onWillStart().then(() => component.onStart()));
      } else {
        console.warn(`Can't found the '${component_name}' component!`, dom_el);
      }
    }

    return Promise.all(tasks);
  }

  #assignServices(component) {
    for (const service_name of component.useServices) {
      component[service_name] = this.#services[service_name];
    }
  }

  #traverseNodeListOnDestroy(node) {
    node.childNodes.forEach(cnode => this.#traverseNodeListOnDestroy(cnode));
    domGetComponentObj(node)?.onDestroy();
  }

  #onObserver(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(anode => this.#initializeComponents(anode));
      mutation.removedNodes.forEach(rnode =>
        this.#traverseNodeListOnDestroy(rnode),
      );
    });
  }

  #onCoreClickDropdown(ev) {
    this.query(ev.currentTarget.dataset.target).classList.toggle('hidden');
  }

  #onCoreClickDismiss(ev) {
    const classname = `.${ev.currentTarget.datatset.dismiss}`;
    ev.currentTarget.closest(classname).remove();
  }
}

export const app = new App(null, document.body);
