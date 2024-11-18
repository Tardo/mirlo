import {AnimatedComponent} from '../../dist/mirlo';

export default class Test03 extends AnimatedComponent {
  onSetup() {
    AnimatedComponent.useStateBinds({
      counter: {
        id: 'test03_text',
      },
    });
  }

  onStart() {
    super.onStart();
    this.mirlo.state.counter = 0;
  }

  onAnimationStep() {
    ++this.mirlo.state.counter;
  }
}
