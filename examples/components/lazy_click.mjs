import LazyComponent from './lazy';

export default class LazyClickComponent extends LazyComponent {
  events = {
    [`click .${this.LAZY_ELEMENT_CLASS}`]: this.#onClickLazy,
  };

  #onClickLazy(ev) {
    this.applyLazyAttributes(ev.currentTarget);
  }
}
