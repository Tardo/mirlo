import {Component} from '../../dist/mirlo';

export default class Test04 extends Component {
  onSetup() {
    Component.useStateBinds({
      items: {
        id: 'list',
        each: {
          template: 'item',
          key: 'id',
          binds: {
            name: {selector: '.name'},
            done: {attribute: 'data-done'},
            $index: {selector: '.idx'},
          },
        },
      },
    });
    Component.useEvents({
      list: {
        mode: 'id',
        delegate: '.name',
        events: {click: this.onClickName},
      },
    });
  }

  onClickName(ev, matched) {
    this.clicked = this.getListItem(matched);
  }
}
