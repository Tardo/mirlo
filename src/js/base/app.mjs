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
  #queded_mutations = {
    added: [],
    removed: [],
  };
  #queded_mutations_raf = null;

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
        return this.#initializeComponents(
          this.dom_el.querySelectorAll('[data-component]'),
        );
      });
  }

  onStart() {
    super.onStart();
    // Observer
    this.#observer = new MutationObserver(this.#onObserver.bind(this));
    this.#observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

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

  #instantiateComponent(name, ...args) {
    const component_cls = this.getComponentClass(name);
    if (component_cls) {
      const component = new component_cls(...args);
      this.#assignServices(component);
      return component.onWillStart().then(() => component.onStart());
    }
    return Promise.reject(`Can't found the '${name}' component!`);
  }

  #getNodeComponentOptions(dom_el) {
    const component_options = {};
    Object.keys(dom_el.dataset).forEach(optionName => {
      if (optionName.startsWith('componentOption')) {
        const componentOptionName = optionName
          .replace(/^componentOption/, '')
          .toLowerCase();
        component_options[componentOptionName] = dom_el.dataset[optionName];
      }
    });
    return component_options;
  }

  #initializeComponents(nodes) {
    const tasks = [];
    for (const dom_el of nodes) {
      if (domGetComponentObj(dom_el)) {
        continue;
      }
      const component_name = dom_el.dataset.component;
      const parent_component = dom_el.closest('[data-component]');
      const parent_component_obj = domGetComponentObj(parent_component);
      tasks.push(
        this.#instantiateComponent(
          component_name,
          parent_component_obj || this,
          dom_el,
          this.#getNodeComponentOptions(dom_el),
        ),
      );
    }
    return Promise.all(tasks);
  }

  #assignServices(component) {
    for (const service_name of component.useServices) {
      component[service_name] = this.#services[service_name];
    }
  }

  #traverseNodeListRemoved(node) {
    if (node.children) {
      for (const cnode of node.children) {
        this.#traverseNodeListRemoved(cnode);
      }
    }
    domGetComponentObj(node)?.onDestroy();
  }

  #traverseNodeListAdded(node, node_list) {
    if (Object.hasOwn(node.dataset, 'component')) {
      node_list.push(node);
    }
    if (node.children) {
      for (const cnode of node.children) {
        this.#traverseNodeListAdded(cnode, node_list);
      }
    }
  }

  #processQuededMutations() {
    const added_nodes = [];
    this.#queded_mutations.added.forEach(anode =>
      this.#traverseNodeListAdded(anode, added_nodes),
    );
    this.#initializeComponents(added_nodes);
    this.#queded_mutations.added = [];
    this.#queded_mutations.removed.forEach(rnode =>
      this.#traverseNodeListRemoved(rnode),
    );
    this.#queded_mutations.removed = [];
    this.#queded_mutations_raf = null;
  }

  #onObserver(mutations) {
    mutations.forEach(mutation => {
      this.#queded_mutations.added.push(...mutation.addedNodes);
      this.#queded_mutations.removed.push(...mutation.removedNodes);
    });
    if (
      !this.#queded_mutations_raf &&
      (this.#queded_mutations.added.length ||
        this.#queded_mutations.removed.length)
    ) {
      this.#queded_mutations_raf = window.requestAnimationFrame(
        this.#processQuededMutations.bind(this),
      );
    }
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
