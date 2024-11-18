import {Component} from '../../dist/mirlo';

export default class Test01 extends Component {
  static observedAttributes = ['myval'];

  onSetup() {
    Component.useStateBinds({
      zoneA: {
        id: 'zoneA',
        attribute: 'html',
      },
      zoneB: {
        id: 'zoneB',
        attribute: 'html',
      },
    });
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

  connectedCallback() {
    super.connectedCallback();
    this.queryId('zoneA').innerHTML = '<strong>Hello World!</strong>';
  }

  onRemove() {
    super.onRemove();
    ++window.comp_rmv_count;
  }

  onClick(ev) {
    if (ev.target.id === 'zoneA') {
      this.mirlo.state.zoneA = '<strong>Clicked!</strong>';
    } else if (ev.target.id === 'zoneB') {
      this.mirlo.state.zoneB = `<strong>Clicked ${this.options.myval}!</strong>`;
    }
  }
}
