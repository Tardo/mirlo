import domGetData from './dom_get_data';

export default function (dom_el) {
  const dom_el_data = domGetData(dom_el);
  if (Object.hasOwn(dom_el_data, 'component_obj')) {
    return dom_el_data.component_obj;
  }
  return undefined;
}
