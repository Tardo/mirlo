import {Component} from '../../dist/mirlo';

export default class Test01 extends Component {
  events = {
    'click #zoneA,#zoneB': this.#onClick,
  };

  static get observedAttributes() {
    return ['myval'];
  }

  onRemove() {
    super.onRemove();
    ++window.comp_rmv_count;
  }

  onStart() {
    super.onStart();
    this.getChild('zoneA').innerHTML = '<strong>Hello World!</strong>';
  }

  #onClick(ev) {
    if (ev.target.id === 'zoneA') {
      this.getChild('zoneA').innerHTML = '<strong>Clicked!</strong>';
    } else if (ev.target.id === 'zoneB') {
      this.getChild('zoneB').innerHTML =
        `<strong>Clicked ${this.options.myval}!</strong>`;
    }
  }
}
