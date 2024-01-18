export default {
  _component_obj: null,

  set(target, prop, value) {
    this._component_obj.onStateChanged(prop, target[prop], value);
    return Reflect.set(...arguments);
  },
};
