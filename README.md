<h1 align="center">
  <img src="mirlo.png" />
  <div>Mirlo</div>
  <div>- Another Simple JavaScript WC -</div>
</h1>

## Installation

```bash
npm i mirlo
```

## Basic Usage

- HTML:

```html
<template id="template-mirlo-demo01">
  <span id="msg"></span>
</template>

<mirlo-demo01 id="demo"></mirlo-demo01>
```

- JS 'Component':

```javascript
import {Component} from 'mirlo';

export default class Demo01 extends Component {
  onSetup() {
    Component.useEvents({
      msg: [
        {
          event: 'click',
          callback: this.onClickMessage,
          mode: 'id',
        },
      ],
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
```

- JS 'Main':

```javascript
import app from 'mirlo';
import Demo01 from './components/demo01';

app.registerComponent('demo01', Demo01);
```

---

## Use Built-in Services

### Available Services:

- requests: HTTP operations
- localStorage: Local storage operations
- sessionStorage: Session storage operations

### Example

- JS 'Component':

```javascript
import {Component, getService} from 'mirlo';

export default class Demo01 extends Component {
  onStart() {
    super.onStart();
    const username = getService('localStorage').getItem('username');
    this.queryId('msg').innerHTML = `<strong>Hello ${username}!</strong>`;
  }
}
```

## Create Custom Service

- JS 'Service':

```javascript
import {Service} from 'mirlo';

export default class MyService extends Service {
  getUsername(item) {
    return 'Yo';
  }
}
```

- JS 'Component':

```javascript
import {Component} from 'mirlo';

export default class Demo01 extends Component {
  onStart() {
    super.onStart();
    this.queryId('msg').innerHTML =
      `<strong>Hello ${getService('myService').getUsername()}!</strong>`;
  }
}
```

- JS 'Main':

```javascript
import app from 'mirlo';
import Demo01 from './components/demo01';
import MyService from './serices/myservice';

app.registerService('myService', MyService);
app.registerComponent('demo01', Demo01);
```

## Extend Built-in Services

- JS 'Service':

```javascript
import {RequestsService} from 'mirlo';

export default class MyRequestsService extends RequestsService {
  onInit() {
    super().onInit(...arguments);
    this.user_info = {
      csrftoken: 'ABC123',
    };
  }
  getHeaders(custom_headers) {
    return Object.assign(custom_headers, {
      'X-CSRFToken': this.user_info.csrftoken,
    });
  }
}
```

- JS 'Main':

```javascript
import app from 'mirlo';
import MyRequestsService from './serices/myrequestsservice';

app.registerService('requests', MyRequestsService, true);
```

---

## Fetch Data

- JS 'Component':

```javascript
import {Component} from 'mirlo';

export default class Demo01 extends Component {
  onSetup() {
    Component.useFetchData({
      endpoint: '/get_demo01_data',
      data: {
        valueA: 'this is a test!',
        valueB: 42,
      },
    });
  }

  onStart() {
    super.onStart();
    this.queryId('msg').innerHTML = this.netdata.chart.response_value_a;
  }
}
```

---

## State Binds

JS 'Component':

```javascript
import {Component} from 'mirlo';

export default class Demo01 extends Component {
  onSetup() {
    Component.useStateBinds({
      msg: {
        attribute: 'html',
        id: 'msg',
      },
    });
  }
}
```

- JS 'Main':

```javascript
document.getElementById('demoA').state.msg = '<i>State changed!</i>';
```
