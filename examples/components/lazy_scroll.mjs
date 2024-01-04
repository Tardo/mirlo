import $ from 'jquery-slim';
import LazyComponent from './lazy';

export default class LazyScrollComponent extends LazyComponent {
  events = {
    scroll: this.#onScrollContainer,
  };

  constructor() {
    super(...arguments);
    Object.assign(
      this.options,
      {
        bounce_time_scroll: 75,
        zone_y_offset: 150,
        zone_x_offset: 75,
      },
      this.options,
    );
    this.load = $.debounce(
      this.#doLazyLoad.bind(this),
      this.options.bounce_time_scroll,
    );
  }

  onStart() {
    super.onStart();
    this.#doLazyLoad();
  }

  #doLazyLoad() {
    this.getLazyElements().forEach(item => {
      if (!this.#isOptionVisible(item)) {
        return;
      }
      this.applyLazyAttributes(item);
    });
  }

  #getDimensions(dom_el) {
    const $elm = $(dom_el);
    const $offset = $elm.offset();
    const left = $offset.left;
    const top = $offset.top;
    const right = left + $elm.width();
    const bottom = top + $elm.height();
    return [left, top, right, bottom];
  }

  #isOptionVisible(dom_el) {
    let [ddViewLeft, ddViewTop, ddViewRight, ddViewBottom] =
      this.#getDimensions(this.dom_el);
    ddViewLeft -= this.options.zone_x_offset;
    ddViewTop -= this.options.zone_y_offset;
    ddViewRight += this.options.zone_x_offset;
    ddViewBottom += this.options.zone_y_offset;
    const [elemLeft, elemTop, elemRight, elemBottom] =
      this.#getDimensions(dom_el);
    return (
      elemLeft <= ddViewRight &&
      elemTop <= ddViewBottom &&
      elemRight >= ddViewLeft &&
      elemBottom >= ddViewTop
    );
  }

  #onScrollContainer() {
    this.load();
  }
}
