export default function (event_name, selector, callback) {
  document
    .querySelectorAll(selector)
    .forEach(dom_el => dom_el.removeEventListener(event_name, callback));
}
