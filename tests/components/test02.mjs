import {Component, Service} from '../../dist/mirlo';

export class ServiceTest02 extends Service {
  getName() {
    return 'Test';
  }
}

export class Test02 extends Component {
  useServices = ['requests', 'servTest02'];

  onWillStart() {
    this.fetchData.ipify = {endpoint: 'https://api.ipify.org/?format=json'};
    return super.onWillStart(...arguments);
  }

  onStart() {
    super.onStart();
    this.dom_title = this.query('#test01-title');
    this.dom_title.innerHTML = `<strong>Hello ${this.servTest02.getName()}!</strong>`;
    this.state.desc = 'State changed!';
  }
}
