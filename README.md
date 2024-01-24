<h1 align="center">
  <img src="mirlo.png" />
  <div>Mirlo</div>
  <div>- Another Simple JavaScript WC -</div>
</h1>

## Installation

```bash
npm i mirlo --save-dev
```

## Basic Example

- HTML:

```html
<template id="template-mirlo-demo">
  <span id="msg"></span>
</template>

<mirlo-demo id="demo"></mirlo-demo>
```

- JS 'Component':

```javascript
import {Component, registerComponent} from 'mirlo';

export default class Demo extends Component {
  onSetup() {
    Component.useEvents({
      msg: {
        mode: 'id',
        events: {
          click: this.onClickMessage,
        },
      },
    });
  }

  onStart() {
    super.onStart();
    this.queryId('msg').innerHTML = '<strong>Hello World!</strong>';
  }

  onClickMessage(ev) {
    ev.target.innerHTML = '<strong>Clicked!</strong>';
  }
}

registerComponent('demo', Demo);
```

- JS 'Main':

```javascript
import './components/demo01';
```
