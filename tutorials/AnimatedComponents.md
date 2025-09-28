# Create a basic animated component

To implement a animated component you simply create a class that extends `AnimatedComponent` and register it in Mirlo:

```javascript
import {AnimatedComponent, registerComponent} from 'mirlo';

class DemoAnimated extends AnimatedComponent {
  #counter = 0;

  onSetup() {
    AnimatedComponent.useStateBinds({
      counter: {
        id: 'msg',
      },
    });
  }

  onStart() {
    super.onStart();
    this.mirlo.state.counter = 0;
  }

  onAnimationStep(timestamp) {
    console.log('TIMESTAMP:', timestamp);
    if (this.#counter === 500) {
      this.stopAnimation();
    }
    ++this.mirlo.state.counter;
  }
}

registerComponent('demo-anim', DemoAnimated);
```

Now, use it:

```html
<template id="template-mirlo-demo-anim">
  <div id="msg"></div>
</template>

<mirlo-demo-anim></mirlo-demo-anim>
```

# More details

## Lifecycle

| Callback        | Async? | Description                           | Good moment for... |
| --------------- | ------ | ------------------------------------- | ------------------ |
| onAnimationStep | [ ]    | Invoked on rAF. (Disabled by default) | Change node.       |

## Anim. Functions

- `startAnimation()` -> Start the animation loop.

- `stopAnimation()` -> Stop animation loop.
