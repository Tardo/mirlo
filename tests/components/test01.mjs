import {Component} from '../../dist/mirlo';

export default class Test01 extends Component {
  static observedAttributes = ['myval'];

  onSetup() {
    Component.useEvents({
      zoneA: {
        mode: 'id',
        events: {
          click: this.onClick,
        },
      },
      zoneB: {
        mode: 'id',
        events: {
          click: this.onClick,
        },
      },
    });
  }

  onRemove() {
    super.onRemove();
    ++window.comp_rmv_count;
  }

  onStart() {
    super.onStart();
    this.queryId('zoneA').innerHTML = '<strong>Hello World!</strong>';
  }

  onClick(ev) {
    if (ev.target.id === 'zoneA') {
      ev.target.innerHTML = '<strong>Clicked!</strong>';
    } else if (ev.target.id === 'zoneB') {
      ev.target.innerHTML = `<strong>Clicked ${this.options.myval}!</strong>`;
    }
  }
}
