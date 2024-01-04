export default {
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
