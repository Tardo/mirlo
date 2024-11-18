import {Component, Service, getService} from '../../dist/mirlo';

export class ServiceTest02 extends Service {
  getName() {
    return 'Test';
  }
}

export class Test02 extends Component {
  onSetup() {
    Component.useStateBinds({
      desc: {
        attribute: 'html',
        id: 'test01_title',
      },
      title: {
        attribute: 'title',
        id: 'test02_title',
      },
    });
    Component.useFetchData({
      ipify: {endpoint: 'https://api.ipify.org/?format=json'},
    });
  }

  onStart() {
    super.onStart();
    this.mirlo.state.desc = `<strong>Hello ${getService('servTest02').getName()}! (${this.getFetchData('ipify').ip})</strong>`;
  }
}
