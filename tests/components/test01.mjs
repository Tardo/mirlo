import {Component} from '../../dist/mirlo';

export default class Test01 extends Component {
  events = {
    click: this.#onClick,
  };

  onRemove() {
    super.onRemove();
    ++window.comp_rmv_count;
  }

  onStart() {
    super.onStart();
    this.dom_el.innerHTML = '<strong>Hello World!</strong>';
  }

  #onClick() {
    this.dom_el.innerHTML = '<strong>Clicked!</strong>';
  }
}
