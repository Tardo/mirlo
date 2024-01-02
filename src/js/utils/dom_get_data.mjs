export default function (dom_el) {
  if (!Object.hasOwn(dom_el, 'mirlo')) {
    dom_el.mirlo = {};
  }
  return dom_el.mirlo;
}
