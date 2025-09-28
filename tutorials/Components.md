The components in Mirlo are basically 'Web Components' that enable 'Shadow Root' by default:

![image](https://developer.mozilla.org/es/docs/Web/API/Web_components/Using_shadow_DOM/shadowdom.svg)

# Create a basic component

To implement a component you simply create a class that extends `Component` and register it in Mirlo:

```javascript
import {Component, registerComponent} from 'mirlo';

class Demo extends Component {
  static observedAttributes = ['mycprop'];

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

  onClickMessage(ev) {
    this.mirlo.state.msg = `<strong>${this.mirlo.options.mycprop}</strong>`;
  }
}

registerComponent('demo', Demo);
```

Now, use it:

```html
<template id="template-mirlo-demo" mycprop="Clicked!">
  <div id="msg"><strong>Hello World!</strong></div>
</template>

<mirlo-demo></mirlo-demo>
```

# More details

## Lifecycle

| Callback           | Async? | Description                                                                                              | Good moment for...                                           |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| onSetup            | [ ]    | Invoked at construction time.                                                                            | Configure the component.                                     |
| onWillStart        | [x]    | Invoked when the component is added to the DOM.                                                          | Do necessary async work.                                     |
| onStart            | [ ]    | Invoked when the component is added to the DOM and it is completely ready for use.                       | Change node.                                                 |
| onAttributeChanged | [ ]    | Invoked when an attribute of the component changes. (Configured with 'observedAttributes' static method) | This is internally used to fill 'this.mirlo.options' object. |
| onRemove           | [ ]    | Invoked when the component is removed from the DOM.                                                      | Cleanup.                                                     |

## Hook Functions

Components implements 'Hook Functions', these functions only can be called in the `onSetup` step. With these functions
you can configure the component:

- `useEvents()` -> Configure component event listeners.

  The function receives an object with the following scheme:

  ```
  {
    <NODE SELECTOR/ID>: {
      mode: <"id"|Undefined>,
      <EVENT NAME>: <CALLBACK>
    }
  }
  ```

  Example:

  ```javascript
  Component.useEvents({
    '.tab': {
      click: this.onClickTab,
    },
  });
  ```

- `useFetchData()` -> Configure component prefetched network data.

  The function receives an object with the following scheme:

  ```
  {
    <CUSTOM NAME>: {
      enpoint: <String>,
      data: <Object>,
      method: <"GET"|"POST">,
      cache_name: <String>,
    }
  }
  ```

  Example:

  ```javascript
  Component.useFetchData({
    ipify: {endpoint: 'https://api.ipify.org/?format=json'},
  });
  ```

- `useStateBinds` -> Configure component state binds.

  The function receives an object with the following scheme. Note that only can use one of the 'id', 'selector' or '
  selectorAll' options.

  ```
  {
    <STATE ATTRIBUTE>: {
      attribute: <NODE ATTRIBUTE NAME|"html"|Undefined>,
      id: <String>,
      selector: <String>,
      selectorAll: <String>,
    }
  }
  ```

  Example:

  ```javascript
  Component.useStateBinds({
    desc: {
      attribute: 'html',
      id: 'description',
    },
  });
  ```

- `useStyles()` -> Configure component styles.

  The function receives an array of strings with the location of the css resources:

  ```
  [<Strings>]
  ```

  Example:

  ```javascript
  Component.useStyles(['/static/css/mycomponent.css']);
  ```

- `disableShadow()` -> Disable Shadow DOM usage.
