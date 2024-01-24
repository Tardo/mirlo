import {Component} from '../../dist/mirlo';

export default class Test03 extends Component {
  onSetup() {
    Component.useStateBinds({
      counter: {
        id: 'test03_text',
      },
    });
    Component.enableAnimation();
  }

  async onWillStart() {
    super.onWillStart();
    this.mirlo.state.counter = 0;
  }

  onAnimationStep() {
    ++this.mirlo.state.counter;
  }
}
