export default {
  component_obj: null,

  set(target, prop, value) {
    this.component_obj.onStateChanged(prop, target[prop], value);
    return Reflect.set(...arguments);
  },
};
