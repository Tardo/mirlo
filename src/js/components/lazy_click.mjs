import LazyComponent from './lazy';

export class LazyClickComponent extends LazyComponent {
  events = {
    [`click .${this.LAZY_ELEMENT_CLASS}`]: this.#onClickLazy,
  };

  #onClickLazy(ev) {
    this.applyLazyAttributes(ev.currentTarget);
  }
}
