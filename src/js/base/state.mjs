export default {
  component_obj: null,

  set(target, prop, value) {
    this.component_obj.onStateChanged(prop, value);
    return Reflect.set(...arguments);
  },
};
