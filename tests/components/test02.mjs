import {Component, Service} from '../../dist/mirlo';

export class ServiceTest02 extends Service {
  getName() {
    return 'Test';
  }
}

export class Test02 extends Component {
  useServices = ['servTest02'];

  onStart() {
    super.onStart();
    this.dom_title = this.query('#test01-title');
    this.dom_title.innerHTML = `<strong>Hello ${this.servTest02.getName()}!</strong>`;
    this.state.desc = 'State changed!';
  }
}
