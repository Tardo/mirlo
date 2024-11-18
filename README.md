<h1 align="center">
  <img src="mirlo.png" />
  <div>Mirlo</div>
  <div>- Another Simple JavaScript WC -</div>
</h1>

<h2 align="center">

[![Static Badge](https://img.shields.io/badge/JSDoc-Page-33A2FF)](https://tardo.github.io/mirlo/)
[![Tests](https://github.com/Tardo/mirlo/actions/workflows/tests.yml/badge.svg)](https://github.com/Tardo/mirlo/actions/workflows/tests.yml)

</h2>

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
    Component.useStateBinds({
      msg: {
        id: 'msg',
        attribute: 'html',
      },
    });
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
    this.mirlo.state.msg = '<strong>Hello World!</strong>';
  }

  onClickMessage() {
    this.mirlo.state.msg = '<strong>Clicked!</strong>';
  }
}

registerComponent('demo', Demo);
```

- JS 'Main':

```javascript
import './components/demo01';
```

## Documentation

https://tardo.github.io/mirlo/
