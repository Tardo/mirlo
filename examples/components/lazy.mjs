import $ from 'jquery-slim';
import {Component} from 'mirlo';

export default class LazyComponent extends Component {
  LAZY_ELEMENT_CLASS = 'lazy';

  getNormalizedAttributes(dom_el, remove_attr = false) {
    const attrs = {};
    Object.keys(dom_el.dataset).forEach(dataName => {
      if (dataName.startsWith('lazy')) {
        const targetAttributeName = dataName.replace(/^lazy/, '').toLowerCase();
        const targetAttributeValue = dom_el.getAttribute(targetAttributeName);
        const targetLazyAttributeValue = dom_el.dataset[dataName];
        if (!targetAttributeValue || targetAttributeValue !== targetLazyAttributeValue) {
          attrs[targetAttributeName] = targetLazyAttributeValue;
          if (remove_attr) {
            dom_el.removeAttribute(dataName);
          }
        }
      }
    });
    return attrs;
  }

  applyLazyAttributes(dom_el) {
    dom_el.removeClass(this.LAZY_ELEMENT_CLASS);
    const attrs = this.getNormalizedAttributes(dom_el, true);
    if (dom_el?.dataset.createTag) {
      const new_dom_elm = $(`<${dom_el.dataset.createTag}>`, attrs);
      dom_el.replaceWith(new_dom_elm);
    } else {
      $(dom_el).attr(attrs);
    }
  }

  getLazyElements() {
    return this.queryAll(`.${this.LAZY_ELEMENT_CLASS}`);
  }
}
