
<h1 align="center">
  <img src="mirlo.png" />
  <div>Mirlo</div>
  <div style='font-size:x-small'>Simple javascript initiator</div>
</h1>

1. Basic Usage

+ HTML:
```html
<div data-component="demo01"></div>
```

+ JS 'Component':
```javascript
import {Component} from "mirlo";

export default class Demo01 extends Component {
  events = {
    "click": this.#onClick,
  };

  onStart() {
    super.onStart();
    this.dom_el.innerHTML = "<strong>Hello World!</strong>";
  }

  #onClick() {
    this.dom_el.innerHTML = "<strong>Clicked!</strong>";
  }
}
```

+ JS 'Main':
```javascript
import app from "mirlo";
import Demo01 from "./components/demo01";

app.registerComponent("demo01", Demo01);
```

---

2. Use Services

+ JS 'Component':
```javascript
import {Component} from "mirlo";

export default class Demo01 extends Component {
  useServices = ['requests'];

  onStart() {
    super.onStart();
    this.dom_el.innerHTML = "<strong>Hello World!</strong>";
    this.requests.postJSON("/demo01").then(result => this.dom_el.innerHTML = result);
  }
}
```

---

3. Fetch Data

+ JS 'Component':
```javascript
import {Component} from "mirlo";

export default class Demo01 extends Component {
  onWillStart() {
    this.fetchData.chart = {
      endpoint: "/get_demo01_data",
      data: {
        valueA: "this is a tests!",
        valueB: 42,
      },
    };
    return super.onWillStart(...arguments);
  }

  onStart() {
    super.onStart();
    this.dom_el.innerHTML = this.data.chart.response_value_a;
  }
}
