function domAddEventListener (event_name, selector, callback) {
  document.querySelectorAll(selector).forEach(dom_el => {
    dom_el.addEventListener(event_name, callback);
  });
}

function domRemoveEventListener (event_name, selector, callback) {
  document.querySelectorAll(selector).forEach(dom_el => {
    dom_el.removeEventListener(event_name, callback);
  });
}

function domGetData (dom_el) {
  if (!Object.hasOwn(dom_el, 'mirlo')) {
    dom_el.mirlo = {};
  }
  return dom_el.mirlo;
}

function domGetComponentObj (dom_el) {
  const dom_el_data = domGetData(dom_el);
  if (Object.hasOwn(dom_el_data, 'component_obj')) {
    return dom_el_data.component_obj;
  }
  return undefined;
}

var ComponentStateHandler = {
  component_obj: null,

  set(target, prop, value) {
    const value_typeof = typeof value;
    if (
      this.component_obj &&
      (value_typeof === 'string' || value_typeof === 'number')
    ) {
      const dom_els = this.component_obj.queryAll(
        `[data-component-state-binds*='${prop}-']`,
      );
      dom_els.forEach(dom_el => {
        const binds = dom_el.dataset.componentStateBinds.split(' ');
        binds.forEach(bind => {
          const bind_parts = bind.split('-');
          if (bind_parts[0] === prop) {
            if (bind_parts.length === 1) {
              dom_el.textContent = value;
            } else if (bind_parts[1] === 'html') {
              dom_el.innerHTML = value;
            } else {
              dom_el.setAttribute(bind_parts[1], value);
            }
          }
        });
      });
    }
    return Reflect.set(...arguments);
  },
};

class Component {
  useServices = [];
  fetchData = {};
  data = {};
  #parent = null;
  #childrens = [];
  #root_state = {};
  state = null;

  constructor(parent, target, options) {
    // Force 'requests' service
    if (this.useServices.indexOf('requests') === -1) {
      this.useServices.push('requests');
    }
    this.options = options || {};
    this.setParent(parent);
    this.setElement(target);
    const state_handler = Object.assign({}, ComponentStateHandler, {
      component_obj: this,
    });
    this.state = new Proxy(this.#root_state, state_handler);
  }

  onWillStart() {
    const tasks = [];
    for (const data_key in this.fetchData) {
      tasks.push(
        this.requests
          .postJSON(
            this.fetchData[data_key].endpoint,
            this.fetchData[data_key].data,
          )
          .then(result => {
            this.data[data_key] = result;
            return result;
          }),
      );
    }
    return Promise.all(tasks);
  }

  onStart() {
    for (const cevent in this.events) {
      const [event_name, ...event_rest] = cevent.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_target =
        (event_target && this.query(event_target)) || this.dom_el;
      dom_target.addEventListener(event_name, this.events[cevent].bind(this));
    }
  }

  remove() {
    this.dom_el.remove();
  }

  destroy() {
    // for (const children of this.#childrens) {
    //   children.destroy();
    // }
    this.#childrens = [];
    for (const cevent in this.events) {
      const [event_name, ...event_rest] = cevent.split(' ');
      const event_target = (event_rest && event_rest.join(' ')) || null;
      const dom_target =
        (event_target && this.query(event_target)) || this.dom_el;
      dom_target.removeEventListener(
        event_name,
        this.events[cevent].bind(this),
      );
    }
  }

  /**
   * @param {Component} parent
   */
  setParent(parent) {
    this.#parent = parent;
    if (this.#parent) {
      this.#parent.addChildren(this);
    }
  }

  /**
   * @returns {Component}
   */
  getParent() {
    return this.#parent;
  }

  addChildren(component) {
    this.#childrens.push(component);
  }

  removeChildren(component) {
    this.#childrens = this.#childrens.filter(item => item !== component);
  }

  setElement(target) {
    this.dom_el = target;
  }

  queryAll(selector) {
    return this.dom_el.querySelectorAll(selector);
  }
  query(selector) {
    return this.dom_el.querySelector(selector);
  }
}

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
    const services = Object.values(this.#services);
    for (const service of services) {
      service.destroy();
    }
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
        return this.#initializeComponents();
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

  #initializeComponents() {
    const tasks = [];
    const components = this.queryAll('[data-component]');
    for (const dom_elm of components) {
      if (domGetComponentObj(dom_elm)) {
        continue;
      }
      const component_name = dom_elm.dataset.component;
      const component_cls = this.getComponentClass(component_name);
      const parent_component = dom_elm.closest('[data-component]');
      const parent_component_obj =
        parent_component && domGetComponentObj(parent_component);
      const component_options = {};
      Object.keys(dom_elm.dataset).forEach(optionName => {
        if (optionName.startsWith('componentOption')) {
          const componentOptionName = optionName
            .replace(/^componentOption/, '')
            .toLowerCase();
          component_options[componentOptionName] = dom_elm.dataset[optionName];
        }
      });
      if (component_cls) {
        const component = new component_cls(
          parent_component_obj || this,
          dom_elm,
          component_options,
        );
        this.#assignServices(component);
        const dom_elm_data = domGetData(dom_elm);
        Object.assign(dom_elm_data, {component_obj: component});
        tasks.push(component.onWillStart().then(() => component.onStart()));
      } else {
        console.warn(`Can't found the '${component_name}' component!`, dom_elm);
      }
    }

    return Promise.all(tasks);
  }

  #assignServices(component) {
    for (const service_name of component.useServices) {
      component[service_name] = this.#services[service_name];
    }
  }

  #onObserver(mutations) {
    let need_load_components = false;
    const destroy_nodes_component = function (cnode) {
      for (const child of cnode.childNodes) {
        destroy_nodes_component(child);
      }
      const cnode_component_obj = domGetComponentObj(cnode);
      if (cnode_component_obj) {
        cnode_component_obj.destroy();
      }
    };
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        if (mutation.addedNodes.length) {
          need_load_components = true;
        }
        for (const rnode of mutation.removedNodes) {
          destroy_nodes_component(rnode);
        }
      }
    });
    if (need_load_components) {
      this.#initializeComponents();
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

const app = new App(null, document.body);

class Service {
  onWillStart() {
    return Promise.resolve();
  }

  destroy() {
    throw Error('Not Implemented!');
  }
}

class StorageService extends Service {
  storage = null;

  getItem(item) {
    return (
      (this.storage && JSON.parse(this.storage.getItem(item))) || undefined
    );
  }

  setItem(item, value, on_error) {
    try {
      return this.storage.setItem(item, JSON.stringify(value));
    } catch (err) {
      console.error(
        `[StorageService] Can't set the item '${item}' = '${value}'`,
      );
      if (on_error) {
        const err_check = this.#isQuotaExceededError(err);
        if (err_check) {
          on_error(err);
        }
      }
    }

    return false;
  }

  removeItem(item) {
    return (this.storage && this.storage.removeItem(item)) || undefined;
  }

  #isQuotaExceededError(err) {
    return err.name === 'QuotaExceededError';
  }
}

class LocalStorageService extends StorageService {
  storage = localStorage;
}

class SessionStorageService extends StorageService {
  storage = sessionStorage;
}

class RequestsService extends Service {
  MESSAGES = {
    e200: '200: Invalid server result!',
  };

  getHeaders(custom_headers) {
    return custom_headers;
  }

  async postJSON(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'same-origin',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: this.getHeaders({
        'Content-Type': 'application/json',
      }),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
      body: JSON.stringify(data),
    });
    const result = response.json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
  }

  async post(url, data, cache = 'default') {
    let fdata = false;
    if (typeof data === 'object') {
      fdata = new URLSearchParams();
      for (const k in data) {
        fdata.append(k, data[k]);
      }
    } else if (typeof data === 'string') {
      fdata = data;
    }
    const response = await fetch(url, {
      method: 'POST',
      mode: 'same-origin',
      cache: cache,
      credentials: 'same-origin',
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
      body: fdata,
    });
    const result = response.json();
    if (this.checkServerResult(result)) {
      return result;
    }
    throw Error(this.MESSAGES.e200);
  }

  async get(url, cache = 'default') {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'same-origin',
      cache: cache,
      credentials: 'same-origin',
      headers: this.getHeaders(),
      redirect: 'follow',
      referrerPolicy: 'same-origin',
    });
    return response.blob();
  }

  checkServerResult(data) {
    if (!data || typeof data === 'undefined') {
      return true;
    }
  }
}

// Copyright (C) 2022 Alexandre Díaz

app.registerService('requests', RequestsService);
app.registerService('localStorage', LocalStorageService);
app.registerService('sessionStorage', SessionStorageService);

// On Start APP
window.addEventListener('load', () => {
  app.onWillStart().then(() => {
    app.onStart();
  });
});

export { Component, LocalStorageService, RequestsService, Service, SessionStorageService, app as default };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlybG8ubWpzIiwic291cmNlcyI6WyIuLi9zcmMvanMvdXRpbHMvZG9tX2FkZF9ldmVudF9saXN0ZW5lci5tanMiLCIuLi9zcmMvanMvdXRpbHMvZG9tX3JlbW92ZV9ldmVudF9saXN0ZW5lci5tanMiLCIuLi9zcmMvanMvdXRpbHMvZG9tX2dldF9kYXRhLm1qcyIsIi4uL3NyYy9qcy91dGlscy9kb21fZ2V0X2NvbXBvbmVudF9vYmplY3QubWpzIiwiLi4vc3JjL2pzL2Jhc2Uvc3RhdGUubWpzIiwiLi4vc3JjL2pzL2Jhc2UvY29tcG9uZW50Lm1qcyIsIi4uL3NyYy9qcy9iYXNlL2FwcC5tanMiLCIuLi9zcmMvanMvYmFzZS9zZXJ2aWNlLm1qcyIsIi4uL3NyYy9qcy9zZXJ2aWNlcy9zdG9yYWdlLm1qcyIsIi4uL3NyYy9qcy9zZXJ2aWNlcy9yZXF1ZXN0cy5tanMiLCIuLi9zcmMvanMvbWlybG8ubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChldmVudF9uYW1lLCBzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikuZm9yRWFjaChkb21fZWwgPT4ge1xuICAgIGRvbV9lbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50X25hbWUsIGNhbGxiYWNrKTtcbiAgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoZXZlbnRfbmFtZSwgc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLmZvckVhY2goZG9tX2VsID0+IHtcbiAgICBkb21fZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudF9uYW1lLCBjYWxsYmFjayk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKGRvbV9lbCkge1xuICBpZiAoIU9iamVjdC5oYXNPd24oZG9tX2VsLCAnbWlybG8nKSkge1xuICAgIGRvbV9lbC5taXJsbyA9IHt9O1xuICB9XG4gIHJldHVybiBkb21fZWwubWlybG87XG59XG4iLCJpbXBvcnQgZG9tR2V0RGF0YSBmcm9tICcuL2RvbV9nZXRfZGF0YSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChkb21fZWwpIHtcbiAgY29uc3QgZG9tX2VsX2RhdGEgPSBkb21HZXREYXRhKGRvbV9lbCk7XG4gIGlmIChPYmplY3QuaGFzT3duKGRvbV9lbF9kYXRhLCAnY29tcG9uZW50X29iaicpKSB7XG4gICAgcmV0dXJuIGRvbV9lbF9kYXRhLmNvbXBvbmVudF9vYmo7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgY29tcG9uZW50X29iajogbnVsbCxcblxuICBzZXQodGFyZ2V0LCBwcm9wLCB2YWx1ZSkge1xuICAgIGNvbnN0IHZhbHVlX3R5cGVvZiA9IHR5cGVvZiB2YWx1ZTtcbiAgICBpZiAoXG4gICAgICB0aGlzLmNvbXBvbmVudF9vYmogJiZcbiAgICAgICh2YWx1ZV90eXBlb2YgPT09ICdzdHJpbmcnIHx8IHZhbHVlX3R5cGVvZiA9PT0gJ251bWJlcicpXG4gICAgKSB7XG4gICAgICBjb25zdCBkb21fZWxzID0gdGhpcy5jb21wb25lbnRfb2JqLnF1ZXJ5QWxsKFxuICAgICAgICBgW2RhdGEtY29tcG9uZW50LXN0YXRlLWJpbmRzKj0nJHtwcm9wfS0nXWAsXG4gICAgICApO1xuICAgICAgZG9tX2Vscy5mb3JFYWNoKGRvbV9lbCA9PiB7XG4gICAgICAgIGNvbnN0IGJpbmRzID0gZG9tX2VsLmRhdGFzZXQuY29tcG9uZW50U3RhdGVCaW5kcy5zcGxpdCgnICcpO1xuICAgICAgICBiaW5kcy5mb3JFYWNoKGJpbmQgPT4ge1xuICAgICAgICAgIGNvbnN0IGJpbmRfcGFydHMgPSBiaW5kLnNwbGl0KCctJyk7XG4gICAgICAgICAgaWYgKGJpbmRfcGFydHNbMF0gPT09IHByb3ApIHtcbiAgICAgICAgICAgIGlmIChiaW5kX3BhcnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICBkb21fZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmluZF9wYXJ0c1sxXSA9PT0gJ2h0bWwnKSB7XG4gICAgICAgICAgICAgIGRvbV9lbC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGRvbV9lbC5zZXRBdHRyaWJ1dGUoYmluZF9wYXJ0c1sxXSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIFJlZmxlY3Quc2V0KC4uLmFyZ3VtZW50cyk7XG4gIH0sXG59O1xuIiwiaW1wb3J0IENvbXBvbmVudFN0YXRlSGFuZGxlciBmcm9tICcuL3N0YXRlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICB1c2VTZXJ2aWNlcyA9IFtdO1xuICBmZXRjaERhdGEgPSB7fTtcbiAgZGF0YSA9IHt9O1xuICAjcGFyZW50ID0gbnVsbDtcbiAgI2NoaWxkcmVucyA9IFtdO1xuICAjcm9vdF9zdGF0ZSA9IHt9O1xuICBzdGF0ZSA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IocGFyZW50LCB0YXJnZXQsIG9wdGlvbnMpIHtcbiAgICAvLyBGb3JjZSAncmVxdWVzdHMnIHNlcnZpY2VcbiAgICBpZiAodGhpcy51c2VTZXJ2aWNlcy5pbmRleE9mKCdyZXF1ZXN0cycpID09PSAtMSkge1xuICAgICAgdGhpcy51c2VTZXJ2aWNlcy5wdXNoKCdyZXF1ZXN0cycpO1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuc2V0UGFyZW50KHBhcmVudCk7XG4gICAgdGhpcy5zZXRFbGVtZW50KHRhcmdldCk7XG4gICAgY29uc3Qgc3RhdGVfaGFuZGxlciA9IE9iamVjdC5hc3NpZ24oe30sIENvbXBvbmVudFN0YXRlSGFuZGxlciwge1xuICAgICAgY29tcG9uZW50X29iajogdGhpcyxcbiAgICB9KTtcbiAgICB0aGlzLnN0YXRlID0gbmV3IFByb3h5KHRoaXMuI3Jvb3Rfc3RhdGUsIHN0YXRlX2hhbmRsZXIpO1xuICB9XG5cbiAgb25XaWxsU3RhcnQoKSB7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRhdGFfa2V5IGluIHRoaXMuZmV0Y2hEYXRhKSB7XG4gICAgICB0YXNrcy5wdXNoKFxuICAgICAgICB0aGlzLnJlcXVlc3RzXG4gICAgICAgICAgLnBvc3RKU09OKFxuICAgICAgICAgICAgdGhpcy5mZXRjaERhdGFbZGF0YV9rZXldLmVuZHBvaW50LFxuICAgICAgICAgICAgdGhpcy5mZXRjaERhdGFbZGF0YV9rZXldLmRhdGEsXG4gICAgICAgICAgKVxuICAgICAgICAgIC50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmRhdGFbZGF0YV9rZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcyk7XG4gIH1cblxuICBvblN0YXJ0KCkge1xuICAgIGZvciAoY29uc3QgY2V2ZW50IGluIHRoaXMuZXZlbnRzKSB7XG4gICAgICBjb25zdCBbZXZlbnRfbmFtZSwgLi4uZXZlbnRfcmVzdF0gPSBjZXZlbnQuc3BsaXQoJyAnKTtcbiAgICAgIGNvbnN0IGV2ZW50X3RhcmdldCA9IChldmVudF9yZXN0ICYmIGV2ZW50X3Jlc3Quam9pbignICcpKSB8fCBudWxsO1xuICAgICAgY29uc3QgZG9tX3RhcmdldCA9XG4gICAgICAgIChldmVudF90YXJnZXQgJiYgdGhpcy5xdWVyeShldmVudF90YXJnZXQpKSB8fCB0aGlzLmRvbV9lbDtcbiAgICAgIGRvbV90YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudF9uYW1lLCB0aGlzLmV2ZW50c1tjZXZlbnRdLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZSgpIHtcbiAgICB0aGlzLmRvbV9lbC5yZW1vdmUoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgLy8gZm9yIChjb25zdCBjaGlsZHJlbiBvZiB0aGlzLiNjaGlsZHJlbnMpIHtcbiAgICAvLyAgIGNoaWxkcmVuLmRlc3Ryb3koKTtcbiAgICAvLyB9XG4gICAgdGhpcy4jY2hpbGRyZW5zID0gW107XG4gICAgZm9yIChjb25zdCBjZXZlbnQgaW4gdGhpcy5ldmVudHMpIHtcbiAgICAgIGNvbnN0IFtldmVudF9uYW1lLCAuLi5ldmVudF9yZXN0XSA9IGNldmVudC5zcGxpdCgnICcpO1xuICAgICAgY29uc3QgZXZlbnRfdGFyZ2V0ID0gKGV2ZW50X3Jlc3QgJiYgZXZlbnRfcmVzdC5qb2luKCcgJykpIHx8IG51bGw7XG4gICAgICBjb25zdCBkb21fdGFyZ2V0ID1cbiAgICAgICAgKGV2ZW50X3RhcmdldCAmJiB0aGlzLnF1ZXJ5KGV2ZW50X3RhcmdldCkpIHx8IHRoaXMuZG9tX2VsO1xuICAgICAgZG9tX3RhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICBldmVudF9uYW1lLFxuICAgICAgICB0aGlzLmV2ZW50c1tjZXZlbnRdLmJpbmQodGhpcyksXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge0NvbXBvbmVudH0gcGFyZW50XG4gICAqL1xuICBzZXRQYXJlbnQocGFyZW50KSB7XG4gICAgdGhpcy4jcGFyZW50ID0gcGFyZW50O1xuICAgIGlmICh0aGlzLiNwYXJlbnQpIHtcbiAgICAgIHRoaXMuI3BhcmVudC5hZGRDaGlsZHJlbih0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMge0NvbXBvbmVudH1cbiAgICovXG4gIGdldFBhcmVudCgpIHtcbiAgICByZXR1cm4gdGhpcy4jcGFyZW50O1xuICB9XG5cbiAgYWRkQ2hpbGRyZW4oY29tcG9uZW50KSB7XG4gICAgdGhpcy4jY2hpbGRyZW5zLnB1c2goY29tcG9uZW50KTtcbiAgfVxuXG4gIHJlbW92ZUNoaWxkcmVuKGNvbXBvbmVudCkge1xuICAgIHRoaXMuI2NoaWxkcmVucyA9IHRoaXMuI2NoaWxkcmVucy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9PSBjb21wb25lbnQpO1xuICB9XG5cbiAgc2V0RWxlbWVudCh0YXJnZXQpIHtcbiAgICB0aGlzLmRvbV9lbCA9IHRhcmdldDtcbiAgfVxuXG4gIHF1ZXJ5QWxsKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9tX2VsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9tX2VsLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG59XG4iLCJpbXBvcnQgZG9tQWRkRXZlbnRMaXN0ZW5lciBmcm9tICcuLi91dGlscy9kb21fYWRkX2V2ZW50X2xpc3RlbmVyLm1qcyc7XG5pbXBvcnQgZG9tUmVtb3ZlRXZlbnRMaXN0ZW5lciBmcm9tICcuLi91dGlscy9kb21fcmVtb3ZlX2V2ZW50X2xpc3RlbmVyLm1qcyc7XG5pbXBvcnQgZG9tR2V0RGF0YSBmcm9tICcuLi91dGlscy9kb21fZ2V0X2RhdGEnO1xuaW1wb3J0IGRvbUdldENvbXBvbmVudE9iaiBmcm9tICcuLi91dGlscy9kb21fZ2V0X2NvbXBvbmVudF9vYmplY3QnO1xuaW1wb3J0IENvbXBvbmVudCBmcm9tICcuL2NvbXBvbmVudC5tanMnO1xuXG4vKiogQm9vdCBNaXJsbyAqKi9cbmNsYXNzIEFwcCBleHRlbmRzIENvbXBvbmVudCB7XG4gICNyZWdpc3RyeSA9IHtcbiAgICBjb21wb25lbnRzOiB7fSxcbiAgICBzZXJ2aWNlczoge30sXG4gIH07XG4gICNzZXJ2aWNlcyA9IHt9O1xuICAjb2JzZXJ2ZXIgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHBhcmVudCwgdGFyZ2V0LCBvcHRpb25zLCBpbnRlcm5hbF9kYXRhKSB7XG4gICAgc3VwZXIocGFyZW50LCB0YXJnZXQsIG9wdGlvbnMpO1xuICAgIHRoaXMuX19kYXRhID0gaW50ZXJuYWxfZGF0YTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgc3VwZXIuZGVzdHJveSgpO1xuICAgIGNvbnN0IHNlcnZpY2VzID0gT2JqZWN0LnZhbHVlcyh0aGlzLiNzZXJ2aWNlcyk7XG4gICAgZm9yIChjb25zdCBzZXJ2aWNlIG9mIHNlcnZpY2VzKSB7XG4gICAgICBzZXJ2aWNlLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgdGhpcy4jc2VydmljZXMgPSBbXTtcbiAgICB0aGlzLiNvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgZG9tUmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBcIltjbGFzc349J2Ryb3Bkb3duJ11cIik7XG4gICAgZG9tUmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCAnW2RhdGEtZGlzbWlzc10nKTtcbiAgfVxuXG4gIHJlZ2lzdGVyQ29tcG9uZW50KG5hbWUsIGNvbXBvbmVudCkge1xuICAgIGlmIChPYmplY3QuaGFzT3duKHRoaXMuI3JlZ2lzdHJ5LmNvbXBvbmVudHMsIG5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oYEFscmVhZHkgZXhpc3RzIGEgY29tcG9uZW50IGNhbGxlZCAnJHtuYW1lfSchYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuI3JlZ2lzdHJ5LmNvbXBvbmVudHNbbmFtZV0gPSBjb21wb25lbnQ7XG4gIH1cbiAgZ2V0Q29tcG9uZW50Q2xhc3MobmFtZSkge1xuICAgIHJldHVybiB0aGlzLiNyZWdpc3RyeS5jb21wb25lbnRzW25hbWVdO1xuICB9XG4gIGludm9rZUNvbXBvbmVudChuYW1lLCAuLi5hcmdzKSB7XG4gICAgY29uc3QgY29tcG9uZW50X2NscyA9IHRoaXMuZ2V0Q29tcG9uZW50Q2xhc3MobmFtZSk7XG4gICAgaWYgKGNvbXBvbmVudF9jbHMpIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5ldyBjb21wb25lbnRfY2xzKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgdGhpcy4jYXNzaWduU2VydmljZXMoY29tcG9uZW50KTtcbiAgICAgIGNvbXBvbmVudC5vbldpbGxTdGFydCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb21wb25lbnQub25TdGFydCgpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihgVGhlIGNvbXBvbmVudCAnJHtuYW1lfScgZG9uJ3QgZXhpc3RzIWApO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyU2VydmljZShuYW1lLCBzZXJ2aWNlLCBmb3JjZSA9IGZhbHNlKSB7XG4gICAgaWYgKE9iamVjdC5oYXNPd24odGhpcy4jcmVnaXN0cnkuc2VydmljZXMsIG5hbWUpICYmICFmb3JjZSkge1xuICAgICAgY29uc29sZS53YXJuKGBBbHJlYWR5IGV4aXN0cyBhIHNlcnZpY2UgY2FsbGVkICcke25hbWV9JyFgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy4jcmVnaXN0cnkuc2VydmljZXNbbmFtZV0gPSBzZXJ2aWNlO1xuICB9XG4gIGdldFNlcnZpY2VDbGFzcyhuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuI3JlZ2lzdHJ5LnNlcnZpY2VzW25hbWVdO1xuICB9XG4gIGdldFNlcnZpY2UobmFtZSkge1xuICAgIHJldHVybiB0aGlzLiNzZXJ2aWNlc1tuYW1lXTtcbiAgfVxuXG4gIGdldENvbXBvbmVudEJ5SWQoaWQpIHtcbiAgICBjb25zdCBkb21fZWwgPSB0aGlzLnF1ZXJ5KGAjJHtpZH1gKTtcbiAgICBpZiAoIWRvbV9lbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRvbUdldENvbXBvbmVudE9iaihkb21fZWwpO1xuICB9XG5cbiAgb25XaWxsU3RhcnQoKSB7XG4gICAgcmV0dXJuIHN1cGVyXG4gICAgICAub25XaWxsU3RhcnQoKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy4jaW5pdGlhbGl6ZVNlcnZpY2VzKCk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy4jaW5pdGlhbGl6ZUNvbXBvbmVudHMoKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgb25TdGFydCgpIHtcbiAgICBzdXBlci5vblN0YXJ0KCk7XG4gICAgLy8gT2JzZXJ2ZXJcbiAgICB0aGlzLiNvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMuI29uT2JzZXJ2ZXIuYmluZCh0aGlzKSk7XG4gICAgdGhpcy4jb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7Y2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlfSk7XG5cbiAgICAvLyBBc3NpZ24gY29yZSBldmVudFxuICAgIGRvbUFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAnY2xpY2snLFxuICAgICAgXCJbY2xhc3N+PSdkcm9wZG93biddXCIsXG4gICAgICB0aGlzLiNvbkNvcmVDbGlja0Ryb3Bkb3duLmJpbmQodGhpcyksXG4gICAgKTtcbiAgICBkb21BZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ2NsaWNrJyxcbiAgICAgICdbZGF0YS1kaXNtaXNzXScsXG4gICAgICB0aGlzLiNvbkNvcmVDbGlja0Rpc21pc3MuYmluZCh0aGlzKSxcbiAgICApO1xuICB9XG5cbiAgI2luaXRpYWxpemVTZXJ2aWNlcygpIHtcbiAgICBmb3IgKGNvbnN0IHNlcnZpY2VfbmFtZSBpbiB0aGlzLiNyZWdpc3RyeS5zZXJ2aWNlcykge1xuICAgICAgdGhpcy4jc2VydmljZXNbc2VydmljZV9uYW1lXSA9IG5ldyB0aGlzLiNyZWdpc3RyeS5zZXJ2aWNlc1tcbiAgICAgICAgc2VydmljZV9uYW1lXG4gICAgICBdKCk7XG4gICAgfVxuICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgY29uc3Qgc2VydmljZV9uYW1lcyA9IE9iamVjdC5rZXlzKHRoaXMuI3NlcnZpY2VzKTtcbiAgICBmb3IgKGNvbnN0IHNlcnZpY2VfbmFtZSBvZiBzZXJ2aWNlX25hbWVzKSB7XG4gICAgICBjb25zdCBzZXJ2aWNlID0gdGhpcy4jc2VydmljZXNbc2VydmljZV9uYW1lXTtcbiAgICAgIHRhc2tzLnB1c2goc2VydmljZS5vbldpbGxTdGFydCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKTtcbiAgfVxuXG4gICNpbml0aWFsaXplQ29tcG9uZW50cygpIHtcbiAgICBjb25zdCB0YXNrcyA9IFtdO1xuICAgIGNvbnN0IGNvbXBvbmVudHMgPSB0aGlzLnF1ZXJ5QWxsKCdbZGF0YS1jb21wb25lbnRdJyk7XG4gICAgZm9yIChjb25zdCBkb21fZWxtIG9mIGNvbXBvbmVudHMpIHtcbiAgICAgIGlmIChkb21HZXRDb21wb25lbnRPYmooZG9tX2VsbSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBjb21wb25lbnRfbmFtZSA9IGRvbV9lbG0uZGF0YXNldC5jb21wb25lbnQ7XG4gICAgICBjb25zdCBjb21wb25lbnRfY2xzID0gdGhpcy5nZXRDb21wb25lbnRDbGFzcyhjb21wb25lbnRfbmFtZSk7XG4gICAgICBjb25zdCBwYXJlbnRfY29tcG9uZW50ID0gZG9tX2VsbS5jbG9zZXN0KCdbZGF0YS1jb21wb25lbnRdJyk7XG4gICAgICBjb25zdCBwYXJlbnRfY29tcG9uZW50X29iaiA9XG4gICAgICAgIHBhcmVudF9jb21wb25lbnQgJiYgZG9tR2V0Q29tcG9uZW50T2JqKHBhcmVudF9jb21wb25lbnQpO1xuICAgICAgY29uc3QgY29tcG9uZW50X29wdGlvbnMgPSB7fTtcbiAgICAgIE9iamVjdC5rZXlzKGRvbV9lbG0uZGF0YXNldCkuZm9yRWFjaChvcHRpb25OYW1lID0+IHtcbiAgICAgICAgaWYgKG9wdGlvbk5hbWUuc3RhcnRzV2l0aCgnY29tcG9uZW50T3B0aW9uJykpIHtcbiAgICAgICAgICBjb25zdCBjb21wb25lbnRPcHRpb25OYW1lID0gb3B0aW9uTmFtZVxuICAgICAgICAgICAgLnJlcGxhY2UoL15jb21wb25lbnRPcHRpb24vLCAnJylcbiAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgIGNvbXBvbmVudF9vcHRpb25zW2NvbXBvbmVudE9wdGlvbk5hbWVdID0gZG9tX2VsbS5kYXRhc2V0W29wdGlvbk5hbWVdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChjb21wb25lbnRfY2xzKSB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5ldyBjb21wb25lbnRfY2xzKFxuICAgICAgICAgIHBhcmVudF9jb21wb25lbnRfb2JqIHx8IHRoaXMsXG4gICAgICAgICAgZG9tX2VsbSxcbiAgICAgICAgICBjb21wb25lbnRfb3B0aW9ucyxcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy4jYXNzaWduU2VydmljZXMoY29tcG9uZW50KTtcbiAgICAgICAgY29uc3QgZG9tX2VsbV9kYXRhID0gZG9tR2V0RGF0YShkb21fZWxtKTtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihkb21fZWxtX2RhdGEsIHtjb21wb25lbnRfb2JqOiBjb21wb25lbnR9KTtcbiAgICAgICAgdGFza3MucHVzaChjb21wb25lbnQub25XaWxsU3RhcnQoKS50aGVuKCgpID0+IGNvbXBvbmVudC5vblN0YXJ0KCkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgQ2FuJ3QgZm91bmQgdGhlICcke2NvbXBvbmVudF9uYW1lfScgY29tcG9uZW50IWAsIGRvbV9lbG0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcyk7XG4gIH1cblxuICAjYXNzaWduU2VydmljZXMoY29tcG9uZW50KSB7XG4gICAgZm9yIChjb25zdCBzZXJ2aWNlX25hbWUgb2YgY29tcG9uZW50LnVzZVNlcnZpY2VzKSB7XG4gICAgICBjb21wb25lbnRbc2VydmljZV9uYW1lXSA9IHRoaXMuI3NlcnZpY2VzW3NlcnZpY2VfbmFtZV07XG4gICAgfVxuICB9XG5cbiAgI29uT2JzZXJ2ZXIobXV0YXRpb25zKSB7XG4gICAgbGV0IG5lZWRfbG9hZF9jb21wb25lbnRzID0gZmFsc2U7XG4gICAgY29uc3QgZGVzdHJveV9ub2Rlc19jb21wb25lbnQgPSBmdW5jdGlvbiAoY25vZGUpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY25vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICBkZXN0cm95X25vZGVzX2NvbXBvbmVudChjaGlsZCk7XG4gICAgICB9XG4gICAgICBjb25zdCBjbm9kZV9jb21wb25lbnRfb2JqID0gZG9tR2V0Q29tcG9uZW50T2JqKGNub2RlKTtcbiAgICAgIGlmIChjbm9kZV9jb21wb25lbnRfb2JqKSB7XG4gICAgICAgIGNub2RlX2NvbXBvbmVudF9vYmouZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH07XG4gICAgbXV0YXRpb25zLmZvckVhY2gobXV0YXRpb24gPT4ge1xuICAgICAgaWYgKG11dGF0aW9uLnR5cGUgPT09ICdjaGlsZExpc3QnKSB7XG4gICAgICAgIGlmIChtdXRhdGlvbi5hZGRlZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgIG5lZWRfbG9hZF9jb21wb25lbnRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHJub2RlIG9mIG11dGF0aW9uLnJlbW92ZWROb2Rlcykge1xuICAgICAgICAgIGRlc3Ryb3lfbm9kZXNfY29tcG9uZW50KHJub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChuZWVkX2xvYWRfY29tcG9uZW50cykge1xuICAgICAgdGhpcy4jaW5pdGlhbGl6ZUNvbXBvbmVudHMoKTtcbiAgICB9XG4gIH1cblxuICAjb25Db3JlQ2xpY2tEcm9wZG93bihldikge1xuICAgIHRoaXMucXVlcnkoZXYuY3VycmVudFRhcmdldC5kYXRhc2V0LnRhcmdldCkuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJyk7XG4gIH1cblxuICAjb25Db3JlQ2xpY2tEaXNtaXNzKGV2KSB7XG4gICAgY29uc3QgY2xhc3NuYW1lID0gYC4ke2V2LmN1cnJlbnRUYXJnZXQuZGF0YXRzZXQuZGlzbWlzc31gO1xuICAgIGV2LmN1cnJlbnRUYXJnZXQuY2xvc2VzdChjbGFzc25hbWUpLnJlbW92ZSgpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBhcHAgPSBuZXcgQXBwKG51bGwsIGRvY3VtZW50LmJvZHkpO1xuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBvbldpbGxTdGFydCgpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRocm93IEVycm9yKCdOb3QgSW1wbGVtZW50ZWQhJyk7XG4gIH1cbn1cbiIsImltcG9ydCBTZXJ2aWNlIGZyb20gJy4uL2Jhc2Uvc2VydmljZSc7XG5cbmV4cG9ydCBjbGFzcyBTdG9yYWdlU2VydmljZSBleHRlbmRzIFNlcnZpY2Uge1xuICBzdG9yYWdlID0gbnVsbDtcblxuICBnZXRJdGVtKGl0ZW0pIHtcbiAgICByZXR1cm4gKFxuICAgICAgKHRoaXMuc3RvcmFnZSAmJiBKU09OLnBhcnNlKHRoaXMuc3RvcmFnZS5nZXRJdGVtKGl0ZW0pKSkgfHwgdW5kZWZpbmVkXG4gICAgKTtcbiAgfVxuXG4gIHNldEl0ZW0oaXRlbSwgdmFsdWUsIG9uX2Vycm9yKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2Uuc2V0SXRlbShpdGVtLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgYFtTdG9yYWdlU2VydmljZV0gQ2FuJ3Qgc2V0IHRoZSBpdGVtICcke2l0ZW19JyA9ICcke3ZhbHVlfSdgLFxuICAgICAgKTtcbiAgICAgIGlmIChvbl9lcnJvcikge1xuICAgICAgICBjb25zdCBlcnJfY2hlY2sgPSB0aGlzLiNpc1F1b3RhRXhjZWVkZWRFcnJvcihlcnIpO1xuICAgICAgICBpZiAoZXJyX2NoZWNrKSB7XG4gICAgICAgICAgb25fZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJlbW92ZUl0ZW0oaXRlbSkge1xuICAgIHJldHVybiAodGhpcy5zdG9yYWdlICYmIHRoaXMuc3RvcmFnZS5yZW1vdmVJdGVtKGl0ZW0pKSB8fCB1bmRlZmluZWQ7XG4gIH1cblxuICAjaXNRdW90YUV4Y2VlZGVkRXJyb3IoZXJyKSB7XG4gICAgcmV0dXJuIGVyci5uYW1lID09PSAnUXVvdGFFeGNlZWRlZEVycm9yJztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTG9jYWxTdG9yYWdlU2VydmljZSBleHRlbmRzIFN0b3JhZ2VTZXJ2aWNlIHtcbiAgc3RvcmFnZSA9IGxvY2FsU3RvcmFnZTtcbn1cblxuZXhwb3J0IGNsYXNzIFNlc3Npb25TdG9yYWdlU2VydmljZSBleHRlbmRzIFN0b3JhZ2VTZXJ2aWNlIHtcbiAgc3RvcmFnZSA9IHNlc3Npb25TdG9yYWdlO1xufVxuIiwiaW1wb3J0IFNlcnZpY2UgZnJvbSAnLi4vYmFzZS9zZXJ2aWNlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVxdWVzdHNTZXJ2aWNlIGV4dGVuZHMgU2VydmljZSB7XG4gIE1FU1NBR0VTID0ge1xuICAgIGUyMDA6ICcyMDA6IEludmFsaWQgc2VydmVyIHJlc3VsdCEnLFxuICB9O1xuXG4gIGdldEhlYWRlcnMoY3VzdG9tX2hlYWRlcnMpIHtcbiAgICByZXR1cm4gY3VzdG9tX2hlYWRlcnM7XG4gIH1cblxuICBhc3luYyBwb3N0SlNPTih1cmwsIGRhdGEpIHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBtb2RlOiAnc2FtZS1vcmlnaW4nLFxuICAgICAgY2FjaGU6ICduby1jYWNoZScsXG4gICAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJyxcbiAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycyh7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9KSxcbiAgICAgIHJlZGlyZWN0OiAnZm9sbG93JyxcbiAgICAgIHJlZmVycmVyUG9saWN5OiAnc2FtZS1vcmlnaW4nLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gcmVzcG9uc2UuanNvbigpO1xuICAgIGlmICh0aGlzLmNoZWNrU2VydmVyUmVzdWx0KHJlc3VsdCkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHRocm93IEVycm9yKHRoaXMuTUVTU0FHRVMuZTIwMCk7XG4gIH1cblxuICBhc3luYyBwb3N0KHVybCwgZGF0YSwgY2FjaGUgPSAnZGVmYXVsdCcpIHtcbiAgICBsZXQgZmRhdGEgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XG4gICAgICBmZGF0YSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICAgIGZvciAoY29uc3QgayBpbiBkYXRhKSB7XG4gICAgICAgIGZkYXRhLmFwcGVuZChrLCBkYXRhW2tdKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgZmRhdGEgPSBkYXRhO1xuICAgIH1cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBtb2RlOiAnc2FtZS1vcmlnaW4nLFxuICAgICAgY2FjaGU6IGNhY2hlLFxuICAgICAgY3JlZGVudGlhbHM6ICdzYW1lLW9yaWdpbicsXG4gICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoe1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICAgICB9KSxcbiAgICAgIHJlZGlyZWN0OiAnZm9sbG93JyxcbiAgICAgIHJlZmVycmVyUG9saWN5OiAnc2FtZS1vcmlnaW4nLFxuICAgICAgYm9keTogZmRhdGEsXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gcmVzcG9uc2UuanNvbigpO1xuICAgIGlmICh0aGlzLmNoZWNrU2VydmVyUmVzdWx0KHJlc3VsdCkpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHRocm93IEVycm9yKHRoaXMuTUVTU0FHRVMuZTIwMCk7XG4gIH1cblxuICBhc3luYyBnZXQodXJsLCBjYWNoZSA9ICdkZWZhdWx0Jykge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgbW9kZTogJ3NhbWUtb3JpZ2luJyxcbiAgICAgIGNhY2hlOiBjYWNoZSxcbiAgICAgIGNyZWRlbnRpYWxzOiAnc2FtZS1vcmlnaW4nLFxuICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICByZWRpcmVjdDogJ2ZvbGxvdycsXG4gICAgICByZWZlcnJlclBvbGljeTogJ3NhbWUtb3JpZ2luJyxcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICB9XG5cbiAgY2hlY2tTZXJ2ZXJSZXN1bHQoZGF0YSkge1xuICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IChDKSAyMDIyIEFsZXhhbmRyZSBEw61helxuaW1wb3J0IHthcHB9IGZyb20gJy4vYmFzZS9hcHAnO1xuaW1wb3J0IENvbXBvbmVudCBmcm9tICcuL2Jhc2UvY29tcG9uZW50JztcbmltcG9ydCBTZXJ2aWNlIGZyb20gJy4vYmFzZS9zZXJ2aWNlJztcblxuaW1wb3J0IHtMb2NhbFN0b3JhZ2VTZXJ2aWNlLCBTZXNzaW9uU3RvcmFnZVNlcnZpY2V9IGZyb20gJy4vc2VydmljZXMvc3RvcmFnZSc7XG5pbXBvcnQgUmVxdWVzdHNTZXJ2aWNlIGZyb20gJy4vc2VydmljZXMvcmVxdWVzdHMnO1xuXG5hcHAucmVnaXN0ZXJTZXJ2aWNlKCdyZXF1ZXN0cycsIFJlcXVlc3RzU2VydmljZSk7XG5hcHAucmVnaXN0ZXJTZXJ2aWNlKCdsb2NhbFN0b3JhZ2UnLCBMb2NhbFN0b3JhZ2VTZXJ2aWNlKTtcbmFwcC5yZWdpc3RlclNlcnZpY2UoJ3Nlc3Npb25TdG9yYWdlJywgU2Vzc2lvblN0b3JhZ2VTZXJ2aWNlKTtcblxuLy8gT24gU3RhcnQgQVBQXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgYXBwLm9uV2lsbFN0YXJ0KCkudGhlbigoKSA9PiB7XG4gICAgYXBwLm9uU3RhcnQoKTtcbiAgfSk7XG59KTtcblxuZXhwb3J0IHtcbiAgQ29tcG9uZW50LFxuICBTZXJ2aWNlLFxuICBMb2NhbFN0b3JhZ2VTZXJ2aWNlLFxuICBTZXNzaW9uU3RvcmFnZVNlcnZpY2UsXG4gIFJlcXVlc3RzU2VydmljZSxcbn07XG5leHBvcnQgZGVmYXVsdCBhcHA7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQWUsNEJBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRTtBQUN6RCxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJO0FBQ3hELElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNsRCxHQUFHLENBQUMsQ0FBQztBQUNMOztBQ0plLCtCQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUU7QUFDekQsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSTtBQUN4RCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDckQsR0FBRyxDQUFDLENBQUM7QUFDTDs7QUNKZSxtQkFBUSxFQUFFLE1BQU0sRUFBRTtBQUNqQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRTtBQUN2QyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLEdBQUc7QUFDSCxFQUFFLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQztBQUN0Qjs7QUNIZSwyQkFBUSxFQUFFLE1BQU0sRUFBRTtBQUNqQyxFQUFFLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxFQUFFLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLEVBQUU7QUFDbkQsSUFBSSxPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQUM7QUFDckMsR0FBRztBQUNILEVBQUUsT0FBTyxTQUFTLENBQUM7QUFDbkI7O0FDUkEsNEJBQWU7QUFDZixFQUFFLGFBQWEsRUFBRSxJQUFJO0FBQ3JCO0FBQ0EsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDM0IsSUFBSSxNQUFNLFlBQVksR0FBRyxPQUFPLEtBQUssQ0FBQztBQUN0QyxJQUFJO0FBQ0osTUFBTSxJQUFJLENBQUMsYUFBYTtBQUN4QixPQUFPLFlBQVksS0FBSyxRQUFRLElBQUksWUFBWSxLQUFLLFFBQVEsQ0FBQztBQUM5RCxNQUFNO0FBQ04sTUFBTSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7QUFDakQsUUFBUSxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDbEQsT0FBTyxDQUFDO0FBQ1IsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSTtBQUNoQyxRQUFRLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BFLFFBQVEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUk7QUFDOUIsVUFBVSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdDLFVBQVUsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO0FBQ3RDLFlBQVksSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUN6QyxjQUFjLE1BQU0sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQ3pDLGFBQWEsTUFBTSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLEVBQUU7QUFDakQsY0FBYyxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztBQUN2QyxhQUFhLE1BQU07QUFDbkIsY0FBYyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RCxhQUFhO0FBQ2IsV0FBVztBQUNYLFNBQVMsQ0FBQyxDQUFDO0FBQ1gsT0FBTyxDQUFDLENBQUM7QUFDVCxLQUFLO0FBQ0wsSUFBSSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztBQUNyQyxHQUFHO0FBQ0gsQ0FBQzs7QUM1QmMsZUFBSyxDQUFDO0FBQ3JCLEVBQUUsV0FBVyxHQUFHLEVBQUUsQ0FBQztBQUNuQixFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDakIsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ1osRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLEVBQUUsVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUNsQixFQUFFLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFDbkIsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQ2Y7QUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRTtBQUN2QztBQUNBLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtBQUNyRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLEtBQUs7QUFDTCxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztBQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLElBQUksTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUscUJBQXFCLEVBQUU7QUFDbkUsTUFBTSxhQUFhLEVBQUUsSUFBSTtBQUN6QixLQUFLLENBQUMsQ0FBQztBQUNQLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzVELEdBQUc7QUFDSDtBQUNBLEVBQUUsV0FBVyxHQUFHO0FBQ2hCLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLElBQUksS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQzNDLE1BQU0sS0FBSyxDQUFDLElBQUk7QUFDaEIsUUFBUSxJQUFJLENBQUMsUUFBUTtBQUNyQixXQUFXLFFBQVE7QUFDbkIsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVE7QUFDN0MsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUk7QUFDekMsV0FBVztBQUNYLFdBQVcsSUFBSSxDQUFDLE1BQU0sSUFBSTtBQUMxQixZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDO0FBQ3pDLFlBQVksT0FBTyxNQUFNLENBQUM7QUFDMUIsV0FBVyxDQUFDO0FBQ1osT0FBTyxDQUFDO0FBQ1IsS0FBSztBQUNMLElBQUksT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlCLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxHQUFHO0FBQ1osSUFBSSxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDdEMsTUFBTSxNQUFNLENBQUMsVUFBVSxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1RCxNQUFNLE1BQU0sWUFBWSxHQUFHLENBQUMsVUFBVSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDO0FBQ3hFLE1BQU0sTUFBTSxVQUFVO0FBQ3RCLFFBQVEsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ2xFLE1BQU0sVUFBVSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzlFLEtBQUs7QUFDTCxHQUFHO0FBQ0g7QUFDQSxFQUFFLE1BQU0sR0FBRztBQUNYLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN6QixHQUFHO0FBQ0g7QUFDQSxFQUFFLE9BQU8sR0FBRztBQUNaO0FBQ0E7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7QUFDekIsSUFBSSxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDdEMsTUFBTSxNQUFNLENBQUMsVUFBVSxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1RCxNQUFNLE1BQU0sWUFBWSxHQUFHLENBQUMsVUFBVSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDO0FBQ3hFLE1BQU0sTUFBTSxVQUFVO0FBQ3RCLFFBQVEsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ2xFLE1BQU0sVUFBVSxDQUFDLG1CQUFtQjtBQUNwQyxRQUFRLFVBQVU7QUFDbEIsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDdEMsT0FBTyxDQUFDO0FBQ1IsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRTtBQUNwQixJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0FBQzFCLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQ3RCLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckMsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUUsU0FBUyxHQUFHO0FBQ2QsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDeEIsR0FBRztBQUNIO0FBQ0EsRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFO0FBQ3pCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDcEMsR0FBRztBQUNIO0FBQ0EsRUFBRSxjQUFjLENBQUMsU0FBUyxFQUFFO0FBQzVCLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQ3pFLEdBQUc7QUFDSDtBQUNBLEVBQUUsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUNyQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLEdBQUc7QUFDSDtBQUNBLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRTtBQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRCxHQUFHO0FBQ0gsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFO0FBQ2xCLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxHQUFHO0FBQ0g7O0FDdkdBO0FBQ0EsTUFBTSxHQUFHLFNBQVMsU0FBUyxDQUFDO0FBQzVCLEVBQUUsU0FBUyxHQUFHO0FBQ2QsSUFBSSxVQUFVLEVBQUUsRUFBRTtBQUNsQixJQUFJLFFBQVEsRUFBRSxFQUFFO0FBQ2hCLEdBQUcsQ0FBQztBQUNKLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUNqQixFQUFFLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDbkI7QUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUU7QUFDdEQsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDO0FBQ2hDLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxHQUFHO0FBQ1osSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDcEIsSUFBSSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNuRCxJQUFJLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO0FBQ3BDLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hCLEtBQUs7QUFDTCxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUNoQyxJQUFJLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBQzNELElBQUksc0JBQXNCLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDdEQsR0FBRztBQUNIO0FBQ0EsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO0FBQ3JDLElBQUksSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFO0FBQ3hELE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLG1DQUFtQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25FLE1BQU0sT0FBTztBQUNiLEtBQUs7QUFDTCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQztBQUNoRCxHQUFHO0FBQ0gsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUU7QUFDMUIsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNDLEdBQUc7QUFDSCxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLEVBQUU7QUFDakMsSUFBSSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkQsSUFBSSxJQUFJLGFBQWEsRUFBRTtBQUN2QixNQUFNLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3pELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTTtBQUN6QyxRQUFRLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUM1QixPQUFPLENBQUMsQ0FBQztBQUNULEtBQUssTUFBTTtBQUNYLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztBQUM1RCxLQUFLO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFO0FBQ2hELElBQUksSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ2hFLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGlDQUFpQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLE1BQU0sT0FBTztBQUNiLEtBQUs7QUFDTCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUM1QyxHQUFHO0FBQ0gsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFO0FBQ3hCLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QyxHQUFHO0FBQ0gsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQ25CLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLEdBQUc7QUFDSDtBQUNBLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO0FBQ3ZCLElBQUksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ2pCLE1BQU0sT0FBTyxTQUFTLENBQUM7QUFDdkIsS0FBSztBQUNMLElBQUksT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QyxHQUFHO0FBQ0g7QUFDQSxFQUFFLFdBQVcsR0FBRztBQUNoQixJQUFJLE9BQU8sS0FBSztBQUNoQixPQUFPLFdBQVcsRUFBRTtBQUNwQixPQUFPLElBQUksQ0FBQyxNQUFNO0FBQ2xCLFFBQVEsT0FBTyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztBQUMxQyxPQUFPLENBQUM7QUFDUixPQUFPLElBQUksQ0FBQyxNQUFNO0FBQ2xCLFFBQVEsT0FBTyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztBQUM1QyxPQUFPLENBQUMsQ0FBQztBQUNULEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxHQUFHO0FBQ1osSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDcEI7QUFDQSxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDNUU7QUFDQTtBQUNBLElBQUksbUJBQW1CO0FBQ3ZCLE1BQU0sT0FBTztBQUNiLE1BQU0scUJBQXFCO0FBQzNCLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDMUMsS0FBSyxDQUFDO0FBQ04sSUFBSSxtQkFBbUI7QUFDdkIsTUFBTSxPQUFPO0FBQ2IsTUFBTSxnQkFBZ0I7QUFDdEIsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN6QyxLQUFLLENBQUM7QUFDTixHQUFHO0FBQ0g7QUFDQSxFQUFFLG1CQUFtQixHQUFHO0FBQ3hCLElBQUksS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtBQUN4RCxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVE7QUFDaEUsUUFBUSxZQUFZO0FBQ3BCLE9BQU8sRUFBRSxDQUFDO0FBQ1YsS0FBSztBQUNMLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLElBQUksTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEQsSUFBSSxLQUFLLE1BQU0sWUFBWSxJQUFJLGFBQWEsRUFBRTtBQUM5QyxNQUFNLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDbkQsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLEtBQUs7QUFDTCxJQUFJLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5QixHQUFHO0FBQ0g7QUFDQSxFQUFFLHFCQUFxQixHQUFHO0FBQzFCLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLElBQUksTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3pELElBQUksS0FBSyxNQUFNLE9BQU8sSUFBSSxVQUFVLEVBQUU7QUFDdEMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ3ZDLFFBQVEsU0FBUztBQUNqQixPQUFPO0FBQ1AsTUFBTSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztBQUN2RCxNQUFNLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuRSxNQUFNLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ25FLE1BQU0sTUFBTSxvQkFBb0I7QUFDaEMsUUFBUSxnQkFBZ0IsSUFBSSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2pFLE1BQU0sTUFBTSxpQkFBaUIsR0FBRyxFQUFFLENBQUM7QUFDbkMsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJO0FBQ3pELFFBQVEsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7QUFDdEQsVUFBVSxNQUFNLG1CQUFtQixHQUFHLFVBQVU7QUFDaEQsYUFBYSxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO0FBQzVDLGFBQWEsV0FBVyxFQUFFLENBQUM7QUFDM0IsVUFBVSxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDL0UsU0FBUztBQUNULE9BQU8sQ0FBQyxDQUFDO0FBQ1QsTUFBTSxJQUFJLGFBQWEsRUFBRTtBQUN6QixRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYTtBQUMzQyxVQUFVLG9CQUFvQixJQUFJLElBQUk7QUFDdEMsVUFBVSxPQUFPO0FBQ2pCLFVBQVUsaUJBQWlCO0FBQzNCLFNBQVMsQ0FBQztBQUNWLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4QyxRQUFRLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqRCxRQUFRLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzVFLE9BQU8sTUFBTTtBQUNiLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxZQUFZLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNoRixPQUFPO0FBQ1AsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUIsR0FBRztBQUNIO0FBQ0EsRUFBRSxlQUFlLENBQUMsU0FBUyxFQUFFO0FBQzdCLElBQUksS0FBSyxNQUFNLFlBQVksSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFO0FBQ3RELE1BQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDN0QsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRTtBQUN6QixJQUFJLElBQUksb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0FBQ3JDLElBQUksTUFBTSx1QkFBdUIsR0FBRyxVQUFVLEtBQUssRUFBRTtBQUNyRCxNQUFNLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtBQUM1QyxRQUFRLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZDLE9BQU87QUFDUCxNQUFNLE1BQU0sbUJBQW1CLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUQsTUFBTSxJQUFJLG1CQUFtQixFQUFFO0FBQy9CLFFBQVEsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDdEMsT0FBTztBQUNQLEtBQUssQ0FBQztBQUNOLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUk7QUFDbEMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO0FBQ3pDLFFBQVEsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUN4QyxVQUFVLG9CQUFvQixHQUFHLElBQUksQ0FBQztBQUN0QyxTQUFTO0FBQ1QsUUFBUSxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUU7QUFDbkQsVUFBVSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxTQUFTO0FBQ1QsT0FBTztBQUNQLEtBQUssQ0FBQyxDQUFDO0FBQ1AsSUFBSSxJQUFJLG9CQUFvQixFQUFFO0FBQzlCLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7QUFDbkMsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxFQUFFO0FBQzNCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzNFLEdBQUc7QUFDSDtBQUNBLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxFQUFFO0FBQzFCLElBQUksTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM5RCxJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2pELEdBQUc7QUFDSCxDQUFDO0FBQ0Q7QUFDWSxNQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7O0FDM00vQixhQUFLLENBQUM7QUFDckIsRUFBRSxXQUFXLEdBQUc7QUFDaEIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUM3QixHQUFHO0FBQ0g7QUFDQSxFQUFFLE9BQU8sR0FBRztBQUNaLElBQUksTUFBTSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNwQyxHQUFHO0FBQ0g7O0FDTk8sTUFBTSxjQUFjLFNBQVMsT0FBTyxDQUFDO0FBQzVDLEVBQUUsT0FBTyxHQUFHLElBQUksQ0FBQztBQUNqQjtBQUNBLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRTtBQUNoQixJQUFJO0FBQ0osTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLFNBQVM7QUFDM0UsTUFBTTtBQUNOLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ2pDLElBQUksSUFBSTtBQUNSLE1BQU0sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQy9ELEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRTtBQUNsQixNQUFNLE9BQU8sQ0FBQyxLQUFLO0FBQ25CLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDcEUsT0FBTyxDQUFDO0FBQ1IsTUFBTSxJQUFJLFFBQVEsRUFBRTtBQUNwQixRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxRCxRQUFRLElBQUksU0FBUyxFQUFFO0FBQ3ZCLFVBQVUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLFNBQVM7QUFDVCxPQUFPO0FBQ1AsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLEtBQUssQ0FBQztBQUNqQixHQUFHO0FBQ0g7QUFDQSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDbkIsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLENBQUM7QUFDeEUsR0FBRztBQUNIO0FBQ0EsRUFBRSxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7QUFDN0IsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUM7QUFDN0MsR0FBRztBQUNILENBQUM7QUFDRDtBQUNPLE1BQU0sbUJBQW1CLFNBQVMsY0FBYyxDQUFDO0FBQ3hELEVBQUUsT0FBTyxHQUFHLFlBQVksQ0FBQztBQUN6QixDQUFDO0FBQ0Q7QUFDTyxNQUFNLHFCQUFxQixTQUFTLGNBQWMsQ0FBQztBQUMxRCxFQUFFLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFDM0I7O0FDMUNlLE1BQU0sZUFBZSxTQUFTLE9BQU8sQ0FBQztBQUNyRCxFQUFFLFFBQVEsR0FBRztBQUNiLElBQUksSUFBSSxFQUFFLDZCQUE2QjtBQUN2QyxHQUFHLENBQUM7QUFDSjtBQUNBLEVBQUUsVUFBVSxDQUFDLGNBQWMsRUFBRTtBQUM3QixJQUFJLE9BQU8sY0FBYyxDQUFDO0FBQzFCLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRTtBQUM1QixJQUFJLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsRUFBRTtBQUN0QyxNQUFNLE1BQU0sRUFBRSxNQUFNO0FBQ3BCLE1BQU0sSUFBSSxFQUFFLGFBQWE7QUFDekIsTUFBTSxLQUFLLEVBQUUsVUFBVTtBQUN2QixNQUFNLFdBQVcsRUFBRSxhQUFhO0FBQ2hDLE1BQU0sT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDL0IsUUFBUSxjQUFjLEVBQUUsa0JBQWtCO0FBQzFDLE9BQU8sQ0FBQztBQUNSLE1BQU0sUUFBUSxFQUFFLFFBQVE7QUFDeEIsTUFBTSxjQUFjLEVBQUUsYUFBYTtBQUNuQyxNQUFNLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztBQUNoQyxLQUFLLENBQUMsQ0FBQztBQUNQLElBQUksTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ25DLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDeEMsTUFBTSxPQUFPLE1BQU0sQ0FBQztBQUNwQixLQUFLO0FBQ0wsSUFBSSxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BDLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEdBQUcsU0FBUyxFQUFFO0FBQzNDLElBQUksSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3RCLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7QUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztBQUNwQyxNQUFNLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFO0FBQzVCLFFBQVEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsT0FBTztBQUNQLEtBQUssTUFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDbkIsS0FBSztBQUNMLElBQUksTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFO0FBQ3RDLE1BQU0sTUFBTSxFQUFFLE1BQU07QUFDcEIsTUFBTSxJQUFJLEVBQUUsYUFBYTtBQUN6QixNQUFNLEtBQUssRUFBRSxLQUFLO0FBQ2xCLE1BQU0sV0FBVyxFQUFFLGFBQWE7QUFDaEMsTUFBTSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQztBQUMvQixRQUFRLGNBQWMsRUFBRSxtQ0FBbUM7QUFDM0QsT0FBTyxDQUFDO0FBQ1IsTUFBTSxRQUFRLEVBQUUsUUFBUTtBQUN4QixNQUFNLGNBQWMsRUFBRSxhQUFhO0FBQ25DLE1BQU0sSUFBSSxFQUFFLEtBQUs7QUFDakIsS0FBSyxDQUFDLENBQUM7QUFDUCxJQUFJLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNuQyxJQUFJLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFO0FBQ3hDLE1BQU0sT0FBTyxNQUFNLENBQUM7QUFDcEIsS0FBSztBQUNMLElBQUksTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxHQUFHO0FBQ0g7QUFDQSxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsU0FBUyxFQUFFO0FBQ3BDLElBQUksTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFO0FBQ3RDLE1BQU0sTUFBTSxFQUFFLEtBQUs7QUFDbkIsTUFBTSxJQUFJLEVBQUUsYUFBYTtBQUN6QixNQUFNLEtBQUssRUFBRSxLQUFLO0FBQ2xCLE1BQU0sV0FBVyxFQUFFLGFBQWE7QUFDaEMsTUFBTSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUNoQyxNQUFNLFFBQVEsRUFBRSxRQUFRO0FBQ3hCLE1BQU0sY0FBYyxFQUFFLGFBQWE7QUFDbkMsS0FBSyxDQUFDLENBQUM7QUFDUCxJQUFJLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzNCLEdBQUc7QUFDSDtBQUNBLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFO0FBQzFCLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLEVBQUU7QUFDOUMsTUFBTSxPQUFPLElBQUksQ0FBQztBQUNsQixLQUFLO0FBQ0wsR0FBRztBQUNIOztBQzlFQTtBQU9BO0FBQ0EsR0FBRyxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDakQsR0FBRyxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUN6RCxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDN0Q7QUFDQTtBQUNBLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTTtBQUN0QyxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTTtBQUMvQixJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNsQixHQUFHLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQzs7OzsifQ==
