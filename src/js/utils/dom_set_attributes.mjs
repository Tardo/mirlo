export default function (dom_el, attrs) {
  Object.keys(attrs).forEach(key => {
    dom_el.setAttribute(key, attrs[key]);
  });
}
