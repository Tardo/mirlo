import {Component, Service} from '../../dist/mirlo';

export class ServiceTest02 extends Service {
  getName() {
    return 'Test';
  }
}

export class Test02 extends Component {
  useServices = ['requests', 'servTest02'];
  useStateBinds = [
    {
      prop: 'desc',
      attribute: 'html',
      selector: '#test01_title',
    },
    {
      prop: 'title',
      attribute: 'title',
      selector: '#test02_title',
    },
  ];

  async onWillStart() {
    this.fetchData.ipify = {endpoint: 'https://api.ipify.org/?format=json'};
    return super.onWillStart(...arguments);
  }

  onStart() {
    super.onStart();
    this.getChild('test01_title').innerHTML =
      `<strong>Hello ${this.servTest02.getName()}!</strong>`;
  }
}
